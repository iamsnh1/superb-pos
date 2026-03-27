import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, authApi, setToken, removeToken } from '@/lib/api';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  branch_id: number | null;
}

interface AuthContextType {
  user: User | null;
  profile: User | null;
  role: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing token and validate
    const token = localStorage.getItem('auth_token');
    if (token) {
      authApi.me()
        .then(({ user }) => setUser(user))
        .catch(() => {
          removeToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    const { token, user } = await authApi.login(email, password);
    setToken(token);
    setUser(user);
    navigate('/');
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { token, user } = await authApi.register({ email, password, full_name: fullName });
    setToken(token);
    setUser(user);
    navigate('/');
  };

  const signOut = () => {
    removeToken();
    setUser(null);
    navigate('/auth');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user,
        role: user?.role || null,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
