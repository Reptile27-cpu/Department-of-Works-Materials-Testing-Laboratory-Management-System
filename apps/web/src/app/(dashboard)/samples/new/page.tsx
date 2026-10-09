'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  FlaskConical,
  Building2,
  MapPin,
  Calendar,
  User,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';

interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  location: string;
}

interface TestType {
  id: string;
  code: string;
  name: string;
  category: string;
  standard: string;
}

interface UserOption {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  role?: string;
  workerId?: string;
  position?: string;
}

const MATERIAL_TYPES = [
  'Subgrade Soil (In-situ)',
  'Borrow Pit Soil',
  'Crushed Rock Basecourse (CRB)',
  'Crushed Rock Subbase (CRS)',
  'River Gravel / River Shingle',
  'Fine Aggregate / Sand',
  'Coarse Aggregate / Crushed Stone',
  'Bituminous Concrete / Asphalt Core',
  'Cement Stabilized Pavement Material',
  'Concrete Test Cylinder',
  'Lime Treated Expansive Clay',
];

const SAMPLE_CONDITIONS = [
  'Intact sealed heavy-duty poly bag (Moisture retained)',
  'Disturbed bulk sample in sealed 20L plastic bucket',
  'Undisturbed U50/U75 thin-walled tube sample',
  'Drilled core in fitted core box with paraffin wrap',
  'Bag slightly damaged upon receipt (noted)',
  'Airdry bulk sample in woven sack',
];

