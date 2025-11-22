import { useState, useEffect, FormEvent } from 'react';
import { Users, FileText, BarChart2, Activity, AlertCircle, X, Trash2 } from 'lucide-react';
import Header from './Header';
import { supabase, Usuario, Observacion, Scoring, LogEliminacion } from '../lib/supabase';
import { generarReportePDFGlobal } from '../lib/reportes';

interface Estadisticas {
  totalObservaciones: number;
  totalUsuarios: number;
  distribucionRiesgo: { bajo: number; medio: number; alto: number };
  observacionesPorGrupo: Record<string, number>;
}

export default function Admin() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [stats, setStats] = useState<Estadisticas | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalDetalle, setModalDetalle] = useState<'usuarios' | 'observaciones' | 'riesgo' | 'grupos' | 'eliminaciones' | null>(null);
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [scorings, setScorings] = useState<Scoring[]>([]);
  const [logsEliminaciones, setLogsEliminaciones] = useState<LogEliminacion[]>([]);
  const [notificacionesCerradas, setNotificacionesCerradas] = useState<Set<string>>(new Set());
  const [ultimaVista, setUltimaVista] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [usuarioAConfirmar, setUsuarioAConfirmar] = useState<{ id: string; nombre: string; activo: boolean } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<{ id: string; nombre: string } | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    rol: 'docente',
  });

  useEffect(() => {
    cargarDatos();
    cargarLogsEliminaciones();
    // Cargar notificaciones cerradas y última vista desde localStorage
    try {
      const cerradas = localStorage.getItem('notificacionesEliminacionesCerradas');
      if (cerradas) {
        setNotificacionesCerradas(new Set(JSON.parse(cerradas)));
      }
      const ultimaVistaStorage = localStorage.getItem('ultimaVistaEliminaciones');
      if (ultimaVistaStorage) {
        setUltimaVista(ultimaVistaStorage);
      }
    } catch (e) {
      console.error('Error al cargar notificaciones cerradas:', e);
    }
    // Recargar logs cada 5 segundos para ver nuevas eliminaciones
    const interval = setInterval(() => {
      cargarLogsEliminaciones();
      cargarDatos();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Cuando se cargan los logs por primera vez y no hay ultimaVista, marcar todas como vistas
  useEffect(() => {
    if (logsEliminaciones.length > 0 && !ultimaVista) {
      // Usar el timestamp más reciente de los logs existentes + 1 segundo para marcar todos como vistos
      const timestampMasReciente = new Date(logsEliminaciones[0].created_at);
      timestampMasReciente.setSeconds(timestampMasReciente.getSeconds() + 1);
      const timestampString = timestampMasReciente.toISOString();
      localStorage.setItem('ultimaVistaEliminaciones', timestampString);
      setUltimaVista(timestampString);
    }
  }, [logsEliminaciones, ultimaVista]);

  const cargarLogsEliminaciones = async () => {
    const { data } = await supabase
      .from('logs_eliminaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
      setLogsEliminaciones(data as LogEliminacion[]);
    }
  };

  const cargarDatos = async () => {
    const { data: usuariosData } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: observacionesData } = await supabase
      .from('observaciones')
      .select('*, estudiante:estudiantes(*), docente:usuarios(*)')
      .order('created_at', { ascending: false });

    const { data: scoringData } = await supabase
      .from('scoring')
      .select('*, estudiante:estudiantes(*)')
      .order('created_at', { ascending: false });

    if (usuariosData) setUsuarios(usuariosData);
    
    // Función auxiliar para verificar si un estudiante es válido
    const esEstudianteValido = (estudiante: any): boolean => {
      if (!estudiante) return false;
      if (!estudiante.id) return false;
      if (!estudiante.nombre || estudiante.nombre.trim() === '') return false;
      // Excluir específicamente a Maria Lopez (estudiante eliminado)
      if (estudiante.nombre.trim() === 'Maria Lopez') return false;
      // Verificar que el estudiante realmente existe en la base de datos
      // Si el join falló, estudiante será null o tendrá solo el id
      return true;
    };
    
    // Filtrar observaciones que tienen estudiantes válidos (no eliminados)
    if (observacionesData) {
      const observacionesValidas = observacionesData.filter(
        (obs: Observacion) => esEstudianteValido(obs.estudiante)
      );
      setObservaciones(observacionesValidas as Observacion[]);
    }
    // Filtrar scoring que tiene estudiantes válidos
    if (scoringData) {
      const scoringValido = scoringData.filter(
        (s: Scoring) => esEstudianteValido(s.estudiante)
      );
      setScorings(scoringValido as Scoring[]);
    }

    if (observacionesData && scoringData) {
      // Filtrar scoring válido y agrupar por estudiante (mantener solo el más reciente)
      const scoringValido = (scoringData as Scoring[]).filter(
        (s: Scoring) => esEstudianteValido(s.estudiante)
      );
      
      // Agrupar por estudiante, manteniendo solo el más reciente
      const scoringPorEstudiante = new Map<string, Scoring>();
      scoringValido.forEach((scoring) => {
        const estudianteId = scoring.estudiante_id;
        if (!scoringPorEstudiante.has(estudianteId)) {
          scoringPorEstudiante.set(estudianteId, scoring);
        } else {
          // Si ya existe, mantener el más reciente
          const existente = scoringPorEstudiante.get(estudianteId)!;
          if (new Date(scoring.created_at) > new Date(existente.created_at)) {
            scoringPorEstudiante.set(estudianteId, scoring);
          }
        }
      });

      // Calcular distribución basada en estudiantes únicos
      const distribucion = { bajo: 0, medio: 0, alto: 0 };
      scoringPorEstudiante.forEach((s) => {
        distribucion[s.nivel_riesgo]++;
      });

      // Filtrar observaciones válidas para estadísticas
      const observacionesValidas = (observacionesData as Observacion[]).filter(
        (obs) => esEstudianteValido(obs.estudiante)
      );
      
      const grupos: Record<string, number> = {};
      observacionesValidas.forEach((obs) => {
        const grupo = obs.estudiante?.grupo || 'Sin grupo';
        grupos[grupo] = (grupos[grupo] || 0) + 1;
      });

      setStats({
        totalObservaciones: observacionesValidas.length,
        totalUsuarios: usuariosData?.length || 0,
        distribucionRiesgo: distribucion,
        observacionesPorGrupo: grupos,
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje('');

    try {
      const { error } = await supabase.from('usuarios').insert({
        email: formData.email,
        password: formData.password,
        nombre: formData.nombre,
        rol: formData.rol,
      });

      if (error) throw error;

      setMensaje('Usuario creado exitosamente');
      setFormData({ email: '', password: '', nombre: '', rol: 'docente' });
      setShowModal(false);
      cargarDatos();
    } catch (error) {
      setMensaje('Error al crear usuario');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEstadoClick = (usuario: Usuario) => {
    setUsuarioAConfirmar({ id: usuario.id, nombre: usuario.nombre, activo: usuario.activo });
    setShowConfirmModal(true);
  };

  const confirmarCambioEstado = async () => {
    if (!usuarioAConfirmar) return;
    
    setLoading(true);
    setShowConfirmModal(false);
    
    try {
      const nuevoEstado = !usuarioAConfirmar.activo;
      const { error } = await supabase
        .from('usuarios')
        .update({ activo: nuevoEstado })
        .eq('id', usuarioAConfirmar.id);

      if (error) throw error;

      setMensaje(`Usuario ${nuevoEstado ? 'activado' : 'dado de baja'} exitosamente`);
      cargarDatos();
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setMensaje('Error al actualizar el estado del usuario');
      console.error(error);
      setTimeout(() => setMensaje(''), 3000);
    } finally {
      setLoading(false);
      setUsuarioAConfirmar(null);
    }
  };

  const handleEliminarUsuario = (usuario: Usuario) => {
    setUsuarioAEliminar({ id: usuario.id, nombre: usuario.nombre });
    setShowDeleteModal(true);
  };

  const confirmarEliminarUsuario = async () => {
    if (!usuarioAEliminar) return;
    
    setLoading(true);
    setShowDeleteModal(false);
    
    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', usuarioAEliminar.id);

      if (error) throw error;

      setMensaje(`Usuario ${usuarioAEliminar.nombre} eliminado exitosamente`);
      cargarDatos();
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setMensaje('Error al eliminar el usuario');
      console.error(error);
      setTimeout(() => setMensaje(''), 3000);
    } finally {
      setLoading(false);
      setUsuarioAEliminar(null);
    }
  };

  // Calcular notificaciones nuevas antes del render
  // Agrupar por estudiante y mostrar solo la más reciente de cada uno
  const logsFiltrados = logsEliminaciones.filter(log => {
    if (notificacionesCerradas.has(log.id)) return false;
    if (!ultimaVista) return false;
    return new Date(log.created_at) > new Date(ultimaVista);
  });
  
  // Agrupar por nombre de estudiante, manteniendo solo la más reciente
  const estudiantesMap = new Map<string, LogEliminacion>();
  logsFiltrados.forEach(log => {
    const nombre = log.estudiante_nombre;
    const existing = estudiantesMap.get(nombre);
    if (!existing || new Date(log.created_at) > new Date(existing.created_at)) {
      estudiantesMap.set(nombre, log);
    }
  });
  
  const notificacionesNuevas = Array.from(estudiantesMap.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Agrupar logs para el historial (solo la más reciente de cada estudiante)
  const logsHistorialMap = new Map<string, LogEliminacion>();
  logsEliminaciones.forEach(log => {
    const nombre = log.estudiante_nombre;
    const existing = logsHistorialMap.get(nombre);
    if (!existing || new Date(log.created_at) > new Date(existing.created_at)) {
      logsHistorialMap.set(nombre, log);
    }
  });
  const logsHistorial = Array.from(logsHistorialMap.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  // Contar estudiantes únicos eliminados
  const totalEstudiantesEliminados = logsHistorial.length;

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
        <Header title="Panel de Administración" />
        
        <div className="flex justify-end mb-4 mt-8">
          <button
            onClick={async () => {
              if (!stats) return;
              // Cargar estudiantes únicos
              const { data: estudiantesData } = await supabase
                .from('estudiantes')
                .select('id')
                .neq('nombre', 'Maria Lopez');
              
              const totalEstudiantes = estudiantesData?.length || 0;
              
              // Cargar casos por estado para incluir en reporte
              const { data } = await supabase
                .from('casos_seguimiento')
                .select('estado');
              
              const casosPorEstado = {
                abierto: 0,
                en_seguimiento: 0,
                cerrado: 0,
              };
              if (data) {
                data.forEach((caso: { estado: string }) => {
                  if (caso.estado === 'abierto') casosPorEstado.abierto++;
                  else if (caso.estado === 'en_seguimiento') casosPorEstado.en_seguimiento++;
                  else if (caso.estado === 'cerrado') casosPorEstado.cerrado++;
                });
              }
              generarReportePDFGlobal({
                ...stats,
                totalEstudiantes,
                casosPorEstado,
                usuarios: usuarios,
                observaciones: observaciones,
                scorings: scorings,
                eliminaciones: logsEliminaciones,
              });
            }}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            <FileText className="w-4 h-4" />
            Exportar Reporte PDF
          </button>
        </div>

        <main className="mt-6">
          {/* Notificaciones de eliminaciones - Solo mostrar las nuevas */}
          {notificacionesNuevas.length > 0 && notificacionesNuevas.slice(0, 3).map((log) => (
            <div
              key={log.id}
              className="mb-4 bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start justify-between"
            >
              <div className="flex items-start gap-3 flex-1">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800 text-sm">
                    Estudiante eliminado
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    <span className="font-semibold">{log.estudiante_nombre}</span>
                    {log.estudiante_grupo && ` (Grupo: ${log.estudiante_grupo})`}
                    {log.docente_nombre && ` - Eliminado por: ${log.docente_nombre}`}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {new Date(log.created_at).toLocaleString('es-ES')}
                  </p>
                </div>
              </div>
                <button
                  onClick={() => {
                    const nuevasCerradas = new Set(notificacionesCerradas);
                    // Cerrar TODAS las notificaciones de este estudiante
                    logsEliminaciones.forEach(l => {
                      if (l.estudiante_nombre === log.estudiante_nombre) {
                        nuevasCerradas.add(l.id);
                      }
                    });
                    setNotificacionesCerradas(nuevasCerradas);
                    const ahora = new Date().toISOString();
                    try {
                      localStorage.setItem('notificacionesEliminacionesCerradas', JSON.stringify(Array.from(nuevasCerradas)));
                      localStorage.setItem('ultimaVistaEliminaciones', ahora);
                      setUltimaVista(ahora);
                    } catch (e) {
                      console.error('Error al guardar notificaciones cerradas:', e);
                    }
                  }}
                  className="text-red-400 hover:text-red-600 ml-2"
                >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
            <div 
              onClick={() => setModalDetalle('usuarios')}
              className="bg-white rounded-lg shadow-md p-6 text-center transform hover:scale-105 transition cursor-pointer"
            >
              <Users className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Usuarios</h3>
              <p className="text-3xl font-bold text-indigo-600">{stats?.totalUsuarios || 0}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModal(true);
                }}
                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition w-full"
              >
                Gestionar
              </button>
            </div>

            <div 
              onClick={() => setModalDetalle('observaciones')}
              className="bg-white rounded-lg shadow-md p-6 text-center transform hover:scale-105 transition cursor-pointer"
            >
              <FileText className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Observaciones</h3>
              <p className="text-3xl font-bold text-green-600">
                {stats?.totalObservaciones || 0}
              </p>
              <p className="text-sm text-gray-500 mt-2">Total registradas</p>
            </div>

            <div 
              onClick={() => setModalDetalle('riesgo')}
              className="bg-white rounded-lg shadow-md p-6 text-center transform hover:scale-105 transition cursor-pointer"
            >
              <BarChart2 className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Distribución de Riesgo</h3>
              <div className="space-y-1 text-sm">
                <p className="text-red-600">Alto: {stats?.distribucionRiesgo.alto || 0}</p>
                <p className="text-yellow-600">
                  Medio: {stats?.distribucionRiesgo.medio || 0}
                </p>
                <p className="text-green-600">Bajo: {stats?.distribucionRiesgo.bajo || 0}</p>
              </div>
            </div>

            <div 
              onClick={() => setModalDetalle('grupos')}
              className="bg-white rounded-lg shadow-md p-6 text-center transform hover:scale-105 transition cursor-pointer"
            >
              <Activity className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Grupos Activos</h3>
              <p className="text-3xl font-bold text-red-600">
                {Object.keys(stats?.observacionesPorGrupo || {}).length}
              </p>
              <p className="text-sm text-gray-500 mt-2">Con observaciones</p>
            </div>

            <div 
              onClick={() => setModalDetalle('eliminaciones')}
              className="bg-white rounded-lg shadow-md p-6 text-center transform hover:scale-105 transition cursor-pointer"
            >
              <AlertCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Eliminados</h3>
              <p className="text-3xl font-bold text-orange-600">
                {totalEstudiantesEliminados}
              </p>
              <p className="text-sm text-gray-500 mt-2">Estudiantes eliminados</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-800">Usuarios del sistema</h3>
            </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase sticky right-0 bg-gray-50">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{usuario.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{usuario.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
                        {usuario.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          usuario.activo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 sticky right-0 bg-white">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleEstadoClick(usuario)}
                          disabled={loading}
                          className={`px-3 py-1.5 text-xs font-semibold rounded ${
                            usuario.activo
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                        >
                          {usuario.activo ? 'Dar de baja' : 'Activar'}
                        </button>
                        <button
                          onClick={() => handleEliminarUsuario(usuario)}
                          disabled={loading}
                          className="px-3 py-1.5 text-xs font-semibold rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-800">
                Observaciones por grupo
              </h3>
            </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats?.observacionesPorGrupo || {}).map(([grupo, count]) => (
              <div key={grupo} className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-lg font-bold text-indigo-600">{grupo}</p>
                <p className="text-2xl font-bold text-gray-800">{count}</p>
                <p className="text-xs text-gray-500">observaciones</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modal de detalle */}
      {modalDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                {modalDetalle === 'usuarios' && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-6 h-6 text-indigo-600" />
                      <h3 className="text-2xl font-bold text-gray-800">Usuarios del sistema</h3>
                    </div>
                    <p className="text-sm text-gray-600">Total: {usuarios.length} usuarios</p>
                  </>
                )}
                {modalDetalle === 'observaciones' && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-6 h-6 text-green-600" />
                      <h3 className="text-2xl font-bold text-gray-800">Observaciones registradas</h3>
                    </div>
                    <p className="text-sm text-gray-600">Total: {observaciones.length} observaciones</p>
                  </>
                )}
                {modalDetalle === 'riesgo' && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart2 className="w-6 h-6 text-yellow-600" />
                      <h3 className="text-2xl font-bold text-gray-800">Distribución de riesgo</h3>
                    </div>
                    <p className="text-sm text-gray-600">Total: {scorings.length} evaluaciones</p>
                  </>
                )}
                {modalDetalle === 'grupos' && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-6 h-6 text-red-600" />
                      <h3 className="text-2xl font-bold text-gray-800">Grupos activos</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {Object.keys(stats?.observacionesPorGrupo || {}).length} grupos con observaciones
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={() => setModalDetalle(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {modalDetalle === 'usuarios' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Nombre</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Rol</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Fecha registro</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {usuarios.map((usuario) => (
                        <tr key={usuario.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm text-gray-900">{usuario.nombre}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{usuario.email}</td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
                              {usuario.rol}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                usuario.activo
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {usuario.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {new Date(usuario.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 bg-white">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleToggleEstadoClick(usuario)}
                                disabled={loading}
                                className={`px-3 py-1.5 text-xs font-semibold rounded ${
                                  usuario.activo
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                              >
                                {usuario.activo ? 'Dar de baja' : 'Activar'}
                              </button>
                              <button
                                onClick={() => handleEliminarUsuario(usuario)}
                                disabled={loading}
                                className="px-3 py-1.5 text-xs font-semibold rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {modalDetalle === 'observaciones' && (() => {
                // Filtrar observaciones válidas primero
                const observacionesFiltradas = observaciones.filter(
                  (obs) => obs.estudiante && 
                          obs.estudiante.id && 
                          obs.estudiante.nombre && 
                          obs.estudiante.nombre.trim() !== '' &&
                          obs.estudiante.nombre.trim() !== 'Maria Lopez'
                );
                
                // Agrupar observaciones por estudiante
                const observacionesPorEstudiante = new Map<string, Observacion[]>();
                observacionesFiltradas.forEach((obs) => {
                  const estudianteId = obs.estudiante_id;
                  if (!observacionesPorEstudiante.has(estudianteId)) {
                    observacionesPorEstudiante.set(estudianteId, []);
                  }
                  observacionesPorEstudiante.get(estudianteId)!.push(obs);
                });

                return (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {observacionesFiltradas.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No hay observaciones registradas</p>
                    ) : (
                      Array.from(observacionesPorEstudiante.entries()).map(([estudianteId, obsList]) => {
                        const primeraObs = obsList[0];
                        const estudianteNombre = primeraObs.estudiante?.nombre || 'Estudiante desconocido';
                        const estudianteGrupo = primeraObs.estudiante?.grupo || 'N/A';
                        return (
                          <div key={estudianteId} className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                              <div>
                                <p className="font-bold text-gray-800">
                                  {estudianteNombre}
                                </p>
                                <p className="text-xs text-gray-600">Grupo: {estudianteGrupo}</p>
                              </div>
                              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                                {obsList.length} {obsList.length === 1 ? 'observación' : 'observaciones'}
                              </span>
                            </div>
                            <div className="space-y-3">
                              {obsList.map((obs) => (
                                <div key={obs.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                      {obs.docente && (
                                        <p className="text-xs text-gray-500 mb-1">
                                          Docente: {obs.docente.nombre}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-500">
                                        {obs.fecha_observacion 
                                          ? new Date(obs.fecha_observacion).toLocaleDateString()
                                          : new Date(obs.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                      {new Date(obs.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                  <p className="text-sm text-gray-800 mb-2">{obs.comportamiento}</p>
                                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                    <p>Atención: {obs.nivel_atencion}</p>
                                    <p>Interacción: {obs.interaccion_social}/5</p>
                                    <p>Seguimiento: {obs.seguimiento_instrucciones}/5</p>
                                    <p>Concentración: {obs.concentracion}/5</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })()}

              {modalDetalle === 'riesgo' && (() => {
                // Filtrar scoring válido primero
                const scoringFiltrado = scorings.filter(
                  (s) => s.estudiante && 
                         s.estudiante.id && 
                         s.estudiante.nombre && 
                         s.estudiante.nombre.trim() !== '' &&
                         s.estudiante.nombre.trim() !== 'Maria Lopez'
                );
                
                // Agrupar scoring por estudiante, manteniendo solo el más reciente
                const scoringPorEstudiante = new Map<string, Scoring>();
                scoringFiltrado.forEach((scoring) => {
                  const estudianteId = scoring.estudiante_id;
                  if (!scoringPorEstudiante.has(estudianteId)) {
                    scoringPorEstudiante.set(estudianteId, scoring);
                  } else {
                    // Si ya existe, mantener el más reciente
                    const existente = scoringPorEstudiante.get(estudianteId)!;
                    if (new Date(scoring.created_at) > new Date(existente.created_at)) {
                      scoringPorEstudiante.set(estudianteId, scoring);
                    }
                  }
                });

                const scoringUnicos = Array.from(scoringPorEstudiante.values());

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
                        <p className="text-sm font-semibold text-red-700 mb-1">Alto Riesgo</p>
                        <p className="text-3xl font-bold text-red-600">
                          {scoringUnicos.filter(s => s.nivel_riesgo === 'alto').length}
                        </p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center">
                        <p className="text-sm font-semibold text-yellow-700 mb-1">Medio Riesgo</p>
                        <p className="text-3xl font-bold text-yellow-600">
                          {scoringUnicos.filter(s => s.nivel_riesgo === 'medio').length}
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                        <p className="text-sm font-semibold text-green-700 mb-1">Bajo Riesgo</p>
                        <p className="text-3xl font-bold text-green-600">
                          {scoringUnicos.filter(s => s.nivel_riesgo === 'bajo').length}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {scoringUnicos.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No hay evaluaciones de riesgo</p>
                      ) : (
                        scoringUnicos.map((scoring) => {
                          const estudianteNombre = scoring.estudiante?.nombre || 'Estudiante desconocido';
                          const estudianteGrupo = scoring.estudiante?.grupo || 'N/A';
                          return (
                            <div key={scoring.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-semibold text-gray-800 text-sm">
                                    {estudianteNombre}
                                  </p>
                                  <p className="text-xs text-gray-600">Grupo: {estudianteGrupo}</p>
                                </div>
                                <span
                                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                    scoring.nivel_riesgo === 'alto'
                                      ? 'bg-red-100 text-red-700'
                                      : scoring.nivel_riesgo === 'medio'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}
                                >
                                  {scoring.nivel_riesgo} ({scoring.puntuacion?.toFixed(1)})
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                Evaluado: {new Date(scoring.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}

              {modalDetalle === 'grupos' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {Object.entries(stats?.observacionesPorGrupo || {}).map(([grupo, count]) => (
                      <div key={grupo} className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 text-center">
                        <p className="text-lg font-bold text-indigo-600">{grupo}</p>
                        <p className="text-2xl font-bold text-gray-800">{count}</p>
                        <p className="text-xs text-gray-500">observaciones</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {Object.entries(stats?.observacionesPorGrupo || {}).map(([grupo, count]) => {
                      const observacionesGrupo = observaciones.filter(
                        (obs) => obs.estudiante?.grupo === grupo &&
                                 obs.estudiante &&
                                 obs.estudiante.id &&
                                 obs.estudiante.nombre &&
                                 obs.estudiante.nombre.trim() !== '' &&
                                 obs.estudiante.nombre.trim() !== 'Maria Lopez'
                      );
                      return (
                        <div key={grupo} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-gray-800">Grupo {grupo}</h4>
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded">
                              {count} observaciones
                            </span>
                          </div>
                          <div className="space-y-2">
                            {observacionesGrupo.slice(0, 5).map((obs) => {
                              const estudianteNombre = obs.estudiante?.nombre || 'Desconocido';
                              return (
                                <div key={obs.id} className="p-2 bg-white rounded border border-gray-200">
                                  <div className="flex justify-between items-start">
                                    <p className="text-xs font-semibold text-gray-700">
                                      {estudianteNombre}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(obs.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1">{obs.comportamiento}</p>
                                </div>
                              );
                            })}
                            {observacionesGrupo.length > 5 && (
                              <p className="text-xs text-gray-500 text-center">
                                ... y {observacionesGrupo.length - 5} más
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {modalDetalle === 'eliminaciones' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                    <h3 className="text-2xl font-bold text-gray-800">Historial de eliminaciones</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Total: {logsHistorial.length} estudiantes eliminados
                  </p>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {logsHistorial.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No hay eliminaciones registradas</p>
                    ) : (
                      logsHistorial.map((log) => {
                        const estaCerrada = notificacionesCerradas.has(log.id);
                        return (
                          <div
                            key={log.id}
                            className={`p-4 rounded-lg border-2 ${
                              estaCerrada
                                ? 'bg-gray-50 border-gray-200 opacity-75'
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                                  estaCerrada ? 'text-gray-400' : 'text-red-600'
                                }`} />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className={`font-semibold text-sm ${
                                      estaCerrada ? 'text-gray-600' : 'text-red-800'
                                    }`}>
                                      Estudiante eliminado
                                    </p>
                                    {estaCerrada && (
                                      <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-semibold rounded">
                                        Cerrada
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-sm mt-1 ${
                                    estaCerrada ? 'text-gray-600' : 'text-red-700'
                                  }`}>
                                    <span className="font-semibold">{log.estudiante_nombre}</span>
                                    {log.estudiante_grupo && ` (Grupo: ${log.estudiante_grupo})`}
                                  </p>
                                  {log.docente_nombre && (
                                    <p className={`text-xs mt-1 ${
                                      estaCerrada ? 'text-gray-500' : 'text-red-600'
                                    }`}>
                                      Eliminado por: {log.docente_nombre}
                                    </p>
                                  )}
                                  <p className={`text-xs mt-1 ${
                                    estaCerrada ? 'text-gray-400' : 'text-red-500'
                                  }`}>
                                    {new Date(log.created_at).toLocaleString('es-ES', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para dar de baja/activar usuario */}
      {showConfirmModal && usuarioAConfirmar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {usuarioAConfirmar.activo ? 'Dar de baja usuario' : 'Activar usuario'}
              </h3>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setUsuarioAConfirmar(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-700 mb-6">
              ¿Estás seguro de que deseas {usuarioAConfirmar.activo ? 'dar de baja' : 'activar'} la cuenta de{' '}
              <span className="font-semibold">{usuarioAConfirmar.nombre}</span>?
              {usuarioAConfirmar.activo && (
                <span className="block mt-2 text-sm text-red-600">
                  El usuario no podrá iniciar sesión hasta que se reactive su cuenta.
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setUsuarioAConfirmar(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCambioEstado}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  usuarioAConfirmar.activo
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Procesando...' : usuarioAConfirmar.activo ? 'Dar de baja' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar usuario */}
      {showDeleteModal && usuarioAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-red-800">Eliminar usuario</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUsuarioAEliminar(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                ¿Estás seguro de que deseas eliminar permanentemente la cuenta de{' '}
                <span className="font-semibold">{usuarioAEliminar.nombre}</span>?
              </p>
              <p className="text-sm text-red-600 font-semibold">
                ⚠️ Esta acción no se puede deshacer. El usuario será eliminado permanentemente del sistema.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUsuarioAEliminar(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminarUsuario}
                disabled={loading}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? 'Eliminando...' : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar permanentemente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-800">Crear nuevo usuario</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setMensaje('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rol</label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="docente">Docente</option>
                  <option value="orientador">Orientador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {mensaje && (
                <div
                  className={`px-4 py-3 rounded-lg font-semibold ${
                    mensaje.includes('Error')
                      ? 'bg-red-50 border-2 border-red-300 text-red-700'
                      : 'bg-green-50 border-2 border-green-300 text-green-700'
                  }`}
                >
                  {mensaje}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear usuario'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setMensaje('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
