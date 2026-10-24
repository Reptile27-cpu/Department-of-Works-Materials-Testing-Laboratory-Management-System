'use client';

import { useState, useEffect } from 'react';
import { TableSkeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  FileText,
  Search,
  ArrowRight,
  FlaskConical,
  RefreshCw,
  Plus
} from 'lucide-react';

interface LabTestItem {
  id: string;
  testNumber: string;
  status: string;
  testDate: string;
  summary: string | null;
  sample?: {
    id: string;
    sampleNumber: string;
    materialType: string;
    location?: string;
    sourceLocation?: string;
    clientReference?: string | null;
    project?: {
      code?: string;
      projectCode?: string;
      name: string;
    } | null;
  } | null;
  testType?: {
    code: string;
    name: string;
    standard: string;
    category?: string;
  } | null;
  technician?: {
    firstName: string;
    lastName: string;
  } | null;
  reviewer?: {
    firstName: string;
    lastName: string;
  } | null;
}

export default function TestsRegisterPage() {
  const [tests, setTests] = useState<LabTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [testTypeFilter, setTestTypeFilter] = useState('');

  const fetchTests = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (testTypeFilter) params.type = testTypeFilter;

      const res = await api.get('/tests', { params });
      setTests(res.data.data?.tests || res.data.data || []);
    } catch (err) {
      console.error('Failed to load lab tests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [statusFilter, testTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTests();
  };

  // Compute stat counts (case-insensitive)
  const totalCount = tests.length;
  const inProgressCount = tests.filter((t) => (t.status || '').toUpperCase() === 'IN_PROGRESS').length;
  const awaitingReviewCount = tests.filter((t) => (t.status || '').toUpperCase() === 'AWAITING_REVIEW').length;
  const approvedCount = tests.filter((t) => (t.status || '').toUpperCase() === 'APPROVED').length;
  const returnedCount = tests.filter((t) => (t.status || '').toUpperCase() === 'RETURNED').length;

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'PENDING':
      case 'NOT_STARTED':
        return <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400 border border-slate-700">Pending</span>;
      case 'IN_PROGRESS':
        return <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/20">In Progress</span>;
      case 'AWAITING_REVIEW':
        return <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-400 border border-purple-500/20">Awaiting Review</span>;
      case 'APPROVED':
        return <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">Approved</span>;
      case 'RETURNED':
        return <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400 border border-red-500/20">Returned</span>;
      default:
        return <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-amber-500" />
            Laboratory Test Worksheets Register
          </h1>
          <p className="text-sm text-slate-400">
            Active and archived laboratory test measurements, calculations, and verification workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTests()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <Link
            href="/samples/new"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
          >
            <Plus className="h-4 w-4" /> Register Sample & Tests
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <p className="text-xs font-semibold text-slate-400">Total Worksheets</p>
          <p className="mt-1 text-2xl font-bold text-white">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <p className="text-xs font-semibold text-amber-400">In Progress</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{inProgressCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <p className="text-xs font-semibold text-purple-400">Awaiting Review</p>
          <p className="mt-1 text-2xl font-bold text-purple-400">{awaitingReviewCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <p className="text-xs font-semibold text-emerald-400">Approved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{approvedCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <p className="text-xs font-semibold text-red-400">Returned / Correction</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{returnedCount}</p>
        </div>
      </div>

      {/* Filter / Search Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search test number, sample ID, project, or standard..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="AWAITING_REVIEW">Awaiting Review</option>
            <option value="APPROVED">Approved</option>
            <option value="RETURNED">Returned</option>
          </select>

          <select
            value={testTypeFilter}
            onChange={(e) => setTestTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-none"
          >
            <option value="">All Test Types</option>
            <option value="MOISTURE_CONTENT">Moisture Content</option>
            <option value="SIEVE_ANALYSIS">Particle Size Distribution</option>
            <option value="ATTERBERG_LIMITS">Atterberg Limits</option>
            <option value="COMPACTION_PROCTOR">Standard Compaction</option>
            <option value="CBR">California Bearing Ratio</option>
            <option value="SPECIFIC_GRAVITY">Specific Gravity</option>
            <option value="SOIL_CLASSIFICATION">Soil Classification</option>
          </select>
        </div>
      </div>

      {/* Tests Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm">
        {loading ? (
          <TableSkeleton columns={7} rows={6} showHeader={false} />
        ) : tests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FlaskConical className="h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-white">No Laboratory Worksheets Found</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              No test records match your filter criteria. Try clearing search filters or registering new samples.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Test Number</th>
                  <th className="px-4 py-3 font-semibold">Sample ID & Material</th>
                  <th className="px-4 py-3 font-semibold">Test Method & Standard</th>
                  <th className="px-4 py-3 font-semibold">Civil Works Project</th>
                  <th className="px-4 py-3 font-semibold">Personnel</th>
                  <th className="px-4 py-3 font-semibold">Calculated Results</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {tests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-800/40 transition">
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono font-bold text-amber-400">
                      {test.testNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      {test.sample ? (
                        <Link
                          href={`/samples/${test.sample.id}`}
                          className="font-mono font-semibold text-white hover:text-amber-400 block"
                        >
                          {test.sample.sampleNumber}
                        </Link>
                      ) : (
                        <span className="font-mono text-slate-500">—</span>
                      )}
                      <span className="text-[11px] text-slate-400 block truncate max-w-[160px]">
                        {test.sample?.materialType || 'General Sample'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-white block">
                        {test.testType?.name || 'Standard Test'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 block">
                        {test.testType?.standard || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <span className="font-semibold text-slate-200 block truncate">
                        {test.sample?.project?.projectCode || test.sample?.project?.code || (test.sample?.clientReference ? `Ref: ${test.sample.clientReference}` : 'Direct Submission')}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {test.sample?.project?.name || test.sample?.sourceLocation || 'No Project Assigned'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-400">
                      <div>
                        Tech:{' '}
                        <span className="text-slate-200 font-medium">
                          {test.technician ? `${test.technician.firstName} ${test.technician.lastName}` : 'Unassigned'}
                        </span>
                      </div>
                      {test.reviewer && (
                        <div className="text-[11px] text-slate-500">
                          Rev: {test.reviewer.firstName} {test.reviewer.lastName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {test.summary ? (
                        <span className="inline-block rounded bg-teal-950/60 border border-teal-800/50 px-2 py-0.5 font-mono text-[11px] text-teal-300 max-w-[220px] truncate">
                          {test.summary}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Pending measurement</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      {getStatusBadge(test.status)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      <Link
                        href={`/tests/${test.id}`}
                        className="inline-flex items-center gap-1 rounded bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
                      >
                        Worksheet <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
