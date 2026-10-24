'use client';

import { useState, useEffect } from 'react';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import {
  Building2,
  Search,
  Plus,
  MapPin,
  CheckCircle2,
  FlaskConical,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  contractor: string | null;
  location: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  _count?: {
    samples: number;
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    code: '',
    name: '',
    client: 'Department of Works and Highways - PNG',
    contractor: '',
    location: '',
    status: 'ACTIVE',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/projects', { params });
      setProjects(res.data.data?.projects || res.data.data || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProjects();
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.code || !addForm.name) return;

    try {
      setSaving(true);
      setError(null);
      await api.post('/projects', addForm);
      setShowAddModal(false);
      setSuccess(`Project ${addForm.code} created successfully.`);
      fetchProjects();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error creating project.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-amber-500" />
            Civil Infrastructure Projects
          </h1>
          <p className="text-sm text-slate-400">
            Roads, bridges, wharves, and civil works projects submitting materials for laboratory compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchProjects()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
          >
            <Plus className="h-4 w-4" /> Add Civil Project
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <p>{error}</p>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search project code, name, client, or location..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="ON_HOLD">On Hold</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <CardGridSkeleton count={6} columns={3} />
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-white">No Projects Found</h3>
          <p className="mt-1 text-xs text-slate-400">
            No civil works projects currently match your filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-5 hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-amber-400">{p.code}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      p.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : p.status === 'COMPLETED'
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white leading-snug">{p.name}</h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{p.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">Client: {p.client}</span>
                  </div>
                  {p.contractor && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span>Contractor: {p.contractor}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <FlaskConical className="h-3.5 w-3.5 text-teal-400" />
                  <span className="font-semibold text-white">{p._count?.samples || 0}</span> Samples
                </span>

                <Link
                  href={`/samples?search=${encodeURIComponent(p.code)}`}
                  className="font-medium text-amber-400 hover:text-amber-300 text-[11px] transition"
                >
                  View Custody Samples →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Plus className="h-5 w-5 text-amber-500" />
              Register Civil Infrastructure Project
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Create an infrastructure project file for sample custody tracking.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Project Code <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PNG-HWY-005"
                  value={addForm.code}
                  onChange={(e) => setAddForm({ ...addForm, code: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Project Title / Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sepik Coastal Highway Upgrade (Wewak to Aitape)"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Location / Province <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. East Sepik / West Sepik Province"
                  value={addForm.location}
                  onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Client / Funding Agency
                </label>
                <input
                  type="text"
                  value={addForm.client}
                  onChange={(e) => setAddForm({ ...addForm, client: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contractor / Joint Venture
                </label>
                <input
                  type="text"
                  placeholder="e.g. Covec PNG Ltd"
                  value={addForm.contractor}
                  onChange={(e) => setAddForm({ ...addForm, contractor: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Register Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
