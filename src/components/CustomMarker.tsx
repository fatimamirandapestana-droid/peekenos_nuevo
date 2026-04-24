import React from 'react';
import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import { PawPrint, ArrowRight } from 'lucide-react'; // Usando Lucide que ya tienes en el proyecto
import { renderToString } from 'react-dom/server';
import { Link } from 'react-router-dom';

interface CustomMarkerProps {
  report: {
    id: string;
    type: 'lost' | 'sighted' | 'recovered';
    pet_type: 'dog' | 'cat';
    name: string;
    latitude: number;
    longitude: number;
    photos: string[];
  };
}

const CustomMarker: React.FC<CustomMarkerProps> = ({ report }) => {
  // Definimos el color según el estado
  const markerColor = report.type === 'lost' ? '#ef4444' : '#3b82f6'; // Rojo o Azul

  // Creamos el HTML del icono con una patita
  const iconHTML = renderToString(
    <div style={{
      position: 'relative',
      width: '35px',
      height: '35px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* El "Pin" de fondo */}
      <div style={{
        position: 'absolute',
        width: '30px',
        height: '30px',
        backgroundColor: markerColor,
        borderRadius: '50% 50% 50% 0',
        transform: 'rotate(-45deg)',
        border: '2px solid white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
      }} />
      {/* El icono de la patita en el centro */}
      <div style={{ position: 'relative', zIndex: 1, color: 'white' }}>
        <PawPrint size={16} />
      </div>
    </div>
  );

  const customIcon = L.divIcon({
    html: iconHTML,
    className: 'custom-pet-pin',
    iconSize: [35, 35],
    iconAnchor: [17, 35], // El punto del pin
  });

  return (
    <Marker position={[report.latitude, report.longitude]} icon={customIcon}>
      <Popup>
        <div className="text-center p-1">
          <img 
            src={report.photos[0]} 
            className="w-20 h-20 object-cover rounded-md mx-auto mb-2" 
            alt={report.name} 
          />
          <strong className="block text-stone-900">{report.name}</strong>
          <span className="text-xs text-stone-500 capitalize block mb-3">
            {report.pet_type === 'dog' ? 'Perro' : 'Gato'} • {report.type === 'lost' ? 'Extraviado' : 'Visto'}
          </span>
          
          <Link 
            to={`/report/${report.id}`}
            className="inline-flex items-center justify-center w-full px-3 py-1.5 text-xs font-medium text-white bg-stone-900 rounded-md hover:bg-stone-800 transition-colors"
          >
            Ver más
            <ArrowRight size={12} className="ml-1" />
          </Link>
        </div>
      </Popup>
    </Marker>
  );
};

export default CustomMarker;
