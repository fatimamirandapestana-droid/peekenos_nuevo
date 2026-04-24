import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import React from 'react';
import CustomMarker from '../components/CustomMarker';
import { Calendar } from 'lucide-react';

interface Report {
  id: string;
  type: 'lost' | 'sighted' | 'recovered';
  name: string;
  pet_type: string;
  latitude: number;
  longitude: number;
  photos: string[];
  description: string;
  created_at: string;
}

const STATES: Record<string, [number, number]> = {
  'Aguascalientes': [21.8853, -102.2916],
  'Baja California': [30.8406, -115.2838],
  'Baja California Sur': [26.0444, -111.6661],
  'Campeche': [19.8301, -90.5349],
  'Chiapas': [16.7569, -93.1292],
  'Chihuahua': [28.6353, -106.0889],
  'Ciudad de México': [19.4326, -99.1332],
  'Coahuila': [27.0587, -101.7068],
  'Colima': [19.2452, -103.7241],
  'Durango': [24.0277, -104.6532],
  'Guanajuato': [21.0190, -101.2574],
  'Guerrero': [17.4392, -99.5451],
  'Hidalgo': [20.0911, -98.7624],
  'Jalisco': [20.6597, -103.3496],
  'México': [19.4969, -99.7233],
  'Michoacán': [19.5665, -101.7068],
  'Morelos': [18.6813, -99.1013],
  'Nayarit': [21.7514, -104.8455],
  'Nuevo León': [25.5922, -99.9962],
  'Oaxaca': [17.0732, -96.7266],
  'Puebla': [19.0414, -98.2063],
  'Querétaro': [20.5888, -100.3899],
  'Quintana Roo': [19.1817, -88.4791],
  'San Luis Potosí': [22.1565, -100.9855],
  'Sinaloa': [25.1721, -107.4795],
  'Sonora': [29.2972, -110.3309],
  'Tabasco': [17.8409, -92.6189],
  'Tamaulipas': [24.2669, -98.8363],
  'Tlaxcala': [19.3182, -98.2375],
  'Veracruz': [19.1738, -96.1342],
  'Yucatán': [20.7099, -89.0943],
  'Zacatecas': [22.7709, -102.5832]
};

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 10);
  }, [center, map]);
  return null;
}

export default function Home() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<[number, number]>([20.9676, -89.5926]);
  const [selectedState, setSelectedState] = useState('Yucatán');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (error) => {
          console.log('Location access denied or error, using default:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }

    fetch('/api/reports')
      .then(res => res.json())
      .then(data => {
        setReports(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredReports = reports.filter(report => {
    if (!report.created_at) return true;

    const reportDate = new Date(report.created_at).getTime();
    const start = startDate ? new Date(startDate).getTime() : -Infinity;
    const end = endDate ? new Date(endDate).getTime() : Infinity;

    return reportDate >= start && reportDate <= (end + 86400000);
  });

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const state = e.target.value;
    setSelectedState(state);
    if (STATES[state]) {
      setPosition(STATES[state]);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96">Cargando mapa...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col gap-4">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2">Mapa de Mascotas</h1>
            
            {/* 🔥 NUEVO: leyenda visual integrada */}
            <p className="text-stone-600 text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
              Extraviados
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500 ml-4 mr-2"></span>
              Vistos
            </p>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-full md:w-48">
              <label className="block text-xs font-medium text-stone-500 mb-1">Estado</label>
              <select value={selectedState} onChange={handleStateChange} className="block w-full rounded-md border-stone-300 shadow-sm sm:text-sm p-2 border">
                {Object.keys(STATES).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Desde</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="block w-full rounded-md border-stone-300 shadow-sm sm:text-sm p-2 border" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Hasta</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="block w-full rounded-md border-stone-300 shadow-sm sm:text-sm p-2 border" />
              </div>
            </div>

            <button 
              onClick={() => {setStartDate(''); setEndDate('');}}
              className="text-xs text-orange-600 hover:text-orange-800 font-medium pb-2"
            >
              Limpiar fechas
            </button>
          </div>
        </div>
      </div>

      <div className="h-[600px] rounded-xl overflow-hidden shadow-md border border-stone-200 relative z-0">
        <MapContainer center={position} zoom={10} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; Stadia Maps &copy; OpenMapTiles &copy; OpenStreetMap contributors'
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
          />
          <MapController center={position} />

          {/* 🔥 MEJORA: validación de coordenadas */}
          {filteredReports.map((report) => {
            if (
              typeof report.latitude !== 'number' ||
              typeof report.longitude !== 'number' ||
              isNaN(report.latitude) ||
              isNaN(report.longitude)
            ) {
              return null;
            }

            return <CustomMarker key={report.id} report={report as any} />;
          })}
        </MapContainer>
      </div>
    </div>
  );
}