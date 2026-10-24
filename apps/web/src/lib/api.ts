import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token and acting worker identity
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const activeWorkerId = localStorage.getItem('dow_active_worker_id');
      const activeWorkerName = localStorage.getItem('dow_active_worker_name');
      const activeWorkerCode = localStorage.getItem('dow_active_worker_code');

      if (activeWorkerId) {
        config.headers['x-acting-worker-id'] = activeWorkerId;
      }
      if (activeWorkerName) {
        config.headers['x-acting-worker-name'] = activeWorkerName;
      }
      if (activeWorkerCode) {
        config.headers['x-acting-worker-code'] = activeWorkerCode;
      }

      const workerSessionToken = localStorage.getItem('dow_worker_session_token');
      if (workerSessionToken) {
        config.headers['x-worker-session-token'] = workerSessionToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

export const restoreSession = async (): Promise<{ user: Record<string, unknown>; accessToken: string } | null> => {
  try {
    const storedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      storedRefreshToken ? { refreshToken: storedRefreshToken } : {},
      { withCredentials: true }
    );

    if (response.data?.success && response.data?.data) {
      const { accessToken, user } = response.data.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', accessToken);
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }
      }
      return { user, accessToken };
    }
    return null;
  } catch {
    return null;
  }
};


const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Do NOT intercept auth endpoints (login, refresh, register, password reset)
    const isAuthEndpoint = originalRequest?.url && (
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/refresh') ||
      originalRequest.url.includes('/auth/register') ||
      originalRequest.url.includes('/auth/forgot-password') ||
      originalRequest.url.includes('/auth/reset-password')
    );

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          storedRefreshToken ? { refreshToken: storedRefreshToken } : {},
          { withCredentials: true }
        );

        const { accessToken, user } = response.data.data;
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
          }
        }

        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login?message=session_expired';
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// API helper functions
export const apiHelpers = {
  get: async <T>(url: string, params?: Record<string, unknown>) => {
    const response = await api.get<T>(url, { params });
    return response.data;
  },

  post: async <T>(url: string, data?: unknown) => {
    const response = await api.post<T>(url, data);
    return response.data;
  },

  patch: async <T>(url: string, data?: unknown) => {
    const response = await api.patch<T>(url, data);
    return response.data;
  },

  delete: async <T>(url: string) => {
    const response = await api.delete<T>(url);
    return response.data;
  },
};

export default api;
