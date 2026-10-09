import { create } from 'zustand';
import { api } from '@/lib/api';

export interface WorkerIdentity {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  workerId: string;
  position?: string;
  role: string;
  roleKey: string;
  designation?: string;
  email?: string;
  avatarUrl?: string | null;
  availability?: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE' | 'INACTIVE';
  isActive?: boolean;
  activeTestsCount?: number;
  assignedWorkCount?: number;
  activeTests?: number;
  totalTests?: number;
}

interface WorkerState {
  workers: WorkerIdentity[];
  currentWorker: WorkerIdentity | null;
  workerSessionToken: string | null;
  isLoading: boolean;
  error: string | null;
  fetchWorkers: () => Promise<void>;
  verifyAndUnlockWorker: (workerId: string, pin: string) => Promise<{ success: boolean; message?: string }>;
  lockWorkerSession: () => void;
  setCurrentWorkerDirect: (worker: WorkerIdentity) => void;
  setWorkerById: (workerId: string) => void;
}

export const useWorkerStore = create<WorkerState>((set, get) => ({
  workers: [],
  currentWorker: null,
  workerSessionToken: typeof window !== 'undefined' ? localStorage.getItem('dow_worker_session_token') : null,
  isLoading: false,
  error: null,

  fetchWorkers: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/laboratory/workers');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const workers: WorkerIdentity[] = res.data.data;
        const storedId = typeof window !== 'undefined' ? localStorage.getItem('dow_active_worker_id') : null;
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('dow_worker_session_token') : null;

        let active: WorkerIdentity | null = null;
        if (storedToken && storedId) {
          active = workers.find((w) => w.id === storedId) || null;
        }

        set({
          workers,
          currentWorker: active,
          workerSessionToken: storedToken,
          isLoading: false,
        });
      }
    } catch (err: any) {
      console.error('Failed to load laboratory workers:', err);
      set({ workers: [], isLoading: false, error: 'Failed to load workers from server' });
    }
  },

  verifyAndUnlockWorker: async (workerId: string, pin: string) => {
    try {
      const res = await api.post('/laboratory/workers/verify-pin', {
        workerId,
        pin,
      });

      if (res.data?.success && res.data?.data) {
        const { worker, workerSessionToken } = res.data.data;

        if (typeof window !== 'undefined') {
          localStorage.setItem('dow_worker_session_token', workerSessionToken);
          localStorage.setItem('dow_active_worker_id', worker.id);
          localStorage.setItem('dow_active_worker_name', worker.name);
          localStorage.setItem('dow_active_worker_code', worker.workerId);
          window.dispatchEvent(new CustomEvent('dow:worker-changed', { detail: worker }));
        }

        set({
          currentWorker: worker,
          workerSessionToken,
          error: null,
        });

        return { success: true };
      }
      return { success: false, message: 'Invalid server response' };
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Incorrect PIN. Verification failed.';
      return { success: false, message };
    }
  },

  lockWorkerSession: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dow_worker_session_token');
      localStorage.removeItem('dow_active_worker_id');
      localStorage.removeItem('dow_active_worker_name');
      localStorage.removeItem('dow_active_worker_code');
      window.dispatchEvent(new CustomEvent('dow:worker-locked'));
    }
    set({ currentWorker: null, workerSessionToken: null });
  },

  setCurrentWorkerDirect: (worker: WorkerIdentity) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dow_active_worker_id', worker.id);
      localStorage.setItem('dow_active_worker_name', worker.name);
      localStorage.setItem('dow_active_worker_code', worker.workerId);
      window.dispatchEvent(new CustomEvent('dow:worker-changed', { detail: worker }));
    }
    set({ currentWorker: worker });
  },

  setWorkerById: (workerId: string) => {
    const worker = get().workers.find((w) => w.id === workerId);
    if (worker) {
      get().setCurrentWorkerDirect(worker);
    }
  },
}));
