
"use client";

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password?: string) => Promise<void>; // Parameter changed to username
  logout: () => Promise<void>;
  setUser: Dispatch<SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (username: string, password?: string) => { // Parameter is now username
    setError(null);
    setLoading(true);
    try {
      if (!username || !password) {
        throw new Error('Por favor, introduce tu usuario y contraseña.');
      }

      const fullEmail = `${username.trim()}@v3ga.com`; // Construct the full email

      await signInWithEmailAndPassword(auth, fullEmail, password);
      router.push('/');
      
    } catch (err: any) {
      console.error("Error de inicio de sesión:", err);
      if (err.code === 'auth/invalid-credential' || 
          err.code === 'auth/user-not-found' || // Keep user-not-found as it might map to the constructed email
          err.code === 'auth/wrong-password' ||
          err.code === 'auth/invalid-email') { // invalid-email could still occur if username is empty after trim
        setError('Usuario o contraseña incorrectos.');
      } else {
        setError(err.message || 'Error al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
      router.push('/login');
    } catch (err: any) {
      console.error("Error al cerrar sesión:", err);
      setError(err.message || 'Error al cerrar sesión.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
