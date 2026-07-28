import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Dev mode flag — set to true to bypass OTP and use local mock store during development
export const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

// Validate URL format
const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const hasValidCreds =
  !DEV_MODE &&
  rawUrl &&
  isValidUrl(rawUrl) &&
  !rawUrl.includes('your-supabase-url-here') &&
  rawAnonKey &&
  !rawAnonKey.includes('your-supabase-anon-key-here');

let supabaseClient: any;

if (hasValidCreds) {
  supabaseClient = createClient(rawUrl, rawAnonKey);
} else {
  console.warn(
    '⚠️ NearBy: Dev Mode or missing Supabase backend. Initializing Local Mock Client.'
  );

  // Mock Auth Callback Listeners
  const authListeners = new Set<(event: string, session: any) => void>();

  const getSessionFromStorage = () => {
    try {
      const sessionStr = localStorage.getItem('nearby_mock_session');
      return sessionStr ? JSON.parse(sessionStr) : null;
    } catch {
      return null;
    }
  };

  const getMockUsers = () => {
    try {
      return JSON.parse(localStorage.getItem('nearby_mock_users') || '{}');
    } catch {
      return {};
    }
  };

  const getMockDb = (table: string) => {
    try {
      return JSON.parse(localStorage.getItem(`nearby_mock_db_${table}`) || '[]');
    } catch {
      return [];
    }
  };

  const setMockDb = (table: string, items: any[]) => {
    try {
      localStorage.setItem(`nearby_mock_db_${table}`, JSON.stringify(items));
    } catch (e) {
      console.error(`Failed to update mock db for ${table}`, e);
    }
  };

  supabaseClient = {
    auth: {
      getSession: async () => {
        const session = getSessionFromStorage();
        return { data: { session }, error: null };
      },
      getUser: async () => {
        const session = getSessionFromStorage();
        return { data: { user: session?.user || null }, error: null };
      },
      signUp: async ({ email, phone, password }: any) => {
        const identifier = phone || (email ? email.replace(/@nearbe\.app$/, '') : 'user');
        const userId = 'mock-user-' + Math.random().toString(36).substring(2, 11);
        const mockUser = {
          id: userId,
          email: email || `${identifier}@nearbe.app`,
          phone: identifier,
          role: 'authenticated',
          factor_id: null,
          created_at: new Date().toISOString(),
        };
        const mockSession = {
          access_token: 'mock-access-token-' + userId,
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token-' + userId,
          user: mockUser,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        };

        const users = getMockUsers();
        users[identifier] = { user: mockUser, password };
        if (email) users[email] = { user: mockUser, password };
        localStorage.setItem('nearby_mock_users', JSON.stringify(users));
        localStorage.setItem('nearby_mock_session', JSON.stringify(mockSession));

        authListeners.forEach((cb) => cb('SIGNED_IN', mockSession));

        return { data: { user: mockUser, session: mockSession }, error: null };
      },
      signInWithPassword: async ({ email, phone, password }: any) => {
        const identifier = phone || (email ? email.replace(/@nearbe\.app$/, '') : 'user');
        const users = getMockUsers();
        let match = users[identifier] || (email ? users[email] : null) || (phone ? users[phone] : null);

        // Auto-create mock user for seamless login/demo if not found
        if (!match) {
          const userId = 'mock-user-' + Math.random().toString(36).substring(2, 11);
          const mockUser = {
            id: userId,
            email: email || `${identifier}@nearbe.app`,
            phone: identifier,
            role: 'authenticated',
            factor_id: null,
            created_at: new Date().toISOString(),
          };
          match = { user: mockUser, password };
          users[identifier] = match;
          if (email) users[email] = match;
          try {
            localStorage.setItem('nearby_mock_users', JSON.stringify(users));
          } catch (e) {
            console.error('Error saving mock users:', e);
          }

          // Auto-seed mock customer record
          const customers = getMockDb('customers');
          if (!customers.some((c: any) => c.auth_user_id === userId)) {
            customers.push({
              id: 'cust-' + userId,
              auth_user_id: userId,
              full_name: 'Rahul Sharma',
              mobile_number: identifier,
              city: 'Bangalore',
              created_at: new Date().toISOString(),
            });
            setMockDb('customers', customers);
          }

          // Auto-seed mock vendor record
          const vendors = getMockDb('vendors');
          if (!vendors.some((v: any) => v.auth_user_id === userId)) {
            vendors.push({
              id: 'vend-' + userId,
              auth_user_id: userId,
              name: 'Sharma Services & Repair',
              owner_name: 'Rahul Sharma',
              category: 'home-maintenance',
              sub_service: 'Electrician',
              address: 'Indiranagar 100ft Road, Bangalore',
              phone_number: identifier,
              whatsapp_number: identifier,
              is_verified: true,
              opening_hours: '9:00 AM - 8:00 PM',
              created_at: new Date().toISOString(),
            });
            setMockDb('vendors', vendors);
          }
        }

        const mockSession = {
          access_token: 'mock-access-token-' + match.user.id,
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token-' + match.user.id,
          user: match.user,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        };

        localStorage.setItem('nearby_mock_session', JSON.stringify(mockSession));
        authListeners.forEach((cb) => cb('SIGNED_IN', mockSession));

        return { data: { user: match.user, session: mockSession }, error: null };
      },
      signInWithOtp: async ({ phone }: any) => {
        return { data: { user: null, session: null }, error: null };
      },
      verifyOtp: async ({ phone, token }: any) => {
        const userId = 'mock-user-' + Math.random().toString(36).substring(2, 11);
        const mockUser = {
          id: userId,
          phone,
          role: 'authenticated',
          factor_id: null,
          created_at: new Date().toISOString(),
        };
        const mockSession = {
          access_token: 'mock-access-token-' + userId,
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token-' + userId,
          user: mockUser,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        };

        localStorage.setItem('nearby_mock_session', JSON.stringify(mockSession));
        authListeners.forEach((cb) => cb('SIGNED_IN', mockSession));

        return { data: { user: mockUser, session: mockSession }, error: null };
      },
      updateUser: async ({ password }: any) => {
        const session = getSessionFromStorage();
        if (!session?.user) {
          return { data: { user: null }, error: new Error('Mock Auth: No active session found.') };
        }
        return { data: { user: session.user }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem('nearby_mock_session');
        authListeners.forEach((cb) => cb('SIGNED_OUT', null));
        return { error: null };
      },
      onAuthStateChange: (callback: any) => {
        authListeners.add(callback);
        const session = getSessionFromStorage();
        callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);

        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authListeners.delete(callback);
              },
            },
          },
        };
      },
    },
    from: (table: string) => {
      return {
        select: (columns: string = '*') => {
          const createQuery = (col?: string, val?: any) => {
            const getFiltered = () => {
              const items = getMockDb(table);
              if (!col) return items;
              return items.filter((i: any) => i[col] === val);
            };
            return {
              maybeSingle: async () => {
                const items = getFiltered();
                return { data: items[0] || null, error: null };
              },
              single: async () => {
                const items = getFiltered();
                return { data: items[0] || null, error: items[0] ? null : new Error('Not found') };
              },
              order: () => createQuery(col, val),
              limit: () => createQuery(col, val),
              then: (resolve: any) => resolve({ data: getFiltered(), error: null }),
            };
          };

          return {
            eq: (col: string, val: any) => createQuery(col, val),
            maybeSingle: async () => {
              const items = getMockDb(table);
              return { data: items[0] || null, error: null };
            },
            single: async () => {
              const items = getMockDb(table);
              return { data: items[0] || null, error: items[0] ? null : new Error('Not found') };
            },
          };
        },
        insert: async (data: any) => {
          const items = getMockDb(table);
          const records = Array.isArray(data) ? data : [data];
          const newRecords = records.map((r) => ({
            id: 'mock-id-' + Math.random().toString(36).substring(2, 11),
            created_at: new Date().toISOString(),
            ...r,
          }));
          items.push(...newRecords);
          setMockDb(table, items);
          return { data: Array.isArray(data) ? newRecords : newRecords[0], error: null };
        },
        update: (updateData: any) => {
          return {
            eq: async (col: string, val: any) => {
              const items = getMockDb(table);
              const updated = items.map((item: any) => {
                if (item[col] === val) {
                  return { ...item, ...updateData };
                }
                return item;
              });
              setMockDb(table, updated);
              return { data: updateData, error: null };
            },
          };
        },
      };
    },
    storage: {
      createBucket: async () => ({ data: null, error: null }),
      from: (bucket: string) => ({
        upload: async (path: string, file: any) => ({ data: { path }, error: null }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600' },
        }),
      }),
    },
  };
}

export const supabase = supabaseClient as SupabaseClient;

// Default launch city (configurable, not hardcoded into logic)
export const DEFAULT_CITY = 'Bangalore';


