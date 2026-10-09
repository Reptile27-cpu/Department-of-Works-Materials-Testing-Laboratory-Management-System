'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound,
  ShieldCheck,
  User,
  Delete,
  Loader2,
  AlertCircle,
  ArrowRight,
  HardHat,
  ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface WorkerItem {
  id: string;
  fullName: string;
  employeeNumber: string;
  role: string;
  designation: string;
  permittedCategories: string[];
}

export default function WorkerPortalPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [loadingWorkers, setLoadingWorkers] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load active laboratory workers
  useEffect(() => {
    async function fetchWorkers() {
      try {
        setLoadingWorkers(true);
        const res = await api.get('/auth/workers');
        const list = res.data?.data || [];
        setWorkers(list);
        if (list.length > 0) {
          setSelectedWorkerId(list[0].id);
        }
      } catch (err: unknown) {
        setErrorMessage('Failed to load laboratory workers. Please ensure backend is running.');
      } finally {
        setLoadingWorkers(false);
      }
    }
    fetchWorkers();
  }, []);

  const selectedWorker = workers.find((w) => w.id === selectedWorkerId);

  // Handle number pad click
  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setErrorMessage(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage(null);
  };

  // Keyboard support for physical keyboards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 6) {
          setPin((prev) => prev + e.key);
          setErrorMessage(null);
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
        setErrorMessage(null);
      } else if (e.key === 'Escape') {
        setPin('');
      } else if (e.key === 'Enter') {
        if (pin.length >= 4 && selectedWorkerId && !submitting) {
          submitPinLogin();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, selectedWorkerId, submitting]);

  // Submit PIN login
  const submitPinLogin = async () => {
    if (!selectedWorkerId) {
      setErrorMessage('Please select a technician profile.');
      return;
    }
    if (pin.length < 4) {
      setErrorMessage('Please enter at least 4 digits for your PIN.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/auth/worker-login', {
        workerId: selectedWorkerId,
        pin,
      });

      const { user, accessToken, refreshToken } = res.data.data;
      login(user, accessToken, refreshToken);

      router.replace('/work-queue');
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          data?: {
            error?: { message?: string };
          };
        };
      };
      setErrorMessage(
        axiosErr.response?.data?.error?.message ||
          'Invalid PIN. Please try again or contact your Laboratory Manager.'
      );
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4 && selectedWorkerId && !submitting) {
      submitPinLogin();
    }
  }, [pin, selectedWorkerId]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between selection:bg-amber-500 selection:text-black">
      {/* Top Banner */}
      <header className="bg-black border-b border-zinc-800 py-3.5 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 p-1.5 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="DoW Crest"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <span className="font-extrabold text-sm text-white block">Department of Works</span>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Central Materials Testing Laboratory
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
            >
              Password Login
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
            >
              Public Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Kiosk Area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 items-center justify-center mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Worker PIN Entry</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Select your profile and enter your 4-digit PIN for bench work queue
            </p>
          </div>

          {/* Worker Selector */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Select Technician Profile
            </label>
            {loadingWorkers ? (
              <div className="p-3 bg-zinc-800/80 rounded-xl flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Loading roster...</span>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedWorkerId}
                  onChange={(e) => {
                    setSelectedWorkerId(e.target.value);
                    setPin('');
                    setErrorMessage(null);
                  }}
                  className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition cursor-pointer pr-10"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.fullName} ({w.employeeNumber || 'STAFF'}) &mdash; {w.designation}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {selectedWorker && (
              <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 px-1">
                <span>Certified: {selectedWorker.permittedCategories.join(', ') || 'All Disciplines'}</span>
                <span className="font-mono text-amber-400">{selectedWorker.employeeNumber}</span>
              </div>
            )}
          </div>

          {/* Masked PIN Display */}
          <div className="mb-6">
            <div className="flex justify-center items-center gap-4 py-4 bg-black/60 border border-zinc-800 rounded-2xl">
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                return (
                  <motion.div
                    key={index}
                    animate={{ scale: isFilled ? 1.15 : 1 }}
                    className={`w-4 h-4 rounded-full transition-colors ${
                      isFilled
                        ? 'bg-amber-400 shadow-md shadow-amber-400/50'
                        : 'bg-zinc-800 border border-zinc-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 p-2.5 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Numeric Touch Keypad */}
          <div className="grid grid-cols-3 gap-2.5 mb-6">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                disabled={submitting}
                className="h-14 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 active:bg-amber-500 active:text-black font-extrabold text-xl text-white border border-zinc-700/60 transition shadow-sm disabled:opacity-50 flex items-center justify-center"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={submitting || pin.length === 0}
              className="h-14 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 font-bold text-xs text-zinc-400 uppercase tracking-wider border border-zinc-800 transition disabled:opacity-40 flex items-center justify-center"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              disabled={submitting}
              className="h-14 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 active:bg-amber-500 active:text-black font-extrabold text-xl text-white border border-zinc-700/60 transition shadow-sm disabled:opacity-50 flex items-center justify-center"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              disabled={submitting || pin.length === 0}
              className="h-14 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-800 transition disabled:opacity-40 flex items-center justify-center"
              aria-label="Backspace"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Action / Default Hint */}
          <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-center text-xs text-zinc-400">
            <span>Demo Technician Default PIN: </span>
            <strong className="text-amber-400 font-mono text-sm">1234</strong>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-zinc-500 border-t border-zinc-800/80">
        <span>Central Materials Testing Laboratory &bull; Department of Works &bull; 4-Mile Boroko, NCD</span>
      </footer>
    </main>
  );
}
