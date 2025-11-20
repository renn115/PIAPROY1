import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { usuario, logout } = useAuth();

  return (
    <header className="bg-indigo-600 text-white py-7 shadow-lg">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-indigo-200">
            {usuario?.nombre} • {usuario?.rol}
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
