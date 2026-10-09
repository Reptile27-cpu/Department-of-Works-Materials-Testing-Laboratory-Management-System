'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TestTube2,
  FlaskConical,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ArrowRight,
  RefreshCw,
  UserCheck,
  Lock,
  Layers,
  FileSpreadsheet,
  Activity,
  Calendar,
  Play,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkerStore } from '@/stores/worker-store';
import { apiHelpers } from '@/lib/api';
import QrScannerModal from '@/components/qr-scanner-modal';

interface AssignedTestItem {
  id: string;
  testNumber: string;
  status: string;
  deadlineAt?: string;
  isOverdue?: boolean;
  isDueToday?: boolean;
  sample: {
    id: string;
    sampleNumber: string;
    materialType: string;
    priority: string;
    project?: { name: string; projectCode: string };
  };
  testType: {
    id: string;
    name: string;
    standard: string;
    category: string;
  };
}

export default function WorkerDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const { currentWorker, isLoading: workerLoading } = useWorkerStore();

  const [tests, setTests] = useState<AssignedTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);

  const handleStartTest = async (testId: string) => {
    setStartingTestId(testId);
    try {
      await apiHelpers.post(`/tests/${testId}/start`, {
        actingWorkerId: currentWorker?.id,
      });
      router.push(`/tests/${testId}`);
    } catch (err: any) {
      console.error('Failed to start test:', err);
      alert(err?.response?.data?.error?.message || err?.message || 'Failed to start test');
    } finally {
      setStartingTestId(null);
    }
  };

  // Security Gate
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'system_admin' || user.role === 'super_admin') {
        router.replace('/system-admin');
        return;
      }
      if (user.role === 'lab_manager') {
        router.replace('/dashboard');
        return;
      }
      // If shared worker account has no worker identity unlocked, go to worker select
      if (!currentWorker && !workerLoading) {
        router.replace('/worker/select');
      }
    }
  }, [user, authLoading, currentWorker, workerLoading, router]);

  const fetchMyAssignments = useCallback(async () => {
    if (!currentWorker?.id) return;
    setLoading(true);
    try {
      const res = await apiHelpers.get<{ success: boolean; data: AssignedTestItem[] }>(
        `/tests/my-assignments?workerId=${currentWorker.id}`
      );
      if (res?.data) {
        setTests(res.data);
      }
    } catch (err) {
      console.error('Failed to load technician tests:', err);
    } finally {
      setLoading(false);
    }
  }, [currentWorker?.id]);

  useEffect(() => {
    if (currentWorker?.id) {
      fetchMyAssignments();
    }
  }, [currentWorker?.id, fetchMyAssignments]);

  if (authLoading || (!currentWorker && workerLoading)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
          <span>Opening worker workspace...</span>
        </div>
      </div>
    );
  }

  const isLabWorker = user?.role === 'lab_worker' || user?.email === 'labworker@dow.gov.pg';
  if (!isLabWorker || !currentWorker) {
    return null;
  }

  const inProgressCount = tests.filter((t) => t.status === 'in_progress').length;
  const awaitingReviewCount = tests.filter((t) => t.status === 'awaiting_review').length;
  const completedCount = tests.filter((t) => t.status === 'completed' || t.status === 'approved').length;
  const pendingCount = tests.filter((t) => t.status === 'pending' || t.status === 'assigned').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Worker Greeting & Identity Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-black border-2 border-amber-400/50 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-black text-xl shrink-0 shadow-inner">
            <UserCheck className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Operating Laboratory Personnel
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                Shared Terminal: {user?.email}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Good day, {currentWorker.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-300">
              <span className="font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {currentWorker.workerId}
              </span>
              <span>&bull;</span>
              <span className="font-semibold text-white">
                {currentWorker.designation || currentWorker.position || currentWorker.role || 'Laboratory Technician'}
              </span>
              <span>&bull;</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                {currentWorker.availability || 'AVAILABLE'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan Sample QR</span>
          </button>

          <button
            onClick={() => router.push('/worker/select')}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Switch Personnel</span>
          </button>

          <button
            onClick={fetchMyAssignments}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Tests"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Worker Task KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Assigned Tests</span>
            <TestTube2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{loading ? '...' : tests.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Total in my active queue</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">In Progress</span>
            <Activity className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-teal-400">{loading ? '...' : inProgressCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Measurements being entered</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Awaiting Review</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{loading ? '...' : awaitingReviewCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Submitted for engineer sign-off</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{loading ? '...' : completedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Approved &amp; certified</div>
        </div>
      </div>

      {/* Main Work Area: Active Assigned Worksheets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                My Active Testing Work Queue
              </h2>
              <p className="text-xs text-slate-400">
                Specimens and test procedures assigned to {currentWorker.name}
              </p>
            </div>
            <Link
              href="/work-queue"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>View Full Work Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
              Loading assigned worksheets...
            </div>
          ) : tests.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">No Pending Tests Assigned</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                You have no pending tests in your queue right now. Use the QR Scanner to look up incoming samples or check back when the Lab Manager assigns new worksheets.
              </p>
              <button
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span>Scan Specimen Tag</span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-800">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-850 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {test.testNumber || 'TST-PENDING'}
                        </span>
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                          {test.sample?.sampleNumber}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                          {test.sample?.materialType}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white">
                        {test.testType?.name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="font-mono text-[11px] text-amber-300">
                          {test.testType?.standard}
                        </span>
                        {test.sample?.project?.name && (
                          <>
                            <span>&bull;</span>
                            <span className="truncate max-w-xs">{test.sample.project.name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          test.status === 'in_progress'
                            ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                            : test.status === 'awaiting_review'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {test.status.replace('_', ' ')}
                      </span>

                      {test.status === 'pending' || test.status === 'assigned' || test.status === 'not_started' ? (
                        <button
                          type="button"
                          onClick={() => handleStartTest(test.id)}
                          disabled={startingTestId === test.id}
                          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                          {startingTestId === test.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Starting...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Start Test</span>
                            </>
                          )}
                        </button>
                      ) : test.status === 'in_progress' ? (
                        <Link
                          href={`/tests/${test.id}`}
                          className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <span>Resume Worksheet</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href={`/tests/${test.id}`}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm border border-slate-700"
                        >
                          <span>View Worksheet</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Testing Standards & Fast Actions */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Testing Bay Shortcuts
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 transition-colors text-slate-300 hover:text-white text-xs font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>Scan Specimen QR Tag</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <Link
                href="/work-queue"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 transition-colors text-slate-300 hover:text-white text-xs font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                  <span>Full Technician Queue</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>

              <Link
                href="/test-methods"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 transition-colors text-slate-300 hover:text-white text-xs font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>Standard Test Methods (AS 1289)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-black border border-amber-500/30 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>Attribution Notice</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You are currently entering data as <strong className="text-white">{currentWorker.name} ({currentWorker.workerId})</strong>. If another technician takes over this testing bay, please switch identities using the button above.
            </p>
          </div>
        </div>
      </div>

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => {
          setIsScannerOpen(false);
          router.push(`/samples/${code}`);
        }}
      />
    </div>
  );
}

