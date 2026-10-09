'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  FlaskConical,
  TestTube2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Users,
  RefreshCw,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';

interface TelemetryMetrics {
  totalSamples: number;
  samplesAwaitingTesting: number;
  testsInProgress: number;
  testsAwaitingReview: number;
  completedTests: number;
  rejectedTests: number;
  totalEquipment: number;
  overdueCalibrationEquipment: number;
}

interface TechnicianWorkloadItem {
  id: string;
  name: string;
  role: string;
  assignedTests: number;
  assignedSamples: number;
}

interface TestDistributionItem {
  code: string;
  name: string;
  count: number;
}

interface TrendItem {
  date: string;
  total: number;
  completed: number;
  rate: number;
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);
  const [workload, setWorkload] = useState<TechnicianWorkloadItem[]>([]);
  const [distribution, setDistribution] = useState<TestDistributionItem[]>([]);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [days, setDays] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [dashRes, trendsRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/trends', { params: { days } }).catch(() => ({ data: { data: [] } })),
      ]);

      const data = dashRes.data.data;
      setMetrics(data.metrics || {
        totalSamples: data.totalSamples || 0,
        samplesAwaitingTesting: data.samplesAwaitingTesting || 0,
        testsInProgress: data.testsInProgress || 0,
        testsAwaitingReview: data.testsAwaitingReview || 0,
        completedTests: data.completedTests || 0,
        rejectedTests: data.rejectedTests || 0,
        totalEquipment: data.totalEquipment || 0,
        overdueCalibrationEquipment: data.overdueCalibrationEquipment || 0,
      });

      setWorkload(data.technicianWorkload || []);
      setDistribution(data.testDistribution || []);
      setTrends(Array.isArray(trendsRes.data?.data) ? trendsRes.data.data : []);
    } catch {
      setError('Unable to load laboratory operations telemetry from server.');
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Activity className="w-7 h-7 text-teal-400" />
            Laboratory Operations Telemetry & Analytics
          </h1>
          <p className="text-slate-400 mt-1">
            Testing throughput, quality assurance indices, calibration compliance, and technician workload.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          <button
            onClick={() => loadAnalytics()}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Specimens</span>
            <FlaskConical className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {metrics?.totalSamples ?? 0}
          </div>
          <p className="text-xs text-slate-500">Registered laboratory samples</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>In Testing</span>
            <TestTube2 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-bold text-teal-400">
            {metrics?.testsInProgress ?? 0}
          </div>
          <p className="text-xs text-slate-500">Currently on laboratory benches</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Review Queue</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400">
            {metrics?.testsAwaitingReview ?? 0}
          </div>
          <p className="text-xs text-slate-500">Awaiting engineer verification</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Calibrated Units</span>
            <Wrench className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {metrics?.totalEquipment ?? 0}
          </div>
          <p className="text-xs text-slate-500">
            {metrics?.overdueCalibrationEquipment ? (
              <span className="text-rose-400 font-semibold">{metrics.overdueCalibrationEquipment} overdue calibration</span>
            ) : (
              <span className="text-emerald-400">100% calibration compliant</span>
            )}
          </p>
        </div>
      </div>

      {/* Grid: Technician Workload & Test Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-400" />
              Technician Operational Workload
            </h3>
            <span className="text-xs text-slate-500">Active assignments</span>
          </div>

          <div className="divide-y divide-slate-800">
            {workload.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">No technicians registered with active workloads.</p>
            ) : (
              workload.map((tech) => (
                <div key={tech.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-200">{tech.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{tech.role.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded bg-teal-950/60 text-teal-400 border border-teal-800">
                      {tech.assignedTests} Tests
                    </span>
                    <span className="px-2.5 py-1 rounded bg-blue-950/60 text-blue-400 border border-blue-800">
                      {tech.assignedSamples} Samples
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Test Type Distribution */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-400" />
              Catalogue Test Distribution
            </h3>
            <span className="text-xs text-slate-500">Historical tests</span>
          </div>

          <div className="space-y-3">
            {distribution.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">No test data recorded yet.</p>
            ) : (
              distribution.map((t) => (
                <div key={t.code} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{t.name}</span>
                    <span className="font-mono text-teal-400">{t.count} completed</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(8, t.count * 10))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
