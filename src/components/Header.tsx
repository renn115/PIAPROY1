import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Shapes3 from "./Shapes3.png";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { usuario, logout } = useAuth();

  return (
    <header className="bg-gray-100 text-black py-7 shadow">
      <div className="container mx-auto px-4 flex justify-between items-center">

        {/* Izquierda: logo + título */}
        <div className="flex items-center gap-4">
          <img src={Shapes3} className="w-20 h-15 object-contain" alt="Logo" />

          <div className="flex flex-col leading-tight">
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-sm text-gray-600">
              {usuario?.nombre} • {usuario?.rol}
            </p>
          </div>
        </div>

        {/* Derecha: botón */}
        <button
          onClick={logout}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-800 transition"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>

      </div>
    </header>
  );
}
