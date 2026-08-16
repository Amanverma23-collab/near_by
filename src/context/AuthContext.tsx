import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';

export type VendorStatus = 'unregistered' | 'pending' | 'approved' | 'rejected';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole;
  loading: boolean;
  hasShop: boolean;
  vendorStatus: VendorStatus;
  vendorRecord: any | null;
  refreshVendorStatus: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  hasShop: false,
  vendorStatus: 'unregistered',
  vendorRecord: null,
  refreshVendorStatus: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [hasShop, setHasShop] = useState(false);
  const [vendorStatus, setVendorStatus] = useState<VendorStatus>('unregistered');
  const [vendorRecord, setVendorRecord] = useState<any | null>(null);

  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const fetchVendorInfo = useCallback(async (u: User | null) => {
    if (!u) {
      setHasShop(false);
      setVendorStatus('unregistered');
      setVendorRecord(null);
      return;
    }

    try {
      const cleanPhone =
        localStorage.getItem('nearby_customer_phone') ||
        localStorage.getItem('nearby_vendor_phone') ||
        (u.phone ? u.phone.replace(/\D/g, '').slice(-10) : '') ||
        (u.user_metadata?.phone_number ? u.user_metadata.phone_number.replace(/\D/g, '').slice(-10) : '') ||
        (u.email?.includes('@nearbe.app') ? u.email.split('@')[0].replace(/\D/g, '').slice(-10) : '');

      // 1. Build unified search query for vendor record
      let orFilter = `auth_user_id.eq.${u.id}`;
      if (cleanPhone) {
        orFilter += `,phone_number.eq.${cleanPhone},phone_number.eq.+91${cleanPhone},whatsapp_number.eq.${cleanPhone},whatsapp_number.eq.+91${cleanPhone}`;
      }

      const { data: vendors, error: vErr } = await supabase
        .from('vendors')
        .select('*')
        .or(orFilter);

      if (vErr) {
        console.warn('Vendor lookup error in AuthContext:', vErr);
      }

      if (vendors && vendors.length > 0) {
        let realVendor =
          vendors.find((v) => v.name && v.name !== 'Pending Shop Registration' && v.is_verified) ||
          vendors.find((v) => v.name && v.name !== 'Pending Shop Registration') ||
          vendors[0];

        // If this vendor record does not have the current user's auth_user_id linked yet, link it now
        if (realVendor.id && (!realVendor.auth_user_id || realVendor.auth_user_id !== u.id)) {
          supabase
            .from('vendors')
            .update({ auth_user_id: u.id })
            .eq('id', realVendor.id)
            .then();
        }

        // Retain verified and subscription status accurately from DB
        setVendorRecord(realVendor);

        if (realVendor.is_verified || realVendor.verification_status === 'approved') {
          setHasShop(true);
          setVendorStatus('approved');
          if (cleanPhone) localStorage.setItem(`nearby_cached_vstatus_${cleanPhone}`, 'approved');
        } else if (
          realVendor.verification_status === 'pending' ||
          realVendor.verification_requested_at ||
          (realVendor.name && realVendor.name !== 'Pending Shop Registration')
        ) {
          setHasShop(true);
          setVendorStatus('pending');
          if (cleanPhone) localStorage.setItem(`nearby_cached_vstatus_${cleanPhone}`, 'pending');
        } else if (realVendor.verification_status === 'rejected') {
          setHasShop(true);
          setVendorStatus('rejected');
        } else {
          setHasShop(false);
          setVendorStatus('unregistered');
        }
      } else {
        // Fallback to local cache if offline or slow network
        const cachedStatus = cleanPhone ? localStorage.getItem(`nearby_cached_vstatus_${cleanPhone}`) : null;
        if (cachedStatus === 'approved' || cachedStatus === 'pending') {
          setHasShop(true);
          setVendorStatus(cachedStatus as any);
        } else {
          setHasShop(false);
          setVendorStatus('unregistered');
          setVendorRecord(null);
        }
      }
    } catch (err) {
      console.warn('Error fetching vendor status:', err);
      const cleanPhone = (u.phone ? u.phone.replace(/\D/g, '').slice(-10) : '') || (u.email?.includes('@nearbe.app') ? u.email.split('@')[0].replace(/\D/g, '').slice(-10) : '');
      const cachedStatus = cleanPhone ? localStorage.getItem(`nearby_cached_vstatus_${cleanPhone}`) : null;
      if (cachedStatus === 'approved' || cachedStatus === 'pending') {
        setHasShop(true);
        setVendorStatus(cachedStatus as any);
      } else {
        setHasShop(false);
        setVendorStatus('unregistered');
        setVendorRecord(null);
      }
    }
  }, []);

  const refreshVendorStatus = useCallback(async () => {
    if (userRef.current) {
      await fetchVendorInfo(userRef.current);
    }
  }, [fetchVendorInfo]);

  useEffect(() => {
    let isMounted = true;

    // Helper to process session
    const processSession = async (activeSession: Session | null) => {
      if (!isMounted) return;
      setSession(activeSession);
      const currentUser = activeSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        setRole('customer');
        try {
          await fetchVendorInfo(currentUser);
        } catch (e) {
          console.warn('Error in fetchVendorInfo during auth init:', e);
        }
      } else {
        setRole(null);
        setHasShop(false);
        setVendorStatus('unregistered');
        setVendorRecord(null);
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    // Check mock session in localStorage if Supabase has none
    const getLocalSession = () => {
      try {
        const raw = localStorage.getItem('nearby_mock_session');
        if (raw) return JSON.parse(raw);
      } catch {}
      return null;
    };

    // Hard safety timeout: Ensure loading is set to false within max 1200ms
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1200);

    // Initial session check
    const initAuth = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const res: any = await Promise.race([
          sessionPromise,
          new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 1000)),
        ]);

        if (res?.data?.session) {
          await processSession(res.data.session);
        } else {
          const mockSess = getLocalSession();
          await processSession(mockSess);
        }
      } catch (err) {
        console.error('Error fetching initial auth session:', err);
        const mockSess = getLocalSession();
        await processSession(mockSess);
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(safetyTimer);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session) {
        await processSession(session);
      } else {
        const mockSess = getLocalSession();
        await processSession(mockSess);
      }
    });

    const handleVendorUpdate = () => {
      if (userRef.current) fetchVendorInfo(userRef.current);
    };
    window.addEventListener('nearby_vendor_updated', handleVendorUpdate);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
      window.removeEventListener('nearby_vendor_updated', handleVendorUpdate);
    };
  }, [fetchVendorInfo]);

  const signOut = async () => {
    localStorage.removeItem('nearby_mock_session');
    localStorage.removeItem('nearby_user_role');
    localStorage.removeItem('nearby_vendor_name');
    localStorage.removeItem('nearby_vendor_phone');
    localStorage.removeItem('nearby_customer_name');
    localStorage.removeItem('nearby_customer_phone');
    localStorage.removeItem('nearby_customer_email');
    localStorage.removeItem('nearby_customer_address');
    localStorage.removeItem('nearby_customer_avatar');
    localStorage.removeItem('nearby_saved_vendor_ids');
    try {
      await supabase.auth.signOut();
    } catch {}
    setSession(null);
    setUser(null);
    setRole(null);
    setHasShop(false);
    setVendorStatus('unregistered');
    setVendorRecord(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        loading,
        hasShop,
        vendorStatus,
        vendorRecord,
        refreshVendorStatus,
        signOut,
      }}
    >
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


