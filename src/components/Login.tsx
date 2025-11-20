import { useState, FormEvent } from 'react';
import { User } from 'lucide-react';
import { loginUser } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUsuario } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const usuario = await loginUser(email, password);

      if (!usuario) {
        setError('Credenciales inválidas. Por favor, verifica tu email y contraseña.');
        setLoading(false);
        return;
      }

      setUsuario(usuario);
    } catch (err) {
      setError('Error al iniciar sesión. Por favor, intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-100">
  {/* Figuras decorativas */}
  <div className="absolute w-40 h-40 bg-blue-600 rounded-full bottom-10 left-10 opacity-90 shadow-lg" />
  <div className="absolute w-24 h-24 bg-pink-500 rotate-12 top-40 right-32 shadow-lg" />
  <div className="absolute w-20 h-20 bg-orange-500 rotate-12 bottom-70 left-40 shadow-lg" />
  
  <div
  className="absolute w-0 h-0
  border-l-[40px] border-l-transparent
  border-r-[30px] border-r-transparent
  border-b-[70px] border-b-green-400
  top-80 right-20 rotate-3"
/>

  <div className="absolute w-0 h-0 
      border-l-[60px] border-l-transparent 
      border-r-[60px] border-r-transparent 
      border-b-[100px] border-b-yellow-400 
      top-20 left-1/3 rotate-6" />

  {/*contenedor del login */}
  <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md relative z-10">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
            <img src="/src/components/Brain.png" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">NeuroEDU</h2>
          <p className="text-gray-500 mt-2 text-sm">Iniciar Sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="usuario@gmail.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión...' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            <strong>Usuarios de prueba:</strong><br />
            docente@test.com | orientador@test.com | admin@test.com<br />
            Contraseña: <code className="bg-gray-100 px-2 py-1 rounded">password123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
