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
  {/* Figuras decorativas - Distribuidas uniformemente por toda la pantalla */}
  {/* Círculos grandes - Esquinas y bordes */}
  <div className="absolute w-40 h-40 bg-blue-600 rounded-full bottom-10 left-10 opacity-90 shadow-lg" />
  <div className="absolute w-36 h-36 bg-purple-500 rounded-full top-10 right-10 opacity-70 shadow-lg" />
  <div className="absolute w-32 h-32 bg-cyan-500 rounded-full top-10 left-1/2 opacity-60 shadow-lg" />
  
  {/* Círculos medianos - Distribuidos */}
  <div className="absolute w-24 h-24 bg-pink-500 rounded-full top-1/4 right-1/4 opacity-80 shadow-lg rotate-12" />
  <div className="absolute w-28 h-28 bg-teal-500 rounded-full bottom-1/4 left-1/4 opacity-50 shadow-lg" />
  <div className="absolute w-22 h-22 bg-rose-500 rounded-full top-2/3 right-1/3 opacity-65 shadow-lg" />
  
  {/* Círculos pequeños - Esparcidos */}
  <div className="absolute w-20 h-20 bg-orange-500 rounded-full top-1/3 left-1/5 opacity-75 shadow-lg rotate-45" />
  <div className="absolute w-16 h-16 bg-indigo-500 rounded-full bottom-1/3 right-1/5 opacity-40 shadow-lg" />
  <div className="absolute w-18 h-18 bg-amber-500 rounded-full top-3/4 left-3/4 opacity-55 shadow-lg" />
  <div className="absolute w-14 h-14 bg-emerald-500 rounded-full bottom-1/5 right-1/2 opacity-45 shadow-lg" />
  
  {/* Triángulos grandes - Esquinas opuestas */}
  <div className="absolute w-0 h-0 
      border-l-[60px] border-l-transparent 
      border-r-[60px] border-r-transparent 
      border-b-[100px] border-b-yellow-400 
      top-20 left-1/4 opacity-80 rotate-6" />
  <div className="absolute w-0 h-0 
      border-l-[50px] border-l-transparent 
      border-r-[50px] border-r-transparent 
      border-b-[85px] border-b-purple-400 
      bottom-20 right-1/4 opacity-60 rotate-30" />
  
  {/* Triángulos medianos - Lados opuestos */}
  <div className="absolute w-0 h-0
      border-l-[40px] border-l-transparent
      border-r-[30px] border-r-transparent
      border-b-[70px] border-b-green-400
      top-1/2 right-1/5 opacity-70 rotate-3" />
  <div className="absolute w-0 h-0 
      border-l-[35px] border-l-transparent 
      border-r-[35px] border-r-transparent 
      border-b-[60px] border-b-pink-400 
      bottom-1/2 left-1/5 opacity-50 rotate-12" />
  
  {/* Triángulos pequeños - Esparcidos */}
  <div className="absolute w-0 h-0 
      border-l-[25px] border-l-transparent 
      border-r-[25px] border-r-transparent 
      border-b-[45px] border-b-blue-400 
      top-1/5 left-1/3 opacity-55 rotate-45" />
  <div className="absolute w-0 h-0 
      border-l-[30px] border-l-transparent 
      border-r-[30px] border-r-transparent 
      border-b-[55px] border-b-orange-400 
      bottom-1/5 right-1/3 opacity-40 rotate-18" />
  
  {/* Cuadrados grandes - Centro y bordes */}
  <div className="absolute w-20 h-20 bg-indigo-500 top-1/3 right-1/3 opacity-60 rotate-45 shadow-lg" />
  <div className="absolute w-18 h-18 bg-purple-500 bottom-1/3 left-1/3 opacity-50 rotate-12 shadow-lg" />
  
  {/* Cuadrados medianos - Distribuidos */}
  <div className="absolute w-16 h-16 bg-rose-500 top-1/2 left-1/6 opacity-45 rotate-6 shadow-lg" />
  <div className="absolute w-14 h-14 bg-amber-500 bottom-1/2 right-1/6 opacity-55 rotate-30 shadow-lg" />
  
  {/* Cuadrados pequeños - Esquinas y bordes */}
  <div className="absolute w-12 h-12 bg-teal-500 top-1/6 right-1/6 opacity-40 rotate-15 shadow-lg" />
  <div className="absolute w-10 h-10 bg-cyan-500 bottom-1/6 left-1/6 opacity-50 rotate-25 shadow-lg" />

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
            docente@example.com | orientador@example.com | admin@example.com<br />
            Contraseña: <code className="bg-gray-100 px-2 py-1 rounded">rol123</code>
          </p>
        </div>
      </div>
    </div>
  );
}

