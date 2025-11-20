import { useState, useEffect, FormEvent } from 'react';
import { Users, FileText, BarChart2, Activity } from 'lucide-react';
import Header from './Header';
import { supabase, Usuario, Observacion, Scoring } from '../lib/supabase';

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

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    rol: 'docente',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: usuariosData } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: observacionesData } = await supabase
      .from('observaciones')
      .select('*, estudiante:estudiantes(*)');

    const { data: scoringData } = await supabase.from('scoring').select('*');

    if (usuariosData) setUsuarios(usuariosData);

    if (observacionesData && scoringData) {
      const distribucion = { bajo: 0, medio: 0, alto: 0 };
      (scoringData as Scoring[]).forEach((s) => {
        distribucion[s.nivel_riesgo]++;
      });

      const grupos: Record<string, number> = {};
      (observacionesData as Observacion[]).forEach((obs) => {
        const grupo = obs.estudiante?.grupo || 'Sin grupo';
        grupos[grupo] = (grupos[grupo] || 0) + 1;
      });

      setStats({
        totalObservaciones: observacionesData.length,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <Header title="Panel de Administración" />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center transform hover:scale-105 transition">
            <Users className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Usuarios</h3>
            <p className="text-3xl font-bold text-indigo-600">{stats?.totalUsuarios || 0}</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition w-full"
            >
              Gestionar
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 text-center transform hover:scale-105 transition">
            <FileText className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Observaciones</h3>
            <p className="text-3xl font-bold text-green-600">
              {stats?.totalObservaciones || 0}
            </p>
            <p className="text-sm text-gray-500 mt-2">Total registradas</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 text-center transform hover:scale-105 transition">
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

          <div className="bg-white rounded-lg shadow-lg p-6 text-center transform hover:scale-105 transition">
            <Activity className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Grupos Activos</h3>
            <p className="text-3xl font-bold text-red-600">
              {Object.keys(stats?.observacionesPorGrupo || {}).length}
            </p>
            <p className="text-sm text-gray-500 mt-2">Con observaciones</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Usuarios del sistema</h3>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Observaciones por grupo
          </h3>
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Crear nuevo usuario</h3>

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
                  className={`px-4 py-3 rounded-lg ${
                    mensaje.includes('Error')
                      ? 'bg-red-50 text-red-700'
                      : 'bg-green-50 text-green-700'
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
  );
}
