import { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { MapContainer, TileLayer, useMap, Marker, Polyline } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet.heat';
import { 
  MapPin, Search, BadgeCheck, Activity, Clock, 
  Play, Pause, X, Layers
} from 'lucide-react';
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

// --- HEATMAP ---
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

// --- CLUSTER ICON ---
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let color = 'bg-emerald-500';
  if (count > 5) color = 'bg-orange-500';
  if (count > 15) color = 'bg-red-500';

  return L.divIcon({
    html: `<div class="flex items-center justify-center w-8 h-8 rounded-full text-white font-bold ${color} border-2 border-white shadow-lg">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: L.point(32, 32)
  });
};

export default function Dashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros Básicos
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<'all' | 'dog' | 'cat'>('all');

  // Estados del Mapa y Animación
  const [activeLayer, setActiveLayer] = useState<'clusters' | 'heat' | 'flows'>('clusters');
  const [playbackDate, setPlaybackDate] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetch('https://peekenos-api.onrender.com/api/reports')
      .then(res => res.json())
      .then(data => {
        setReports(data);
        setLoading(false);
      })
      .catch(err => console.error("Error cargando datos:", err));
  }, []);

  // --- LÓGICA DE PROCESAMIENTO (Memoizada) ---
  const { 
    filteredData, mapDisplayData, stats, weeklyData, moodData, 
    speciesData, sizeData, avgDaysToFind, timeRange 
  } = useMemo(() => {

    // 1. Filtrar por Fecha y Especie (Aplica a TODO el dashboard)
    const filtered = reports.filter(r => {
      const dateMatch = (!startDate || new Date(r.created_at) >= new Date(startDate)) &&
                        (!endDate || new Date(r.created_at) <= new Date(endDate + 'T23:59:59'));
      const speciesMatch = speciesFilter === 'all' || r.pet_type === speciesFilter;
      return dateMatch && speciesMatch;
    });

    // 2. Rango Temporal para el Slider
    const timestamps = filtered.map(r => new Date(r.created_at).getTime());
    const minTime = timestamps.length ? Math.min(...timestamps) : Date.now();
    const maxTime = timestamps.length ? Math.max(...timestamps) : Date.now();

    // 3. Filtrado Específico para el Mapa (Depende del Slider)
    const mapDisplay = playbackDate
      ? filtered.filter(r => new Date(r.created_at).getTime() <= playbackDate)
      : filtered;

    // 4. KPIs Básicos
    const statsObj = {
      lost: filtered.filter(r => r.type === 'lost' || r.type === 'Extraviado').length,
      sighted: filtered.filter(r => r.type === 'sighted' || r.type === 'Visto').length,
      recovered: filtered.filter(r => r.type === 'recovered' || r.type === 'Encontrado').length,
      rate: filtered.length ? Math.round((filtered.filter(r => r.type === 'recovered' || r.type === 'Encontrado').length / filtered.length) * 100) : 0
    };

    // 5. Procesamiento de Mood
    const moodMap: Record<string, number> = {};
    filtered.forEach(r => {
      let m = r.mood?.trim() || 'No especificado';
      m = m.charAt(0).toUpperCase() + m.slice(1);
      moodMap[m] = (moodMap[m] || 0) + 1;
    });

    // 6. Días de la semana
    const daysArr = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

    // 7. Promedio de días para encontrar
    const recoveredWithDate = filtered.filter(r => (r.type === 'recovered' || r.type === 'Encontrado') && r.fecha_suceso);
    const avgDays = recoveredWithDate.length > 0 
      ? Math.round(recoveredWithDate.reduce((acc, r) => {
          const diff = new Date(r.created_at).getTime() - new Date(r.fecha_suceso!).getTime();
          return acc + (diff / (1000 * 60 * 60 * 24));
        }, 0) / recoveredWithDate.length)
      : 0;

    return {
      filteredData: filtered,
      mapDisplayData: mapDisplay,
      timeRange: { min: minTime, max: maxTime },
      stats: statsObj,
      weeklyData: daysArr.map((d,i) => ({ name: d, cantidad: filtered.filter(r => new Date(r.created_at).getDay() === i).length })),
      moodData: Object.keys(moodMap).map(name => ({ name, value: moodMap[name] })),
      speciesData: [
        { name:'Perros', value: filtered.filter(r => r.pet_type === 'dog' || r.pet_type === 'Perro').length, color:'#f97316' },
        { name:'Gatos', value: filtered.filter(r => r.pet_type === 'cat' || r.pet_type === 'Gato').length, color:'#8b5cf6' }
      ],
      sizeData: ['Pequeño','Mediano','Grande','XL'].map(s => ({ name: s, cantidad: filtered.filter(r => r.size === s).length })),
      avgDaysToFind: avgDays
    };
  }, [reports, startDate, endDate, speciesFilter, playbackDate]);

  // --- ANIMACIÓN DEL TIME SLIDER ---
  useEffect(() => {
    let interval: any;
    if (isPlaying && playbackDate! < timeRange.max) {
      interval = setInterval(() => {
        setPlaybackDate(prev => {
          const next = (prev || timeRange.min) + 86400000; // Avanza 1 día (en ms)
          return next >= timeRange.max ? (setIsPlaying(false), timeRange.max) : next;
        });
      }, 300); // Velocidad
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackDate, timeRange]);

  if (loading) return <div className="p-20 text-center font-bold text-stone-400">Cargando análisis geoespacial...</div>;

  return (
    <div className="p-6 space-y-6 bg-stone-50 min-h-screen">

      {/* --- PANEL DE CONTROL (FILTROS) --- */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 flex flex-wrap gap-6 items-end">
        <div className="flex-1 min-w-[250px]">
          <label className="block text-[10px] font-black text-stone-400 uppercase mb-2 tracking-widest">Rango de Fechas</label>
          <div className="flex gap-2">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 rounded-xl border border-stone-100 bg-stone-50 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 rounded-xl border border-stone-100 bg-stone-50 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        <div className="w-full md:w-64">
          <label className="block text-[10px] font-black text-stone-400 uppercase mb-2 tracking-widest">Especie</label>
          <div className="flex bg-stone-50 p-1 rounded-xl border border-stone-100">
            {['all', 'dog', 'cat'].map(s => (
              <button 
                key={s} 
                onClick={() => setSpeciesFilter(s as any)} 
                className={clsx(
                  "flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all", 
                  speciesFilter === s ? "bg-white text-orange-600 shadow-sm" : "text-stone-400 hover:text-stone-600"
                )}
              >
                {s === 'all' ? 'Todos' : s === 'dog' ? 'Perros' : 'Gatos'}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => { setStartDate(''); setEndDate(''); setSpeciesFilter('all'); setPlaybackDate(null); setIsPlaying(false); }} 
          className="p-3 text-stone-400 hover:text-orange-600 text-xs font-bold uppercase transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" /> Limpiar
        </button>
      </div>

      {/* --- KPIs --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={<Search className="text-red-500" />} title="Extraviados" value={stats.lost} color="red" />
        <StatCard icon={<MapPin className="text-blue-500" />} title="Avistamientos" value={stats.sighted} color="blue" />
        <StatCard icon={<BadgeCheck className="text-emerald-500" />} title="Finales Felices" value={stats.recovered} color="emerald" />
        <StatCard icon={<Activity className="text-orange-500" />} title="Resolución" value={`${stats.rate}%`} color="orange" />
        <StatCard icon={<Clock className="text-purple-500" />} title="Días prom." value={avgDaysToFind} color="purple" />
      </div>

      {/* --- SECCIÓN PRINCIPAL: MAPA Y ESPECIES --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MAPA AVANZADO */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 lg:col-span-2">
          
          {/* Header del Mapa y Controles de Capa */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div>
              <h2 className="text-xl font-black text-stone-800 flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-500" /> Analítica Territorial
              </h2>
              <p className="text-xs text-stone-500 font-bold mt-1">
                Mostrando {mapDisplayData.length} registros en mapa
              </p>
            </div>
            
            <div className="flex bg-stone-50 p-1 rounded-xl border border-stone-100">
              <button onClick={() => setActiveLayer('clusters')} className={clsx("px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all", activeLayer === 'clusters' ? "bg-white text-orange-600 shadow-sm" : "text-stone-400 hover:text-stone-600")}>Clusters</button>
              <button onClick={() => setActiveLayer('heat')} className={clsx("px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all", activeLayer === 'heat' ? "bg-white text-orange-600 shadow-sm" : "text-stone-400 hover:text-stone-600")}>Heatmap</button>
              <button onClick={() => setActiveLayer('flows')} className={clsx("px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all", activeLayer === 'flows' ? "bg-white text-orange-600 shadow-sm" : "text-stone-400 hover:text-stone-600")}>Flujos</button>
            </div>
          </div>

          <div className="h-[450px] rounded-2xl overflow-hidden relative z-0 border border-stone-100 shadow-inner">
            <MapContainer center={[20.9676, -89.6210]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png" />

              {/* CAPA 1: CLUSTERS */}
              {activeLayer === 'clusters' && (
                <MarkerClusterGroup iconCreateFunction={createClusterCustomIcon}>
                  {mapDisplayData.map(r => (
                    <Marker key={r.id} position={[r.latitude, r.longitude]} icon={L.divIcon({ html: `<div class="w-3 h-3 rounded-full border-2 border-white shadow-md ${r.type === 'lost' || r.type === 'Extraviado' ? 'bg-red-500' : 'bg-blue-500'}"></div>`, className: '' })} />
                  ))}
                </MarkerClusterGroup>
              )}

              {/* CAPA 2: HEATMAP */}
              {activeLayer === 'heat' && (
                <HeatmapLayer points={mapDisplayData.map(r => [r.latitude, r.longitude, 1])} />
              )}

              {/* CAPA 3: FLUJOS */}
              {activeLayer === 'flows' && (
                mapDisplayData
                  .filter(r => r.type === 'recovered' || r.type === 'Encontrado')
                  .map(r => (
                    // Aquí asumimos que r.latitude/longitude es donde se encontró, y le sumamos un offset simulado para el origen. 
                    // (En producción, usa r.lat_inicio si lo tienes).
                    <Polyline 
                      key={r.id}
                      positions={[[r.latitude + 0.02, r.longitude - 0.02], [r.latitude, r.longitude]]}
                      pathOptions={{ color: '#8b5cf6', weight: 3, dashArray: '5, 10', opacity: 0.6 }}
                    />
                  ))
              )}
            </MapContainer>

            {/* CONTROLES FLOTANTES DEL TIME SLIDER */}
            <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-stone-200 shadow-xl flex items-center gap-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors shadow-sm"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">
                  <span>{new Date(timeRange.min).toLocaleDateString()}</span>
                  <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                    {new Date(playbackDate || timeRange.max).toLocaleDateString()}
                  </span>
                  <span>{new Date(timeRange.max).toLocaleDateString()}</span>
                </div>
                <input
                  type="range"
                  min={timeRange.min}
                  max={timeRange.max}
                  step={86400000} // Pasos de 1 día
                  value={playbackDate || timeRange.max}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setPlaybackDate(parseInt(e.target.value));
                  }}
                  className="w-full accent-orange-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* DONA DE ESPECIES */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
          <h2 className="text-xl font-black text-stone-800 mb-6 text-center uppercase tracking-tight">Distribución Animal</h2>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={speciesData} innerRadius={80} outerRadius={120} paddingAngle={8} dataKey="value">
                  {speciesData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- SEGUNDA FILA DE GRÁFICAS (TAMAÑOS, DÍAS, MOOD) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
          <h2 className="text-lg font-black text-stone-800 mb-6 uppercase tracking-tight">Mascotas por Tamaño</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sizeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold'}} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#fcfcfc'}} />
                <Bar dataKey="cantidad" fill="#f97316" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
          <h2 className="text-lg font-black text-stone-800 mb-6 uppercase tracking-tight">Incidentes por Día</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold'}} />
                <Tooltip cursor={{fill: '#f5f5f4'}} />
                <Bar dataKey="cantidad" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
          <h2 className="text-lg font-black text-stone-800 mb-6 uppercase tracking-tight text-center">Mood Poblacional</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={moodData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {moodData.map((_, i) => <Cell key={i} fill={['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'][i % 5]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTE REUTILIZABLE PARA KPIS ---
function StatCard({ icon, title, value, color }: { icon: any, title: string, value: string | number, color: string }) {
  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-200">
      <div className="flex justify-between items-start mb-3">
        <div className={clsx("p-2.5 rounded-2xl", `bg-${color}-50 text-${color}-600`)}>{icon}</div>
      </div>
      <h3 className="text-3xl font-black text-stone-900 leading-none mb-1">{value}</h3>
      <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{title}</p>
    </div>
  );
}