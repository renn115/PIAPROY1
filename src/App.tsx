import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Docente from './components/Docente';
import Orientador from './components/Orientador';
import Admin from './components/Admin';

function AppContent() {
  const { usuario } = useAuth();

  if (!usuario) {
    return <Login />;
  }

  if (usuario.rol === 'docente') {
    return <Docente />;
  }

  if (usuario.rol === 'orientador') {
    return <Orientador />;
  }

  if (usuario.rol === 'admin') {
    return <Admin />;
  }

  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
