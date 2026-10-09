'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  FlaskConical,
  MapPin,
  Clock,
  Printer,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Tag,
  QrCode,
  Copy,
  Check,
} from 'lucide-react';

interface SampleDetail {
  id: string;
  sampleNumber: string;
  materialType: string;
  description: string | null;
  location: string;
  depth: string | null;
  samplingDate: string | null;
  receivedDate: string;
  samplerName: string | null;
  source: string | null;
  client: string | null;
  priority: string;
  condition: string | null;
  storageLocation: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  qrToken?: string;
  qrPayload?: string;
  qrCodeDataUrl?: string;
  requestId?: string | null;
  request?: {
    id: string;
    requestNumber?: string;
    organizationName?: string;
    projectName?: string;
  };
  project?: {
    id: string;
    code: string;
    name: string;
    client: string;
    location: string;
  };
  technician?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedTechnician?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  statusHistory?: Array<{
    id: string;
    status: string;
    notes: string | null;
    createdAt: string;
    user?: {
      firstName: string;
      lastName: string;
    };
  }>;
  tests?: Array<{
    id: string;
    testNumber: string;
    status: string;
    testDate: string;
    summary: string | null;
    testType: {
      id: string;
      code: string;
      name: string;
      standard: string;
    };
    technician?: {
      firstName: string;
      lastName: string;
    };
    reviewer?: {
      firstName: string;
      lastName: string;
    };
  }>;
}

interface TestTypeOption {
  id: string;
  code: string;
  name: string;
  standard: string;
}

interface UserOption {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  workerId?: string;
  position?: string;
}

