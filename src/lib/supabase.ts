import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  (import.meta?.env?.VITE_SUPABASE_URL as string) || 'https://rvgimglpwcbyuzmttfln.supabase.co';
const SUPABASE_ANON_KEY =
  (import.meta?.env?.VITE_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z2ltZ2xwd2NieXV6bXR0ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NzQwMzcsImV4cCI6MjA5OTM1MDAzN30.jeb1tSBS9RxEuJW5OXKd81yl8sGwu_ENsA79kyDbou8';

export const DEV_MODE = import.meta?.env?.VITE_DEV_MODE === 'true';

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
  Boolean(SUPABASE_URL) &&
  isValidUrl(SUPABASE_URL) &&
  !SUPABASE_URL.includes('your-supabase-url-here') &&
  Boolean(SUPABASE_ANON_KEY) &&
  !SUPABASE_ANON_KEY.includes('your-supabase-anon-key-here');

let supabaseClient: any;

if (hasValidCreds) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    console.log('✅ Connected to Real Supabase Backend:', SUPABASE_URL);
  } catch (e) {
    console.warn('Failed to initialize Supabase client, falling back to mock:', e);
  }
}

if (!supabaseClient) {
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

  const getMockDb = (table: string): any[] => {
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

  const createQueryChain = (table: string, filters: ((item: any) => boolean)[] = []) => {
    const applyFilters = () => {
      let items = getMockDb(table);
      for (const filter of filters) {
        items = items.filter(filter);
      }
      return items;
    };

    const chain: any = {
      eq: (col: string, val: any) => {
        return createQueryChain(table, [...filters, (item: any) => item[col] === val]);
      },
      neq: (col: string, val: any) => {
        return createQueryChain(table, [...filters, (item: any) => item[col] !== val]);
      },
      is: (col: string, val: any) => {
        return createQueryChain(table, [...filters, (item: any) => val === null ? (item[col] === null || item[col] === undefined) : item[col] === val]);
      },
      in: (col: string, vals: any[]) => {
        return createQueryChain(table, [...filters, (item: any) => Array.isArray(vals) && vals.includes(item[col])]);
      },
      or: (orString: string) => {
        return createQueryChain(table, [
          ...filters,
          (item: any) => {
            // e.g. "phone_number.eq.123,phone_number.eq.+91123"
            const parts = orString.split(',');
            return parts.some((p) => {
              const [c, op, v] = p.split('.');
              if (op === 'eq') return item[c] === v;
              return false;
            });
          },
        ]);
      },
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => {
        const items = applyFilters();
        return { data: items[0] || null, error: null };
      },
      single: async () => {
        const items = applyFilters();
        return { data: items[0] || null, error: items[0] ? null : new Error('Not found') };
      },
      then: (resolve: any) => {
        const items = applyFilters();
        return Promise.resolve({ data: items, count: items.length, error: null }).then(resolve);
      },
    };

    return chain;
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
      signUp: async ({ email, phone, password, options }: any) => {
        const identifier = phone || (email ? email.replace(/@nearbe\.app$/, '') : 'user');
        const users = getMockUsers();

        if (users[identifier] || (email && users[email])) {
          return {
            data: { user: null, session: null },
            error: new Error('This mobile number is already registered. Please switch to Login mode to log in.')
          };
        }

        const userId = 'mock-user-' + Math.random().toString(36).substring(2, 11);
        const fullName = options?.data?.full_name || options?.data?.owner_name || options?.data?.name || '';

        const mockUser = {
          id: userId,
          email: email || `${identifier}@nearbe.app`,
          phone: identifier,
          role: 'authenticated',
          user_metadata: { full_name: fullName, ...options?.data },
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

        users[identifier] = { user: mockUser, password };
        if (email) users[email] = { user: mockUser, password };
        localStorage.setItem('nearby_mock_users', JSON.stringify(users));
        localStorage.setItem('nearby_mock_session', JSON.stringify(mockSession));

        if (fullName) {
          localStorage.setItem('nearby_customer_name', fullName);
        }

        authListeners.forEach((cb) => cb('SIGNED_IN', mockSession));

        return { data: { user: mockUser, session: mockSession }, error: null };
      },
      signInWithPassword: async ({ email, phone, password }: any) => {
        const identifier = phone || (email ? email.replace(/@nearbe\.app$/, '') : 'user');
        const users = getMockUsers();
        let match = users[identifier] || (email ? users[email] : null) || (phone ? users[phone] : null);

        if (!match) {
          return {
            data: { user: null, session: null },
            error: new Error('No account found with this mobile number. Please register first.')
          };
        }

        if (match.password !== password) {
          return {
            data: { user: null, session: null },
            error: new Error('Incorrect password. Please try again.')
          };
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

        const savedName = match.user.user_metadata?.full_name || match.user.user_metadata?.owner_name;
        if (savedName) {
          localStorage.setItem('nearby_customer_name', savedName);
        }

        authListeners.forEach((cb) => cb('SIGNED_IN', mockSession));

        return { data: { user: match.user, session: mockSession }, error: null };
      },
      signInWithOtp: async ({ phone }: any) => {
        return { data: { user: null, session: null }, error: null };
      },
      verifyOtp: async ({ phone }: any) => {
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
      updateUser: async ({ data }: any) => {
        const session = getSessionFromStorage();
        if (!session?.user) {
          return { data: { user: null }, error: new Error('Mock Auth: No active session found.') };
        }
        session.user.user_metadata = { ...(session.user.user_metadata || {}), ...data };
        localStorage.setItem('nearby_mock_session', JSON.stringify(session));
        return { data: { user: session.user }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem('nearby_mock_session');
        localStorage.removeItem('nearby_user_role');
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
        select: (_columns: string = '*', options?: any) => {
          const query = createQueryChain(table);
          if (options?.head || options?.count) {
            return {
              ...query,
              then: (resolve: any) => {
                const items = getMockDb(table);
                return Promise.resolve({ data: null, count: items.length, error: null }).then(resolve);
              },
            };
          }
          return query;
        },
        insert: async (data: any) => {
          const items = getMockDb(table);
          const records = Array.isArray(data) ? data : [data];
          const newRecords = records.map((r) => ({
            id: r.id || 'mock-id-' + Math.random().toString(36).substring(2, 11),
            created_at: new Date().toISOString(),
            ...r,
          }));
          items.push(...newRecords);
          setMockDb(table, items);
          return { data: Array.isArray(data) ? newRecords : newRecords[0], error: null };
        },
        update: (updateData: any) => {
          const makeUpdateChain = (filters: ((item: any) => boolean)[] = []) => {
            const executeUpdate = () => {
              let items = getMockDb(table);
              let updated = items.map((item: any) => {
                const matches = filters.every((fn) => fn(item));
                if (matches) {
                  return { ...item, ...updateData };
                }
                return item;
              });
              setMockDb(table, updated);
              return { data: updateData, error: null };
            };

            const chain: any = {
              eq: (col: string, val: any) => {
                const nextFilters = [...filters, (item: any) => item[col] === val];
                return makeUpdateChain(nextFilters);
              },
              is: (col: string, val: any) => {
                const nextFilters = [
                  ...filters,
                  (item: any) => val === null ? (item[col] === null || item[col] === undefined) : item[col] === val,
                ];
                return makeUpdateChain(nextFilters);
              },
              or: (orString: string) => {
                const parts = orString.split(',');
                const nextFilters = [
                  ...filters,
                  (item: any) =>
                    parts.some((p) => {
                      const [c, op, v] = p.split('.');
                      if (op === 'eq') return item[c] === v;
                      return false;
                    }),
                ];
                return makeUpdateChain(nextFilters);
              },
              then: (resolve: any) => {
                return Promise.resolve(executeUpdate()).then(resolve);
              },
            };
            return chain;
          };

          return makeUpdateChain();
        },
        delete: () => {
          return {
            eq: async (col: string, val: any) => {
              const items = getMockDb(table);
              const filtered = items.filter((i: any) => i[col] !== val);
              setMockDb(table, filtered);
              return { data: null, error: null };
            },
          };
        },
      };
    },
    channel: (_channelName: string) => ({
      on: () => ({
        subscribe: () => ({ unsubscribe: () => {} }),
      }),
      subscribe: () => ({ unsubscribe: () => {} }),
    }),
    removeChannel: (_channel: any) => {},
    storage: {
      createBucket: async () => ({ data: null, error: null }),
      from: (_bucket: string) => ({
        upload: async (path: string, _file: any) => ({ data: { path }, error: null }),
        getPublicUrl: (_path: string) => ({
          data: { publicUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600' },
        }),
      }),
    },
  };
}

export const supabase = supabaseClient as SupabaseClient;

// Default launch city (configurable, not hardcoded into logic)
export const DEFAULT_CITY = 'Bangalore';


