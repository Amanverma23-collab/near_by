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

  const determineRole = async (userId: string): Promise<UserRole> => {
    const roleHint = localStorage.getItem('nearby_user_role');

    if (roleHint === 'customer') {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('auth_user_id', userId)
        .maybeSingle();
      if (customer) return 'customer';
    }

    if (roleHint === 'vendor') {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('auth_user_id', userId)
        .maybeSingle();
      if (vendor) return 'vendor';
    }

    // Default order check: customers first, then vendors
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (customer) return 'customer';

    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (vendor) return 'vendor';

    return null;
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userRole = await determineRole(session.user.id);
        setRole(userRole);
      }

      setLoading(false);
    }).catch((err) => {
      console.error('Error fetching initial auth session:', err);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userRole = await determineRole(session.user.id);
        setRole(userRole);
      } else {
        setRole(null);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
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
