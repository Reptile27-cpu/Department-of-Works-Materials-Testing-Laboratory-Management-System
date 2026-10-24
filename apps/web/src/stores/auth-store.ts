import { create } from 'zustand';
import { api, restoreSession } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'system_admin' | 'lab_manager' | 'lab_worker' | 'lab_engineer' | 'lab_technician' | string;
  laboratoryId?: string;
  department?: string;
  designation?: string;
  avatarUrl?: string;
  mustChangePassword?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  updateUser: (partial: Partial<User>) => void;
  login: (user: User, accessToken: string, refreshToken?: string) => void;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
}

const isTokenUnexpired = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    if (!decoded.exp) return true;
    // Allow 30 seconds buffer for clock skew / network latency
    return decoded.exp * 1000 > Date.now() + 30000;
  } catch {
    return false;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    }
    set({ user, isAuthenticated: !!user });
  },

  updateUser: (partial) => {
    const current = get().user;
    if (current) {
      const updated = { ...current, ...partial };
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(updated));
      }
      set({ user: updated });
    }
  },

  login: (user, accessToken, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(user));
    }
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Network failure or already logged out on server
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('dow_worker_session_token');
      localStorage.removeItem('dow_active_worker_id');
      localStorage.removeItem('dow_active_worker_name');
      localStorage.removeItem('dow_active_worker_code');
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  initialize: async () => {
    if (typeof window === 'undefined') return;

    const storedUserRaw = localStorage.getItem('user');
    const storedToken = localStorage.getItem('accessToken');

    let parsedUser: User | null = null;
    if (storedUserRaw) {
      try {
        parsedUser = JSON.parse(storedUserRaw) as User;
      } catch {
        parsedUser = null;
      }
    }

    // 1. If we have an unexpired access token and stored user, restore immediately
    if (storedToken && isTokenUnexpired(storedToken) && parsedUser) {
      set({ user: parsedUser, isAuthenticated: true, isLoading: false });
      return;
    }

    // 2. Otherwise (token missing, expired, or user data missing),
    // restore session via HttpOnly refresh cookie (or stored refreshToken fallback)
    try {
      const session = await restoreSession();
      if (session && session.user && session.accessToken) {
        set({
          user: session.user as unknown as User,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }
    } catch {
      // Refresh failed or no session
    }

    // 3. If session could not be restored, clean up and set unauthenticated
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
