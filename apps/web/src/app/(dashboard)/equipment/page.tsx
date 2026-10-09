'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Wrench,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileCheck,
  RefreshCw,
  XCircle,
} from 'lucide-react';

interface Equipment {
  id: string;
  assetNumber: string;
  name: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  location: string | null;
  status: string;
  lastCalibrationDate: string | null;
  nextCalibrationDate: string;
  calibrationAgency: string | null;
  certificateNumber: string | null;
  notes: string | null;
}

const CATEGORIES = [
  'BALANCES',
  'OVENS',
  'SIEVES',
  'COMPACTION',
  'CBR_PRESS',
  'COMPRESSION_MACHINE',
  'HYDROMETER',
  'OTHER',
];

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalModal, setShowCalModal] = useState(false);
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);

  // Add form state
  const [addForm, setAddForm] = useState({
    assetNumber: '',
    name: '',
    category: 'BALANCES',
    manufacturer: '',
    model: '',
    serialNumber: '',
    location: 'Central Materials Laboratory - POM',
    nextCalibrationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    calibrationAgency: 'National Institute of Standards & Industrial Technology (NISIT PNG)',
    notes: '',
  });

  // Cal form state
  const [calForm, setCalForm] = useState({
    calibrationDate: new Date().toISOString().split('T')[0],
    certificateNumber: '',
    performedBy: 'NISIT Metrology Division (PNG)',
    nextCalibrationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    result: 'PASS',
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/equipment', { params });
      setEquipment(res.data.data?.equipment || res.data.data || []);
    } catch (err) {
      console.error('Failed to load equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, [categoryFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEquipment();
  };

  // Metrics
  const now = new Date();
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const totalCount = equipment.length;
  const overdueCount = equipment.filter((e) => new Date(e.nextCalibrationDate) < now).length;
  const expiringSoonCount = equipment.filter((e) => {
    const d = new Date(e.nextCalibrationDate);
    return d >= now && d <= thirtyDaysOut;
  }).length;
  const outOfServiceCount = equipment.filter((e) => e.status === 'OUT_OF_SERVICE').length;
  const activeCount = equipment.filter(
    (e) => e.status === 'ACTIVE' && new Date(e.nextCalibrationDate) >= now
  ).length;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.assetNumber || !addForm.name) return;

    try {
      setSaving(true);
      setError(null);
      await api.post('/equipment', addForm);
      setShowAddModal(false);
      setSuccess(`Equipment ${addForm.assetNumber} added to calibration register.`);
      fetchEquipment();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error adding equipment.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEq || !calForm.certificateNumber) return;

    try {
      setSaving(true);
      setError(null);
      await api.post(`/equipment/${selectedEq.id}/calibration`, calForm);
      setShowCalModal(false);
      setSuccess(`Calibration certificate logged for ${selectedEq.assetNumber}.`);
      fetchEquipment();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error recording calibration.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item: Equipment) => {
    const nextStatus = item.status === 'ACTIVE' ? 'OUT_OF_SERVICE' : 'ACTIVE';
    try {
      await api.patch(`/equipment/${item.id}`, { status: nextStatus });
      fetchEquipment();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const getCalibrationStatus = (item: Equipment) => {
    if (item.status === 'OUT_OF_SERVICE') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400 border border-red-500/20">
          <XCircle className="h-3 w-3" /> Out of Service
        </span>
      );
    }
    const calDate = new Date(item.nextCalibrationDate);
    if (calDate < now) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400 border border-red-500/20">
          <AlertTriangle className="h-3 w-3" /> Overdue
        </span>
      );
    }
    if (calDate <= thirtyDaysOut) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/20">
          <Clock className="h-3 w-3" /> Expiring Soon
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="h-3 w-3" /> Calibrated
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Wrench className="h-6 w-6 text-amber-500" />
            Equipment & Calibration Management
          </h1>
          <p className="text-sm text-slate-400">
            Civil engineering testing apparatus calibration tracking per NISIT PNG standards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchEquipment()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
          >
            <Plus className="h-4 w-4" /> Add Instrument
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <p className="text-xs font-semibold text-slate-400">Total Apparatus</p>
          <p className="mt-1 text-2xl font-bold text-white">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <p className="text-xs font-semibold text-emerald-400">Calibrated & Active</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <p className="text-xs font-semibold text-amber-400">Expiring (&lt; 30 Days)</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{expiringSoonCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <p className="text-xs font-semibold text-red-400">Calibration Overdue</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{overdueCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <p className="text-xs font-semibold text-slate-400">Out of Service</p>
          <p className="mt-1 text-2xl font-bold text-slate-400">{outOfServiceCount}</p>
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
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search asset number, serial, model, or instrument name..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace('_', ' ')}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="OUT_OF_SERVICE">Out of Service</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
          </select>
        </div>
      </div>

      {/* Equipment Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-amber-500" />
          </div>
        ) : equipment.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Wrench className="h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-white">No Equipment Found</h3>
            <p className="mt-1 text-xs text-slate-400">
              No instruments match your search criteria. Add new laboratory equipment above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Asset Number</th>
                  <th className="px-4 py-3 font-semibold">Equipment Name & Model</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">NISIT Certificate</th>
                  <th className="px-4 py-3 font-semibold">Next Calibration Due</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {equipment.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono font-bold text-amber-400">
                      {item.assetNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-white block">{item.name}</span>
                      <span className="text-[11px] text-slate-400 block font-mono">
                        {item.manufacturer || 'Unknown'} {item.model || ''} | S/N: {item.serialNumber || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400">{item.location || 'Central Lab'}</td>
                    <td className="px-4 py-3.5 font-mono text-[11px]">
                      {item.certificateNumber ? (
                        <div>
                          <span className="text-teal-400 font-bold block">{item.certificateNumber}</span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">
                            {item.calibrationAgency || 'NISIT PNG'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">None logged</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono">
                      {new Date(item.nextCalibrationDate).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">{getCalibrationStatus(item)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setSelectedEq(item);
                          setShowCalModal(true);
                        }}
                        className="inline-flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs font-semibold text-amber-400 hover:bg-slate-700 border border-slate-700 transition"
                      >
                        <FileCheck className="h-3 w-3" /> Log Cal
                      </button>
                      <button
                        onClick={() => toggleStatus(item)}
                        className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-400 hover:text-white border border-slate-700 transition"
                      >
                        {item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Calibration Modal */}
      {showCalModal && selectedEq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-amber-500" />
              Log Calibration Certificate
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Record verified calibration event for{' '}
              <strong className="text-white font-mono">{selectedEq.assetNumber}</strong> ({selectedEq.name}).
            </p>

            <form onSubmit={handleCalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  NISIT / Calibration Certificate Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NISIT-CAL-2026-9921"
                  value={calForm.certificateNumber}
                  onChange={(e) => setCalForm({ ...calForm, certificateNumber: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Calibration Performed By / Agency
                </label>
                <input
                  type="text"
                  value={calForm.performedBy}
                  onChange={(e) => setCalForm({ ...calForm, performedBy: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Calibration Date
                  </label>
                  <input
                    type="date"
                    required
                    value={calForm.calibrationDate}
                    onChange={(e) => setCalForm({ ...calForm, calibrationDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={calForm.nextCalibrationDate}
                    onChange={(e) => setCalForm({ ...calForm, nextCalibrationDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Calibration Result
                </label>
                <select
                  value={calForm.result}
                  onChange={(e) => setCalForm({ ...calForm, result: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="PASS">PASS (Within Acceptable Metrological Tolerance)</option>
                  <option value="FAIL">FAIL (Out of Tolerance / Restricted Use)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observations / Uncertainty
                </label>
                <textarea
                  rows={2}
                  value={calForm.notes}
                  onChange={(e) => setCalForm({ ...calForm, notes: e.target.value })}
                  placeholder="Record measurement uncertainty, calibration weights used..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCalModal(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {saving ? 'Logging...' : 'Save Calibration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Plus className="h-5 w-5 text-amber-500" />
              Add Laboratory Equipment
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Register new civil engineering testing apparatus into department custody.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Asset Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DOW-OVEN-003"
                    value={addForm.assetNumber}
                    onChange={(e) => setAddForm({ ...addForm, assetNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Instrument Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Forced Air Thermostatic Laboratory Oven (105°C - 110°C)"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ELE International"
                    value={addForm.manufacturer}
                    onChange={(e) => setAddForm({ ...addForm, manufacturer: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EL24-0420"
                    value={addForm.model}
                    onChange={(e) => setAddForm({ ...addForm, model: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ELE-88912"
                    value={addForm.serialNumber}
                    onChange={(e) => setAddForm({ ...addForm, serialNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Lab Location / Room
                  </label>
                  <input
                    type="text"
                    value={addForm.location}
                    onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Initial Next Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={addForm.nextCalibrationDate}
                    onChange={(e) => setAddForm({ ...addForm, nextCalibrationDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
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
                  {saving ? 'Saving...' : 'Add Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
