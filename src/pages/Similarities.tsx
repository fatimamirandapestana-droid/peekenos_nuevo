import { useEffect, useState } from 'react';
import { Search, Image as ImageIcon, MessageSquare, MapPin, Loader2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Report {
  id: string;
  name: string;
  photos: string[];
  type: string; // 'lost' | 'sighted' | 'recovered'
  pet_type: string;
  breed: string;
  description: string;
}

interface SimilarityResult {
  id: string;
  name: string;
  photos: string[];
  breed: string;
  score: number;
}

export default function Similarities() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<{
    visual: SimilarityResult[],
    textual: SimilarityResult[],
    contextual: SimilarityResult[]
  } | null>(null);

  // Cargar todas las mascotas disponibles al inicio
  useEffect(() => {
    fetch('https://peekenos-api.onrender.com/api/reports')
      .then(res => res.json())
      .then(data => setReports(data))
      .catch(err => console.error("Error al cargar reportes:", err));
  }, []);

  const handleAnalyze = async () => {
    if (!selectedId) return;
    
    setIsAnalyzing(true);
    setResults(null); // Limpiar resultados previos

    try {
      const res = await fetch(`https://peekenos-api.onrender.com/api/reports/similar/${selectedId}`);
      if (!res.ok) throw new Error('Error en el servidor');
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error("Error al analizar similitudes:", error);
      alert("Hubo un error al procesar la información. Intenta de nuevo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Encontrar la mascota seleccionada para mostrar contexto en la UI
  const selectedPet = reports.find(r => r.id === selectedId);

  return (
    <div className="space-y-8 p-6 bg-stone-50 min-h-screen">
      {/* Header y Selector */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
        <h1 className="text-3xl font-black text-stone-900 mb-2">Análisis de Similitudes</h1>
        <p className="text-stone-600 mb-8 font-medium">
          Selecciona una mascota de la base de datos para iniciar el motor de búsqueda cruzada.
        </p>
        
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">
              Mascota de Referencia
            </label>
            <select 
              className="w-full p-4 rounded-2xl border-stone-200 border bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none font-bold text-stone-800 transition-all cursor-pointer"
              onChange={(e) => setSelectedId(e.target.value)}
              value={selectedId}
            >
              <option value="">-- Selecciona una mascota --</option>
              {reports.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name || 'Sin nombre'} ({r.type === 'lost' ? 'Extraviado' : r.type === 'recovered' ? 'Encontrado' : 'Avistado'}) - {r.breed}
                </option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={handleAnalyze}
            disabled={!selectedId || isAnalyzing}
            className="w-full md:w-auto bg-orange-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-orange-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-orange-100 disabled:opacity-50 active:scale-95"
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {isAnalyzing ? 'PROCESANDO...' : 'EJECUTAR ANÁLISIS'}
          </button>
        </div>

        {/* Indicador de Lógica Cross-Matching */}
        {selectedPet && (
          <div className="mt-6 flex items-center gap-2 p-3 bg-blue-50 rounded-xl text-blue-700 text-xs font-bold border border-blue-100">
            <Info className="w-4 h-4" />
            EL SISTEMA ESTÁ BUSCANDO COINCIDENCIAS EN LOS REPORTES DE TIPO: 
            <span className="underline uppercase ml-1">
              {selectedPet.type === 'lost' ? 'Avistamientos (Sighted)' : 'Extraviados (Lost)'}
            </span>
          </div>
        )}
      </div>

      {/* Resultados en Columnas */}
      {results ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <SimilarityColumn 
            title="Por Imagen" 
            description="Similitud visual mediante extracción de características."
            icon={<ImageIcon className="text-blue-500" />} 
            data={results.visual} 
          />
          <SimilarityColumn 
            title="Por Descripción" 
            description="Análisis NLP de rasgos y comportamiento narrado."
            icon={<MessageSquare className="text-emerald-500" />} 
            data={results.textual} 
          />
          <SimilarityColumn 
            title="Ubicación y Raza" 
            description="Proximidad geoespacial y coincidencia de tipo."
            icon={<MapPin className="text-red-500" />} 
            data={results.contextual} 
          />
        </div>
      ) : (
        !isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <Search className="w-16 h-16 mb-4 text-stone-300" />
            <p className="font-bold text-stone-400 italic">No hay análisis activo</p>
          </div>
        )
      )}
    </div>
  );
}

interface ColumnProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  data: SimilarityResult[];
}

function SimilarityColumn({ title, description, icon, data }: ColumnProps) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-md border border-stone-100 flex flex-col h-fit">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-stone-50 rounded-xl">{icon}</div>
        <h2 className="font-black text-xl text-stone-800">{title}</h2>
      </div>
      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-6 px-1">
        {description}
      </p>

      <div className="space-y-4">
        {data.length > 0 ? (
          data.map((item) => (
            <Link 
              to={`/report/${item.id}`} 
              key={item.id} 
              className="flex gap-4 p-3 hover:bg-orange-50 rounded-2xl transition-all group border border-transparent hover:border-orange-100"
            >
              <div className="relative flex-shrink-0">
                <img 
                  src={item.photos[0] || "https://placehold.co/100x100/png?text=Sin+Foto"} 
                  className="w-16 h-16 rounded-xl object-cover shadow-sm border border-stone-100" 
                  alt="" 
                />
                <div className="absolute -top-2 -right-2 bg-white text-[10px] font-black px-1.5 py-0.5 rounded-lg border border-orange-100 text-orange-600 shadow-sm">
                  {(item.score * 100).toFixed(0)}%
                </div>
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p className="font-black text-sm text-stone-900 truncate group-hover:text-orange-700">
                  {item.name || 'Desconocido'}
                </p>
                <p className="text-[10px] text-stone-400 font-bold uppercase truncate">
                  {item.breed}
                </p>
                <div className="mt-2 w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-orange-400 to-orange-600 h-full transition-all duration-1000 ease-out" 
                    style={{ width: `${item.score * 100}%` }}
                  ></div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
            <p className="text-stone-400 text-xs italic font-medium">
              No se encontraron coincidencias directas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}