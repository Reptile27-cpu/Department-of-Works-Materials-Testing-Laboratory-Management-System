'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Lock, KeyRound, AlertCircle, Loader2, X, ShieldCheck } from 'lucide-react';
import { WorkerIdentity, useWorkerStore } from '@/stores/worker-store';

interface WorkerPinModalProps {
  isOpen: boolean;
  targetWorker: WorkerIdentity | null;
  onClose: () => void;
  onSuccess?: (worker: WorkerIdentity) => void;
}

export default function WorkerPinModal({
  isOpen,
  targetWorker,
  onClose,
  onSuccess,
}: WorkerPinModalProps) {
  const { verifyAndUnlockWorker } = useWorkerStore();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, targetWorker]);

  if (!isOpen || !targetWorker) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter your private PIN.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await verifyAndUnlockWorker(targetWorker.id, pin.trim());
    setIsLoading(false);

    if (result.success) {
      onSuccess?.(targetWorker);
      onClose();
    } else {
      setError(result.message || 'Incorrect PIN. Access denied.');
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-950 p-6 shadow-2xl shadow-black/80 relative">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Worker Identity Authentication</span>
            </h3>
            <p className="text-xs text-slate-400">Private PIN Verification Required</p>
          </div>
        </div>

        {/* Selected Worker Info Banner */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">{targetWorker.name}</span>
              <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono text-[11px] font-bold">
                {targetWorker.workerId}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {targetWorker.position || targetWorker.role || 'Laboratory Personnel'}
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {targetWorker.availability || 'AVAILABLE'}
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in shake duration-150">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Enter Private PIN:
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                ref={inputRef}
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="&bull; &bull; &bull; &bull;"
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-10 pr-4 py-3 text-center text-lg font-mono tracking-widest text-white placeholder-slate-600 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all"
                autoComplete="off"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 text-center">
              Demo PIN: Simon (1111) &bull; Michael (2222) &bull; David (3333)
            </p>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !pin.trim()}
              className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-400/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying PIN...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Unlock Identity</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

