import express, { Request, Response, RequestHandler } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import cors from 'cors';
// 1. Importaciones de Firebase (Cliente)
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, doc, addDoc, GeoPoint, deleteDoc, updateDoc } from 'firebase/firestore';
// NUEVO: Agregamos deleteObject para borrar las imágenes
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { GoogleGenerativeAI } from "@google/generative-ai";


const firebaseConfig = {
  apiKey: "AIzaSyAsGkFzH1SFgQDeNSvSNL_bV_a_8T_ZbF4",
  authDomain: "peekenos.firebaseapp.com",
  projectId: "peekenos",
  storageBucket: "peekenos.firebasestorage.app",
  messagingSenderId: "368361742637",
  appId: "1:368361742637:web:afba1e13bf2cce125d33a4"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // Límite inicial de 5MB por foto

// --- DICCIONARIOS DE TRADUCCIÓN ---
const traducciones: Record<string, Record<string, string>> = {
  type: { 
    'lost': 'Extraviado', 
    'sighted': 'Visto',
    'recovered': 'Encontrado' // Nuevo estado para finales felices
  },
  pet_type: { 
    'dog': 'Perro', 
    'cat': 'Gato' 
  },
  lifestyle: { 
    'active': 'Activo', 
    'sedentary': 'Sedentario', 
    'mixed': 'Mixto' 
  },
  size: { 
    'small': 'Pequeño', 
    'medium': 'Mediano', 
    'large': 'Grande', 
    'xl': 'Extra Grande' 
  },
  mood: { 
    'friendly': 'Amigable/Social', 
    'scared': 'Asustadizo/Huraño', 
    'angry': 'Enojón/Agresivo' 
  }
};

// Configura tu API Key (puedes usar la misma del Colab)
const genAI = new GoogleGenerativeAI("AIzaSyAf4eivtREFy2DVUQJwBbGu70_HTS3P7nQ");

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors({
  origin: ['https://peekenos.web.app', 'https://peekenos.firebaseapp.com'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true
}));
  app.use(express.json({ limit: '10mb' }) as RequestHandler);

  // --- RUTAS API ---

  app.get('/api/reports', async (req: Request, res: Response) => {
    try {
      const querySnapshot = await getDocs(collection(db, 'reportes'));
      
      const reports = querySnapshot.docs.map(doc => {
        const data = doc.data();
        let lat = 20.9676;
        let lng = -89.6210;
        if (data.location && typeof data.location.latitude === 'number') {
          lat = data.location.latitude;
          lng = data.location.longitude;
        }

        return {
          id: doc.id,
          type: data.type || '',
          name: data.name || '',
          pet_type: data.pet_type || '',
          age: data.age || '',
          lifestyle: data.lifestyle || '',
          size: data.size || '',
          mood: data.mood || '',
          photos: data.photos || [],
          address: data.address || '',
          latitude: lat,
          longitude: lng,
          created_at: data.created_at || new Date().toISOString(),
          description: data.description || '',
          contact_info: data.contact_info || ''
        };
      });
      
      res.json(reports);
    } catch (error) {
      console.error('Error al obtener reportes:', error);
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  });

  app.get('/api/reports/:id', async (req: Request, res: Response): Promise<any> => {
    try {
      const docRef = doc(db, 'reportes', req.params.id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const data = docSnap.data();
      let lat = 20.9676;
      let lng = -89.6210;
      if (data.location && typeof data.location.latitude === 'number') {
        lat = data.location.latitude;
        lng = data.location.longitude;
      }

      const report = {
        id: docSnap.id,
        type: data.type || '',
        name: data.name || '',
        pet_type: data.pet_type || '',
        age: data.age || '',
        lifestyle: data.lifestyle || '',
        size: data.size || '',
        mood: data.mood || '',
        photos: data.photos || [],
        address: data.address || '',
        latitude: lat,
        longitude: lng,
        created_at: data.created_at || new Date().toISOString(),
        description: data.description || '',
        contact_info: data.contact_info || ''
      };

      res.json(report);
    } catch (error) {
      console.error('Error al obtener el reporte:', error);
      res.status(500).json({ error: 'Failed to fetch report' });
    }
  });


app.get('/api/reports/similar/:id', async (req: Request, res: Response): Promise<any> => {
    try {
      const targetId = req.params.id;
      const querySnapshot = await getDocs(collection(db, 'reportes'));
      
      const allReports = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data } as any;
      });

      const target = allReports.find(r => r.id === targetId);
      if (!target) return res.status(404).json({ error: 'Mascota no encontrada' });

      // 1. Lógica de Cross-Matching: Invertimos el tipo de búsqueda
      // Si el target es 'lost', buscamos 'sighted'. Si es 'sighted', buscamos 'lost'.
      const searchType = target.type === 'lost' ? 'sighted' : 
                         target.type === 'sighted' ? 'lost' : null;

      if (!searchType) {
        return res.json({ visual: [], textual: [], contextual: [] });
      }

      // Filtramos candidatos: Tipo opuesto + Misma especie (perro/gato)
      const candidates = allReports.filter(r => 
        r.id !== targetId && 
        r.type === searchType && 
        r.pet_type === target.pet_type
      );

      // 2. Cálculo de Scores y Ranking
      const scoredResults = candidates.map(r => {
        let score = 0;

        // A. Similitud Geoespacial (Peso: 50%)
        if (r.location && target.location) {
          const dist = getDistanceKM(
            target.location.latitude, target.location.longitude,
            r.location.latitude, r.location.longitude
          );
          // Máximo puntaje si está a < 1km, decae linealmente hasta los 15km
          const distanceScore = Math.max(0, 0.5 * (1 - dist / 15));
          score += distanceScore;
        }

        // B. Similitud de Raza (Peso: 30%)
        if (r.breed && target.breed && r.breed.toLowerCase() === target.breed.toLowerCase()) {
          score += 0.3;
        }

        // C. Características Descriptivas (Peso: 20%)
        if (r.size === target.size) score += 0.1;
        if (r.mood === target.mood) score += 0.1;

        return {
          id: r.id,
          name: r.name,
          // Aplicamos tus traducciones para que el frontend lo muestre bien
          breed: traducciones.pet_type[r.pet_type] === 'Perro' ? (r.breed || 'Mestizo') : (r.breed || 'Común'),
          photos: r.photos || [],
          score: Math.min(score, 1) 
        };
      })
      .sort((a, b) => b.score - a.score);

      // Devolvemos los resultados (Top 6 de cada uno)
      res.json({
        visual: scoredResults.slice(0, 6),
        textual: scoredResults.slice(0, 6),
        contextual: scoredResults.slice(0, 6)
      });

    } catch (error) {
      console.error('Error al procesar similitudes:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.post('/api/reports', upload.array('photos', 5) as any, async (req: Request, res: Response) => {
    try {
      const {
        type, pet_type, name, raza, age, lifestyle, size, mood, description,
        address, latitude, longitude, contact_info, fecha_hora_suceso
      } = req.body;

      const files = req.files as Express.Multer.File[];
      const photosUrls: string[] = [];

      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const compressedBuffer = await sharp(file.buffer)
              .resize({ width: 800, withoutEnlargement: true })
              .jpeg({ quality: 80 })
              .toBuffer();

            const fileName = `mascotas/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const storageRef = ref(storage, fileName);

            const snapshot = await uploadBytes(storageRef, compressedBuffer, {
              contentType: 'image/jpeg',
            });

            const downloadURL = await getDownloadURL(snapshot.ref);
            photosUrls.push(downloadURL);
          } catch (sharpError) {
             console.error('Error comprimiendo la foto, se ignorará este archivo:', sharpError);
          }
        }
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const location = (!isNaN(lat) && !isNaN(lng)) ? new GeoPoint(lat, lng) : null;

      const nuevoReporte = {
        type: type || '',
        name: name || '',
        pet_type: pet_type || '',
        breed: raza || '',
        age: age || '',
        lifestyle: lifestyle || '',
        size: size || '',
        mood: mood || '',
        address: address || '',
        location_desc: '',
        contact_info: contact_info || '',
        location: location,
        fecha_suceso: fecha_hora_suceso || '',
        created_at: new Date().toISOString(),
        description: description || '',
        photos: photosUrls.length > 0 ? photosUrls : ["https://placehold.co/600x400/png"]
      };

      const docRef = await addDoc(collection(db, 'reportes'), nuevoReporte);
      res.json({ id: docRef.id, message: 'Report created successfully' });
    } catch (error) {
      console.error('Error saving report:', error);
      res.status(500).json({ error: 'Error al guardar el reporte' });
    }
  });

app.post('/api/ai/analyze-screenshot', upload.single('screenshot') as any, async (req: Request, res: Response): Promise<any> => {
  try {
    console.log("[DEBUG] Iniciando análisis de screenshot...");

    // 1. Validar que el archivo llegó correctamente
    if (!req.file) {
      console.error("[ERROR] No se recibió ningún archivo en el body (campo 'screenshot').");
      return res.status(400).json({ 
        error: 'No se subió ninguna imagen',
        detail: 'Asegúrate de que el FormData use el campo name="screenshot"' 
      });
    }

    console.log(`[DEBUG] Imagen recibida: ${req.file.originalname} (${req.file.mimetype}) - ${req.file.size} bytes`);

    // 2. Inicializar modelo de Gemini
    const model = genAI.getGenerativeModel({ 
          model: "gemini-2.0-flash-lite", // <-- Exactamente el de tu Python
          generationConfig: { responseMimeType: "application/json" }
        });

    // 3. Preparar datos de imagen
    const imageData = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype,
      },
    };

    const prompt = `
      Analiza esta captura de pantalla de un reporte de mascota.
      Extrae la información y devuélvela en el siguiente formato JSON estrictamente:
      {
        "type": "lost" | "sighted",
        "pet_type": "dog" | "cat",
        "name": "nombre si existe o vacío",
        "raza": "raza detectada",
        "age": "edad aproximada",
        "size": "small" | "medium" | "large" | "xl",
        "lifestyle": "active" | "sedentary" | "mixed",
        "mood": "friendly" | "scared" | "angry",
        "description": "descripción física detallada",
        "address": "dirección o referencia de ubicación",
        "contact_info": "teléfono o medio de contacto",
        "fecha_hora_suceso": "YYYY-MM-DDTHH:mm"
      }
      Si no encuentras un campo, deja el string vacío.
    `;

    console.log("[DEBUG] Enviando petición a Gemini API...");
    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;
    let text = response.text();

    // Limpiamos posibles bloques de código que la IA a veces agrega por error
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const jsonResponse = JSON.parse(cleanJson);
    res.json(jsonResponse);
    // 4. Llamada a la API con timeout manual (opcional)

    console.log("[DEBUG] Respuesta cruda de Gemini:", text);

    // 5. Parseo seguro del JSON
    try {
      const jsonResponse = JSON.parse(text);
      console.log("[DEBUG] JSON parseado con éxito.");
      res.json(jsonResponse);
    } catch (parseError) {
      console.error("[ERROR] Gemini no devolvió un JSON válido:", text);
      throw new Error(`La IA no pudo estructurar los datos correctamente: ${text}`);
    }

  } catch (error: any) {
    // CAPA FINAL DE ERRORES: Aquí capturamos fallos de API Key, red o cuota
    console.error("--- FALLO CRÍTICO EN ANALYZE-SCREENSHOT ---");
    console.error("Mensaje:", error.message);
    if (error.stack) console.error("Stack:", error.stack);
    
    // Identificar errores comunes de Google AI
    let status = 500;
    let message = "Error interno al procesar con IA";
    
    if (error.message?.includes("API_KEY_INVALID")) {
      message = "La API Key de Gemini es inválida o expiró.";
      status = 401;
    } else if (error.message?.includes("429")) {
      message = "Se alcanzó el límite de cuota gratuita de Gemini.";
      status = 429;
    } else if (error.message?.includes("model not found")) {
      message = "El modelo especificado (gemini-1.5-flash) no está disponible.";
    }

    res.status(status).json({ 
      error: message, 
      detail: error.message 
    });
  }
});

  // 4. Actualizar estado (Marcar como Encontrado)
  app.patch('/api/reports/:id/status', async (req: Request, res: Response): Promise<any> => {
    try {
      const { type } = req.body;
      const docRef = doc(db, 'reportes', req.params.id);

      if (!['lost', 'sighted', 'recovered'].includes(type)) {
        return res.status(400).json({ error: 'Estado no válido' });
      }

      await updateDoc(docRef, { type: type });
      res.json({ message: 'Estado actualizado exitosamente' });
    } catch (error) {
      console.error('Error al actualizar el estado:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // NUEVO: Ruta para manejar la eliminación (DELETE) del reporte y sus imágenes
  app.delete('/api/reports/:id', async (req: Request, res: Response): Promise<any> => {
    try {
      const docRef = doc(db, 'reportes', req.params.id);
      
      // 1. Obtener el documento para recuperar las URLs de las fotos antes de borrarlo
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return res.status(404).json({ error: 'Reporte no encontrado' });
      }

      const data = docSnap.data();
      const photos: string[] = data.photos || [];

      // 2. Eliminar cada imagen asociada en Firebase Storage
      for (const photoUrl of photos) {
        // Ignorar la imagen por defecto si existe
        if (!photoUrl.includes('placehold.co')) {
          try {
            const photoRef = ref(storage, photoUrl);
            await deleteObject(photoRef);
            console.log(`[DEBUG] Imagen eliminada correctamente del storage.`);
          } catch (storageError) {
            console.error(`[ERROR] No se pudo eliminar la imagen del storage: ${photoUrl}`, storageError);
          }
        }
      }

      // 3. Finalmente, eliminar el documento de la base de datos Firestore
      await deleteDoc(docRef);
      
      res.json({ message: 'Reporte e imágenes eliminadas exitosamente' });
    } catch (error) {
      console.error('Error al eliminar el reporte:', error);
      res.status(500).json({ error: 'Error al eliminar el reporte' });
    }
  });

  app.get('/api/reverse-geocode', async (req: Request, res: Response): Promise<any> => {
    try {
      const { lat, lng } = req.query;
      if (!lat || !lng) return res.status(400).json({ error: 'Lat and Lng are required' });

      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      console.log(`[DEBUG] Proxying geocode request to: ${nominatimUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(nominatimUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'PeekenosApp/1.0 (contact: admin@peekenos.com)'
          }
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[ERROR] Nominatim returned status ${response.status}: ${errorText}`);
          return res.status(response.status).json({ error: 'Nominatim error' });
        }

        const data = await response.json();
        console.log(`[DEBUG] Geocode success for ${lat}, ${lng}`);
        res.json(data);
      } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
          console.error('[ERROR] Nominatim request timed out after 5s');
          return res.status(504).json({ error: 'Request timed out' });
        }
        throw e;
      }
    } catch (error) {
      console.error('Error in proxy geocode:', error);
      res.status(500).json({ error: 'Failed to fetch address' });
    }
  });

  // --- CONFIGURACIÓN DEL SERVIDOR WEB ---
  
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares as RequestHandler);
  } else {
    app.use(express.static(path.resolve('dist')) as RequestHandler);
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

// Función auxiliar para calcular distancia en KM (Haversine)
  function getDistanceKM(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
