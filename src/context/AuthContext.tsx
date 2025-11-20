import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Usuario } from '../lib/supabase';

interface AuthContextType {
  usuario: Usuario | null;
  setUsuario: (usuario: Usuario | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const stored = sessionStorage.getItem('usuario');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (usuario) {
      sessionStorage.setItem('usuario', JSON.stringify(usuario));
    } else {
      sessionStorage.removeItem('usuario');
    }
  }, [usuario]);

  const logout = () => {
    setUsuario(null);
    sessionStorage.removeItem('usuario');
  };

  return (
    <AuthContext.Provider value={{ usuario, setUsuario, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
