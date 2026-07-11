import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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
    '⚠️ NearBe: Valid Supabase credentials not found. Initializing Local Mock Client.'
  );

  // Mock Auth Callback Listeners
  const authListeners = new Set<(event: string, session: any) => void>();

  const getSessionFromStorage = () => {
    try {
      const sessionStr = localStorage.getItem('nearbe_mock_session');
      return sessionStr ? JSON.parse(sessionStr) : null;
    } catch {
      return null;
    }
  };

  const getMockUsers = () => {
    try {
      return JSON.parse(localStorage.getItem('nearbe_mock_users') || '{}');
    } catch {
      return {};
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
      signUp: async ({ phone, password }: any) => {
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

        // Save user registration credentials
        const users = getMockUsers();
        users[phone] = { user: mockUser, password };
        localStorage.setItem('nearbe_mock_users', JSON.stringify(users));

        // Save active session
        localStorage.setItem('nearbe_mock_session', JSON.stringify(mockSession));

        // Notify listeners
        authListeners.forEach((cb) => cb('SIGNED_IN', mockSession));

        return { data: { user: mockUser, session: mockSession }, error: null };
      },
      signInWithPassword: async ({ phone, password }: any) => {
        const users = getMockUsers();
        const match = users[phone];
        if (!match || match.password !== password) {
          return {
            data: { user: null, session: null },
            error: new Error('Invalid login credentials in Dev Mode.'),
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

        localStorage.setItem('nearbe_mock_session', JSON.stringify(mockSession));
        authListeners.forEach((cb) => cb('SIGNED_IN', mockSession));

        return { data: { user: match.user, session: mockSession }, error: null };
      },
      signInWithOtp: async ({ phone }: any) => {
        console.log('Mock Auth: signInWithOtp triggered for phone:', phone);
        return { data: { user: null, session: null }, error: null };
      },
      verifyOtp: async ({ phone, token }: any) => {
        console.log('Mock Auth: verifyOtp triggered for phone:', phone, 'with token:', token);
        return { data: { user: null, session: null }, error: null };
      },
      updateUser: async ({ password }: any) => {
        console.log('Mock Auth: updateUser (set password) triggered');
        return { data: { user: null }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem('nearbe_mock_session');
        authListeners.forEach((cb) => cb('SIGNED_OUT', null));
        return { error: null };
      },
      onAuthStateChange: (callback: any) => {
        authListeners.add(callback);
        // Execute immediately with current state
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
        select: (columns: string) => {
          return {
            eq: (col: string, val: any) => {
              return {
                maybeSingle: async () => {
                  try {
                    const items = JSON.parse(
                      localStorage.getItem(`nearbe_mock_db_${table}`) || '[]'
                    );
                    const item = items.find((i: any) => i[col] === val);
                    return { data: item || null, error: null };
                  } catch {
                    return { data: null, error: null };
                  }
                },
              };
            },
          };
        },
        insert: async (data: any) => {
          try {
            const items = JSON.parse(
              localStorage.getItem(`nearbe_mock_db_${table}`) || '[]'
            );
            const newRecord = {
              id: 'mock-record-' + Math.random().toString(36).substring(2, 11),
              created_at: new Date().toISOString(),
              ...data,
            };
            items.push(newRecord);
            localStorage.setItem(`nearbe_mock_db_${table}`, JSON.stringify(items));
            return { data: newRecord, error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },
      };
    },
  };
}

export const supabase = supabaseClient as SupabaseClient;

// Dev mode flag — set to true to bypass OTP verification during development
export const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

// Default launch city (configurable, not hardcoded into logic)
export const DEFAULT_CITY = 'Bangalore';

