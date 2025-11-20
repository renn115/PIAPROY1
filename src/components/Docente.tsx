import { useState, useEffect, FormEvent } from 'react';
import { FileText, Send } from 'lucide-react';
import Header from './Header';
import { supabase, Estudiante, Observacion } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Docente() {
  const { usuario } = useAuth();
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const [formData, setFormData] = useState({
    estudiante_nombre: '',
    grupo: '',
    comportamiento: '',
    nivel_atencion: '',
    interaccion_social: 3,
    seguimiento_instrucciones: 3,
    concentracion: 3,
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: estudiantesData } = await supabase
      .from('estudiantes')
      .select('*')
      .order('nombre');

    const { data: observacionesData } = await supabase
      .from('observaciones')
      .select('*, estudiante:estudiantes(*)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (estudiantesData) setEstudiantes(estudiantesData);
    if (observacionesData) setObservaciones(observacionesData as Observacion[]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje('');

    try {
      let estudianteId = estudiantes.find(
        (e) => e.nombre === formData.estudiante_nombre
      )?.id;

      if (!estudianteId) {
        const { data: nuevoEstudiante, error: errorEstudiante } = await supabase
          .from('estudiantes')
          .insert({
            nombre: formData.estudiante_nombre,
            grupo: formData.grupo,
          })
          .select()
          .single();

        if (errorEstudiante) throw errorEstudiante;
        estudianteId = nuevoEstudiante.id;
      }

      const { error } = await supabase.from('observaciones').insert({
        estudiante_id: estudianteId,
        docente_id: usuario!.id,
        comportamiento: formData.comportamiento,
        nivel_atencion: formData.nivel_atencion,
        interaccion_social: formData.interaccion_social,
        seguimiento_instrucciones: formData.seguimiento_instrucciones,
        concentracion: formData.concentracion,
      });

      if (error) throw error;

      setMensaje('Observación registrada exitosamente');
      setFormData({
        estudiante_nombre: '',
        grupo: '',
        comportamiento: '',
        nivel_atencion: '',
        interaccion_social: 3,
        seguimiento_instrucciones: 3,
        concentracion: 3,
      });

      cargarDatos();
    } catch (error) {
      setMensaje('Error al registrar la observación');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Panel Docente - Observaciones" />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-6">
                <FileText className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-800">Registrar observación</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre del estudiante
                    </label>
                    <input
                      type="text"
                      value={formData.estudiante_nombre}
                      onChange={(e) =>
                        setFormData({ ...formData, estudiante_nombre: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej. Estudiante Zeta"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Grupo
                    </label>
                    <input
                      type="text"
                      value={formData.grupo}
                      onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej. 3A"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Comportamiento en clase
                  </label>
                  <textarea
                    value={formData.comportamiento}
                    onChange={(e) =>
                      setFormData({ ...formData, comportamiento: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows={4}
                    placeholder="Describe brevemente el comportamiento observado..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nivel de atención
                  </label>
                  <select
                    value={formData.nivel_atencion}
                    onChange={(e) =>
                      setFormData({ ...formData, nivel_atencion: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Seleccione...</option>
                    <option value="bajo">Bajo</option>
                    <option value="medio">Medio</option>
                    <option value="alto">Alto</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Interacción social (1-5)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formData.interaccion_social}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          interaccion_social: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Seguimiento de instrucciones (1-5)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formData.seguimiento_instrucciones}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          seguimiento_instrucciones: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Concentración (1-5)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formData.concentracion}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          concentracion: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {mensaje && (
                  <div
                    className={`px-4 py-3 rounded-lg ${
                      mensaje.includes('Error')
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : 'bg-green-50 border border-green-200 text-green-700'
                    }`}
                  >
                    {mensaje}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {loading ? 'Enviando...' : 'Enviar observación'}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Últimas observaciones
              </h3>
              <div className="space-y-3">
                {observaciones.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay observaciones registradas</p>
                ) : (
                  observaciones.map((obs) => (
                    <div
                      key={obs.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <p className="font-semibold text-gray-800">
                        {obs.estudiante?.nombre}
                      </p>
                      <p className="text-sm text-gray-600">
                        Grupo: {obs.estudiante?.grupo}
                      </p>
                      <p className="text-sm text-gray-600">
                        Atención:{' '}
                        <span
                          className={`font-semibold ${
                            obs.nivel_atencion === 'alto'
                              ? 'text-green-600'
                              : obs.nivel_atencion === 'medio'
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {obs.nivel_atencion}
                        </span>
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
