'use client';
import { TableSkeleton, CardGridSkeleton, DetailViewSkeleton, Skeleton } from '@/components/ui/skeleton';

import { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Clock,
  Mail,
  Phone,
  Shield,
  Award,
  RefreshCw,
  UserCheck,
  Plus,
  Lock,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  X,
  UserX,
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface WorkerItem {
  id: string;
  workerId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  position: string;
  designation?: string;
  availability: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE' | 'INACTIVE';
  isActive: boolean;
  activeTests: number;
  totalTests: number;
}

interface PersonnelItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  designation?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export default function PersonnelRosterPage() {
  const { user } = useAuthStore();
  const isManagerOrAdmin =
    user?.role === 'lab_manager' ||
    user?.role === 'system_admin' ||
    user?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<'workers' | 'all'>('workers');
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [users, setUsers] = useState<PersonnelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<WorkerItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Add Worker Form state
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    workerCode: '',
    role: 'lab_technician',
    designation: 'Laboratory Technician',
    initialPin: '',
    availability: 'AVAILABLE',
  });

  // Edit Worker Form state
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    designation: '',
    availability: 'AVAILABLE',
    newPin: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [workersRes, usersRes] = await Promise.allSettled([
        apiHelpers.get<{ success: boolean; data: WorkerItem[] }>('/laboratory/workers'),
        apiHelpers.get<{ success: boolean; data: PersonnelItem[] }>('/users'),
      ]);

      if (workersRes.status === 'fulfilled' && workersRes.value?.data) {
        setWorkers(workersRes.value.data);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value?.data) {
        setUsers(usersRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load personnel roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!addForm.firstName.trim() || !addForm.lastName.trim()) {
      setActionError('First and last name are required');
      return;
    }
    if (!addForm.workerCode.trim()) {
      setActionError('Worker code/ID is required (e.g. DOW-LT-004)');
      return;
    }
    if (!/^\d{4}$/.test(addForm.initialPin)) {
      setActionError('Initial PIN must be exactly 4 numeric digits');
      return;
    }

    setActionLoading(true);
    try {
      await apiHelpers.post('/laboratory/workers', {
        firstName: addForm.firstName.trim(),
        lastName: addForm.lastName.trim(),
        workerCode: addForm.workerCode.trim().toUpperCase(),
        role: addForm.role,
        designation: addForm.designation.trim(),
        initialPin: addForm.initialPin,
        availability: addForm.availability,
      });

      setIsAddModalOpen(false);
      setAddForm({
        firstName: '',
        lastName: '',
        workerCode: '',
        role: 'lab_technician',
        designation: 'Laboratory Technician',
        initialPin: '',
        availability: 'AVAILABLE',
      });
      await fetchData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Failed to create worker identity');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker) return;
    setActionError(null);

    if (editForm.newPin && !/^\d{4}$/.test(editForm.newPin)) {
      setActionError('New PIN must be exactly 4 digits or leave blank to keep existing');
      return;
    }

    setActionLoading(true);
    try {
      const payload: any = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        designation: editForm.designation.trim(),
        availability: editForm.availability,
      };
      if (editForm.newPin) {
        payload.newPin = editForm.newPin;
      }

      await apiHelpers.patch(`/laboratory/workers/${editingWorker.id}`, payload);
      setEditingWorker(null);
      await fetchData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Failed to update worker identity');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleDeactivate = async (worker: WorkerItem) => {
    const isDeactivating = worker.isActive;
    const confirmMsg = isDeactivating
      ? `Are you sure you want to soft-deactivate worker identity ${worker.name} (${worker.workerId})? Historical tests and audit logs will remain intact, but this identity cannot unlock workstation sessions.`
      : `Reactivate worker identity ${worker.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (isDeactivating) {
        await apiHelpers.delete(`/laboratory/workers/${worker.id}`);
      } else {
        await apiHelpers.patch(`/laboratory/workers/${worker.id}`, {
          isActive: true,
          availability: 'AVAILABLE',
        });
      }
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Action failed');
    }
  };

  const openEditModal = (w: WorkerItem) => {
    setEditingWorker(w);
    setActionError(null);
    setEditForm({
      firstName: w.firstName || w.name.split(' ')[0] || '',
      lastName: w.lastName || w.name.split(' ').slice(1).join(' ') || '',
      designation: w.position || w.designation || '',
      availability: w.availability || 'AVAILABLE',
      newPin: '',
    });
  };

  const filteredWorkers = workers.filter((w) => {
    if (availabilityFilter !== 'all' && w.availability !== availabilityFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      w.name.toLowerCase().includes(term) ||
      w.workerId.toLowerCase().includes(term) ||
      (w.position || '').toLowerCase().includes(term)
    );
  });

  const getAvailabilityBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Available
          </span>
        );
      case 'BUSY':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Busy
          </span>
        );
      case 'UNAVAILABLE':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Unavailable
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold uppercase tracking-wider">
            Inactive
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
            <Users className="w-4 h-4" /> Laboratory Personnel & Operating Workstation Roster
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Staff Roster & Authorizations</h1>
          <p className="text-xs text-slate-400">
            Accredited materials testing engineers, laboratory technicians, and shared workstation identities
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {isManagerOrAdmin && (
            <button
              onClick={() => {
                setActionError(null);
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-400/10"
            >
              <Plus className="w-4 h-4" /> Add Worker Identity
            </button>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Refresh roster"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('workers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'workers'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/10'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span>Operational Lab Workers ({workers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/10'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>All Staff Accounts ({users.length})</span>
        </button>
      </div>

      {/* WORKERS TAB */}
      {activeTab === 'workers' && (
        <div className="space-y-6">
          {/* Workstation Info Callout */}
          <div className="p-4 rounded-xl bg-slate-950 border border-amber-400/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white">
                  Shared Operational Account Architecture (labworker@dow.gov.pg)
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Individual technician and engineer identities authenticate into this shared workstation using secure 4-digit PINs. Work queues and digital signatures are strictly tied to the verified personnel identity.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase bg-slate-900 px-2.5 py-1 rounded border border-slate-800 text-amber-300">
              Department of Works
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search worker by name, ID, or position..."
                className="w-full bg-slate-950 text-white placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 text-xs border border-slate-800 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="bg-slate-950 text-white rounded-xl px-3 py-2 text-xs border border-slate-800 focus:outline-none focus:border-amber-400"
              >
                <option value="all">All Availability</option>
                <option value="AVAILABLE">Available</option>
                <option value="BUSY">Busy</option>
                <option value="UNAVAILABLE">Unavailable</option>
                <option value="INACTIVE">Inactive / Deactivated</option>
              </select>
            </div>
          </div>

          {/* Workers Grid */}
          {loading ? (
            <CardGridSkeleton count={6} columns={3} />
          ) : filteredWorkers.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-950 border border-dashed border-slate-800">
              <UserCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">No worker identities found</h3>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or add a new worker identity.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkers.map((w) => (
                <div
                  key={w.id}
                  className={`p-5 rounded-2xl bg-slate-950 border transition-all space-y-4 ${
                    w.isActive
                      ? 'border-slate-850 hover:border-amber-400/50 shadow-lg'
                      : 'border-slate-900 opacity-60 bg-slate-950/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center font-bold text-sm">
                        {w.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white flex items-center gap-2">
                          <span>{w.name}</span>
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                            {w.workerId}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {w.position || w.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>{getAvailabilityBadge(w.availability)}</div>
                  </div>

                  {/* Workload Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-850">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Active In Progress
                      </span>
                      <span className="text-base font-bold text-amber-400 mt-0.5 block">
                        {w.activeTests}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-850">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Total Completed
                      </span>
                      <span className="text-base font-bold text-white mt-0.5 block">
                        {w.totalTests}
                      </span>
                    </div>
                  </div>

                  {/* Security Specs */}
                  <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-400" /> Private PIN:
                      </span>
                      <span className="font-mono text-slate-300">•••• (Hashed)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Shared Station:</span>
                      <span className="font-mono text-slate-400 text-[10px]">labworker@dow.gov.pg</span>
                    </div>
                  </div>

                  {/* Manager Controls */}
                  {isManagerOrAdmin && (
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => openEditModal(w)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-amber-400/60 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Edit2 className="w-3 h-3 text-amber-400" /> Edit / Availability
                      </button>

                      <button
                        onClick={() => handleToggleDeactivate(w)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          w.isActive
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                        title={w.isActive ? 'Deactivate worker identity' : 'Reactivate worker'}
                      >
                        {w.isActive ? (
                          <>
                            <UserX className="w-3 h-3" /> Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Reactivate
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ALL STAFF TAB */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-5 rounded-2xl bg-slate-950 border border-slate-850 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-sm">
                      {u.firstName?.[0] || 'U'}
                      {u.lastName?.[0] || ''}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">
                        {u.firstName} {u.lastName}
                      </h3>
                      <p className="text-xs text-amber-400 font-medium">
                        {u.designation || u.role}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      u.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{u.email}</span>
                  </div>
                  {u.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{u.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD WORKER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
              <Plus className="w-5 h-5 text-amber-400" />
              <span>Add Laboratory Worker Identity</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Create a designated laboratory personnel identity with an initial 4-digit PIN for shared workstation login.
            </p>

            {actionError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateWorker} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.firstName}
                    onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                    placeholder="e.g. John"
                    className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 text-xs border border-slate-800 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.lastName}
                    onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                    placeholder="e.g. Kaupa"
                    className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 text-xs border border-slate-800 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Worker Code / ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.workerCode}
                    onChange={(e) => setAddForm({ ...addForm, workerCode: e.target.value })}
                    placeholder="e.g. DOW-LT-004"
                    className="w-full bg-slate-900 text-white font-mono rounded-xl px-3 py-2 text-xs border border-slate-800 focus:border-amber-400 focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Role Category
                  </label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 text-xs border border-slate-800 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="lab_technician">Laboratory Technician</option>
                    <option value="lab_engineer">Materials Engineer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Designation / Position
                </label>
                <input
                  type="text"
                  value={addForm.designation}
                  onChange={(e) => setAddForm({ ...addForm, designation: e.target.value })}
                  placeholder="e.g. Senior Asphalt Technician"
                  className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 text-xs border border-slate-800 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Initial 4-Digit PIN *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={addForm.initialPin}
                    onChange={(e) => setAddForm({ ...addForm, initialPin: e.target.value.replace(/\D/g, '') })}
                    placeholder="e.g. 4444"
                    className="w-full bg-slate-900 text-white font-mono tracking-widest text-center rounded-xl px-3 py-2 text-sm border border-slate-800 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Availability
                  </label>
                  <select
                    value={addForm.availability}
                    onChange={(e) => setAddForm({ ...addForm, availability: e.target.value as any })}
                    className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 text-xs border border-slate-800 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="BUSY">Busy</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all flex items-center gap-2"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Worker Identity</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WORKER MODAL */}
      {editingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingWorker(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
              <Edit2 className="w-5 h-5 text-amber-400" />
              <span>Edit Worker: {editingWorker.name}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Update position, availability status, or reset the private 4-digit PIN.
            </p>

            {actionError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleEditWorker} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 text-xs border border-slate-800 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 text-xs border border-slate-800 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Designation / Position
                </label>
                <input
                  type="text"
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 text-xs border border-slate-800 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Availability Status
                  </label>
                  <select
                    value={editForm.availability}
                    onChange={(e) => setEditForm({ ...editForm, availability: e.target.value as any })}
                    className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 text-xs border border-slate-800 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="BUSY">Busy</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Reset PIN (Optional)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={editForm.newPin}
                    onChange={(e) => setEditForm({ ...editForm, newPin: e.target.value.replace(/\D/g, '') })}
                    placeholder="Leave blank to keep"
                    className="w-full bg-slate-900 text-white font-mono tracking-widest text-center rounded-xl px-3 py-2 text-sm border border-slate-800 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingWorker(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all flex items-center gap-2"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Update Worker</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
