'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FlaskConical,
  Search,
  Plus,
  Download,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';

interface SampleItem {
  id: string;
  sampleNumber: string;
  materialType: string;
  description: string;
  sourceLocation: string;
  priority: string;
  status: string;
  dateReceived: string;
  project?: { id: string; name: string; projectCode: string };
  assignedTechnician?: { id: string; firstName: string; lastName: string };
  _count?: { tests: number };
}

export default function SamplesRegisterPage() {
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [materialFilter, setMaterialFilter] = useState('all');

  const fetchSamples = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (materialFilter !== 'all') params.materialType = materialFilter;

      const res = await apiHelpers.get<{
        success: boolean;
        data: SampleItem[];
        pagination: { total: number; totalPages: number };
      }>('/samples', params);

      if (res?.data) {
        setSamples(res.data);
        setTotal(res.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch samples:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, [page, statusFilter, materialFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSamples();
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; label: string }> = {
      registered: { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Registered' },
      received: { bg: 'bg-slate-100 text-slate-800 border-slate-200', label: 'Received' },
      in_progress: { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: 'In Testing' },
      awaiting_review: { bg: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Awaiting Review' },
      approved: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Approved' },
      completed: { bg: 'bg-teal-100 text-teal-800 border-teal-200', label: 'Completed' },
      returned_for_correction: { bg: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Returned' },
      cancelled: { bg: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Cancelled' },
    };

    const c = config[status] || { bg: 'bg-slate-100 text-slate-800 border-slate-200', label: status };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${c.bg}`}>
        {c.label}
      </span>
    );
  };

  const getPriorityBadge = (p: string) => {
    const isUrgent = p === 'urgent';
    const isHigh = p === 'high';
    return (
      <span className={`text-[10px] font-bold uppercase tracking-wider ${isUrgent ? 'text-red-600' : isHigh ? 'text-amber-600' : 'text-slate-500'}`}>
        {p}
      </span>
    );
  };

  const downloadExcel = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    fetch(`${apiUrl}/reports/export/samples`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DOW_Sample_Register_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => alert('Export failed: ' + err.message));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-600" />
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Sample Custody & Register
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registered material specimens under testing custody at PNG Central Materials Laboratory
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={downloadExcel}
            className="btn-secondary flex items-center gap-1.5 text-xs font-semibold py-2 px-3"
            title="Export to Excel Spreadsheet"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Excel</span>
          </button>

          <Link
            href="/samples/new"
            className="btn-primary flex items-center gap-1.5 text-xs font-bold py-2 px-3 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Sample</span>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by sample ID, project, or location..."
              className="input-field pl-9"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input-field"
            >
              <option value="all">All Statuses</option>
              <option value="registered">Registered</option>
              <option value="in_progress">In Testing</option>
              <option value="awaiting_review">Awaiting Review</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <select
              value={materialFilter}
              onChange={(e) => {
                setMaterialFilter(e.target.value);
                setPage(1);
              }}
              className="input-field"
            >
              <option value="all">All Material Types</option>
              <option value="Subgrade Soil">Subgrade Soil</option>
              <option value="Crushed River Gravel Base Course">Crushed River Gravel</option>
              <option value="Coralline Limestone Pavement Base">Coralline Limestone</option>
              <option value="Alluvial Sub-base Aggregate">Alluvial Sub-base</option>
              <option value="Concrete Core">Concrete Core</option>
              <option value="Bituminous Mix">Bituminous Mix</option>
            </select>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-border text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Sample Ref</th>
                <th className="py-3 px-4">Material / Description</th>
                <th className="py-3 px-4">Project Corridor</th>
                <th className="py-3 px-4">Source Location</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                      <span>Loading laboratory sample custody records...</span>
                    </div>
                  </td>
                </tr>
              ) : samples.length > 0 ? (
                samples.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-900 dark:text-blue-300">
                      <Link href={`/samples/${s.id}`} className="hover:underline">
                        {s.sampleNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{s.materialType}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{s.description}</p>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                      {s.project?.name || 'General Investigation'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                      {s.sourceLocation}
                    </td>
                    <td className="py-3 px-4">
                      {getPriorityBadge(s.priority)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(s.status)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {s.assignedTechnician ? `${s.assignedTechnician.firstName} ${s.assignedTechnician.lastName}` : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/samples/${s.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No laboratory samples found matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between p-3 border-t border-border bg-slate-50/50 dark:bg-slate-800/20 text-xs text-slate-500">
          <span>Showing {samples.length} of {total} samples</span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-2.5 py-1 rounded border border-border disabled:opacity-40 hover:bg-slate-100"
            >
              Previous
            </button>
            <span className="px-2 font-medium">Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
            <button
              disabled={page >= Math.ceil(total / limit)}
              onClick={() => setPage(page + 1)}
              className="px-2.5 py-1 rounded border border-border disabled:opacity-40 hover:bg-slate-100"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
