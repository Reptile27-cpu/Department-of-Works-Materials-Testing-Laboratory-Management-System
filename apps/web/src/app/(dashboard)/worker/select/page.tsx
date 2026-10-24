'use client';
import { TableSkeleton, CardGridSkeleton, DetailViewSkeleton, Skeleton } from '@/components/ui/skeleton';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  UserCheck,
  Lock,
  ShieldCheck,
  FlaskConical,
  Activity,
  ArrowRight,
  Clock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkerStore, WorkerIdentity } from '@/stores/worker-store';
import WorkerPinModal from '@/components/layout/worker-pin-modal';

export default function WorkerSelectPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const { workers, currentWorker, fetchWorkers, isLoading: workersLoading } = useWorkerStore();
  const [pinModalWorker, setPinModalWorker] = useState<WorkerIdentity | null>(null);

  // Security gate: ONLY shared lab worker account may access this page
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'system_admin' || user.role === 'super_admin') {
        router.replace('/system-admin');
      } else if (user.role === 'lab_manager') {
        router.replace('/dashboard');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const handleSelectWorker = (worker: WorkerIdentity) => {
    setPinModalWorker(worker);
  };

  const handlePinSuccess = () => {
    setPinModalWorker(null);
    router.push('/worker/dashboard');
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
          <span>Loading laboratory workstation session...</span>
        </div>
      </div>
    );
  }

  const isLabWorker = user?.role === 'lab_worker' || user?.email === 'labworker@dow.gov.pg';
  if (!isLabWorker) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Workstation Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-black border-2 border-amber-400/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-black border border-amber-400/40 p-2 shadow-lg shrink-0 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="DoW Logo"
                width={48}
                height={48}
                className="w-12 h-12 object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-xs font-bold border border-amber-400/30">
                  Shared Operational Terminal
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {user?.email || 'labworker@dow.gov.pg'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Select Operating Personnel Identity
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Civil Engineering Materials Testing Laboratory &bull; Select your personnel record and enter your private 4-digit PIN to unlock your testing queue and record test measurements.
              </p>
            </div>
          </div>

          {currentWorker && (
            <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-900/90 border border-slate-700 p-4 rounded-2xl">
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Active Session</div>
                <div className="text-sm font-bold text-amber-400">{currentWorker.name}</div>
                <div className="text-xs font-mono text-slate-300">{currentWorker.workerId}</div>
              </div>
              <button
                onClick={() => router.push('/worker/dashboard')}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
              >
                <span>Continue to Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Roster of Workers Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Authorized Laboratory Technicians & Engineers
            </h2>
          </div>
          <button
            onClick={() => fetchWorkers()}
            disabled={workersLoading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
            title="Refresh Roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${workersLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Roster</span>
          </button>
        </div>

        {workersLoading && workers.length === 0 ? (
          <CardGridSkeleton count={6} columns={3} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {workers.map((worker) => {
              const isActive = currentWorker?.id === worker.id;
              const isAvailable = worker.availability === 'AVAILABLE';

              return (
                <div
                  key={worker.id}
                  onClick={() => handleSelectWorker(worker)}
                  className={`relative p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-b from-slate-900 to-amber-950/30 border-amber-400 shadow-lg shadow-amber-400/10 ring-1 ring-amber-400'
                      : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 hover:border-slate-700 shadow-md'
                  }`}
                >
                  <div>
                    {/* Header: Avatar, Worker ID, Status */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-black text-lg shadow-inner">
                          {worker.firstName?.[0] || worker.name[0]}
                          {worker.lastName?.[0] || ''}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white leading-tight">
                            {worker.name}
                          </h3>
                          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 inline-block mt-1">
                            {worker.workerId}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isAvailable
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : worker.availability === 'BUSY'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {worker.availability || 'AVAILABLE'}
                      </span>
                    </div>

                    {/* Designation / Role */}
                    <p className="text-xs text-slate-300 font-medium mb-4">
                      {worker.designation || worker.position || worker.role || 'Laboratory Technician'}
                    </p>

                    {/* Operational Telemetry */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-5">
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">Active Tests</div>
                        <div className="text-sm font-bold text-white">{worker.activeTests || 0}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Recorded</div>
                        <div className="text-sm font-bold text-slate-300">{worker.totalTests || 0}</div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleSelectWorker(worker)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                        : 'bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-white border border-slate-700'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isActive ? 'Active (Enter PIN to Re-verify)' : 'Unlock with 4-Digit PIN'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security & Guidance Callout */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-4 text-xs text-slate-400">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block mb-0.5">Dual-Layer Security &amp; Attribution Protocol</strong>
          All laboratory worksheets, soil moisture determinations, sieve gradations, and compaction tests are digitally attributed to the active worker identity unlocked by PIN. If you step away from the workstation, select your name again or lock your terminal.
        </div>
      </div>

      {/* PIN Verification Modal */}
      {pinModalWorker && (
        <WorkerPinModal
          targetWorker={pinModalWorker}
          isOpen={!!pinModalWorker}
          onClose={() => setPinModalWorker(null)}
          onSuccess={handlePinSuccess}
        />
      )}
    </div>
  );
}
