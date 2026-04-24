import { useState, useRef, useEffect, useCallback } from 'react';
import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { Upload, MapPin, X } from 'lucide-react';
import clsx from 'clsx';
import L from 'leaflet';


function LocationMarker({ position, setPosition }: { position: [number, number], setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });


  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}


function MapController({ setPosition, fetchAddress }: { setPosition: (pos: [number, number]) => void, fetchAddress: (lat: number, lon: number) => void }) {
  const map = useMap();


  useEffect(() => {
    // Escuchar el evento de ubicación encontrada de Leaflet
    const onLocationFound = (e: L.LocationEvent) => {
      const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(newPos);
      fetchAddress(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, 17); // Zoom profundo para precisión
    };


    const onLocationError = (e: L.ErrorEvent) => {
      console.error("Leaflet location error:", e.message);
    };


    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);


    // Iniciar detección automática al montar
    map.locate({
      setView: false,
      enableHighAccuracy: true,
      maxZoom: 17
    });


    return () => {
      map.off('locationfound', onLocationFound);
      map.off('locationerror', onLocationError);
    };
  }, [map]); // Solo depende del mapa para evitar bucles infinitos


  return null;
}


interface ReportFormProps {
  type: 'lost' | 'sighted';
}


export default function ReportForm({ type }: ReportFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [position, setPosition] = useState<[number, number]>([20.9676, -89.6210]);
  const [photoData, setPhotoData] = useState<{ file?: File, preview: string }[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();


  const [formData, setFormData] = useState({
    pet_type: 'dog',
    name: '',
    raza: '', // <-- NUEVO
    age: '',
    lifestyle: '',
    size: '',
    mood: '',
    description: '',
    address: '',
    contact_info: '',
    fecha_hora_suceso: '', // <-- NUEVO
    state: '',
    city: '',
    country: ''
  });


  // NUEVO: Geocodificación inversa memoizada para evitar bucles infinitos
  const fetchAddress = useCallback(async (lat: number, lon: number) => {
    try {
      console.log(`Fetching address for: ${lat}, ${lon}`);
      const response = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lon}`);
      const data = await response.json();
      console.log("Geocode data received:", data);
     
      if (data.address) {
        const road = data.address.road || data.address.pedestrian || data.address.path || '';
        const suburb = data.address.suburb || data.address.neighbourhood || '';
        const city = data.address.city || data.address.town || data.address.village || '';
       
        setFormData(prev => {
          // Formatear una dirección más legible
          const cleanAddress = road
            ? `${road}${suburb ? ', ' + suburb : ''}${city ? ', ' + city : ''}`
            : (data.display_name || prev.address);


          return {
            ...prev,
            city: city || suburb || '',
            state: data.address.state || '',
            country: data.address.country || 'Mexico',
            address: cleanAddress
          };
        });
      }
    } catch (error) {
      console.error('Error al obtener la dirección:', error);
    }
  }, []);


  // Eliminado el useEffect anterior con navigator.geolocation directo
  // ahora se maneja dentro de MapController para mejor integración con Leaflet


  // Actualizar dirección cuando se mueve el marcador manualmente
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAddress(position[0], position[1]);
    }, 1000); // Debounce para no saturar la API
    return () => clearTimeout(timer);
  }, [position]);

  useEffect(() => {
  // Si venimos desde la página de captura, inyectamos los datos de la IA
  if (location.state && location.state.aiData) {
    const ai = location.state.aiData;
    setFormData(prev => ({
      ...prev,
      pet_type: ai.pet_type || 'dog',
      name: ai.name || '',
      raza: ai.raza || '',
      age: ai.age || '',
      size: ai.size || 'medium',
      mood: ai.mood || 'friendly',
      lifestyle: ai.lifestyle || 'mixed',
      description: ai.description || '',
      address: ai.address || '',
      contact_info: ai.contact_info || '',
      fecha_hora_suceso: ai.fecha_hora_suceso || ''
    }));
  }
}, [location.state]);


  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files) as File[];
      const newPhotoData = newFiles.map(file => {
        const url = (typeof window !== 'undefined' && (window.URL || window.webkitURL)) ? (window.URL || window.webkitURL).createObjectURL(file) : '';
        return { file, preview: url };
      });
     
      setPhotoData(prev => [...prev, ...newPhotoData].slice(0, 5));
    }
  };


  const removePhoto = (index: number) => {
    setPhotoData(prev => {
      const newData = [...prev];
      // Revoke the object URL to avoid memory leaks
      if (newData[index].preview.startsWith('blob:')) {
        URL.revokeObjectURL(newData[index].preview);
      }
      return newData.filter((_, i) => i !== index);
    });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);


    try {
      const data = new FormData();
     
      // Añadir campos de texto
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, String(value));
      });
     
      // Añadir ubicación y tipo
      data.append('type', type);
      data.append('latitude', position[0].toString());
      data.append('longitude', position[1].toString());
     
      // Añadir fotos reales
      photoData.forEach(p => {
        if (p.file) {
          data.append('photos', p.file);
        }
      });

      const res = await fetch('https://peekenos-api.onrender.com/api/reports', {
        method: 'POST',
        // No enviamos Content-Type manual, el navegador lo pone con el boundary de FormData
        body: data
      });


      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit report');
      }


      navigate('/');
    } catch (error: any) {
      console.error(error);
      alert(`Error al enviar el reporte: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden border border-stone-200">
      <div className="bg-orange-500 px-6 py-4">
        <h2 className="text-xl font-bold text-white">
          {type === 'lost' ? 'Reportar Mascota Extraviada' : 'Reportar Mascota Vista'}
        </h2>
        <p className="text-orange-100 text-sm mt-1">
          {type === 'lost'
            ? 'Ayúdanos a encontrar a tu mascota proporcionando la mayor cantidad de detalles posible.'
            : 'Si viste una mascota perdida, repórtala aquí para ayudar a sus dueños.'}
        </p>
      </div>


      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Pet Type */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Tipo de Mascota</label>
          <div className="flex space-x-4">
            {['dog', 'cat'].map((t) => (
              <label key={t} className={clsx(
                "flex-1 cursor-pointer rounded-lg border p-4 text-center transition-all hover:bg-stone-50",
                formData.pet_type === t ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500" : "border-stone-200"
              )}>
                <input
                  type="radio"
                  name="pet_type"
                  value={t}
                  checked={formData.pet_type === t}
                  onChange={(e) => setFormData({ ...formData, pet_type: e.target.value })}
                  className="sr-only"
                />
                <span className="capitalize font-medium text-stone-900">
                  {t === 'dog' ? 'Perro' : 'Gato'}
                </span>
              </label>
            ))}
          </div>
        </div>


        {/* Conditional Fields for Lost Pets */}
        {type === 'lost' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-stone-700">Nombre</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700">Edad (aprox)</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              />
            </div>
          </div>
        )}


        {/* ----------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-stone-700">Raza</label>
            <input
              type="text"
              placeholder={type === 'sighted' ? 'Ej. Mestizo, Poodle (o déjalo en blanco)' : ''}
              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
              value={formData.raza}
              onChange={(e) => setFormData({ ...formData, raza: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">
              Fecha y Hora del {type === 'lost' ? 'Extravío' : 'Avistamiento'}
            </label>
            <input
              type="datetime-local"
              required
              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
              value={formData.fecha_hora_suceso}
              onChange={(e) => setFormData({ ...formData, fecha_hora_suceso: e.target.value })}
            />
          </div>
        </div>
        {/* ----------------------------------------------- */}


        {/* Common Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-stone-700">Tamaño</label>
            <select
              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
            >
              <option value="small">Pequeño</option>
              <option value="medium">Mediano</option>
              <option value="large">Grande</option>
              <option value="xl">XL</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">Estilo de Vida</label>
            <select
              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
              value={formData.lifestyle}
              onChange={(e) => setFormData({ ...formData, lifestyle: e.target.value })}
            >
              <option value="active">Activo</option>
              <option value="sedentary">Sedentario</option>
              <option value="mixed">Mixto</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">Ánimo</label>
            <select
              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
              value={formData.mood}
              onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
            >
              <option value="friendly">Amigable/Social</option>
              <option value="scared">Asustadizo/Huraño</option>
              <option value="angry">Enojón/Agresivo</option>
            </select>
          </div>
        </div>


        <div>
          <label className="block text-sm font-medium text-stone-700">Descripción Adicional</label>
          <textarea
            rows={3}
            className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Color, marcas distintivas, collar..."
          />
        </div>


        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Fotografías (Máx 5)</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {photoData.map((photo, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-stone-200 group">
                <img src={photo.preview} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {photoData.length < 5 && (
              <div className="flex flex-col space-y-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 rounded-lg border-2 border-dashed border-orange-200 bg-orange-50/50 flex flex-col items-center justify-center text-orange-600 hover:bg-orange-100 transition-colors py-4"
                >
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">CÁMARA</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 rounded-lg border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 hover:border-orange-500 hover:text-orange-500 transition-colors py-4"
                >
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">GALERÍA</span>
                </button>
              </div>
            )}
          </div>
          <input
            type="file"
            ref={galleryInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
          />
          <input
            type="file"
            ref={cameraInputRef}
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
          />
        </div>


        {/* Location Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-stone-700">
              Ubicación {type === 'lost' ? 'del Extravío' : 'del Avistamiento'}
            </label>
            <button
              type="button"
              disabled={isLocating}
              onClick={() => {
                if (navigator.geolocation) {
                  setIsLocating(true);
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                      setPosition(newPos);
                      fetchAddress(pos.coords.latitude, pos.coords.longitude);
                      setIsLocating(false);
                    },
                    (err) => {
                      setIsLocating(false);
                      let message = "No se pudo obtener la ubicación.";
                      if (err.code === 1) message = "Permiso de ubicación denegado.";
                      else if (err.code === 2) message = "Ubicación no disponible.";
                      else if (err.code === 3) message = "Tiempo de espera agotado.";
                      alert(message);
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                  );
                }
              }}
              className={clsx(
                "text-xs font-semibold flex items-center px-2 py-1 rounded transition-colors",
                isLocating ? "text-stone-400 bg-stone-100" : "text-orange-600 hover:bg-orange-50"
              )}
            >
              <MapPin className={clsx("w-3 h-3 mr-1", isLocating && "animate-bounce")} />
              {isLocating ? "Buscando ubicación..." : "Obtener ubicación exacta ahora"}
            </button>
          </div>
         
          <div className="h-64 rounded-lg overflow-hidden border border-stone-200 relative group">
            <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController setPosition={setPosition} fetchAddress={fetchAddress} />
              <LocationMarker position={position} setPosition={setPosition} />
            </MapContainer>
           
            {isLocating && (
              <div className="absolute inset-x-0 bottom-0 bg-white/90 backdrop-blur-sm p-3 z-[1000] flex items-center justify-center space-x-3 border-t border-stone-200">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></div>
                <span className="text-sm font-medium text-stone-700">Detectando tu ubicación exacta...</span>
              </div>
            )}
          </div>


          <div className="flex justify-between items-center text-xs text-stone-500 bg-stone-50 p-2 rounded border border-stone-100">
            <p className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              Haz clic en el mapa para ajustar la ubicación.
            </p>
            <div className="text-orange-700 font-mono font-bold">
              Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}
            </div>
          </div>
        </div>


        {/* Domicilio / Referencia (Visible para ambos) */}
        <div>
          <label className="block text-sm font-medium text-stone-700">Domicilio / Referencia (Se llena automáticamente)</label>
          <input
            type="text"
            required
            placeholder="Ej. Calle 60 x 57 Centro"
            className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border bg-stone-50"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-stone-700">País</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">Estado</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">Ciudad</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
        </div>


        <div>
          <label className="block text-sm font-medium text-stone-700">Información de Contacto</label>
          <input
            type="text"
            required
            placeholder="Teléfono o Email"
            className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
            value={formData.contact_info}
            onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
          />
        </div>


        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar Reporte'}
          </button>
        </div>
      </form>
    </div>
  );
}
