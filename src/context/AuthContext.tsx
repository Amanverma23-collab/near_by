import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const determineRole = async (u: User): Promise<UserRole> => {
    const roleHint =
      (localStorage.getItem('nearby_user_role') as UserRole) ||
      (u.user_metadata?.role as UserRole);

    try {
      if (roleHint === 'customer') {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('auth_user_id', u.id)
          .maybeSingle();
        if (customer) return 'customer';
      }

      if (roleHint === 'vendor') {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('auth_user_id', u.id)
          .maybeSingle();
        if (vendor) return 'vendor';
      }

      // Default order check: customers first, then vendors
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('auth_user_id', u.id)
        .maybeSingle();

      if (customer) return 'customer';

      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('auth_user_id', u.id)
        .maybeSingle();

      if (vendor) return 'vendor';
    } catch (err) {
      console.warn('Error determining user role from database:', err);
    }

    // Fallback: If user is logged in, return roleHint or default to 'customer'
    return roleHint || 'customer';
  };

  useEffect(() => {
    // Helper to process session
    const processSession = async (activeSession: Session | null) => {
      let finalSession = activeSession;
      if (!finalSession) {
        const rawMock = localStorage.getItem('nearby_mock_session');
        if (rawMock) {
          try {
            finalSession = JSON.parse(rawMock);
          } catch {}
        }
      }

      setSession(finalSession);
      setUser(finalSession?.user ?? null);

      if (finalSession?.user) {
        const userRole = await determineRole(finalSession.user);
        setRole(userRole);
      } else {
        setRole(null);
      }

      setLoading(false);
    };

    // Get initial session
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        await processSession(session);
      })
      .catch(async (err) => {
        console.error('Error fetching initial auth session:', err);
        await processSession(null);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await processSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    localStorage.removeItem('nearby_mock_session');
    localStorage.removeItem('nearby_user_role');
    try {
      await supabase.auth.signOut();
    } catch {}
    setSession(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
