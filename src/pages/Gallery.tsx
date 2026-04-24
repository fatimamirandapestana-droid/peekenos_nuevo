import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Calendar, X, MapPin } from 'lucide-react'; // Añadí MapPin para el icono
import clsx from 'clsx';

interface Report {
  id: string;
  type: 'lost' | 'sighted' | 'recovered';
  name: string;
  pet_type: string;
  photos: string[];
  description: string;
  created_at: string;
  size: string;
  mood: string;
  city: string; // <-- 1. Campo de ciudad añadido
}

export default function Gallery() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedCity, setSelectedCity] = useState(''); // <-- 2. Estado para la ciudad
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filter, setFilter] = useState<'all' | 'lost' | 'sighted'>('all');
  const [loading, setLoading] = useState(true);

  // Extraer ciudades únicas de los reportes para el selector
  const cities = Array.from(new Set(reports.map(r => r.city))).filter(Boolean).sort();

  useEffect(() => {
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

  // Lógica de filtrado combinada
  const filteredReports = reports.filter(r => {
    // 1. Filtro por tipo
    const typeMatch = filter === 'all' || r.type === filter;

    // 2. Filtro por ciudad (NUEVO)
    const cityMatch = !selectedCity || r.city === selectedCity;

    // 3. Filtro por fecha
    let dateMatch = true;
    if (r.created_at) {
      const reportTime = new Date(r.created_at).getTime();
      const start = startDate ? new Date(startDate).getTime() : -Infinity;
      const end = endDate ? new Date(endDate).getTime() + 86400000 : Infinity;
      dateMatch = reportTime >= start && reportTime <= end;
    }

    return typeMatch && cityMatch && dateMatch;
  });

  const clearAllFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCity('');
    setFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* Panel de Filtros */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-stone-200">
        <h1 className="text-2xl font-bold text-stone-900">Galería de Mascotas</h1>
        
        <div className="flex flex-wrap items-center justify-center gap-4">
          
          {/* Filtro por Ciudad (NUEVO) */}
          <div className="flex items-center gap-2 bg-stone-50 p-2 rounded-lg border border-stone-200">
            <MapPin className="w-4 h-4 text-stone-400 ml-1" />
            <select 
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent text-xs border-none focus:ring-0 text-stone-600 outline-none cursor-pointer"
            >
              <option value="">Todas las ciudades</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Fecha */}
          <div className="flex items-center gap-2 bg-stone-50 p-2 rounded-lg border border-stone-200">
            <Calendar className="w-4 h-4 text-stone-400 ml-1" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs border-none focus:ring-0 text-stone-600 outline-none"
            />
            <span className="text-stone-300">—</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs border-none focus:ring-0 text-stone-600 outline-none"
            />
          </div>

          {/* Botón de limpiar si hay filtros activos */}
          {(startDate || endDate || selectedCity || filter !== 'all') && (
            <button 
              onClick={clearAllFilters} 
              className="text-xs flex items-center gap-1 text-stone-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}

          {/* Filtro por Tipo */}
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-stone-400" />
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setFilter('all')}
                className={clsx(
                  "px-4 py-2 text-sm font-medium rounded-l-md border",
                  filter === 'all' 
                    ? "bg-orange-50 text-orange-700 border-orange-500 z-10" 
                    : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                )}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('lost')}
                className={clsx(
                  "px-4 py-2 text-sm font-medium border-t border-b border-r",
                  filter === 'lost' 
                    ? "bg-red-50 text-red-700 border-red-500 z-10" 
                    : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                )}
              >
                Extraviados
              </button>
              <button
                onClick={() => setFilter('sighted')}
                className={clsx(
                  "px-4 py-2 text-sm font-medium rounded-r-md border-t border-b border-r",
                  filter === 'sighted' 
                    ? "bg-blue-50 text-blue-700 border-blue-500 z-10" 
                    : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                )}
              >
                Vistos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Reportes */}
      {loading ? (
        <div className="text-center py-12 text-stone-500">Cargando galería...</div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-stone-300">
          <p className="text-stone-400">No se encontraron mascotas con los filtros aplicados.</p>
          <button 
            onClick={clearAllFilters}
            className="mt-4 text-orange-600 font-semibold hover:underline"
          >
            Resetear filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredReports.map((report) => (
            <Link 
              key={report.id} 
              to={`/report/${report.id}`}
              className="group bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-stone-100 relative overflow-hidden">
                {report.photos && report.photos.length > 0 ? (
                  <img 
                    src={report.photos[0]} 
                    alt={report.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm italic">
                    Sin fotografía
                  </div>
                )}
                <div className={clsx(
                  "absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-sm",
                  report.type === 'lost' ? "bg-red-500" : report.type === 'sighted' ? "bg-blue-500" : "bg-green-500"
                )}>
                  {report.type === 'lost' ? 'Extraviado' : report.type === 'sighted' ? 'Visto' : 'Encontrado'}
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-stone-900 truncate">{report.name}</h3>
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <MapPin className="w-2 h-2" /> {report.city}
                  </span>
                </div>
                <div className="flex items-center text-sm text-stone-500 mt-1 capitalize">
                  <span>{report.pet_type === 'dog' ? 'Perro 🐶' : 'Gato 🐱'}</span>
                  <span className="mx-2 text-stone-300">•</span>
                  <span>{report.size}</span>
                </div>
                <p className="text-sm text-stone-600 mt-2 line-clamp-2 h-10">
                  {report.description || 'Sin descripción disponible.'}
                </p>
                <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between items-center text-[10px] text-stone-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(report.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className="capitalize font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                    {report.mood}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}