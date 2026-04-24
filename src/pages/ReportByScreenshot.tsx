import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Sparkles, ArrowRight, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function ReportByScreenshot() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('screenshot', file);

      const res = await fetch('/api/ai/analyze-screenshot', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Error al analizar');
      
      const aiData = await res.json();

      // Redirigimos al formulario de reporte pasando los datos de la IA
      // Enviamos el tipo detectado (lost o sighted) y los datos para el form
      navigate(`/report/${aiData.type}`, { state: { aiData } });

    } catch (error) {
      alert("No se pudo procesar la imagen. Intenta llenando el formulario manualmente.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="text-center mb-10">
        <div className="bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="text-orange-600 w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-stone-900">Reporte Inteligente</h1>
        <p className="text-stone-500 mt-2">
          Sube una captura de pantalla de un post de Facebook o una foto y nuestra IA llenará los datos por ti.
        </p>
      </div>

      <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-10 flex flex-col items-center justify-center transition-all hover:border-orange-300">
        {preview ? (
          <div className="w-full space-y-6">
            <img src={preview} alt="Preview" className="max-h-80 mx-auto rounded-2xl shadow-lg border-4 border-white" />
            <div className="flex gap-3">
              <button 
                onClick={() => { setFile(null); setPreview(null); }}
                className="flex-1 py-3 px-6 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors"
              >
                Cambiar foto
              </button>
              <button 
                onClick={handleAnalyze}
                disabled={loading}
                className="flex-[2] py-3 px-6 bg-orange-600 text-white rounded-xl font-black shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                {loading ? 'ANALIZANDO...' : 'LLENAR FORMULARIO'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-4 mb-6">
              <div className="bg-stone-50 p-4 rounded-full"><ImageIcon className="text-stone-300 w-10 h-10" /></div>
            </div>
            <label className="cursor-pointer bg-orange-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-transform">
              SELECCIONAR CAPTURA
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
            <p className="text-xs text-stone-400 mt-6 uppercase font-bold tracking-widest">Formatos: PNG, JPG o WEBP</p>
          </>
        )}
      </div>
      
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-50">
        <div className="text-center">
          <div className="text-xl font-black text-stone-900">1</div>
          <p className="text-xs font-bold text-stone-500">Subes la captura</p>
        </div>
        <div className="text-center">
          <div className="text-xl font-black text-stone-900">2</div>
          <p className="text-xs font-bold text-stone-500">Gemini extrae los datos</p>
        </div>
        <div className="text-center">
          <div className="text-xl font-black text-stone-900">3</div>
          <p className="text-xs font-bold text-stone-500">Tú solo confirmas</p>
        </div>
      </div>
    </div>
  );
}