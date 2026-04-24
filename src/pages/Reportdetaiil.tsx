import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import {
  ArrowLeft, MapPin, Clock, Calendar, User, Phone, Info,
  BadgeAlert, BadgeCheck, Dog, Cat, Activity, Heart,
  Maximize2, Trash2, X, Check
} from 'lucide-react';
import clsx from 'clsx';
import L from 'leaflet';

// @ts-ignore
L.Marker.prototype.options.icon = L.Icon.Default.prototype.options?.icon || new L.Icon.Default();

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

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 16);
  }, [center, map]);
  return null;
}

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  
  // Estados para Eliminación
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Estados para "Encontrado"
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverConfirmText, setRecoverConfirmText] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/reports/${id}`);
        if (!res.ok) throw new Error('Report not found');
        const data = await res.json();
        setReport(data);
      } catch (error) {
        console.error('Error fetching report:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  // Función para marcar como encontrado
  const handleMarkAsFound = async () => {
    if (recoverConfirmText !== "esta mascota fue encontrada") return;

    try {
      const res = await fetch(`/api/reports/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'recovered' })
      });
      
      if (res.ok) {
        setReport(prev => prev ? { ...prev, type: 'Encontrado' } : null);
        setIsRecovering(false);
        setRecoverConfirmText('');
      } else {
        alert("Hubo un error al actualizar el estado.");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Función para eliminar
  const handleDelete = async () => {
    if (confirmText !== "ESTOY SEGURO, ELIMINAR") return;
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (res.ok) {
        navigate('/');
      } else {
        alert("Error al eliminar.");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
        <p className="text-stone-500 font-medium">Cargando detalles del reporte...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-20 px-4">
        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <BadgeAlert className="text-red-500 w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Reporte no encontrado</h2>
        <p className="text-stone-600 mb-6">El reporte que buscas ya no está disponible o el enlace es incorrecto.</p>
        <button onClick={() => navigate('/')} className="inline-flex items-center text-orange-600 font-semibold hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver al inicio
        </button>
      </div>
    );
  }

  // Comprobaciones de estado basadas en las traducciones
  const isLost = report.type === 'Extraviado' || report.type === 'lost';
  const isRecovered = report.type === 'Encontrado' || report.type === 'recovered';
  const eventDate = report.fecha_suceso ? new Date(report.fecha_suceso) : null;

  return (
    <div className="max-w-6xl mx-auto pb-12 relative">
      {/* Header / Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center text-stone-600 hover:text-stone-900 transition-colors group">
          <div className="bg-white p-2 rounded-full shadow-sm border border-stone-200 mr-3 group-hover:bg-stone-50">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="font-medium">Volver</span>
        </button>
        
        <div className="flex items-center gap-3">
          
          {/* BOTÓN ENCONTRADO */}
          {!isRecovered && (
            <button 
              onClick={() => setIsRecovering(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 transition-all active:scale-95"
            >
              <Check className="w-4 h-4" /> ¡Lo encontré!
            </button>
          )}

          {/* BOTÓN ELIMINAR */}
          <button onClick={() => setIsDeleting(true)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>

          {/* BADGE DE ESTADO */}
          <div className={clsx(
            "px-4 py-1.5 rounded-full text-sm font-bold flex items-center shadow-sm",
            isLost ? "bg-red-100 text-red-700 border border-red-200" : 
            isRecovered ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
            "bg-blue-100 text-blue-700 border border-blue-200"
          )}>
            {isRecovered ? <BadgeCheck className="w-4 h-4 mr-2" /> : <BadgeAlert className="w-4 h-4 mr-2" />}
            {isLost ? 'EXTRAVIADO' : isRecovered ? 'ENCONTRADO' : 'AVISTADO'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Visuals */}
        <div className="space-y-6">
          <div className="bg-stone-100 rounded-3xl overflow-hidden aspect-[4/3] relative border border-stone-200 shadow-inner group">
            <img
              src={report.photos[activePhoto] || "https://placehold.co/800x600/png?text=Sin+Foto"}
              alt={report.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          {/* Map Preview */}
          <div className="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm h-80 relative group">
            <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-sm border border-stone-100 text-xs font-bold text-stone-700 flex items-center">
              <MapPin className="w-3 h-3 mr-1.5 text-orange-500" />
              Lugar del incidente
            </div>
            <MapContainer center={[report.latitude, report.longitude]} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer attribution='© Stadia Maps' url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png" />
              <MapController center={[report.latitude, report.longitude]} />
              <Marker position={[report.latitude, report.longitude]} />
            </MapContainer>
          </div>
        </div>

        {/* Right Column: Information */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-200 relative overflow-hidden">
            
            {/* Background Accent dinámico (Rojo, Azul o Verde) */}
            <div className={clsx(
              "absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10",
              isLost ? "bg-red-500" : isRecovered ? "bg-emerald-500" : "bg-blue-500"
            )} />

            <div className="relative">
              <h1 className="text-4xl font-black text-stone-900 mb-2 truncate">
                {report.name || 'Desconocido'}
              </h1>
              <div className="flex items-center text-stone-500 text-sm mb-6">
                <Clock className="w-4 h-4 mr-1.5 text-orange-400" />
                Reportado el {new Date(report.created_at).toLocaleDateString()}
              </div>

            {/* Grid of basic info */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  <div className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1">Mascota</div>
                  <div className="flex items-center font-bold text-stone-800">
                    {report.pet_type === 'dog' ? <Dog className="w-4 h-4 mr-2" /> : <Cat className="w-4 h-4 mr-2" />}
                    {report.pet_type === 'dog' ? 'Perro' : 'Gato'}
                  </div>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  <div className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1">Raza/Tipo</div>
                  <div className="flex items-center font-bold text-stone-800">
                    <Activity className="w-4 h-4 mr-2" />
                    {report.breed || 'Mestizo'}
                  </div>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  <div className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1">Edad Est.</div>
                  <div className="flex items-center font-bold text-stone-800">
                    <Calendar className="w-4 h-4 mr-2" />
                    {report.age || 'No especificada'}
                  </div>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  <div className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1">Personalidad</div>
                  <div className="flex items-center font-bold text-stone-800">
                    <Heart className="w-4 h-4 mr-2" />
                    <span className="capitalize">{report.mood || 'Amigable'}</span>
                  </div>
                </div>
              </div>

              {/* Metadata Details */}
              <div className="space-y-6 pb-8 border-b border-stone-100 mb-8">
                <div className="flex space-x-3">
                  <div className="mt-1 bg-orange-100 p-2 rounded-lg h-fit text-orange-600">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 text-lg mb-1">Descripción</h3>
                    <p className="text-stone-600 leading-relaxed">
                      {report.description || 'Sin descripción adicional proporcionada.'}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <div className="mt-1 bg-stone-100 p-2 rounded-lg h-fit text-stone-600">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 text-lg mb-1">Ubicación detectada</h3>
                    <p className="text-stone-600 leading-relaxed mb-1">
                      {report.address || 'Ubicación aproximada'}
                    </p>
                    <div className="text-[10px] font-mono text-stone-400 uppercase">
                      COORD: {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                    </div>
                  </div>
                </div>

                {eventDate && (
                  <div className="flex space-x-3">
                    <div className="mt-1 bg-stone-100 p-2 rounded-lg h-fit text-stone-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-lg mb-1">Fecha del Suceso</h3>
                      <p className="text-stone-600 leading-relaxed">
                        {eventDate.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Card */}
              <div className="bg-stone-900 rounded-3xl p-6 text-white shadow-xl shadow-stone-200">
                <div className="flex items-center mb-4">
                  <div className="bg-white/20 p-2 rounded-xl mr-3">
                    <User className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg">Información de Contacto</h3>
                </div>
                <div className="space-y-4">
                  {report.contact_info ? (
                    <>
                      <div className="flex items-center bg-white/10 p-4 rounded-2xl group transition-colors hover:bg-white/20 cursor-pointer">
                        <Phone className="w-5 h-5 mr-3 text-orange-400" />
                        <span className="font-medium text-lg">{report.contact_info}</span>
                      </div>
                      <p className="text-stone-400 text-[10px] text-center px-4 leading-tight">
                        Si tienes información, comunícate inmediatamente. La rapidez es clave para ayudar a una mascota.
                      </p>
                    </>
                  ) : (
                    <div className="text-stone-400 text-sm text-center py-2 italic">
                      No se proporcionó información de contacto directa.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL ENCONTRADO --- */}
      {isRecovering && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-stone-200">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600"><Heart className="w-6 h-6" /></div>
              <button onClick={() => { setIsRecovering(false); setRecoverConfirmText(''); }} className="text-stone-400 hover:text-stone-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <h3 className="text-2xl font-bold text-stone-900 mb-2">¡Qué excelente noticia!</h3>
            <p className="text-stone-600 mb-6">
              Escribe <span className="font-mono font-bold text-stone-900 italic">esta mascota fue encontrada</span> a continuación:
            </p>
            <input
              type="text"
              placeholder="esta mascota fue encontrada"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none mb-6"
              value={recoverConfirmText}
              onChange={(e) => setRecoverConfirmText(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => { setIsRecovering(false); setRecoverConfirmText(''); }} className="flex-1 px-4 py-3 rounded-xl font-bold text-stone-600 bg-stone-100">
                Cancelar
              </button>
              <button
                onClick={handleMarkAsFound}
                disabled={recoverConfirmText !== "esta mascota fue encontrada"}
                className={clsx(
                  "flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-lg",
                  recoverConfirmText === "esta mascota fue encontrada" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-stone-300 cursor-not-allowed"
                )}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL ELIMINAR --- */}
      {isDeleting && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-stone-200">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-red-100 p-3 rounded-2xl text-red-600"><BadgeAlert className="w-6 h-6" /></div>
              <button onClick={() => { setIsDeleting(false); setConfirmText(''); }} className="text-stone-400 hover:text-stone-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <h3 className="text-2xl font-bold text-stone-900 mb-2">¿Estás seguro?</h3>
            <p className="text-stone-600 mb-6">
              Escribe <span className="font-mono font-bold text-stone-900">ESTOY SEGURO, ELIMINAR</span> a continuación:
            </p>
            <input
              type="text"
              placeholder="ESTOY SEGURO, ELIMINAR"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-red-500 outline-none mb-6"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => { setIsDeleting(false); setConfirmText(''); }} className="flex-1 px-4 py-3 rounded-xl font-bold text-stone-600 bg-stone-100">
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== "ESTOY SEGURO, ELIMINAR"}
                className={clsx(
                  "flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-lg",
                  confirmText === "ESTOY SEGURO, ELIMINAR" ? "bg-red-600 hover:bg-red-700" : "bg-stone-300 cursor-not-allowed"
                )}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}