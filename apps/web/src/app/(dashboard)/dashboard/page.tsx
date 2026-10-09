'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FlaskConical,
  TestTube2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  FileSpreadsheet,
  Activity,
  ArrowRight,
  RefreshCw,
  Building2,
  Layers,
  MapPin,
  Calendar,
  ShieldCheck,
  DollarSign,
  FileText,
  Loader2,
  HelpCircle,
  UserCheck,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkerStore } from '@/stores/worker-store';

interface DashboardMetrics {
  totalSamples: number;
  samplesAwaitingTesting: number;
  testsInProgress: number;
  testsAwaitingReview: number;
  completedTests: number;
  rejectedTests: number;
  totalEquipment: number;
  overdueCalibrationEquipment: number;
}

interface RecentSample {
  id: string;
  sampleNumber: string;
  materialType: string;
  status: string;
  priority: string;
  createdAt: string;
  project?: { name: string; projectCode: string };
  assignedTechnician?: { firstName: string; lastName: string };
}

interface TechnicianWorkload {
  id: string;
  name: string;
  assignedTests: number;
  assignedSamples: number;
}

interface ActivityLog {
  id: string;
  sampleNumber: string;
  fromStatus: string;
  toStatus: string;
  reason?: string;
  timestamp: string;
  changedBy: string;
}

interface ClientRequestItem {
  id: string;
  requestNumber: string;
  clientName: string;
  projectName: string;
  location: string;
  materialType: string;
  status: string;
  samplingDate: string;
  requestedTests: string[];
  estimatedCost?: number | string;
  sampleId?: string;
  sampleNumber?: string;
  quotationId?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const isClient = user?.role === 'client';

