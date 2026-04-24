import { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { MapPin, Search, BadgeCheck, Activity, Dog, Cat, Calendar, Filter, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface Report {
  id: string;
  type: 'Extraviado' | 'Visto' | 'Encontrado' | 'lost' | 'sighted' | 'recovered';
  name: string;
  pet_type: 'dog' | 'cat' | 'Perro' | 'Gato';
  breed?: string;
  age?: string;
  lifestyle?: string;
  size?: string;
  mood?: string;
  photos: string[];
  address: string;
  latitude: number;
  longitude: number;
  created_at: string;
  description: string;
  contact_info?: string;
  fecha_suceso?: string;
}

const CITY_COORDS: Record<string, [number, number]> = {
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
// --- COMPONENTE INTERNO PARA EL HEATMAP ---
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const heat = (L as any).heatLayer(points, { 
      radius: 20, blur: 15, maxZoom: 13,
      gradient: { 0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
    });
    heat.addTo(map);
    return () => { map.removeLayer(heat); };
  }, [points, map]);
  return null;
}

// --- ACTUALIZADOR DE VISTA DE MAPA ---
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, 12); }, [center, map]);
  return null;
}

export default function Dashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DE FILTRO INTEGRADOS ---
  const [selectedCity, setSelectedCity] = useState('Yucatán');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<'all' | 'dog' | 'cat'>('all');

  useEffect(() => {
    fetch('https://peekenos-api.onrender.com/api/reports')
      .then(res => res.json())
      .then(data => {
        setReports(data);
        setLoading(false);
      })
      .catch(err => console.error("Error:", err));
  }, []);

  // --- LÓGICA DE FILTRADO (Memoizada para performance) ---
  const filteredData = useMemo(() => {
    return reports.filter(r => {
      const dateMatch = (!startDate || new Date(r.created_at) >= new Date(startDate)) &&
                        (!endDate || new Date(r.created_at) <= new Date(endDate + 'T23:59:59'));
      const cityMatch = r.address.toLowerCase().includes(selectedCity.toLowerCase());
      const speciesMatch = speciesFilter === 'all' || r.pet_type === speciesFilter;
      return dateMatch && cityMatch && speciesMatch;
    });
  }, [reports, selectedCity, startDate, endDate, speciesFilter]);

  if (loading) return <div className="p-20 text-center font-bold text-stone-400">Procesando datos...</div>;

  // --- PROCESAMIENTO DE GRÁFICAS ---
  const lostPoints: [number, number, number][] = filteredData
    .filter(r => r.type === 'lost' && r.latitude)
    .map(r => [r.latitude, r.longitude, 1]);

  const stats = {
    lost: filteredData.filter(r => r.type === 'lost').length,
    sighted: filteredData.filter(r => r.type === 'sighted').length,
    recovered: filteredData.filter(r => r.type === 'recovered').length,
    rate: filteredData.length > 0 ? Math.round((filteredData.filter(r => r.type === 'recovered').length / filteredData.length) * 100) : 0
  };

  const speciesData = [
    { name: 'Perros', value: filteredData.filter(r => r.pet_type === 'dog').length, color: '#f97316' },
    { name: 'Gatos', value: filteredData.filter(r => r.pet_type === 'cat').length, color: '#8b5cf6' },
  ];

  const sizeData = ['Pequeño', 'Mediano', 'Grande', 'XL'].map(s => ({
    name: s, 
    cantidad: filteredData.filter(r => r.size === s).length
  }));

  return (
    <div className="p-6 space-y-6 bg-stone-50 min-h-screen">
      
      {/* --- PANEL DE CONTROL (FILTROS) --- */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-1">
          <label className="block text-[10px] font-black text-stone-400 uppercase mb-2 tracking-widest">Ciudad / Estado</label>
          <select 
            value={selectedCity} 
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full p-3 rounded-xl border border-stone-100 bg-stone-50 font-bold text-stone-800 outline-none focus:ring-2 focus:ring-orange-500"
          >
            {Object.keys(CITY_COORDS).map(city => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>

        <div className="md:col-span-1">
          <label className="block text-[10px] font-black text-stone-400 uppercase mb-2 tracking-widest">Desde - Hasta</label>
          <div className="flex gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-1/2 p-3 rounded-xl border border-stone-100 bg-stone-50 text-xs font-bold" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-1/2 p-3 rounded-xl border border-stone-100 bg-stone-50 text-xs font-bold" />
          </div>
        </div>

        <div className="md:col-span-1">
          <label className="block text-[10px] font-black text-stone-400 uppercase mb-2 tracking-widest">Especie</label>
          <div className="flex bg-stone-50 p-1 rounded-xl border border-stone-100">
            {['all', 'dog', 'cat'].map(s => (
              <button 
                key={s}
                onClick={() => setSpeciesFilter(s as any)}
                className={clsx(
                  "flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                  speciesFilter === s ? "bg-white text-orange-600 shadow-sm" : "text-stone-400"
                )}
              >
                {s === 'all' ? 'Todos' : s === 'dog' ? 'Perros' : 'Gatos'}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => {setStartDate(''); setEndDate(''); setSelectedCity('Yucatán'); setSpeciesFilter('all');}}
          className="p-3 text-stone-400 hover:text-orange-600 text-xs font-bold uppercase transition-colors"
        >
          Limpiar Filtros
        </button>
      </div>

      {/* --- KPIs --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Search className="text-red-500" />} title="Extraviados" value={stats.lost} color="red" />
        <StatCard icon={<MapPin className="text-blue-500" />} title="Avistamientos" value={stats.sighted} color="blue" />
        <StatCard icon={<BadgeCheck className="text-emerald-500" />} title="Finales Felices" value={stats.recovered} color="emerald" />
        <StatCard icon={<Activity className="text-orange-500" />} title="Resolución" value={`${stats.rate}%`} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MAPA DE CALOR */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 lg:col-span-2">
          <h2 className="text-xl font-black text-stone-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-500" /> Hotspots de Extravío
          </h2>
          <div className="h-[400px] rounded-2xl overflow-hidden relative z-0 border border-stone-100">
            <MapContainer center={CITY_COORDS[selectedCity]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png" />
              <MapController center={CITY_COORDS[selectedCity]} />
              <HeatmapLayer points={lostPoints} />
            </MapContainer>
          </div>
        </div>

        {/* DISTRIBUCIÓN POR ESPECIE */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
          <h2 className="text-xl font-black text-stone-800 mb-6 text-center">Especies</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={speciesData} innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value">
                  {speciesData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TAMAÑOS (BAR CHART) */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
          <h2 className="text-xl font-black text-stone-800 mb-6">Mascotas por Tamaño</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sizeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#fcfcfc'}} />
                <Bar dataKey="cantidad" fill="#f97316" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTE STAT CARD ---
function StatCard({ icon, title, value, color }: { icon: any, title: string, value: string | number, color: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
      <div className="flex justify-between items-start mb-4">
        <div className={clsx("p-3 rounded-2xl", `bg-${color}-50 text-${color}-500`)}>{icon}</div>
      </div>
      <h3 className="text-4xl font-black text-stone-900 mb-1">{value}</h3>
      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{title}</p>
    </div>
  );
}