export default function NewSamplePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [technicians, setTechnicians] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    projectId: '',
    sampleNumber: '',
    materialType: MATERIAL_TYPES[0],
    description: '',
    location: '',
    depth: '',
    samplingDate: new Date().toISOString().split('T')[0],
    receivedDate: new Date().toISOString().split('T')[0],
    samplerName: '',
    source: '',
    client: 'Department of Works and Highways - PNG',
    priority: 'NORMAL',
    condition: SAMPLE_CONDITIONS[0],
    storageLocation: 'Central Bay - Soils Rack S1',
    technicianId: '',
    notes: '',
  });

  const [selectedTestTypeIds, setSelectedTestTypeIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadFormData() {
      try {
        setLoading(true);
        const [projRes, testsRes, workersRes] = await Promise.all([
          api.get('/projects?status=ACTIVE'),
          api.get('/tests/types'),
          api.get('/laboratory/workers').catch(() => api.get('/users?role=lab_technician')),
        ]);

        const projectList = projRes.data.data?.projects || projRes.data.data || [];
        setProjects(projectList);
        if (projectList.length > 0) {
          setFormData((prev) => ({ ...prev, projectId: projectList[0].id }));
        }

        const testsList = testsRes.data.data?.testTypes || testsRes.data.data || [];
        setTestTypes(testsList);

        const rawWorkers = workersRes.data.data?.users || workersRes.data.data || [];
        const techList: UserOption[] = rawWorkers.map((w: any) => ({
          id: w.id,
          name: w.name || `${w.firstName || ''} ${w.lastName || ''}`.trim(),
          firstName: w.firstName || w.name?.split(' ')[0] || '',
          lastName: w.lastName || w.name?.split(' ').slice(1).join(' ') || '',
          email: w.email || w.workerId || '',
          workerId: w.workerId,
          position: w.position || w.role,
        }));
        setTechnicians(techList);
        if (techList.length > 0) {
          setFormData((prev) => ({ ...prev, technicianId: techList[0].id }));
        }
      } catch (err: unknown) {
        console.error('Failed to load form lookup data:', err);
        setError('Failed to load project and test master data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadFormData();
  }, []);

  const handleTestToggle = (id: string) => {
    setSelectedTestTypeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId) {
      setError('Please select an active civil works project.');
      return;
    }
    if (!formData.materialType) {
      setError('Please specify the material type.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        projectId: formData.projectId,
        materialType: formData.materialType,
        description: formData.description,
        location: formData.location,
        depth: formData.depth,
        samplingDate: formData.samplingDate ? new Date(formData.samplingDate).toISOString() : undefined,
        receivedDate: formData.receivedDate ? new Date(formData.receivedDate).toISOString() : new Date().toISOString(),
        samplerName: formData.samplerName,
        source: formData.source,
        client: formData.client,
        priority: formData.priority,
        condition: formData.condition,
        storageLocation: formData.storageLocation,
        technicianId: formData.technicianId || undefined,
        notes: formData.notes,
        initialTestTypeIds: selectedTestTypeIds,
      };

      const res = await api.post('/samples', payload);
      const createdSample = res.data.data;
      setSuccess(`Sample ${createdSample.sampleNumber} successfully registered into custody!`);

      setTimeout(() => {
        router.push(`/samples/${createdSample.id}`);
      }, 1200);
    } catch (err: unknown) {
      console.error('Failed to register sample:', err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error registering sample.';
      setError(msg);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-amber-500"></div>
          <p className="text-sm font-medium text-slate-400">Loading laboratory master data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/samples"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sample Register
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-amber-500" />
            Sample Custody Registration
          </h1>
          <p className="text-sm text-slate-400">
            Formally log physical civil engineering materials into laboratory custody per DoW Standard Procedures.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Project & Site Information */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-5">
            <Building2 className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-semibold text-white">1. Project & Sourcing Location</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Civil Works Project <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                required
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name} ({p.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Requesting Client / Agency
              </label>
              <input
                type="text"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                placeholder="e.g. DoW Highlands Region, China Railway First Group Ltd"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Sampling Location / Chainage / Section <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. CH 42+500 Cut Section, Northbound Lane"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Depth / Elevation
              </label>
              <input
                type="text"
                value={formData.depth}
                onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
                placeholder="e.g. 0.5m - 1.2m below finished subgrade level"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Material Source / Quarry / Pit
              </label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="e.g. Banz River Gravel Deposit, Pit 3B"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Field Sampler Name & Designation
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={formData.samplerName}
                  onChange={(e) => setFormData({ ...formData, samplerName: e.target.value })}
                  placeholder="e.g. J. Kila (Resident Materials Engineer)"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Material Characterization & Custody */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-5">
            <FlaskConical className="h-5 w-5 text-teal-500" />
            <h2 className="text-base font-semibold text-white">2. Material Characterization & Storage</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Material Classification Type <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.materialType}
                onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                required
              >
                {MATERIAL_TYPES.map((mat) => (
                  <option key={mat} value={mat}>
                    {mat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Testing Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="NORMAL">Normal Priority (Standard SLA)</option>
                <option value="HIGH">High Priority (Urgent Project Inspection)</option>
                <option value="URGENT">Critical / Urgent (Emergency Works / Paving Halt)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Visual Material Description & Color
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Reddish-brown silty clay with moderate plasticity, contains trace fine quartz gravel particles, moist."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Field Sampling Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="date"
                  value={formData.samplingDate}
                  onChange={(e) => setFormData({ ...formData, samplingDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Laboratory Receipt Date <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="date"
                  value={formData.receivedDate}
                  onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Condition Upon Receipt
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              >
                {SAMPLE_CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Assigned Storage Bin / Location
              </label>
              <input
                type="text"
                value={formData.storageLocation}
                onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                placeholder="e.g. Bay C - Rack 04 Soil Bin"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Primary Assigned Technician
              </label>
              <select
                value={formData.technicianId}
                onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="">-- Unassigned (Assign Later) --</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim()} {t.workerId ? `(${t.workerId})` : ''} {t.position ? `— ${t.position}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Special Handling Instructions / Notes
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Sensitive to oven temperature > 60°C due to organic matter"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Initial Laboratory Tests Requested */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-semibold text-white">3. Tests Requested for Sample</h2>
            </div>
            <span className="text-xs text-slate-400">
              {selectedTestTypeIds.length} test{selectedTestTypeIds.length !== 1 ? 's' : ''} selected
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Select the standard civil engineering tests required on this sample. Test worksheets will be automatically created upon sample registration.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {testTypes.map((t) => {
              const selected = selectedTestTypeIds.includes(t.id);
              return (
                <div
                  key={t.id}
                  onClick={() => handleTestToggle(t.id)}
                  className={`cursor-pointer rounded-lg border p-3.5 transition flex flex-col justify-between ${
                    selected
                      ? 'border-amber-500/60 bg-amber-500/10'
                      : 'border-slate-800 bg-slate-850 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-400 mb-1">
                        {t.code}
                      </span>
                      <h4 className="text-xs font-semibold text-white leading-snug">{t.name}</h4>
                    </div>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {}}
                      className="mt-0.5 h-4 w-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400 font-mono">
                    Standard: {t.standard}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/samples"
            className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 transition"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                Registering Sample...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Log Sample into Custody
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