  // Role Gate: Route system_admin and lab_worker to their respective workspaces
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'system_admin' || user.role === 'super_admin') {
        router.replace('/system-admin');
        return;
      }
      if (user.role === 'lab_worker' || user.email === 'labworker@dow.gov.pg') {
        const storedWorkerId = localStorage.getItem('dow_active_worker_id');
        const sessionToken = localStorage.getItem('dow_worker_session_token');
        if (!storedWorkerId || !sessionToken) {
          router.replace('/worker/select');
        } else {
          router.replace('/worker/dashboard');
        }
        return;
      }
    }
  }, [user, authLoading, router]);

  // Internal Staff Dashboard State
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentSamples, setRecentSamples] = useState<RecentSample[]>([]);
  const [workload, setWorkload] = useState<TechnicianWorkload[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  // Worker Session State
  const { currentWorker, workers, setWorkerById, fetchWorkers } = useWorkerStore();
  const [workerProfile, setWorkerProfile] = useState<{
    id: string;
    name: string;
    workerId: string;
    role: string;
    designation: string;
    assignedWorkCount: number;
    activeTestsCount: number;
    completedTestsCount: number;
    awaitingReviewCount: number;
  } | null>(null);

  // Client Dashboard State
  const [clientRequests, setClientRequests] = useState<ClientRequestItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWorkerProfile = useCallback(async (workerId?: string) => {
    const targetId = workerId || currentWorker?.id;
    if (!targetId) return;
    try {
      const res = await api.get(`/laboratory/workers/${targetId}/profile`);
      if (res.data?.success) {
        setWorkerProfile(res.data.data);
      }
    } catch {
      // fallback
    }
  }, [currentWorker?.id]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    if (currentWorker?.id) {
      loadWorkerProfile(currentWorker.id);
    }
  }, [currentWorker?.id, loadWorkerProfile]);

  useEffect(() => {
    const handleWorkerChanged = (e: any) => {
      if (e.detail?.id) {
        loadWorkerProfile(e.detail.id);
      }
    };
    window.addEventListener('dow:worker-changed', handleWorkerChanged);
    return () => window.removeEventListener('dow:worker-changed', handleWorkerChanged);
  }, [loadWorkerProfile]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    if (isClient) {
      try {
        const res = await api.get('/requests');
        if (res.data?.success) {
          setClientRequests(res.data.data || []);
        }
      } catch {
        setError('Unable to load client testing requests.');
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        const [dashRes, reqRes] = await Promise.allSettled([
          api.get('/analytics/dashboard'),
          api.get('/requests?status=submitted'),
        ]);

        if (dashRes.status === 'fulfilled' && dashRes.value.data?.data) {
          const data = dashRes.value.data.data;
          setMetrics(
            data.metrics || {
              totalSamples: data.totalSamples || 0,
              samplesAwaitingTesting: data.samplesAwaitingTesting || 0,
              testsInProgress: data.testsInProgress || 0,
              testsAwaitingReview: data.testsAwaitingReview || 0,
              completedTests: data.completedTests || 0,
              rejectedTests: data.rejectedTests || 0,
              totalEquipment: data.totalEquipment || 0,
              overdueCalibrationEquipment: data.overdueCalibrationEquipment || 0,
            }
          );
          setRecentSamples(data.recentSamples || []);
          setWorkload(data.technicianWorkload || data.workloadByTechnician || []);
          setRecentActivity(data.recentActivity || []);
        }

        if (reqRes.status === 'fulfilled' && reqRes.value.data?.data) {
          setPendingRequestsCount(reqRes.value.data.data.length || 0);
        }
      } catch {
        setError('Unable to load real-time laboratory operational telemetry from backend server.');
      } finally {
        setIsLoading(false);
      }
    }
  }, [isClient]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client Dashboard View
  if (isClient) {
    const totalRequests = clientRequests.length;
    const underReview = clientRequests.filter((r) =>
      ['submitted', 'clarification_needed'].includes((r.status || '').toLowerCase())
    ).length;
    const activeInLab = clientRequests.filter((r) =>
      ['converted_to_sample', 'approved', 'quoted'].includes((r.status || '').toLowerCase())
    ).length;
    const completed = clientRequests.filter((r) =>
      ['completed', 'report_issued'].includes((r.status || '').toLowerCase())
    ).length;

    const getClientBadge = (status: string) => {
      const s = (status || '').toLowerCase();
      switch (s) {
        case 'approved':
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Technically Approved
            </span>
          );
        case 'quoted':
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Quotation Issued
            </span>
          );
        case 'converted_to_sample':
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              In Testing (Sample Active)
            </span>
          );
        case 'rejected':
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Declined
            </span>
          );
        default:
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Under Technical Review
            </span>
          );
      }
    };

    return (
      <div className="space-y-6">
        {/* Client Portal Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 p-6 rounded-2xl border border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
              <Building2 className="w-4 h-4" />
              <span>Department of Works & Highways &bull; Central Materials Laboratory</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Client Testing Portal & Custody Tracker
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Welcome back, <strong className="text-white">{user?.firstName} {user?.lastName}</strong>. Submit requests, track samples, and access certified test reports.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh Requests"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/requests/new"
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-amber-400/20"
            >
              <Plus className="w-4 h-4" />
              <span>New Testing Request</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Client KPI Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Total Requests</span>
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{isLoading ? '...' : totalRequests}</div>
            <div className="text-[11px] text-slate-500 mt-1">Submitted requests</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Under Review</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{isLoading ? '...' : underReview}</div>
            <div className="text-[11px] text-slate-500 mt-1">Awaiting review / quote</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Active in Lab</span>
              <FlaskConical className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-bold text-teal-400">{isLoading ? '...' : activeInLab}</div>
            <div className="text-[11px] text-slate-500 mt-1">Under testing</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Certificates Ready</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">{isLoading ? '...' : completed}</div>
            <div className="text-[11px] text-slate-500 mt-1">Ready for download</div>
          </div>
        </div>

        {/* Client Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Submitted Requests Table (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                My Testing Requests Register
              </h2>
              <Link
                href="/requests"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <span>View Full List</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="text-center py-12 bg-slate-900 rounded-2xl border border-slate-800 text-slate-500">
                Loading requests...
              </div>
            ) : clientRequests.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 rounded-2xl border border-slate-800 p-8 space-y-3">
                <FileText className="w-10 h-10 text-amber-400 mx-auto" />
                <h3 className="text-base font-bold text-white">No Testing Requests Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  You have not submitted any testing requests yet. Click below to start your first Request for Laboratory Testing (Form RQ-LT).
                </p>
                <Link
                  href="/requests/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-xl text-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Submit New Request
                </Link>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Request No</th>
                      <th className="py-3 px-4">Project & Material</th>
                      <th className="py-3 px-4">Scope</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {clientRequests.slice(0, 8).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          <Link href={`/requests/${r.id}`} className="hover:underline">
                            {r.requestNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white block">{r.projectName}</span>
                          <span className="text-[11px] text-slate-400">{r.materialType}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          <span>{r.requestedTests?.length || 1} standards</span>
                        </td>
                        <td className="py-3 px-4">{getClientBadge(r.status)}</td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/requests/${r.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300"
                          >
                            Details
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Guidance & Intake Counter Details (1 Col) */}
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Physical Sample Drop-off</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                When dropping off physical soil, aggregate, or concrete test cylinders, provide your official Request Reference <strong className="text-white">REQ-YYYY-XXXX</strong> at the intake counter.
              </p>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <span className="text-slate-400 block text-[11px]">Laboratory Location:</span>
                <span className="font-semibold text-white">Central Materials Testing Laboratory</span>
                <span className="text-slate-400 block">Department of Works, Boroko, NCD</span>
                <span className="text-amber-400 block text-[11px] pt-1">Hours: Mon &ndash; Fri &bull; 08:00 AM &ndash; 04:00 PM</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 text-xs">
              <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Quick Services
              </h3>
              <Link
                href="/pricing"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 transition-colors text-slate-300 hover:text-white"
              >
                <span>Fee Schedule & Standards Catalogue</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </Link>
              <Link
                href="/quotations"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 transition-colors text-slate-300 hover:text-white"
              >
                <span>My Quotations & Invoices</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </Link>
              <Link
                href="/reports"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 transition-colors text-slate-300 hover:text-white"
              >
                <span>Official Test Certificates</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== INTERNAL STAFF DASHBOARD ====================

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('approved') || s.includes('completed')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          {status}
        </span>
      );
    }
    if (s.includes('review') || s.includes('progress')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
          <Activity className="w-3 h-3" />
          {status}
        </span>
      );
    }
    if (s.includes('reject')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertTriangle className="w-3 h-3" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3" />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
            <Building2 className="w-4 h-4" />
            <span>Materials Testing & Quality Assurance Division</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Central Laboratory Operational Command
          </h1>
          <p className="text-xs text-slate-400">
            Civil engineering materials testing, sample tracking, and standards verification
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/requests"
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Intake Requests ({pendingRequestsCount})</span>
          </Link>

          <Link
            href="/samples/new"
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Direct Intake</span>
          </Link>
        </div>
      </div>

      {/* Laboratory Personnel Availability & Workload Roster (Manager Oversight View) */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-black border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight uppercase">
                Laboratory Personnel Availability &amp; Workload
              </h2>
              <p className="text-xs text-slate-400">
                Active testing technician availability for incoming testing requests and specimen assignment
              </p>
            </div>
          </div>

          <Link
            href="/personnel"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors shrink-0"
          >
            <span>Manage Staff &amp; Availability</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Worker Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {workers.slice(0, 3).map((w) => (
            <div
              key={w.id}
              className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 font-black text-sm flex items-center justify-center shrink-0">
                  {w.firstName?.[0] || w.name[0]}
                  {w.lastName?.[0] || ''}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{w.name}</div>
                  <div className="text-[11px] font-mono text-amber-400">{w.workerId}</div>
                  <div className="text-[10px] text-slate-400 truncate">{w.designation || w.position || w.role}</div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    w.availability === 'AVAILABLE'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : w.availability === 'BUSY'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {w.availability || 'AVAILABLE'}
                </span>
                <div className="text-[10px] text-slate-500 mt-1">
                  {w.activeTests || 0} active tests
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Client Requests Prompt Banner */}
      {pendingRequestsCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-black flex items-center justify-center font-bold shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">
                {pendingRequestsCount} Client Testing Request{pendingRequestsCount > 1 ? 's' : ''} Awaiting Technical Review
              </span>
              <span className="text-amber-300">
                New testing requests submitted by clients require Lab Manager capability evaluation and intake assignment.
              </span>
            </div>
          </div>
          <Link
            href="/requests"
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-xl text-xs text-center transition-colors shadow-sm shrink-0"
          >
            Review Intake Queue &rarr;
          </Link>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Samples</span>
            <FlaskConical className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? '...' : metrics?.totalSamples ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Registered in registry</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Awaiting Test</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {isLoading ? '...' : metrics?.samplesAwaitingTesting ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Queued for assignment</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">In Testing</span>
            <Activity className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-teal-400">
            {isLoading ? '...' : metrics?.testsInProgress ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active lab tests</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Awaiting Review</span>
            <FileSpreadsheet className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {isLoading ? '...' : metrics?.testsAwaitingReview ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Engineering validation</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {isLoading ? '...' : metrics?.completedTests ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Certified reports issued</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Apparatus / Equipment</span>
            <TestTube2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? '...' : metrics?.totalEquipment ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Calibrated instruments</div>
        </div>
      </div>

      {/* 2-Column Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Custody Samples */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Active Samples in Custody</h2>
                <p className="text-xs text-slate-400">Registered materials undergoing laboratory testing</p>
              </div>
              <Link
                href="/samples"
                className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
              >
                <span>Full Registry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-800/60">
              {recentSamples.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No active custody records found.
                </div>
              ) : (
                recentSamples.slice(0, 5).map((sample) => (
                  <div key={sample.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/samples/${sample.id}`}
                          className="font-mono font-bold text-xs text-amber-400 hover:underline"
                        >
                          {sample.sampleNumber}
                        </Link>
                        <span className="text-xs text-white font-medium truncate">
                          {sample.materialType}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        {sample.project?.name && <span>{sample.project.name}</span>}
                        {sample.assignedTechnician && (
                          <span>&bull; Assigned: {sample.assignedTechnician.firstName} {sample.assignedTechnician.lastName}</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">{getStatusBadge(sample.status)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-6">
          {/* Workload by Technician */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <h2 className="text-sm font-semibold text-white mb-1">Technician Workload</h2>
            <p className="text-xs text-slate-400 mb-4">Current active laboratory assignments</p>

            <div className="space-y-3">
              {workload.map((tech) => (
                <div key={tech.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-200">{tech.name}</span>
                    <span className="text-amber-400 font-medium">{tech.assignedTests} tests</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-400 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(100, (tech.assignedTests / 10) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                    <span>Assigned Samples: {tech.assignedSamples}</span>
                    <span>Status: Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Chain of Custody History */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <h2 className="text-sm font-semibold text-white mb-1">Custody Timeline</h2>
            <p className="text-xs text-slate-400 mb-4">Recent status and revision events</p>

            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((act) => (
                <div key={act.id} className="text-xs border-l-2 border-amber-400/60 pl-3 py-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-300">{act.sampleNumber}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5">
                    {act.fromStatus ? `${act.fromStatus} → ` : ''}
                    <span className="font-medium text-white">{act.toStatus}</span>
                  </p>
                  {act.reason && <p className="text-[10px] text-slate-400 italic mt-0.5">{act.reason}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
