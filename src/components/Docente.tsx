import { useState, useEffect, FormEvent } from 'react';
import { FileText, Send, MessageSquare, Users, Calendar, Trash2 } from 'lucide-react';
import Header from './Header';
import { supabase, Estudiante, Observacion, ComentarioOrientador, RespuestaComentario, MejoraDocente, Scoring } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Docente() {
  const { usuario } = useAuth();
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [comentarios, setComentarios] = useState<ComentarioOrientador[]>([]);
  const [notificaciones, setNotificaciones] = useState<Record<string, { comentarios: number; respuestas: number }>>({});
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [selectedEstudiante, setSelectedEstudiante] = useState<Estudiante | null>(null);
  const [estudianteComentarios, setEstudianteComentarios] = useState<ComentarioOrientador[]>([]);
  const [estudianteMejoras, setEstudianteMejoras] = useState<MejoraDocente[]>([]);
  const [todasLasMejoras, setTodasLasMejoras] = useState<MejoraDocente[]>([]);
  const [scorings, setScorings] = useState<Record<string, Scoring>>({});
  const [nuevaRespuesta, setNuevaRespuesta] = useState<Record<string, string>>({});
  const [nuevaMejora, setNuevaMejora] = useState({ fecha: new Date().toISOString().split('T')[0], mejora: '' });
  const [loadingRespuesta, setLoadingRespuesta] = useState(false);
  const [loadingMejora, setLoadingMejora] = useState(false);
  const [mensajeRespuesta, setMensajeRespuesta] = useState('');

  const [formData, setFormData] = useState({
    estudiante_nombre: '',
    grupo: '',
    edad: '',
    entorno_familiar: '',
    comportamiento: '',
    nivel_atencion: '',
    fecha_observacion: new Date().toISOString().split('T')[0],
    interaccion_social: 3,
    seguimiento_instrucciones: 3,
    concentracion: 3,
  });

  useEffect(() => {
    cargarDatos();
    cargarTodasLasMejoras();
    cargarScorings();
  }, [usuario]);

  const cargarScorings = async () => {
    if (!usuario) return;
    
    // Cargar solo scorings de estudiantes que tienen observaciones de este docente
    const { data: observacionesData } = await supabase
      .from('observaciones')
      .select('estudiante_id')
      .eq('docente_id', usuario.id);
    
    const estudiantesIds = observacionesData?.map(obs => obs.estudiante_id) || [];
    
    if (estudiantesIds.length === 0) return;
    
    // Cargar scoring más reciente de cada estudiante
    const { data: scoringData } = await supabase
      .from('scoring')
      .select('*, estudiante:estudiantes(*)')
      .in('estudiante_id', estudiantesIds)
      .order('created_at', { ascending: false });
    
    if (scoringData) {
      // Agrupar por estudiante, manteniendo solo el más reciente
      const scoringMap: Record<string, Scoring> = {};
      scoringData.forEach((scoring: Scoring) => {
        const estudianteId = scoring.estudiante_id;
        if (!scoringMap[estudianteId] || 
            new Date(scoring.created_at) > new Date(scoringMap[estudianteId].created_at)) {
          scoringMap[estudianteId] = scoring as Scoring;
        }
      });
      setScorings(scoringMap);
    }
  };

  const cargarDatos = async () => {
    if (!usuario) return;
    
    const { data: estudiantesData } = await supabase
      .from('estudiantes')
      .select('*')
      .order('nombre');

    // Cargar solo observaciones del docente autenticado
    const { data: observacionesData } = await supabase
      .from('observaciones')
      .select('*, estudiante:estudiantes(*)')
      .eq('docente_id', usuario.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Cargar comentarios solo de estudiantes que tienen observaciones de este docente
    const estudiantesIds = observacionesData?.map(obs => obs.estudiante_id) || [];
    const { data: comentariosData } = await supabase
      .from('comentarios_orientador')
      .select('*, orientador:usuarios(*), estudiante:estudiantes(*)')
      .in('estudiante_id', estudiantesIds.length > 0 ? estudiantesIds : ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: false });

    // Cargar todas las respuestas de una vez
    const { data: respuestasData } = await supabase
      .from('respuestas_comentarios')
      .select('*, usuario:usuarios(*)')
      .order('created_at', { ascending: false });

    if (estudiantesData && observacionesData) {
      // Filtrar solo estudiantes que tienen observaciones de este docente
      const estudiantesIdsConObservaciones = new Set(
        observacionesData.map(obs => obs.estudiante_id)
      );
      const estudiantesFiltrados = estudiantesData.filter(
        estudiante => estudiantesIdsConObservaciones.has(estudiante.id)
      );
      setEstudiantes(estudiantesFiltrados);
      
      // Calcular notificaciones para cada estudiante
      if (comentariosData) {
        const notifs: Record<string, { comentarios: number; respuestas: number }> = {};
        
        // Cargar notificaciones vistas desde localStorage
        let notificacionesVistas: Record<string, number> = {};
        try {
          notificacionesVistas = JSON.parse(localStorage.getItem('notificacionesVistas') || '{}');
        } catch (e) {
          console.error('Error al cargar notificaciones vistas:', e);
        }
        
        estudiantesFiltrados.forEach((estudiante) => {
          // Contar comentarios del orientador para este estudiante
          const comentariosEstudiante = comentariosData.filter(
            (c: ComentarioOrientador) => c.estudiante_id === estudiante.id
          );
          
          // Contar respuestas para los comentarios de este estudiante
          let totalRespuestas = 0;
          if (respuestasData) {
            comentariosEstudiante.forEach((comentario) => {
              const respuestasComentario = respuestasData.filter(
                (r: RespuestaComentario) => r.comentario_id === comentario.id
              );
              totalRespuestas += respuestasComentario.length;
            });
          }
          
          // Si el estudiante ya fue visto, no mostrar notificaciones
          const fechaVisto = notificacionesVistas[estudiante.id];
          if (fechaVisto) {
            // Verificar si hay comentarios/respuestas nuevos después de la fecha vista
            const comentariosNuevos = comentariosEstudiante.filter(
              (c: ComentarioOrientador) => new Date(c.created_at).getTime() > fechaVisto
            );
            
            let respuestasNuevas = 0;
            if (respuestasData) {
              comentariosEstudiante.forEach((comentario) => {
                const respuestasComentario = respuestasData.filter(
                  (r: RespuestaComentario) => 
                    r.comentario_id === comentario.id && 
                    new Date(r.created_at).getTime() > fechaVisto
                );
                respuestasNuevas += respuestasComentario.length;
              });
            }
            
            notifs[estudiante.id] = {
              comentarios: comentariosNuevos.length,
              respuestas: respuestasNuevas,
            };
          } else {
            // Si no ha sido visto, mostrar todas las notificaciones
            notifs[estudiante.id] = {
              comentarios: comentariosEstudiante.length,
              respuestas: totalRespuestas,
            };
          }
        });
        
        setNotificaciones(notifs);
      }
    }
    
    if (observacionesData) setObservaciones(observacionesData as Observacion[]);
    
    // Cargar comentarios con sus respuestas para el panel lateral
    if (comentariosData && respuestasData) {
      const comentariosConRespuestas = comentariosData.map((comentario) => {
        const respuestasComentario = respuestasData.filter(
          (r: RespuestaComentario) => r.comentario_id === comentario.id
        );
        return {
          ...comentario,
          respuestas: respuestasComentario,
        };
      });
      setComentarios(comentariosConRespuestas as ComentarioOrientador[]);
    } else if (comentariosData) {
      setComentarios(comentariosData as ComentarioOrientador[]);
    }
  };

  const cargarMejorasEstudiante = async (estudianteId: string) => {
    const { data: mejorasData } = await supabase
      .from('mejoras_docente')
      .select('*, docente:usuarios(*), estudiante:estudiantes(*)')
      .eq('estudiante_id', estudianteId)
      .order('fecha', { ascending: false });

    if (mejorasData) {
      setEstudianteMejoras(mejorasData as MejoraDocente[]);
    }
  };

  const cargarDetalleEstudiante = async (estudianteId: string) => {
    // Cargar comentarios del orientador con sus respuestas
    const { data: comentariosData } = await supabase
      .from('comentarios_orientador')
      .select('*, orientador:usuarios(*), estudiante:estudiantes(*)')
      .eq('estudiante_id', estudianteId)
      .order('created_at', { ascending: false });

    if (comentariosData) {
      // Cargar respuestas para cada comentario
      const comentariosConRespuestas = await Promise.all(
        comentariosData.map(async (comentario) => {
          const { data: respuestasData, error: respuestasError } = await supabase
            .from('respuestas_comentarios')
            .select('*, usuario:usuarios(*)')
            .eq('comentario_id', comentario.id)
            .order('created_at', { ascending: true });

          if (respuestasError) {
            console.error('Error al cargar respuestas para comentario', comentario.id, ':', respuestasError);
          } else {
            console.log(`Comentario ${comentario.id} tiene ${respuestasData?.length || 0} respuestas`);
          }

          return {
            ...comentario,
            respuestas: respuestasData || [],
          };
        })
      );
      setEstudianteComentarios(comentariosConRespuestas as ComentarioOrientador[]);
      console.log('Comentarios cargados con respuestas:', comentariosConRespuestas);
    }

    // Cargar mejoras del docente
    const { data: mejorasData } = await supabase
      .from('mejoras_docente')
      .select('*, docente:usuarios(*), estudiante:estudiantes(*)')
      .eq('estudiante_id', estudianteId)
      .order('fecha', { ascending: false });

    if (mejorasData) setEstudianteMejoras(mejorasData as MejoraDocente[]);
  };

  const cargarTodasLasMejoras = async () => {
    if (!usuario) return;
    
    // Cargar solo mejoras del docente autenticado
    const { data: mejorasData } = await supabase
      .from('mejoras_docente')
      .select('*, docente:usuarios(*), estudiante:estudiantes(*)')
      .eq('docente_id', usuario.id)
      .order('fecha', { ascending: false });

    if (mejorasData) {
      setTodasLasMejoras(mejorasData as MejoraDocente[]);
    }
  };

  const handleSelectEstudiante = (estudiante: Estudiante) => {
    setSelectedEstudiante(estudiante);
    cargarDetalleEstudiante(estudiante.id);
    
    // Limpiar notificaciones al abrir el detalle y guardar en localStorage
    setNotificaciones((prev) => {
      const nuevas = { ...prev };
      nuevas[estudiante.id] = { comentarios: 0, respuestas: 0 };
      // Guardar en localStorage para persistir
      try {
        const notificacionesVistas = JSON.parse(localStorage.getItem('notificacionesVistas') || '{}');
        notificacionesVistas[estudiante.id] = Date.now();
        localStorage.setItem('notificacionesVistas', JSON.stringify(notificacionesVistas));
      } catch (e) {
        console.error('Error al guardar notificaciones vistas:', e);
      }
      return nuevas;
    });
  };

  const [showModalMejoras, setShowModalMejoras] = useState(false);
  const [estudianteParaMejoras, setEstudianteParaMejoras] = useState<Estudiante | null>(null);
  const [eliminandoEstudiante, setEliminandoEstudiante] = useState<string | null>(null);
  const [estudianteAEliminar, setEstudianteAEliminar] = useState<Estudiante | null>(null);

  const enviarRespuesta = async (comentarioId: string) => {
    if (!nuevaRespuesta[comentarioId]?.trim() || !selectedEstudiante) return;

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
      await cargarDetalleEstudiante(selectedEstudiante.id);
      
      // Recargar datos para actualizar notificaciones
      await cargarDatos();
      await cargarScorings();
      
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

  const confirmarEliminacion = async () => {
    if (!estudianteAEliminar || !usuario) return;

    const estudianteId = estudianteAEliminar.id;
    const estudianteNombre = estudianteAEliminar.nombre;
    const estudianteGrupo = estudianteAEliminar.grupo;
    setEliminandoEstudiante(estudianteId);
    setEstudianteAEliminar(null);
    
    try {
      // Registrar el log de eliminación ANTES de eliminar el estudiante
      await supabase
        .from('logs_eliminaciones')
        .insert({
          estudiante_nombre: estudianteNombre,
          estudiante_grupo: estudianteGrupo,
          docente_id: usuario.id,
          docente_nombre: usuario.nombre,
        });

      // Eliminar el estudiante (esto eliminará en cascada las observaciones, etc.)
      const { error } = await supabase
        .from('estudiantes')
        .delete()
        .eq('id', estudianteId);

      if (error) throw error;

      // Recargar datos después de eliminar
      await cargarDatos();
      await cargarTodasLasMejoras();
      await cargarScorings();
      
      // Si el estudiante eliminado estaba seleccionado, limpiar selección
      if (selectedEstudiante?.id === estudianteId) {
        setSelectedEstudiante(null);
        setEstudianteComentarios([]);
        setEstudianteMejoras([]);
      }
      if (estudianteParaMejoras?.id === estudianteId) {
        setEstudianteParaMejoras(null);
        setShowModalMejoras(false);
      }
    } catch (error: any) {
      console.error('Error al eliminar estudiante:', error);
      const mensajeError = error?.message || 'Error al eliminar el estudiante. Por favor, intenta de nuevo.';
      alert(mensajeError);
    } finally {
      setEliminandoEstudiante(null);
    }
  };

  const enviarMejora = async (e: FormEvent) => {
    e.preventDefault();
    const estudiante = estudianteParaMejoras || selectedEstudiante;
    if (!estudiante || !nuevaMejora.mejora.trim() || !usuario) return;

    setLoadingMejora(true);
    try {
      const { error } = await supabase.from('mejoras_docente').insert({
        estudiante_id: estudiante.id,
        docente_id: usuario.id,
        fecha: nuevaMejora.fecha,
        mejora: nuevaMejora.mejora.trim(),
      });

      if (error) throw error;

      setNuevaMejora({ fecha: new Date().toISOString().split('T')[0], mejora: '' });
      
      // Si el modal está abierto, recargar las mejoras
      if (showModalMejoras && estudianteParaMejoras) {
        await cargarMejorasEstudiante(estudianteParaMejoras.id);
      } else if (selectedEstudiante) {
        await cargarDetalleEstudiante(selectedEstudiante.id);
      }
      
      await cargarDatos();
      await cargarTodasLasMejoras();
    } catch (error) {
      console.error('Error al enviar mejora:', error);
      alert('Error al guardar la mejora');
    } finally {
      setLoadingMejora(false);
    }
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
            edad: formData.edad ? parseInt(formData.edad) : null,
            entorno_familiar: formData.entorno_familiar || null,
          })
          .select()
          .single();

        if (errorEstudiante) throw errorEstudiante;
        estudianteId = nuevoEstudiante.id;
      }

      const { data: nuevaObservacion, error } = await supabase
        .from('observaciones')
        .insert({
        estudiante_id: estudianteId,
        docente_id: usuario!.id,
        comportamiento: formData.comportamiento,
        nivel_atencion: formData.nivel_atencion,
          fecha_observacion: formData.fecha_observacion,
        interaccion_social: formData.interaccion_social,
        seguimiento_instrucciones: formData.seguimiento_instrucciones,
        concentracion: formData.concentracion,
        })
        .select()
        .single();

      if (error) {
        console.error('Error detallado al insertar observación:', error);
        throw error;
      }

      if (!nuevaObservacion) {
        throw new Error('No se pudo crear la observación');
      }

      // Mostrar mensaje de éxito
      setMensaje('✅ Observación registrada exitosamente');
      
      // Limpiar formulario
      setFormData({
        estudiante_nombre: '',
        grupo: '',
        edad: '',
        entorno_familiar: '',
        comportamiento: '',
        nivel_atencion: '',
        fecha_observacion: new Date().toISOString().split('T')[0],
        interaccion_social: 3,
        seguimiento_instrucciones: 3,
        concentracion: 3,
      });

      // Recargar datos para mostrar la nueva observación
      await cargarDatos();

      // Mantener el mensaje de éxito visible por 5 segundos
      setTimeout(() => {
        setMensaje('');
      }, 5000);
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido';
      setMensaje(`Error al registrar la observación: ${errorMessage}`);
      console.error('Error completo:', error);
    } finally {
      setLoading(false);
    }
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
        <Header title="Panel Docente - Observaciones" />

        <main className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-2 mb-6">
                  <FileText className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-2xl font-bold text-gray-800">
                    Registrar observación
                  </h2>
                </div>

                {mensaje && (
                  <div
                    className={`px-4 py-3 rounded-lg font-semibold mb-4 ${
                      mensaje.includes('Error')
                        ? 'bg-red-50 border-2 border-red-300 text-red-700'
                        : 'bg-green-50 border-2 border-green-300 text-green-700'
                    }`}
                  >
                    {mensaje}
                  </div>
                )}

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
                          setFormData({
                            ...formData,
                            estudiante_nombre: e.target.value,
                          })
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
                        onChange={(e) =>
                          setFormData({ ...formData, grupo: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ej. 3A"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Edad
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="18"
                        value={formData.edad}
                        onChange={(e) =>
                          setFormData({ ...formData, edad: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ej. 8"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Entorno familiar
                      </label>
                      <input
                        type="text"
                        value={formData.entorno_familiar}
                        onChange={(e) =>
                          setFormData({ ...formData, entorno_familiar: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ej. Familia nuclear, vive con abuela, etc."
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
                        setFormData({
                          ...formData,
                          comportamiento: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows={4}
                      placeholder="Describe brevemente el comportamiento observado..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nivel de atención
                    </label>
                    <select
                      value={formData.nivel_atencion}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nivel_atencion: e.target.value,
                        })
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

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Fecha de observación
                      </label>
                      <input
                        type="date"
                        value={formData.fecha_observacion}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            fecha_observacion: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
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

                  <div className="pt-6">
                    <button
  type="submit"
  disabled={loading}
  className="w-full bg-green-500 text-white py-3 mt-2 mb-4 rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
>
  <Send className="w-10 h-5" />
  {loading ? 'Enviando...' : 'Enviar observación'}
</button>
                  </div>

                </form>
              </div>

              {/* Panel de mejoras */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-800">
                    Registro de mejoras
                  </h3>
                </div>
                
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {estudiantes.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No hay estudiantes registrados
                    </p>
                  ) : (
                    estudiantes
                      .filter((estudiante) => {
                        // Filtrar solo estudiantes que tienen mejoras registradas
                        return todasLasMejoras.some((mejora) => mejora.estudiante_id === estudiante.id);
                      })
                      .map((estudiante) => {
                        const mejorasEstudiante = todasLasMejoras.filter(
                          (m) => m.estudiante_id === estudiante.id
                        );
                        
                        return (
                          <div
                            key={estudiante.id}
                            className="p-4 bg-green-50 rounded-lg border border-green-200"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">
                                  {estudiante.nombre}
                                </p>
                                <p className="text-xs text-gray-600">
                                  Grupo: {estudiante.grupo}
                                </p>
                              </div>
                              <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded">
                                {mejorasEstudiante.length} {mejorasEstudiante.length === 1 ? 'mejora' : 'mejoras'}
                              </span>
                            </div>
                            <div className="space-y-2 mt-3">
                              {mejorasEstudiante.map((mejora) => (
                                <div
                                  key={mejora.id}
                                  className="p-2 bg-white rounded border border-green-200"
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <p className="text-xs font-semibold text-green-700">
                                      {new Date(mejora.fecha).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(mejora.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-800">{mejora.mejora}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                  )}
                  {estudiantes.filter((e) => todasLasMejoras.some((m) => m.estudiante_id === e.id)).length === 0 && (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">
                        No hay mejoras registradas aún
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Haz clic en un estudiante de "Mis estudiantes" para registrar mejoras
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Panel lateral: Comentarios y Mis estudiantes */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-gray-800">
                    Comentarios del orientador
                </h3>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {estudiantes.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      No hay estudiantes registrados
                    </p>
                  ) : (
                    estudiantes.map((estudiante) => {
                      const comentariosEstudiante = comentarios.filter(
                        (com) => com.estudiante_id === estudiante.id
                      );
                      const notif = notificaciones[estudiante.id] || { comentarios: 0, respuestas: 0 };
                      const tieneComentarios = comentariosEstudiante.length > 0;
                      
                      if (!tieneComentarios) return null;
                      
                      return (
                        <div
                          key={estudiante.id}
                          className="p-4 bg-indigo-50 rounded-lg border border-indigo-200"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">
                                {estudiante.nombre}
                              </p>
                              <p className="text-xs text-gray-600">
                                Grupo: {estudiante.grupo}
                              </p>
                            </div>
                            {(notif.comentarios > 0 || notif.respuestas > 0) && (
                              <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">
                                Nuevo
                              </span>
                            )}
                          </div>
                          <div className="mt-2 space-y-2">
                            {comentariosEstudiante.map((comentario) => (
                              <div
                                key={comentario.id}
                                className="p-3 bg-white rounded border border-indigo-200"
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <p className="text-xs font-semibold text-indigo-700">
                                    {comentario.orientador?.nombre || 'Orientador'}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(comentario.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-800">{comentario.comentario}</p>
                                {comentario.respuestas && comentario.respuestas.length > 0 && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {comentario.respuestas.length} {comentario.respuestas.length === 1 ? 'respuesta' : 'respuestas'}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => handleSelectEstudiante(estudiante)}
                            className="w-full mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-semibold py-2 px-3 bg-indigo-50 rounded hover:bg-indigo-100 transition"
                          >
                            Ver conversación completa →
                          </button>
                        </div>
                      );
                    })
                  )}
                  {estudiantes.filter(e => comentarios.some(c => c.estudiante_id === e.id)).length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No hay comentarios del orientador aún
                    </p>
                  )}
                </div>
              </div>

              {/* Lista de estudiantes */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-gray-800">
                    Mis estudiantes
                  </h3>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {estudiantes.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      No hay estudiantes registrados
                    </p>
                  ) : (
                    estudiantes.map((estudiante) => {
                      const observacionesEstudiante = observaciones.filter(
                        (obs) => obs.estudiante_id === estudiante.id
                      );
                      const notif = notificaciones[estudiante.id] || { comentarios: 0, respuestas: 0 };
                      const tieneNotificaciones = notif.comentarios > 0 || notif.respuestas > 0;
                      
                      return (
                        <div
                          key={estudiante.id}
                          className={`p-4 rounded-lg border-2 transition ${
                            tieneNotificaciones
                              ? 'bg-indigo-50 border-indigo-300'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div 
                              className="flex-1 cursor-pointer"
                              onClick={() => {
                                setEstudianteParaMejoras(estudiante);
                                setShowModalMejoras(true);
                                // Cargar mejoras del estudiante
                                cargarMejorasEstudiante(estudiante.id);
                              }}
                              title="Haz clic para registrar mejoras"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-800">
                                  {estudiante.nombre}
                                </p>
                                {tieneNotificaciones && (
                                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">
                                    Nuevo
                                  </span>
                                )}
                                {scorings[estudiante.id] && (
                                  <span
                                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                      scorings[estudiante.id].nivel_riesgo === 'alto'
                                        ? 'bg-red-100 text-red-700 border border-red-300'
                                        : scorings[estudiante.id].nivel_riesgo === 'medio'
                                        ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                                        : 'bg-green-100 text-green-700 border border-green-300'
                                    }`}
                                    title={`Puntuación: ${scorings[estudiante.id].puntuacion?.toFixed(1)}`}
                                  >
                                    Riesgo: {scorings[estudiante.id].nivel_riesgo}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 space-y-1">
                                <p className="text-sm text-gray-600">
                                  Grupo: {estudiante.grupo}
                                </p>
                                {estudiante.edad && (
                                  <p className="text-xs text-gray-500">
                                    Edad: {estudiante.edad} años
                                  </p>
                                )}
                                {estudiante.entorno_familiar && (
                                  <p className="text-xs text-gray-500">
                                    Entorno: {estudiante.entorno_familiar}
                                  </p>
                                )}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {notif.comentarios > 0 && (
                                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded">
                                    {notif.comentarios} {notif.comentarios === 1 ? 'comentario' : 'comentarios'}
                                  </span>
                                )}
                                {notif.respuestas > 0 && (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                    {notif.respuestas} {notif.respuestas === 1 ? 'respuesta' : 'respuestas'}
                          </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 ml-4">
                              <p className="text-xs text-gray-500">
                                {observacionesEstudiante.length} observaciones
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEstudianteAEliminar(estudiante);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Eliminar estudiante"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Modal para agregar mejoras */}
      {showModalMejoras && estudianteParaMejoras && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {estudianteParaMejoras.nombre}
                </h3>
                <p className="text-sm text-gray-600">Grupo: {estudianteParaMejoras.grupo}</p>
              </div>
              <button
                onClick={() => {
                  setShowModalMejoras(false);
                  setEstudianteParaMejoras(null);
                  setEstudianteMejoras([]);
                  setNuevaMejora({ fecha: new Date().toISOString().split('T')[0], mejora: '' });
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Observación inicial */}
              {(() => {
                const observacionesEstudiante = observaciones.filter(
                  (obs) => obs.estudiante_id === estudianteParaMejoras.id
                );
                const primeraObservacion = observacionesEstudiante.length > 0
                  ? [...observacionesEstudiante].sort((a, b) => 
                      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    )[0]
                  : null;
                
                return primeraObservacion ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h4 className="text-lg font-bold text-gray-800">Observación inicial</h4>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-semibold text-blue-700">
                          Fecha: {new Date(primeraObservacion.created_at).toLocaleDateString()}
                        </p>
                        {primeraObservacion.fecha_observacion && (
                          <p className="text-xs text-gray-500">
                            Observación: {new Date(primeraObservacion.fecha_observacion).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 mb-3">
                        {primeraObservacion.comportamiento}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <p><strong>Atención:</strong> {primeraObservacion.nivel_atencion}</p>
                        <p><strong>Interacción social:</strong> {primeraObservacion.interaccion_social}/5</p>
                        <p><strong>Seguimiento instrucciones:</strong> {primeraObservacion.seguimiento_instrucciones}/5</p>
                        <p><strong>Concentración:</strong> {primeraObservacion.concentracion}/5</p>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Formulario para nueva mejora */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <h4 className="text-lg font-bold text-gray-800">Registrar nueva mejora</h4>
                </div>
                
                <form onSubmit={enviarMejora} className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Fecha
                      </label>
                      <input
                        type="date"
                        value={nuevaMejora.fecha}
                        onChange={(e) =>
                          setNuevaMejora({ ...nuevaMejora, fecha: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Mejora observada
                      </label>
                      <input
                        type="text"
                        value={nuevaMejora.mejora}
                        onChange={(e) =>
                          setNuevaMejora({ ...nuevaMejora, mejora: e.target.value })
                        }
                        placeholder="Describe la mejora..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loadingMejora || !nuevaMejora.mejora.trim()}
                    className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {loadingMejora ? 'Guardando...' : 'Registrar mejora'}
                  </button>
                </form>
              </div>

              {/* Lista de mejoras registradas */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Mejoras registradas:
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {estudianteMejoras.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4 text-center">
                      No hay mejoras registradas aún
                    </p>
                  ) : (
                    estudianteMejoras.map((mejora) => (
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
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {estudianteAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Confirmar eliminación</h3>
                <p className="text-sm text-gray-600">Esta acción no se puede deshacer</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                ¿Estás segura de que deseas eliminar al estudiante <strong>{estudianteAEliminar.nombre}</strong>?
              </p>
              <p className="text-sm text-red-600 font-semibold">
                ⚠️ Esta acción eliminará permanentemente:
              </p>
              <ul className="text-sm text-gray-600 mt-2 ml-4 list-disc">
                <li>Todas las observaciones del estudiante</li>
                <li>Todos los comentarios y respuestas</li>
                <li>Todas las mejoras registradas</li>
                <li>El registro del estudiante</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEstudianteAEliminar(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminacion}
                disabled={eliminandoEstudiante !== null}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {eliminandoEstudiante ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalle del estudiante (para comentarios) */}
      {selectedEstudiante && !showModalMejoras && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {selectedEstudiante.nombre}
                </h3>
                <p className="text-sm text-gray-600">Grupo: {selectedEstudiante.grupo}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedEstudiante(null);
                  setEstudianteComentarios([]);
                  setEstudianteMejoras([]);
                  setNuevaRespuesta({});
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Sección de comentarios y respuestas */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-lg font-bold text-gray-800">
                    Comentarios y conversaciones
                  </h4>
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
                
                <div className="space-y-4">
                  {estudianteComentarios.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4">
                      No hay comentarios del orientador aún
                    </p>
                  ) : (
                    estudianteComentarios.map((comentario) => (
                      <div
                        key={comentario.id}
                        className="p-4 bg-indigo-50 rounded-lg border border-indigo-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xs font-semibold text-indigo-700">
                              {comentario.orientador?.nombre || 'Orientador'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(comentario.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-800 mb-3">{comentario.comentario}</p>

                        {/* Debug: mostrar información de respuestas */}
                        {process.env.NODE_ENV === 'development' && (
                          <p className="text-xs text-gray-400 mb-2">
                            Debug: respuestas = {comentario.respuestas ? comentario.respuestas.length : 'undefined'}
                          </p>
                        )}

                        {/* Respuestas - Mostrar dentro del mismo comentario */}
                        {comentario.respuestas && Array.isArray(comentario.respuestas) && comentario.respuestas.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-indigo-200">
                            <p className="text-xs font-semibold text-gray-600 mb-2">
                              Respuestas ({comentario.respuestas.length}):
                            </p>
                            <div className="space-y-2">
                              {comentario.respuestas.map((respuesta: RespuestaComentario) => (
                                <div
                                  key={respuesta.id}
                                  className="p-3 bg-white rounded-lg border border-gray-300 shadow-sm"
                                >
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
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Formulario de respuesta */}
                        <div className={`mt-3 pt-3 ${comentario.respuestas && comentario.respuestas.length > 0 ? '' : 'border-t border-indigo-200'}`}>
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
          </div>
        </div>
      )}
    </div>
  );
}

