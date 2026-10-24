'use client';
import { TableSkeleton, CardGridSkeleton, DetailViewSkeleton, Skeleton } from '@/components/ui/skeleton';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ListChecks,
  Clock,
  AlertCircle,
  CheckCircle2,
  TestTube2,
  QrCode,
  ArrowRight,
  Filter,
  RefreshCw,
  FlaskConical,
  Calendar,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { useWorkerStore, WorkerIdentity } from '@/stores/worker-store';
import { useAuthStore } from '@/stores/auth-store';
import { UserCheck, ChevronDown, Check, Lock, X } from 'lucide-react';
import QrScannerModal from '@/components/qr-scanner-modal';
import WorkerPinModal from '@/components/layout/worker-pin-modal';

interface AssignedTestItem {
  id: string;
  testNumber: string;
  status: string;
  deadlineAt?: string;
  deadlineLabel?: string;
  isOverdue?: boolean;
  isDueToday?: boolean;
  remainingDays?: number | null;
  remainingHours?: number | null;
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

export default function TechnicianWorkQueuePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentWorker, workers, fetchWorkers, setWorkerById } = useWorkerStore();
  const [tests, setTests] = useState<AssignedTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'due_today' | 'in_progress' | 'awaiting_review'>('all');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [pinModalWorker, setPinModalWorker] = useState<WorkerIdentity | null>(null);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
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

  const fetchAssignments = async (workerId?: string) => {
    setLoading(true);
    try {
      const targetWorkerId = workerId || currentWorker?.id;
      const url = targetWorkerId ? `/tests/my-assignments?workerId=${targetWorkerId}` : '/tests/my-assignments';
      const res = await apiHelpers.get<{ success: boolean; data: AssignedTestItem[] }>(url);
      if (res?.data) {
        setTests(res.data);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRunDeadlineCheck = async () => {
    setRefreshing(true);
    try {
      await apiHelpers.post('/tests/check-deadlines', {});
      await fetchAssignments(currentWorker?.id);
    } catch (err) {
      console.error('Failed to check deadlines:', err);
      setRefreshing(false);
    }
  };

  const isLabWorker = user?.role === 'lab_worker' || user?.email === 'labworker@dow.gov.pg';

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    if (isLabWorker) {
      if (currentWorker?.id) {
        fetchAssignments(currentWorker.id);
      }
    } else {
      fetchAssignments();
    }
  }, [isLabWorker, currentWorker?.id]);

  useEffect(() => {
    const handleWorkerChanged = (e: any) => {
      if (e.detail?.id && isLabWorker) {
        fetchAssignments(e.detail.id);
      }
    };
    window.addEventListener('dow:worker-changed', handleWorkerChanged);
    return () => window.removeEventListener('dow:worker-changed', handleWorkerChanged);
  }, [isLabWorker]);

  const overdueCount = tests.filter((t) => t.isOverdue).length;
  const dueTodayCount = tests.filter((t) => t.isDueToday).length;
  const inProgressCount = tests.filter((t) => t.status === 'in_progress').length;
  const awaitingReviewCount = tests.filter((t) => t.status === 'awaiting_review').length;

  const filteredTests = tests.filter((t) => {
    if (filter === 'overdue') return t.isOverdue;
    if (filter === 'due_today') return t.isDueToday;
    if (filter === 'in_progress') return t.status === 'in_progress';
    if (filter === 'awaiting_review') return t.status === 'awaiting_review';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Role-Specific Work Queue Banner */}
      {isLabWorker ? (
        /* Shared Laboratory Workstation Operator Banner */
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-black border-2 border-amber-400/50 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold shrink-0 shadow-inner">
              <UserCheck className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Operating Laboratory Personnel
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                  Shared Account: {user?.email || 'labworker@dow.gov.pg'}
                </span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
                {currentWorker?.name || 'Simon Wari'}
              </h1>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                <span className="font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  {currentWorker?.workerId || 'DOW-LT-001'}
                </span>
                <span>&bull;</span>
                <span className="font-semibold text-white">
                  {currentWorker?.designation || currentWorker?.role || 'Laboratory Technician'}
                </span>
              </p>
            </div>
          </div>

          {/* Worker Switcher Button with PIN Protection */}
          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
                Active Worker Identity:
              </span>
              <button
                onClick={() => setIsSelectionModalOpen(true)}
                className="bg-slate-950 hover:bg-slate-800 text-amber-400 font-bold text-xs py-1.5 px-3 rounded-lg border border-amber-400/40 hover:border-amber-400 flex items-center gap-2 transition-all shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{currentWorker?.name || 'Select Identity'} (PIN Protected)</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Lab Manager / Admin Operations Work Queue Header (NO PIN) */
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-black border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold shrink-0 shadow-inner">
              <ListChecks className="w-7 h-7 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                  Laboratory Operations Work Queue
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                  Manager Oversight: {user?.email}
                </span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
                Testing Work Queue &amp; Backlog
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                Monitor testing assignments across all technicians, track turnaround times, and review overdue items.
              </p>
            </div>
          </div>

          {/* Manager Filter by Technician (No PIN Required) */}
          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
                Filter by Technician:
              </span>
              <select
                onChange={(e) => fetchAssignments(e.target.value || undefined)}
                className="bg-slate-950 hover:bg-slate-800 text-amber-400 font-bold text-xs py-1.5 px-3 rounded-lg border border-amber-400/40 hover:border-amber-400 transition-all shadow-sm cursor-pointer"
              >
                <option value="">All Laboratory Technicians</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.workerId})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-amber-400" />
            <span>My Assigned Work</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Individual laboratory tests currently assigned to <strong className="text-amber-400">{currentWorker?.name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-900 rounded-xl p-1 border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                viewMode === 'table' ? 'bg-amber-400 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                viewMode === 'cards' ? 'bg-amber-400 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cards
            </button>
          </div>

          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <QrCode className="w-4 h-4" /> Scan Sample QR
          </button>
          <button
            onClick={handleRunDeadlineCheck}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Scan deadlines & refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setFilter('overdue')}
          className={`card p-4 cursor-pointer transition-all border ${
            filter === 'overdue' ? 'ring-2 ring-danger border-danger' : 'border-border hover:border-danger/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Overdue Deadlines</span>
            <AlertTriangle className="w-4 h-4 text-danger" />
          </div>
          <p className="text-2xl font-bold text-danger mt-2">{overdueCount}</p>
          <span className="text-xs text-[var(--text-muted)] mt-1 block">Immediate action required</span>
        </div>

        <div
          onClick={() => setFilter('due_today')}
          className={`card p-4 cursor-pointer transition-all border ${
            filter === 'due_today' ? 'ring-2 ring-warning border-warning' : 'border-border hover:border-warning/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Due Today</span>
            <Clock className="w-4 h-4 text-warning" />
          </div>
          <p className="text-2xl font-bold text-warning mt-2">{dueTodayCount}</p>
          <span className="text-xs text-[var(--text-muted)] mt-1 block">Target completion today</span>
        </div>

        <div
          onClick={() => setFilter('in_progress')}
          className={`card p-4 cursor-pointer transition-all border ${
            filter === 'in_progress' ? 'ring-2 ring-primary border-primary' : 'border-border hover:border-primary/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">In Progress</span>
            <TestTube2 className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary mt-2">{inProgressCount}</p>
          <span className="text-xs text-[var(--text-muted)] mt-1 block">Measurements underway</span>
        </div>

        <div
          onClick={() => setFilter('awaiting_review')}
          className={`card p-4 cursor-pointer transition-all border ${
            filter === 'awaiting_review' ? 'ring-2 ring-success border-success' : 'border-border hover:border-success/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Awaiting Review</span>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <p className="text-2xl font-bold text-success mt-2">{awaitingReviewCount}</p>
          <span className="text-xs text-[var(--text-muted)] mt-1 block">Submitted to engineer</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1 mr-2">
          <Filter className="w-3.5 h-3.5" /> Filter Queue:
        </span>
        {[
          { key: 'all', label: `All Assigned (${tests.length})` },
          { key: 'overdue', label: `Overdue (${overdueCount})` },
          { key: 'due_today', label: `Due Today (${dueTodayCount})` },
          { key: 'in_progress', label: `In Progress (${inProgressCount})` },
          { key: 'awaiting_review', label: `Under Review (${awaitingReviewCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === tab.key
                ? 'bg-primary text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Test List */}
      {loading ? (
        <TableSkeleton columns={7} rows={6} showHeader={false} />
      ) : filteredTests.length === 0 ? (
        <div className="p-12 text-center card bg-[var(--bg-primary)] border border-dashed border-border">
          <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">No tests matching this filter</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            All assigned tests are up to date. Scan a sample QR code or check back when new samples are registered.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Sample</th>
                  <th className="py-3.5 px-4">Test</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Due</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredTests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/samples/${test.sample.id}`}
                        className="font-mono font-bold text-amber-400 hover:underline block"
                      >
                        {test.sample.sampleNumber}
                      </Link>
                      <span className="text-[11px] text-slate-400">{test.sample.materialType}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{test.testType.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-slate-500">{test.testNumber}</span>
                        <span>&bull;</span>
                        <span>{test.testType.standard}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          test.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : test.status === 'awaiting_review'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : test.status === 'in_progress'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {test.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {test.isOverdue ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                        </span>
                      ) : test.isDueToday ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-400">
                          <Clock className="w-3.5 h-3.5" /> Due Today
                        </span>
                      ) : test.deadlineAt ? (
                        <span className="text-slate-300">
                          {new Date(test.deadlineAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-slate-500">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {test.status === 'pending' || test.status === 'assigned' || test.status === 'not_started' ? (
                        <button
                          type="button"
                          onClick={() => handleStartTest(test.id)}
                          disabled={startingTestId === test.id}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
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
                          className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1 transition-colors"
                        >
                          Resume <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href={`/tests/${test.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs inline-flex items-center gap-1 transition-colors border border-slate-700"
                        >
                          Worksheet <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTests.map((test) => (
              <div
                key={test.id}
                className={`card p-5 bg-[var(--bg-primary)] border transition-all hover:shadow-md ${
                  test.isOverdue
                    ? 'border-danger/40 bg-danger/5'
                    : test.isDueToday
                    ? 'border-warning/40 bg-warning/5'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{test.testNumber}</span>
                      <span
                        className={`badge text-xs uppercase ${
                          test.sample.priority === 'urgent'
                            ? 'badge-danger'
                            : test.sample.priority === 'high'
                            ? 'badge-warning'
                            : 'badge-secondary'
                        }`}
                      >
                        {test.sample.priority}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] mt-1">{test.testType.name}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{test.testType.standard}</p>
                  </div>

                  <div className="text-right">
                    {test.isOverdue ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-danger bg-danger/10 px-2.5 py-1 rounded-md">
                        <AlertTriangle className="w-3.5 h-3.5" /> OVERDUE
                      </span>
                    ) : test.isDueToday ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-warning bg-warning/10 px-2.5 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5" /> DUE TODAY
                      </span>
                    ) : test.remainingDays !== null && test.remainingDays !== undefined ? (
                      <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-md">
                        Due in {test.remainingDays} days
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Sample info */}
                <div className="p-3 rounded-lg bg-[var(--bg-secondary)]/60 text-xs space-y-1.5 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                      <FlaskConical className="w-3.5 h-3.5 text-primary" /> Sample:
                    </span>
                    <Link
                      href={`/samples/${test.sample.id}`}
                      className="font-mono font-semibold text-primary hover:underline"
                    >
                      {test.sample.sampleNumber} ({test.sample.materialType})
                    </Link>
                  </div>
                  {test.sample.project && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Project:</span>
                      <span className="text-[var(--text-primary)] truncate max-w-[200px]">
                        {test.sample.project.name}
                      </span>
                    </div>
                  )}
                  {test.deadlineAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Due Date:
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {new Date(test.deadlineAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span
                    className={`badge text-xs uppercase ${
                      test.status === 'approved'
                        ? 'badge-success'
                        : test.status === 'awaiting_review'
                        ? 'badge-warning'
                        : test.status === 'in_progress'
                        ? 'badge-primary'
                        : 'badge-secondary'
                    }`}
                  >
                    {test.status.replace(/_/g, ' ')}
                  </span>

                  {test.status === 'pending' || test.status === 'assigned' || test.status === 'not_started' ? (
                    <button
                      type="button"
                      onClick={() => handleStartTest(test.id)}
                      disabled={startingTestId === test.id}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
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
                      className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1 transition-colors"
                    >
                      Resume <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <Link
                      href={`/tests/${test.id}`}
                      className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
                    >
                      Worksheet <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />

      {/* Worker Selection Modal */}
      {isSelectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsSelectionModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
              <UserCheck className="w-5 h-5 text-amber-400" />
              <span>Select Laboratory Personnel</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select your identity to access your individual assigned work queue. A 4-digit PIN is required.
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {workers.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    setIsSelectionModalOpen(false);
                    setPinModalWorker(w);
                  }}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    currentWorker?.id === w.id
                      ? 'bg-amber-400/10 border-amber-400/40 text-amber-300'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{w.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400">
                        {w.workerId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{w.position || w.role}</p>
                  </div>
                  <Lock className="w-4 h-4 text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PIN Verification Modal */}
      <WorkerPinModal
        isOpen={!!pinModalWorker}
        targetWorker={pinModalWorker}
        onClose={() => setPinModalWorker(null)}
        onSuccess={() => {
          setPinModalWorker(null);
          if (pinModalWorker) {
            fetchAssignments(pinModalWorker.id);
          }
        }}
      />
    </div>
  );
}

