import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import Header from './Header';
import { supabase, Observacion, Scoring, calcularScoring } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface CasoConRiesgo {
  estudiante_id: string;
  estudiante_nombre: string;
  grupo: string;
  observaciones: Observacion[];
  nivel_riesgo?: 'bajo' | 'medio' | 'alto';
  puntuacion?: number;
  scoring_id?: string;
}

export default function Orientador() {
  const { usuario } = useAuth();
  const [casos, setCasos] = useState<CasoConRiesgo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [selectedCaso, setSelectedCaso] = useState<CasoConRiesgo | null>(null);

  useEffect(() => {
    cargarCasos();
  }, []);

  const cargarCasos = async () => {
    setLoading(true);

    const { data: observacionesData } = await supabase
      .from('observaciones')
      .select('*, estudiante:estudiantes(*)')
      .order('created_at', { ascending: false });

    const { data: scoringData } = await supabase
      .from('scoring')
      .select('*')
      .order('created_at', { ascending: false });

    if (observacionesData) {
      const estudiantesMap = new Map<string, CasoConRiesgo>();

      observacionesData.forEach((obs: Observacion) => {
        const estudianteId = obs.estudiante_id;
        if (!estudiantesMap.has(estudianteId)) {
          estudiantesMap.set(estudianteId, {
            estudiante_id: estudianteId,
            estudiante_nombre: obs.estudiante?.nombre || 'Desconocido',
            grupo: obs.estudiante?.grupo || '',
            observaciones: [],
          });
        }
        estudiantesMap.get(estudianteId)!.observaciones.push(obs);
      });

      const casosArray = Array.from(estudiantesMap.values());

      if (scoringData) {
        scoringData.forEach((score: Scoring) => {
          const caso = casosArray.find((c) => c.estudiante_id === score.estudiante_id);
          if (caso) {
            caso.nivel_riesgo = score.nivel_riesgo;
            caso.puntuacion = score.puntuacion;
            caso.scoring_id = score.id;
          }
        });
      }

      setCasos(casosArray);
    }

    setLoading(false);
  };

  const generarScoring = async (caso: CasoConRiesgo) => {
    setMensaje('');
    const resultado = calcularScoring(caso.observaciones);

    try {
      const { error } = await supabase.from('scoring').insert({
        estudiante_id: caso.estudiante_id,
        orientador_id: usuario!.id,
        nivel_riesgo: resultado.nivel_riesgo,
        puntuacion: resultado.puntuacion,
        detalles: resultado.detalles,
      });

      if (error) throw error;

      setMensaje('Scoring generado exitosamente');
      cargarCasos();
    } catch (error) {
      setMensaje('Error al generar scoring');
      console.error(error);
    }
  };

  const getBadgeColor = (nivel?: 'bajo' | 'medio' | 'alto') => {
    if (!nivel) return 'bg-gray-200 text-gray-700';
    if (nivel === 'alto') return 'bg-red-100 text-red-700 border border-red-300';
    if (nivel === 'medio') return 'bg-yellow-100 text-yellow-700 border border-yellow-300';
    return 'bg-green-100 text-green-700 border border-green-300';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Panel Orientador" />

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-800">Casos recibidos</h2>
          </div>

          {mensaje && (
            <div
              className={`px-4 py-3 rounded-lg mb-4 ${
                mensaje.includes('Error')
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-green-50 border border-green-200 text-green-700'
              }`}
            >
              {mensaje}
            </div>
          )}

          {loading ? (
            <p className="text-gray-500">Cargando casos...</p>
          ) : casos.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay casos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Estudiante
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Grupo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Observaciones
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Nivel de riesgo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {casos.map((caso) => (
                    <tr key={caso.estudiante_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {caso.estudiante_nombre}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{caso.grupo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {caso.observaciones.length}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {caso.nivel_riesgo ? (
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getBadgeColor(
                              caso.nivel_riesgo
                            )}`}
                          >
                            {caso.nivel_riesgo} ({caso.puntuacion?.toFixed(1)})
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Sin scoring</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => generarScoring(caso)}
                          className="inline-flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-600 transition"
                        >
                          <TrendingUp className="w-4 h-4" />
                          Generar scoring
                        </button>
                        <button
                          onClick={() => setSelectedCaso(caso)}
                          className="inline-flex items-center gap-1 bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-300 transition"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedCaso && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  Detalle de {selectedCaso.estudiante_nombre}
                </h3>
                <button
                  onClick={() => setSelectedCaso(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    <strong>Grupo:</strong> {selectedCaso.grupo}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Observaciones registradas:</strong>{' '}
                    {selectedCaso.observaciones.length}
                  </p>
                  {selectedCaso.nivel_riesgo && (
                    <p className="text-sm text-gray-600">
                      <strong>Nivel de riesgo:</strong>{' '}
                      <span
                        className={`px-2 py-1 rounded ${getBadgeColor(
                          selectedCaso.nivel_riesgo
                        )}`}
                      >
                        {selectedCaso.nivel_riesgo} ({selectedCaso.puntuacion?.toFixed(1)})
                      </span>
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Observaciones:</h4>
                  <div className="space-y-3">
                    {selectedCaso.observaciones.map((obs) => (
                      <div
                        key={obs.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <p className="text-sm text-gray-800 mb-2">
                          {obs.comportamiento}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <p>Atención: {obs.nivel_atencion}</p>
                          <p>Interacción: {obs.interaccion_social}/5</p>
                          <p>Seguimiento: {obs.seguimiento_instrucciones}/5</p>
                          <p>Concentración: {obs.concentracion}/5</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(obs.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCaso(null)}
                className="w-full mt-6 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
