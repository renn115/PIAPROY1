import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertCircle, MessageSquare, Send, Calendar, FileText } from 'lucide-react';
import Header from './Header';
import { supabase, Observacion, Scoring, calcularScoring, ComentarioOrientador, RespuestaComentario, MejoraDocente, CasoSeguimiento } from '../lib/supabase';
import { generarReportePDFIndividual } from '../lib/reportes';
import { useAuth } from '../context/AuthContext';

interface CasoConRiesgo {
  estudiante_id: string;
  estudiante_nombre: string;
  grupo: string;
  observaciones: Observacion[];
  nivel_riesgo?: 'bajo' | 'medio' | 'alto';
  puntuacion?: number;
  scoring_id?: string;
  estado_caso?: 'abierto' | 'en_seguimiento' | 'cerrado';
  caso_seguimiento_id?: string;
}

interface CasosPorDocente {
  docente_id: string;
  docente_nombre: string;
  casos: CasoConRiesgo[];
}

export default function Orientador() {
  const { usuario } = useAuth();
  const [casosPorDocente, setCasosPorDocente] = useState<CasosPorDocente[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [selectedCaso, setSelectedCaso] = useState<CasoConRiesgo | null>(null);
  const [comentarios, setComentarios] = useState<ComentarioOrientador[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [loadingComentario, setLoadingComentario] = useState(false);
  const [nuevaRespuesta, setNuevaRespuesta] = useState<Record<string, string>>({});
  const [loadingRespuesta, setLoadingRespuesta] = useState(false);
  const [mensajeRespuesta, setMensajeRespuesta] = useState('');
  const [mejoras, setMejoras] = useState<MejoraDocente[]>([]);
  const [estadosCasos, setEstadosCasos] = useState<Record<string, CasoSeguimiento>>({});
  const [cambiandoEstado, setCambiandoEstado] = useState<Record<string, boolean>>({});
  const [scoringCompleto, setScoringCompleto] = useState<Scoring | null>(null);

  useEffect(() => {
    cargarCasos();
  }, []);

  const cargarCasos = async () => {
    setLoading(true);

    const { data: observacionesData } = await supabase
      .from('observaciones')
      .select('*, estudiante:estudiantes(*), docente:usuarios(*)')
      .order('created_at', { ascending: false });

    const { data: scoringData } = await supabase
      .from('scoring')
      .select('*')
      .order('created_at', { ascending: false });

    // Cargar estados de casos de seguimiento
    const { data: casosData } = await supabase
      .from('casos_seguimiento')
      .select('*')
      .order('updated_at', { ascending: false });

    if (observacionesData) {
      // Agrupar por docente
      const docentesMap = new Map<string, { docente_id: string; docente_nombre: string; estudiantesMap: Map<string, CasoConRiesgo> }>();

      observacionesData.forEach((obs: Observacion) => {
        const docenteId = obs.docente_id || 'sin-docente';
        const docenteNombre = obs.docente?.nombre || 'Docente desconocido';
        
        if (!docentesMap.has(docenteId)) {
          docentesMap.set(docenteId, {
            docente_id: docenteId,
            docente_nombre: docenteNombre,
            estudiantesMap: new Map(),
          });
        }

        const docenteData = docentesMap.get(docenteId)!;
        const estudianteId = obs.estudiante_id;
        
        if (!docenteData.estudiantesMap.has(estudianteId)) {
          docenteData.estudiantesMap.set(estudianteId, {
            estudiante_id: estudianteId,
            estudiante_nombre: obs.estudiante?.nombre || 'Desconocido',
            grupo: obs.estudiante?.grupo || '',
            observaciones: [],
          });
        }
        
        docenteData.estudiantesMap.get(estudianteId)!.observaciones.push(obs);
      });

      // Convertir a array y agregar scoring
      const casosPorDocenteArray: CasosPorDocente[] = Array.from(docentesMap.values()).map((docenteData) => {
        const casosArray = Array.from(docenteData.estudiantesMap.values());

        // Agregar scoring a cada caso
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

        // Agregar estados de casos a cada caso
        const estadosMap: Record<string, CasoSeguimiento> = {};
        if (casosData) {
          casosData.forEach((caso: CasoSeguimiento) => {
            estadosMap[caso.estudiante_id] = caso as CasoSeguimiento;
            const casoEnArray = casosArray.find((c) => c.estudiante_id === caso.estudiante_id);
            if (casoEnArray) {
              casoEnArray.estado_caso = caso.estado;
              casoEnArray.caso_seguimiento_id = caso.id;
            }
          });
        }
        setEstadosCasos(estadosMap);

        return {
          docente_id: docenteData.docente_id,
          docente_nombre: docenteData.docente_nombre,
          casos: casosArray,
        };
      });

      setCasosPorDocente(casosPorDocenteArray);
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

  const cargarComentarios = async (estudianteId: string) => {
    const { data } = await supabase
      .from('comentarios_orientador')
      .select('*, orientador:usuarios(*), estudiante:estudiantes(*)')
      .eq('estudiante_id', estudianteId)
      .order('created_at', { ascending: false });

    if (data) {
      // Cargar respuestas para cada comentario
      const comentariosConRespuestas = await Promise.all(
        data.map(async (comentario) => {
          const { data: respuestasData } = await supabase
            .from('respuestas_comentarios')
            .select('*, usuario:usuarios(*)')
            .eq('comentario_id', comentario.id)
            .order('created_at', { ascending: true });

          return {
            ...comentario,
            respuestas: respuestasData || [],
          };
        })
      );
      setComentarios(comentariosConRespuestas as ComentarioOrientador[]);
    }
  };

  const cargarMejoras = async (estudianteId: string) => {
    const { data } = await supabase
      .from('mejoras_docente')
      .select('*, docente:usuarios(*), estudiante:estudiantes(*)')
      .eq('estudiante_id', estudianteId)
      .order('fecha', { ascending: false });

    if (data) {
      setMejoras(data as MejoraDocente[]);
    }
  };

  const actualizarEstadoCaso = async (estudianteId: string, nuevoEstado: 'abierto' | 'en_seguimiento' | 'cerrado', casoId?: string) => {
    if (!usuario) return;
    
    setCambiandoEstado({ ...cambiandoEstado, [estudianteId]: true });

    try {
      if (casoId) {
        // Actualizar caso existente
        const { error } = await supabase
          .from('casos_seguimiento')
          .update({ estado: nuevoEstado })
          .eq('id', casoId);

        if (error) throw error;
      } else {
        // Crear nuevo caso
        const { data, error } = await supabase
          .from('casos_seguimiento')
          .insert({
            estudiante_id: estudianteId,
            orientador_id: usuario.id,
            estado: nuevoEstado,
          })
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
          setEstadosCasos({ ...estadosCasos, [estudianteId]: data as CasoSeguimiento });
        }
      }

      // Actualizar estado local en casosPorDocente
      setCasosPorDocente(casosPorDocente.map(docente => ({
        ...docente,
        casos: docente.casos.map(caso => 
          caso.estudiante_id === estudianteId 
            ? { ...caso, estado_caso: nuevoEstado }
            : caso
        )
      })));

      setMensaje(`Estado actualizado a: ${nuevoEstado}`);
      setTimeout(() => setMensaje(''), 3000);
      
      // Recargar casos para actualizar estados
      await cargarCasos();
    } catch (error) {
      console.error('Error al actualizar estado del caso:', error);
      setMensaje('Error al actualizar el estado del caso');
      setTimeout(() => setMensaje(''), 3000);
    } finally {
      setCambiandoEstado({ ...cambiandoEstado, [estudianteId]: false });
    }
  };

  const enviarComentario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaso || !nuevoComentario.trim()) return;

    setLoadingComentario(true);
    try {
      const { error } = await supabase.from('comentarios_orientador').insert({
        estudiante_id: selectedCaso.estudiante_id,
        orientador_id: usuario!.id,
        comentario: nuevoComentario.trim(),
      });

      if (error) throw error;

      setNuevoComentario('');
      cargarComentarios(selectedCaso.estudiante_id);
    } catch (error) {
      console.error('Error al enviar comentario:', error);
    } finally {
      setLoadingComentario(false);
    }
  };

  const enviarRespuesta = async (comentarioId: string) => {
    if (!nuevaRespuesta[comentarioId]?.trim() || !selectedCaso) return;

    const respuestaTexto = nuevaRespuesta[comentarioId].trim();
    setLoadingRespuesta(true);
    
    // Limpiar el campo inmediatamente para mejor UX
    setNuevaRespuesta({ ...nuevaRespuesta, [comentarioId]: '' });
    
    try {
      const { error } = await supabase
        .from('respuestas_comentarios')
        .insert({
          comentario_id: comentarioId,
          usuario_id: usuario!.id,
          respuesta: respuestaTexto,
        });

      if (error) {
        console.error('Error detallado al insertar respuesta:', error);
        // Restaurar el texto si hay error
        setNuevaRespuesta({ ...nuevaRespuesta, [comentarioId]: respuestaTexto });
        throw error;
      }

      console.log('Respuesta enviada correctamente para comentario:', comentarioId);
      
      // Mostrar mensaje de éxito
      setMensajeRespuesta('✅ Nueva respuesta enviada exitosamente');
      setTimeout(() => {
        setMensajeRespuesta('');
      }, 3000);
      
      // Pequeño delay para asegurar que la base de datos se actualice
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Recargar los comentarios con sus respuestas actualizadas
      await cargarComentarios(selectedCaso.estudiante_id);
      
      console.log('Comentarios recargados después de enviar respuesta');
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
      setMensajeRespuesta('❌ Error al enviar la respuesta. Por favor, intenta de nuevo.');
      setTimeout(() => {
        setMensajeRespuesta('');
      }, 5000);
    } finally {
      setLoadingRespuesta(false);
    }
  };

  const getBadgeColor = (nivel?: 'bajo' | 'medio' | 'alto') => {
    if (!nivel) return 'bg-gray-200 text-gray-700';
    if (nivel === 'alto') return 'bg-red-100 text-red-700 border border-red-300';
    if (nivel === 'medio') return 'bg-yellow-100 text-yellow-700 border border-yellow-300';
    return 'bg-green-100 text-green-700 border border-green-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex justify-center items-start p-10 relative overflow-hidden">
      {/* Figuras decorativas de fondo */}
      <div className="absolute w-40 h-40 bg-blue-600 rounded-full bottom-10 left-10 opacity-20 shadow-lg animate-pulse" />
      <div className="absolute w-24 h-24 bg-pink-500 rounded-full top-40 right-32 opacity-25 shadow-lg rotate-12" />
      <div className="absolute w-20 h-20 bg-orange-500 rounded-full bottom-70 left-40 opacity-20 shadow-lg rotate-45" />
      <div className="absolute w-32 h-32 bg-purple-400 rounded-full top-10 right-10 opacity-15 shadow-lg" />
      <div className="absolute w-28 h-28 bg-cyan-400 rounded-full bottom-32 right-1/4 opacity-20 shadow-lg" />
      <div className="absolute w-16 h-16 bg-indigo-400 rounded-full top-1/3 left-20 opacity-25 shadow-lg" />
      <div className="absolute w-36 h-36 bg-teal-400 rounded-full bottom-1/4 left-1/3 opacity-15 shadow-lg animate-pulse" />
      
      <div className="absolute w-0 h-0 border-l-[40px] border-l-transparent border-r-[30px] border-r-transparent border-b-[70px] border-b-green-400 top-80 right-20 rotate-3 opacity-20" />
      <div className="absolute w-0 h-0 border-l-[60px] border-l-transparent border-r-[60px] border-r-transparent border-b-[100px] border-b-yellow-400 top-20 left-1/3 rotate-6 opacity-20" />
      <div className="absolute w-0 h-0 border-l-[35px] border-l-transparent border-r-[35px] border-r-transparent border-b-[60px] border-b-pink-400 bottom-20 right-1/3 rotate-12 opacity-25" />
      <div className="absolute w-0 h-0 border-l-[25px] border-l-transparent border-r-[25px] border-r-transparent border-b-[45px] border-b-blue-400 top-1/2 left-10 rotate-45 opacity-20" />
      
      <div className="absolute w-16 h-16 bg-indigo-500 top-60 left-1/4 rotate-45 opacity-15 shadow-lg" />
      <div className="absolute w-12 h-12 bg-purple-500 bottom-40 right-20 rotate-12 opacity-20 shadow-lg" />
      <div className="absolute w-20 h-20 bg-rose-400 top-1/4 right-1/4 rotate-6 opacity-15 shadow-lg" />
      <div className="absolute w-14 h-14 bg-amber-400 bottom-60 left-1/2 rotate-30 opacity-20 shadow-lg" />
      
      <div className="absolute w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 top-32 left-1/2 rotate-45 opacity-10 shadow-lg" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
      <div className="absolute w-18 h-18 bg-gradient-to-br from-pink-400 to-rose-500 bottom-1/3 right-1/2 rotate-12 opacity-15 shadow-lg" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
      
      <div className="absolute w-1 h-32 bg-gradient-to-b from-blue-400 to-transparent top-20 left-16 rotate-45 opacity-20" />
      <div className="absolute w-1 h-40 bg-gradient-to-b from-purple-400 to-transparent bottom-20 right-24 rotate-12 opacity-15" />
      <div className="absolute w-32 h-1 bg-gradient-to-r from-pink-400 to-transparent top-1/3 right-16 rotate-45 opacity-20" />
      <div className="w-full max-w-7xl bg-gray-50 rounded-xl shadow-xl p-6 relative z-10">
        <Header title="Panel Orientador - Casos recibidos" />

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
          ) : casosPorDocente.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay casos registrados</p>
            </div>
          ) : (
            <div className="space-y-6">
              {casosPorDocente.map((docente) => (
                <div key={docente.docente_id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-indigo-100 px-6 py-4 border-b border-indigo-200">
                    <h3 className="text-lg font-bold text-indigo-800">
                      {docente.docente_nombre}
                    </h3>
                    <p className="text-sm text-indigo-600">
                      {docente.casos.length} {docente.casos.length === 1 ? 'estudiante' : 'estudiantes'}
                    </p>
                  </div>
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
                            Estado del caso
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {docente.casos.map((caso) => (
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
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={caso.estado_caso || 'abierto'}
                                onChange={(e) => actualizarEstadoCaso(caso.estudiante_id, e.target.value as 'abierto' | 'en_seguimiento' | 'cerrado', caso.caso_seguimiento_id)}
                                disabled={cambiandoEstado[caso.estudiante_id]}
                                className={`px-2 py-1 text-xs font-semibold rounded border ${
                                  caso.estado_caso === 'cerrado'
                                    ? 'bg-gray-100 text-gray-700 border-gray-300'
                                    : caso.estado_caso === 'en_seguimiento'
                                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                                    : 'bg-green-100 text-green-700 border-green-300'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                <option value="abierto">Abierto</option>
                                <option value="en_seguimiento">En Seguimiento</option>
                                <option value="cerrado">Cerrado</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                              <button
                                onClick={() => generarScoring(caso)}
                                className="inline-flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition"
                              >
                                <TrendingUp className="w-4 h-4" />
                                Generar scoring
                              </button>
                              <button
                                onClick={async () => {
                                  setSelectedCaso(caso);
                                  cargarComentarios(caso.estudiante_id);
                                  cargarMejoras(caso.estudiante_id);
                                  // Cargar estado del caso si existe
                                  const estadoCaso = estadosCasos[caso.estudiante_id];
                                  if (estadoCaso) {
                                    caso.estado_caso = estadoCaso.estado;
                                    caso.caso_seguimiento_id = estadoCaso.id;
                                  }
                                  // Cargar scoring completo si existe
                                  if (caso.scoring_id) {
                                    const { data } = await supabase
                                      .from('scoring')
                                      .select('*')
                                      .eq('id', caso.scoring_id)
                                      .single();
                                    if (data) setScoringCompleto(data as Scoring);
                                  }
                                }}
                                className="inline-flex items-center gap-1 bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-400 transition"
                              >
                                Ver Observaciones
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedCaso && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    {selectedCaso.estudiante_nombre}
                  </h3>
                  <p className="text-sm text-gray-600">Grupo: {selectedCaso.grupo}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedCaso(null);
                    setComentarios([]);
                    setNuevoComentario('');
                    setNuevaRespuesta({});
                    setMensajeRespuesta('');
                    setMejoras([]);
                    setScoringCompleto(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Botón de exportación PDF */}
                <div className="flex gap-2 justify-end mb-4">
                  <button
                    onClick={() => {
                      const datosReporte = {
                        estudiante: {
                          nombre: selectedCaso.estudiante_nombre,
                          grupo: selectedCaso.grupo,
                        },
                        observaciones: selectedCaso.observaciones,
                        scoring: scoringCompleto || undefined,
                        mejoras: mejoras,
                        comentarios: comentarios,
                        estadoCaso: estadosCasos[selectedCaso.estudiante_id],
                      };
                      generarReportePDFIndividual(datosReporte);
                    }}
                    className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                  >
                    <FileText className="w-4 h-4" />
                    Exportar Reporte PDF
                  </button>
                </div>
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Observaciones registradas:</strong> {selectedCaso.observaciones.length}
                      </p>
                    </div>
                    {selectedCaso.nivel_riesgo && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Nivel de riesgo:</strong>{' '}
                          <span
                            className={`px-2 py-1 rounded ${getBadgeColor(
                              selectedCaso.nivel_riesgo
                            )}`}
                          >
                            {selectedCaso.nivel_riesgo} ({selectedCaso.puntuacion?.toFixed(1)})
                          </span>
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Estado del caso:</strong>
                      </p>
                      <select
                        value={selectedCaso.estado_caso || 'abierto'}
                        onChange={(e) => {
                          const nuevoEstado = e.target.value as 'abierto' | 'en_seguimiento' | 'cerrado';
                          actualizarEstadoCaso(selectedCaso.estudiante_id, nuevoEstado, selectedCaso.caso_seguimiento_id);
                          setSelectedCaso({ ...selectedCaso, estado_caso: nuevoEstado });
                        }}
                        disabled={cambiandoEstado[selectedCaso.estudiante_id]}
                        className={`px-3 py-1 text-sm font-semibold rounded border ${
                          selectedCaso.estado_caso === 'cerrado'
                            ? 'bg-gray-100 text-gray-700 border-gray-300'
                            : selectedCaso.estado_caso === 'en_seguimiento'
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : 'bg-green-100 text-green-700 border-green-300'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <option value="abierto">Abierto</option>
                        <option value="en_seguimiento">En Seguimiento</option>
                        <option value="cerrado">Cerrado</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-4">Observaciones:</h4>
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
                        {obs.fecha_observacion && (
                          <p className="text-xs text-gray-500 mt-2">
                            Fecha observación: {new Date(obs.fecha_observacion).toLocaleDateString()}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Registrado: {new Date(obs.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sección de mejoras registradas */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <h4 className="text-lg font-bold text-gray-800">Mejoras registradas por el docente</h4>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {mejoras.length === 0 ? (
                      <p className="text-gray-500 text-sm py-4 text-center">
                        No hay mejoras registradas aún
                      </p>
                    ) : (
                      mejoras.map((mejora) => (
                        <div
                          key={mejora.id}
                          className="p-3 bg-green-50 rounded-lg border border-green-200"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-semibold text-green-700">
                              {new Date(mejora.fecha).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(mejora.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-sm text-gray-800">{mejora.mejora}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    <h4 className="text-lg font-bold text-gray-800">Comentarios y conversaciones</h4>
                  </div>

                  {mensajeRespuesta && (
                    <div
                      className={`px-4 py-3 rounded-lg font-semibold mb-4 ${
                        mensajeRespuesta.includes('Error') || mensajeRespuesta.includes('❌')
                          ? 'bg-red-50 border-2 border-red-300 text-red-700'
                          : 'bg-green-50 border-2 border-green-300 text-green-700'
                      }`}
                    >
                      {mensajeRespuesta}
                    </div>
                  )}

                  <form onSubmit={enviarComentario} className="mb-4">
                    <textarea
                      value={nuevoComentario}
                      onChange={(e) => setNuevoComentario(e.target.value)}
                      placeholder="Escribe un comentario para los docentes sobre este caso..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 mb-2"
                      rows={3}
                      required
                    />
                    <button
                      type="submit"
                      disabled={loadingComentario || !nuevoComentario.trim()}
                      className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {loadingComentario ? 'Enviando...' : 'Enviar comentario'}
                    </button>
                  </form>

                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {comentarios.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No hay comentarios aún
                      </p>
                    ) : (
                      comentarios.map((comentario) => (
                        <div
                          key={comentario.id}
                          className="p-3 bg-indigo-50 rounded-lg border border-indigo-200"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-semibold text-indigo-700">
                              {comentario.orientador?.nombre || 'Orientador'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(comentario.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-sm text-gray-800 mb-2">{comentario.comentario}</p>

                          {/* Mostrar respuestas de docentes con opción de responder */}
                          {comentario.respuestas && comentario.respuestas.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-indigo-200">
                              <p className="text-xs font-semibold text-gray-600 mb-2">
                                Conversación ({comentario.respuestas.length} respuestas):
                              </p>
                              <div className="space-y-3">
                                {comentario.respuestas.map((respuesta: RespuestaComentario) => (
                                  <div key={respuesta.id}>
                                    <div className="p-3 bg-white rounded-lg border border-gray-300 shadow-sm">
                                      <div className="flex justify-between items-start mb-1">
                                        <p className="text-xs font-semibold text-gray-700">
                                          {respuesta.usuario?.nombre || 'Usuario'}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          {new Date(respuesta.created_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                      <p className="text-sm text-gray-800">{respuesta.respuesta}</p>
                                    </div>
                                    
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Formulario para responder (siempre visible al final de la conversación) */}
                          <div className="mt-3 pt-3 border-t border-indigo-200">
                            <textarea
                              value={nuevaRespuesta[comentario.id] || ''}
                              onChange={(e) =>
                                setNuevaRespuesta({
                                  ...nuevaRespuesta,
                                  [comentario.id]: e.target.value,
                                })
                              }
                              placeholder="Escribe una respuesta..."
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 mb-2"
                              rows={2}
                            />
                            <button
                              onClick={() => enviarRespuesta(comentario.id)}
                              disabled={loadingRespuesta || !nuevaRespuesta[comentario.id]?.trim()}
                              className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              <Send className="w-4 h-4" />
                              {loadingRespuesta ? 'Enviando...' : 'Responder'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedCaso(null);
                  setComentarios([]);
                  setNuevoComentario('');
                  setNuevaRespuesta({});
                  setMensajeRespuesta('');
                }}
                className="w-full mt-6 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
