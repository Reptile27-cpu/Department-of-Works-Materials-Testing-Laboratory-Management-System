'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { FileText, Plus, Search, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

interface RequestItem {
  id: string;
  requestNumber: string;
  clientName: string;
  projectName: string;
  location: string;
  materialType: string;
  status: string;
  samplingDate: string;
  requestedTests: string[];
  quotationId?: string;
  sampleId?: string;
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests', {
        params: { status: statusFilter, search },
      });
      if (res.data?.success) {
        setRequests(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, search]);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'approved':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Technically Approved</span>;
      case 'quoted':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Quotation Issued</span>;
      case 'converted_to_sample':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">Sample Active</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">Rejected</span>;
      case 'clarification_needed':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">Clarification Needed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Awaiting Evaluation</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-7 h-7 text-yellow-500" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Testing Requests (Form RQ-LT)
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Formal requests for laboratory testing received from contractors, government engineers, and project proponents.
          </p>
        </div>
        <Link
          href="/requests/new"
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Request (Form RQ-LT)
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by request number, client, project, or material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-900 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-900 dark:text-white"
        >
          <option value="all">All Request Statuses</option>
          <option value="submitted">Awaiting Evaluation</option>
          <option value="approved">Technically Approved</option>
          <option value="quoted">Quotation Issued</option>
          <option value="converted_to_sample">Sample Active</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading requests register...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500">
          No test requests recorded yet. Click &apos;New Request (Form RQ-LT)&apos; to create one.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Request No</th>
                <th className="py-3 px-4">Client / Department</th>
                <th className="py-3 px-4">Project & Location</th>
                <th className="py-3 px-4">Material</th>
                <th className="py-3 px-4">Requested Tests</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-yellow-600 dark:text-yellow-400">
                    <Link href={`/requests/${r.id}`} className="hover:underline">
                      {r.requestNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                    {r.clientName}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    <div className="font-medium">{r.projectName}</div>
                    <div className="text-xs text-slate-400">{r.location}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {r.materialType}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {r.requestedTests?.length || 0} tests requested:
                    </span>
                    <div className="truncate max-w-[200px]" title={r.requestedTests?.join(', ')}>
                      {r.requestedTests?.join(', ')}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(r.status)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/requests/${r.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400 hover:text-yellow-500"
                    >
                      View Details
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
  );
}