export default function SampleDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [sample, setSample] = useState<SampleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add Test Modal State
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [availableTestTypes, setAvailableTestTypes] = useState<TestTypeOption[]>([]);
  const [technicians, setTechnicians] = useState<UserOption[]>([]);
  const [newTestTypeId, setNewTestTypeId] = useState('');
  const [newTestTechId, setNewTestTechId] = useState('');
  const [addingTest, setAddingTest] = useState(false);

  // Status Change Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Print Custody Tag
  const [showTagModal, setShowTagModal] = useState(false);

  const fetchSample = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/samples/${id}`);
      const data = res.data.data;
      if (data && !data.qrCodeDataUrl) {
        const payload = data.qrPayload || `DOW-MS|SAMPLE|${data.sampleNumber}|${data.qrToken || data.id}`;
        data.qrPayload = payload;
        try {
          data.qrCodeDataUrl = await QRCode.toDataURL(payload, {
            errorCorrectionLevel: 'H',
            width: 320,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
          });
        } catch (qrErr) {
          console.error('Failed generating client QR fallback:', qrErr);
        }
      }
      setSample(data);
    } catch (err: unknown) {
      console.error('Failed to load sample:', err);
      setError('Sample record could not be found or you do not have permission.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchSample();
    }
  }, [id]);

  const openAddTestModal = async () => {
    setShowAddTestModal(true);
    try {
      const [testsRes, techRes] = await Promise.all([
        api.get('/tests/types'),
        api.get('/laboratory/workers').catch(() => api.get('/users?role=lab_technician')),
      ]);
      const list = testsRes.data.data?.testTypes || testsRes.data.data || [];
      setAvailableTestTypes(list);
      if (list.length > 0) setNewTestTypeId(list[0].id);

      const rawTechs = techRes.data.data?.users || techRes.data.data || [];
      const techs: UserOption[] = rawTechs.map((t: any) => ({
        id: t.id,
        name: t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim(),
        firstName: t.firstName || t.name?.split(' ')[0] || '',
        lastName: t.lastName || t.name?.split(' ').slice(1).join(' ') || '',
        workerId: t.workerId,
        position: t.position || t.role,
      }));
      setTechnicians(techs);
      if (techs.length > 0) setNewTestTechId(techs[0].id);
    } catch (err) {
      console.error('Error fetching test types:', err);
    }
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestTypeId) return;

    try {
      setAddingTest(true);
      await api.post(`/samples/${id}/tests`, {
        testTypeId: newTestTypeId,
        technicianId: newTestTechId || undefined,
      });
      setShowAddTestModal(false);
      setSuccess('Test worksheet created and assigned successfully.');
      fetchSample();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add test to sample.';
      setError(msg);
    } finally {
      setAddingTest(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return;

    try {
      setUpdatingStatus(true);
      await api.patch(`/samples/${id}/status`, {
        status: newStatus,
        notes: statusNotes,
      });
      setShowStatusModal(false);
      setStatusNotes('');
      setSuccess(`Sample status successfully updated to ${newStatus}.`);
      fetchSample();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update sample status.';
      setError(msg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const printCustodyTag = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-amber-500"></div>
          <p className="text-sm font-medium text-slate-400">Loading sample custody record...</p>
        </div>
      </div>
    );
  }

  if (error || !sample) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-3" />
          <h2 className="text-lg font-bold">Sample Record Not Found</h2>
          <p className="mt-1 text-sm">{error || 'Requested sample was not found.'}</p>
          <Link
            href="/samples"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Samples List
          </Link>
        </div>
      </div>
    );
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400 border border-red-500/20">Critical / Urgent</span>;
      case 'HIGH':
        return <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">High Priority</span>;
      default:
        return <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">Standard</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTERED':
        return <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400 border border-sky-500/20">Custody Logged</span>;
      case 'IN_PROGRESS':
        return <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">Testing in Progress</span>;
      case 'AWAITING_REVIEW':
        return <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400 border border-purple-500/20">Awaiting Review</span>;
      case 'APPROVED':
        return <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">Results Approved</span>;
      case 'REJECTED':
        return <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 border border-red-500/20">Rejected</span>;
      case 'ARCHIVED':
        return <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400 border border-slate-700">Archived</span>;
      default:
        return <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/samples"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sample Register
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-amber-500" />
              {sample.sampleNumber}
            </h1>
            {getStatusBadge(sample.status)}
            {getPriorityBadge(sample.priority)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registered: {new Date(sample.receivedDate).toLocaleDateString()} | Material: <span className="text-slate-200 font-medium">{sample.materialType}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowTagModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <Tag className="h-4 w-4 text-amber-400" />
            Print Custody Tag
          </button>

          <button
            onClick={() => {
              setNewStatus(sample.status);
              setShowStatusModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <RefreshCw className="h-4 w-4 text-teal-400" />
            Update Status
          </button>

          <button
            onClick={openAddTestModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
          >
            <Plus className="h-4 w-4" />
            Add Test Worksheet
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Main Grid: Details + Custody Timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Sample Info & Tests List */}
        <div className="space-y-6 lg:col-span-2">
          {/* Metadata Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
              Sample Specifications & Field Location
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <span className="block text-xs text-slate-400 font-medium">Civil Works Project</span>
                <span className="text-white font-semibold">
                  {sample.project?.code} - {sample.project?.name}
                </span>
                <span className="block text-xs text-slate-400">{sample.project?.location}</span>
              </div>

              <div>
                <span className="block text-xs text-slate-400 font-medium">Requesting Client / Agency</span>
                <span className="text-white">{sample.client || 'PNG Department of Works'}</span>
              </div>

              <div>
                <span className="block text-xs text-slate-400 font-medium">Field Chainage / Location</span>
                <span className="text-white flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  {sample.location}
                </span>
              </div>

              <div>
                <span className="block text-xs text-slate-400 font-medium">Sampling Depth / Elevation</span>
                <span className="text-white">{sample.depth || 'Surface grab'}</span>
              </div>

              <div>
                <span className="block text-xs text-slate-400 font-medium">Source / Quarry / Borrow Pit</span>
                <span className="text-white">{sample.source || 'Local cut excavation'}</span>
              </div>

              <div>
                <span className="block text-xs text-slate-400 font-medium">Sampler Name</span>
                <span className="text-white">{sample.samplerName || 'Not recorded'}</span>
              </div>

              <div>
                <span className="block text-xs text-slate-400 font-medium">Field Sampling Date</span>
                <span className="text-white">
                  {sample.samplingDate ? new Date(sample.samplingDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>

              <div>
                <span className="block text-xs text-slate-400 font-medium">Laboratory Received Date</span>
                <span className="text-white">
                  {new Date(sample.receivedDate).toLocaleDateString()}
                </span>
              </div>

              <div>
                <span className="block text-xs text-slate-400 font-medium">Storage Location</span>
                <span className="text-white font-mono">{sample.storageLocation || 'Main Store'}</span>
              </div>

              <div>
                <span className="block text-xs text-slate-400 font-medium">Assigned Primary Technician</span>
                <span className="text-white">
                  {sample.technician ? `${sample.technician.firstName} ${sample.technician.lastName}` : 'Unassigned'}
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="block text-xs text-slate-400 font-medium">Condition Upon Receipt</span>
                <span className="text-slate-300 italic">{sample.condition || 'Good / Normal'}</span>
              </div>

              {sample.description && (
                <div className="sm:col-span-2">
                  <span className="block text-xs text-slate-400 font-medium">Visual Material Description</span>
                  <p className="text-slate-300">{sample.description}</p>
                </div>
              )}

              {sample.notes && (
                <div className="sm:col-span-2">
                  <span className="block text-xs text-slate-400 font-medium">Handling Notes</span>
                  <p className="text-slate-400 text-xs">{sample.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Laboratory Tests */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-semibold text-white">Laboratory Test Worksheets</h2>
              </div>
              <span className="text-xs text-slate-400">
                {sample.tests?.length || 0} Test{(sample.tests?.length || 0) !== 1 ? 's' : ''} Scheduled
              </span>
            </div>

            {(!sample.tests || sample.tests.length === 0) ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg">
                <FlaskConical className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">No laboratory tests scheduled for this sample yet.</p>
                <button
                  onClick={openAddTestModal}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500 hover:text-amber-400"
                >
                  <Plus className="h-4 w-4" /> Schedule First Test
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {sample.tests.map((test) => (
                  <div
                    key={test.id}
                    className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-800/40 p-3 rounded-lg transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {test.testNumber}
                        </span>
                        <span className="inline-block rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-300">
                          {test.testType.code}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          test.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : test.status === 'AWAITING_REVIEW'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : test.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : test.status === 'RETURNED'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {test.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-white mt-1">
                        {test.testType.name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Method: <span className="font-mono">{test.testType.standard}</span> | Technician:{' '}
                        {test.technician ? `${test.technician.firstName} ${test.technician.lastName}` : 'Unassigned'}
                      </p>

                      {test.summary && (
                        <div className="mt-1.5 text-xs text-teal-400 font-mono bg-teal-950/40 border border-teal-800/40 px-2.5 py-1 rounded inline-block">
                          Result: {test.summary}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tests/${test.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 border border-slate-700 transition"
                      >
                        Open Worksheet <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: QR Specimen Card, Custody & Status History Timeline */}
        <div className="space-y-6">
          {/* Specimen QR Identity Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Specimen QR Identity
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-amber-400">
                {sample.sampleNumber}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="p-3 bg-white rounded-xl shadow-md border-2 border-slate-700 mb-3">
                {sample.qrCodeDataUrl ? (
                  <img
                    src={sample.qrCodeDataUrl}
                    alt={`Physical QR Code for ${sample.sampleNumber}`}
                    className="w-44 h-44 object-contain"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-500 font-mono">
                    Generating QR...
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                Scannable Chain of Custody Payload
              </span>
              <span className="font-mono text-[11px] font-bold text-slate-300 break-all bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                {sample.qrPayload || `DOW-MS|SAMPLE|${sample.sampleNumber}|${sample.qrToken || sample.id}`}
              </span>
              <p className="text-[11px] text-slate-400 mt-2 max-w-xs">
                Official Department of Works laboratory specimen matrix. Scan via barcode terminal to identify sample and open active worksheets.
              </p>
            </div>

            <button
              onClick={() => setShowTagModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-400/10"
            >
              <Printer className="h-4 w-4" />
              <span>Print Official Custody Tag &amp; Label</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Clock className="h-5 w-5 text-teal-500" />
              <h2 className="text-base font-semibold text-white">Chain of Custody Timeline</h2>
            </div>

            {(!sample.statusHistory || sample.statusHistory.length === 0) ? (
              <p className="text-xs text-slate-400">No status changes recorded.</p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {sample.statusHistory.map((item, index) => (
                  <div key={item.id} className="relative">
                    {/* Circle Node */}
                    <div
                      className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-slate-950 ${
                        index === 0 ? 'bg-amber-500 ring-4 ring-amber-500/20' : 'bg-slate-600'
                      }`}
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-white block">{item.status}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                      {item.user && (
                        <span className="block text-[11px] text-slate-300 font-medium">
                          By: {item.user.firstName} {item.user.lastName}
                        </span>
                      )}
                      {item.notes && (
                        <p className="mt-1 rounded bg-slate-800/80 p-2 text-[11px] text-slate-300 italic border border-slate-700/50">
                          &quot;{item.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Departmental Quality Controls
            </h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Dual verification required for final approval</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
                <span>Retains full audit log of all measurement entries</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Test Modal */}
      {showAddTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Plus className="h-5 w-5 text-amber-500" />
              Schedule Test Worksheet
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select the standard test to schedule for sample <span className="font-mono text-amber-400">{sample.sampleNumber}</span>.
            </p>

            <form onSubmit={handleAddTest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Test Type & Standard
                </label>
                <select
                  value={newTestTypeId}
                  onChange={(e) => setNewTestTypeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  required
                >
                  {availableTestTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} - {t.name} ({t.standard})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Technician
                </label>
                <select
                  value={newTestTechId}
                  onChange={(e) => setNewTestTechId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="">-- Unassigned --</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name || `${tech.firstName || ''} ${tech.lastName || ''}`.trim()} {tech.workerId ? `(${tech.workerId})` : ''} {tech.position ? `— ${tech.position}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTestModal(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingTest}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {addingTest ? 'Scheduling...' : 'Create Worksheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-teal-400" />
              Update Sample Status
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Transition the custody status of <span className="font-mono text-amber-400">{sample.sampleNumber}</span>.
            </p>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
                  required
                >
                  <option value="REGISTERED">REGISTERED (In Laboratory Custody)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Under Active Testing)</option>
                  <option value="AWAITING_REVIEW">AWAITING_REVIEW (Testing Complete)</option>
                  <option value="APPROVED">APPROVED (All Results Verified)</option>
                  <option value="REJECTED">REJECTED (Compromised / Resample Required)</option>
                  <option value="ARCHIVED">ARCHIVED (Disposed / Archived)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason / Operational Notes
                </label>
                <textarea
                  rows={3}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Record rationale for status transition..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-teal-400 disabled:opacity-50"
                >
                  {updatingStatus ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Sample Custody Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="h-5 w-5 text-amber-500" />
                Physical Sample Custody Tag
              </h3>
              <button
                onClick={() => setShowTagModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ Close
              </button>
            </div>

            {/* Printable Area */}
            <div
              id="printable-custody-tag"
              className="rounded-lg border-2 border-dashed border-slate-600 bg-white p-6 text-slate-900 font-sans print:border-black print:p-4 print:m-0"
            >
              {/* DOW Official Letterhead */}
              <div className="border-b-2 border-black pb-3 text-center flex flex-col items-center">
                <div className="flex items-center justify-center gap-3 mb-1">
                  {/* DOW Crest / Logo */}
                  <img src="/logo.png" alt="DoW Logo" className="w-12 h-12 object-contain" />
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      Independent State of Papua New Guinea
                    </p>
                    <h2 className="text-lg font-black tracking-tight text-slate-950 leading-tight">
                      DEPARTMENT OF WORKS &amp; HIGHWAYS
                    </h2>
                    <p className="text-[11px] font-bold text-amber-800 tracking-wide">
                      CENTRAL MATERIALS TESTING LABORATORY
                    </p>
                  </div>
                </div>
                <div className="w-full bg-slate-950 text-white text-[11px] font-mono font-bold py-1 tracking-wider uppercase mt-1">
                  Official Specimen Custody &amp; Identification Tag
                </div>
              </div>

              {/* Sample & Request Identifiers */}
              <div className="my-3 flex items-center justify-between border-b border-slate-300 pb-2.5">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                    SAMPLE IDENTIFICATION NO.
                  </span>
                  <span className="font-mono text-xl font-black text-slate-950 tracking-tight">
                    {sample.sampleNumber}
                  </span>
                </div>
                {sample.requestId && (
                  <div className="text-center">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                      TESTING REQUEST NO.
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-800">
                      {sample.request?.requestNumber || sample.requestId}
                    </span>
                  </div>
                )}
                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                    RECEIPT DATE
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {new Date(sample.receivedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* REAL PHYSICAL SCANNABLE QR MATRIX */}
              <div className="my-3 p-3.5 border-2 border-slate-950 rounded-xl bg-slate-50 flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="p-2 bg-white rounded-lg border-2 border-black shadow-sm shrink-0">
                  {sample.qrCodeDataUrl ? (
                    <img
                      src={sample.qrCodeDataUrl}
                      alt={`Physical QR Matrix for sample ${sample.sampleNumber}`}
                      className="w-36 h-36 object-contain"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center bg-slate-100 text-xs text-slate-400 font-mono">
                      Generating QR...
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Official Specimen QR Matrix
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-950 break-all bg-white px-2 py-0.5 rounded border border-slate-300">
                    {sample.qrPayload || `DOW-MS|SAMPLE|${sample.sampleNumber}|${sample.qrToken || sample.id}`}
                  </div>
                  <p className="text-[10px] text-slate-600 max-w-xs leading-relaxed pt-1">
                    Scan with Department of Works terminal or smartphone camera to verify custody record and access testing worksheets.
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px] uppercase tracking-wider border border-emerald-300">
                    <span>Authentic Specimen Record</span>
                  </div>
                </div>
              </div>

              {/* Sample Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-300 pb-3 pt-1">
                <div>
                  <span className="font-bold text-slate-600 block">Project:</span>
                  <span className="font-semibold text-slate-950">
                    {sample.project?.code} - {sample.project?.name}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-600 block">Material Type:</span>
                  <span className="font-semibold text-slate-950">{sample.materialType}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-600 block">Location / Chainage:</span>
                  <span className="font-semibold text-slate-950">{sample.location}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-600 block">Depth / Elevation:</span>
                  <span className="font-semibold text-slate-950">{sample.depth || 'Surface'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-600 block">Storage Bin:</span>
                  <span className="font-mono font-bold text-slate-950">{sample.storageLocation || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-600 block">Assigned Tech:</span>
                  <span className="font-semibold text-slate-950">
                    {sample.assignedTechnician
                      ? `${sample.assignedTechnician.firstName} ${sample.assignedTechnician.lastName}`
                      : sample.technician
                      ? `${sample.technician.firstName} ${sample.technician.lastName}`
                      : 'Unassigned'}
                  </span>
                </div>
              </div>

              <div className="mt-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Required Laboratory Tests:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sample.tests?.map((t) => (
                    <span
                      key={t.id}
                      className="rounded border border-slate-400 bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-800"
                    >
                      {t.testType.code} ({t.testType.standard})
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-300 pt-2 text-[10px]">
                <div>
                  <span className="block text-slate-500">Received By:</span>
                  <div className="mt-3 border-b border-black"></div>
                  <span className="mt-0.5 block text-slate-600">Laboratory Registrar</span>
                </div>
                <div>
                  <span className="block text-slate-500">Verified By:</span>
                  <div className="mt-3 border-b border-black"></div>
                  <span className="mt-0.5 block text-slate-600">Materials Engineer / Reviewer</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTagModal(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={printCustodyTag}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
              >
                <Printer className="h-4 w-4" /> Print Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
