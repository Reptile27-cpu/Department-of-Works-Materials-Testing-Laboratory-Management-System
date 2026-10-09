'use client';

import React, { useEffect, useState, useRef } from 'react';
import { UserCheck, ChevronDown, Check, Shield, Lock } from 'lucide-react';
import { useWorkerStore, WorkerIdentity } from '@/stores/worker-store';
import { useAuthStore } from '@/stores/auth-store';
import WorkerPinModal from './worker-pin-modal';

interface WorkerSwitcherProps {
  className?: string;
  variant?: 'topbar' | 'card';
}

export default function WorkerSwitcher({ className = '', variant = 'topbar' }: WorkerSwitcherProps) {
  const { user } = useAuthStore();
  const { workers, currentWorker, fetchWorkers } = useWorkerStore();
  const [isOpen, setIsOpen] = useState(false);
  const [pinModalWorker, setPinModalWorker] = useState<WorkerIdentity | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (worker: WorkerIdentity) => {
    setIsOpen(false);
    // If selecting a different worker or currently locked, require PIN
    if (worker.id !== currentWorker?.id) {
      setPinModalWorker(worker);
    }
  };

  // Strictly render ONLY for shared laboratory workstation account
  const isLabWorker = user && (user.role === 'lab_worker' || user.email === 'labworker@dow.gov.pg');
  if (!isLabWorker) return null;

  if (variant === 'card') {
    return (
      <>
        <div className={`p-4 rounded-2xl bg-slate-900 border border-amber-400/30 text-white ${className}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <UserCheck className="w-4 h-4" />
              <span>Active Worker Session</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 font-mono border border-amber-400/20">
              Shared Terminal: {user?.email}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">
                  {currentWorker?.name || 'No Worker Unlocked'}
                </span>
                {currentWorker?.workerId && (
                  <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono text-xs font-semibold">
                    {currentWorker.workerId}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentWorker ? (currentWorker.designation || currentWorker.position || currentWorker.role) : 'Enter private PIN to unlock your worker queue'}
              </p>
            </div>

            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-amber-400/10"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{currentWorker ? 'Switch Worker (PIN Required)' : 'Select Worker & Enter PIN'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/80 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2.5 bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Select Operating Personnel</span>
                    <span className="text-[10px] text-amber-400 font-mono lowercase">pin required</span>
                  </div>
                  <div className="p-1 space-y-1">
                    {workers.map((worker) => {
                      const isSelected = currentWorker?.id === worker.id;
                      return (
                        <button
                          key={worker.id}
                          type="button"
                          onClick={() => handleSelect(worker)}
                          className={`w-full p-2.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-amber-400/15 text-amber-300 font-semibold'
                              : 'hover:bg-slate-800 text-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{worker.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-amber-400">
                                {worker.workerId}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{worker.position || worker.role}</p>
                          </div>
                          {isSelected ? (
                            <Check className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PIN Entry Modal */}
        <WorkerPinModal
          isOpen={!!pinModalWorker}
          targetWorker={pinModalWorker}
          onClose={() => setPinModalWorker(null)}
          onSuccess={() => setPinModalWorker(null)}
        />
      </>
    );
  }

  // Topbar variant
  return (
    <>
      <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-amber-400/30 hover:border-amber-400 text-xs text-white transition-all shadow-sm group"
          title="Switch active laboratory technician/engineer identity (requires PIN)"
        >
          <div className="w-5 h-5 rounded-md bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-[10px]">
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-slate-400 hidden sm:inline">Active Worker:</span>
          <span className="font-bold text-amber-400 group-hover:text-amber-300">
            {currentWorker?.name || 'Unlock Worker'}
          </span>
          {currentWorker?.workerId ? (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 hidden md:inline">
              {currentWorker.workerId}
            </span>
          ) : (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 hidden md:inline">
              PIN Required
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/80 animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2.5 bg-slate-900/80 flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Operating Personnel</span>
              <span className="text-[10px] text-amber-400 font-mono lowercase">pin protected</span>
            </div>

            <div className="p-1 space-y-1">
              {workers.map((worker) => {
                const isSelected = currentWorker?.id === worker.id;
                return (
                  <button
                    key={worker.id}
                    type="button"
                    onClick={() => handleSelect(worker)}
                    className={`w-full p-2.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-amber-400/15 text-amber-300 font-semibold'
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{worker.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400">
                          {worker.workerId}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{worker.position || worker.role}</p>
                    </div>
                    {isSelected ? (
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-2.5 bg-slate-950 text-[10px] text-slate-500 flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Shared Workstation: {user?.email || 'labworker@dow.gov.pg'}</span>
            </div>
          </div>
        )}
      </div>

      {/* PIN Entry Modal */}
      <WorkerPinModal
        isOpen={!!pinModalWorker}
        targetWorker={pinModalWorker}
        onClose={() => setPinModalWorker(null)}
        onSuccess={() => setPinModalWorker(null)}
      />
    </>
  );
}
