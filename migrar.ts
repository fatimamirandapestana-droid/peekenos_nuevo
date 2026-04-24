import fs from 'fs';
import Papa from 'papaparse';
import sharp from 'sharp'; // <-- Nueva librería para comprimir
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, GeoPoint } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// 1. Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAsGkFzH1SFgQDeNSvSNL_bV_a_8T_ZbF4",
  authDomain: "peekenos.firebaseapp.com",
  projectId: "peekenos",
  storageBucket: "peekenos.firebasestorage.app", // Asegúrate de que sea tu terminación correcta
  messagingSenderId: "368361742637",
  appId: "1:368361742637:web:afba1e13bf2cce125d33a4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Convertir link de Drive a link de descarga
function getDriveDownloadUrl(driveUrl: string): string | null {
  const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return null;
}

async function migrarYComprimirDatos() {
  console.log("📄 Leyendo el archivo CSV...");
  const csvText = fs.readFileSync('./resultados_todos_unidos.csv', 'utf8');

  Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      console.log(`🔍 Se encontraron ${results.data.length} reportes. Iniciando proceso maestro...`);
      
      let procesados = 0;

      for (const row of results.data as any[]) {
        try {
          console.log(`\n-----------------------------------`);
          console.log(`Procesando a: ${row.nombre || 'Desconocido'}...`);

          // --- A. PROCESAR COORDENADAS ---
          let ubicacionGeopoint = null;
          const coordsStr = row.coords_ubicacion;
          if (coordsStr && coordsStr.startsWith('[') && coordsStr.endsWith(']')) {
            const cleanCoords = coordsStr.replace('[', '').replace(']', '').split(',');
            const lat = parseFloat(cleanCoords[0]);
            const lng = parseFloat(cleanCoords[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              ubicacionGeopoint = new GeoPoint(lat, lng);
            }
          }

          // --- B. PROCESAR, COMPRIMIR Y SUBIR FOTO ---
          let fotosFinales: string[] = [];
          const urlOriginal = row.fotografías;

          if (urlOriginal && urlOriginal.includes('drive.google.com')) {
            const urlDescarga = getDriveDownloadUrl(urlOriginal);
            if (urlDescarga) {
              try {
                console.log(`⬇️  Descargando imagen original de Drive...`);
                const response = await fetch(urlDescarga);
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                
                // Convertimos la respuesta a un Buffer que 'sharp' pueda entender
                const arrayBuffer = await response.arrayBuffer();
                const bufferOriginal = Buffer.from(arrayBuffer);

                console.log(`🗜️  Comprimiendo imagen...`);
                // AQUÍ OCURRE LA MAGIA DE LA COMPRESIÓN
                const bufferComprimido = await sharp(bufferOriginal)
                  .resize({ width: 800, withoutEnlargement: true }) // Máximo 800px de ancho
                  .jpeg({ quality: 70 }) // Convertir a JPEG con 70% de calidad visual
                  .toBuffer();

                console.log(`☁️  Subiendo imagen optimizada a Firebase Storage...`);
                const nombreArchivo = `mascotas_migradas_opt/${Date.now()}_${row.id}.jpg`;
                const storageRef = ref(storage, nombreArchivo);
                const snapshot = await uploadBytes(storageRef, bufferComprimido, { contentType: 'image/jpeg' });
                
                const linkFirebase = await getDownloadURL(snapshot.ref);
                fotosFinales.push(linkFirebase);
                console.log(`✅ Foto optimizada y subida correctamente.`);
              } catch (fotoError) {
                console.error(`❌ Error al procesar la foto, se dejará en blanco:`, fotoError);
              }
            }
          }

          // --- C. CREAR REPORTE EN FIRESTORE ---
          const reporte = {
            id_original: row.id,
            type: row.estado === 'Extraviado' ? 'lost' : 'sighted',
            name: row.nombre !== 'desconocido' ? row.nombre : '',
            pet_type: row.tipo_mascota === 'Perro' ? 'dog' : 'cat',
            breed: row.raza,
            age: row.edad,
            lifestyle: row.estilo_vida,
            size: row.tamano,
            mood: row.animo,
            address: row.domicilio,
            location_desc: row.ubicacion,
            contact_info: row.contacto,
            location: ubicacionGeopoint, 
            fecha_suceso: row.fecha_hora_suceso,
            created_at: row.fecha_hora_reporte,
            description: row.descripcion,
            photos: fotosFinales // <-- Pasamos el arreglo con el nuevo link de Firebase (o vacío si falló)
          };

          await addDoc(collection(db, 'reportes'), reporte);
          procesados++;
          
        } catch (error) {
          console.error(`❌ Error fatal al subir el reporte completo de ${row.nombre}:`, error);
        }
      }
      
      console.log(`\n🎉 ¡Migración Total Completada!`);
      console.log(`📊 Reportes procesados exitosamente: ${procesados}`);
      process.exit(0);
    }
  });
}

migrarYComprimirDatos();