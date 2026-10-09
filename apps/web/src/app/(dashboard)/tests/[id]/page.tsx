'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
  FileText,
  AlertTriangle,
  History,
  Lock,
  Wrench,
  Clock,
  Printer,
  Calendar,
  Building2,
  Tag,
  UserCheck,
  Layers,
  FlaskConical,
  Scale,
  Compass,
} from 'lucide-react';

interface EquipmentItem {
  id: string;
  assetNumber: string;
  name: string;
  category: string;
  status: string;
  nextCalibrationDate: string;
}

interface TestDetail {
  id: string;
  testNumber: string;
  status: string;
  testDate: string;
  startedAt?: string;
  completedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  summary: string | null;
  rawMeasurements: Record<string, any>;
  calculatedResults: Record<string, any>;
  revisionNumber: number;
  remarks: string | null;
  rejectionReason: string | null;
  sample: {
    id: string;
    sampleNumber: string;
    materialType: string;
    description?: string;
    sourceLocation?: string;
    location?: string;
    dateReceived?: string;
    dateSampled?: string;
    project?: {
      projectCode?: string;
      code?: string;
      name?: string;
      location?: string;
      client?: string;
      clientRecord?: { name: string };
    };
    request?: {
      id: string;
      requestNumber: string;
      client?: { name: string; contactPerson?: string };
    };
    assignedTechnician?: {
      id: string;
      firstName: string;
      lastName: string;
      designation?: string;
    };
  };
  testType: {
    id: string;
    code: string;
    name: string;
    standard: string;
    category: string;
    calculationFormula: string | null;
  };
  technician?: {
    id: string;
    firstName: string;
    lastName: string;
    designation?: string;
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    designation?: string;
  };
  equipment?: EquipmentItem[];
  revisions?: Array<{
    id: string;
    revisionNumber: number;
    reason: string;
    createdAt: string;
    changedBy?: {
      firstName: string;
      lastName: string;
    };
  }>;
}

export default function TestWorksheetPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const user = useAuthStore((state) => state.user);

  const [test, setTest] = useState<TestDetail | null>(null);
  const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Measurements form state
  const [measurements, setMeasurements] = useState<Record<string, any>>({});
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);

  // Modals state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnComments, setReturnComments] = useState('');
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [amendReason, setAmendReason] = useState('');

  const fetchTest = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [testRes, eqRes] = await Promise.all([
        api.get(`/tests/${id}`),
        api.get('/equipment').catch(() => ({ data: { data: [] } })),
      ]);

      const testData = testRes.data.data;
      setTest(testData);
      setMeasurements(testData.rawMeasurements || {});
      setSelectedEquipmentIds(testData.equipment?.map((e: EquipmentItem) => e.id) || []);

      setAllEquipment(eqRes.data.data?.equipment || eqRes.data.data || []);
    } catch (err: any) {
      console.error('Failed to load test worksheet:', err);
      setError(err?.response?.data?.error?.message || 'Test worksheet could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchTest();
  }, [id, fetchTest]);

  // Helper for input updates
  const handleInputChange = (field: string, value: any) => {
    setMeasurements((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Helper for nested/array changes
  const handleArrayItemChange = (arrayName: string, index: number, field: string, value: any) => {
    setMeasurements((prev) => {
      const arr = [...(prev[arrayName] || [])];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [arrayName]: arr };
    });
  };

  // Save draft
  const handleSaveMeasurements = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await api.put(`/tests/${id}/measurements`, {
        rawMeasurements: measurements,
        equipmentIds: selectedEquipmentIds,
        remarks: measurements.remarks || test?.remarks,
      });
      setTest(res.data.data);
      setMeasurements(res.data.data.rawMeasurements || measurements);
      setSuccess('Draft measurements and calculated parameters saved successfully.');
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; error?: { message?: string } } } })?.response?.data?.error?.message ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error saving draft measurements.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Submit for review
  const handleSubmitForReview = async () => {
    try {
      setSubmitting(true);
      setError(null);
      // First save current measurements
      await api.put(`/tests/${id}/measurements`, {
        rawMeasurements: measurements,
        equipmentIds: selectedEquipmentIds,
        remarks: measurements.remarks || test?.remarks,
      });

      const res = await api.post(`/tests/${id}/submit-for-review`, {
        notes: measurements.remarks || 'Submitted following completion of laboratory observations.',
      });
      await fetchTest();
      setSuccess('Worksheet submitted to Lab Manager for engineering review.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; error?: { message?: string } } } })?.response?.data?.error?.message ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error submitting worksheet.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Approve test
  const handleApprove = async () => {
    try {
      setApproving(true);
      setError(null);
      const res = await api.post(`/tests/${id}/approve`, {
        notes: 'Verified compliance with applicable Papua New Guinea standard and confirmed calculation accuracy.',
      });
      await fetchTest();
      setSuccess('Test worksheet officially verified and approved.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; error?: { message?: string } } } })?.response?.data?.error?.message ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error approving test.';
      setError(msg);
    } finally {
      setApproving(false);
    }
  };

  // Return test
  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnComments.trim()) return;

    try {
      setError(null);
      const res = await api.post(`/tests/${id}/return`, {
        comments: returnComments.trim(),
        rejectionReason: returnComments.trim(),
      });
      setTest(res.data.data);
      setShowReturnModal(false);
      setSuccess('Test worksheet returned to technician with corrective instructions.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; error?: { message?: string } } } })?.response?.data?.error?.message ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error returning test.';
      setError(msg);
    }
  };

  // Generate Final Report
  const handleGenerateFinalReport = async () => {
    if (!test?.sample?.id) return;
    try {
      setGeneratingReport(true);
      setError(null);
      await api.post('/reports/generate', {
        sampleId: test.sample.id,
        title: `Official Materials Test Certificate - ${test.sample.sampleNumber}`,
        summary: `Approved testing certificate for sample ${test.sample.sampleNumber} (${test.sample.materialType}) verified according to Department of Works standards.`,
      });
      setSuccess('Official DOW Final Report snapshot generated.');
      router.push('/reports');
    } catch (err: any) {
      console.error('Report generate note:', err);
      // Navigate to reports even if a snapshot already exists
      router.push('/reports');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Amend approved test
  const handleAmend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amendReason.trim()) return;

    try {
      setError(null);
      const res = await api.post(`/tests/${id}/amend`, {
        reason: amendReason.trim(),
      });
      setTest(res.data.data);
      setShowAmendModal(false);
      setSuccess('Worksheet unlocked for amendment. Revision recorded in permanent audit logs.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; error?: { message?: string } } } })?.response?.data?.error?.message ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error amending test.';
      setError(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-amber-500" />
          <p className="text-sm font-medium text-slate-400">Opening laboratory digital worksheet...</p>
        </div>
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-3" />
          <h2 className="text-lg font-bold">Worksheet Not Found</h2>
          <p className="mt-1 text-sm">{error}</p>
          <Link
            href="/work-queue"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Work Queue
          </Link>
        </div>
      </div>
    );
  }

  if (!test) return null;

  const statusNorm = (test.status || '').toLowerCase();
  const isApproved = statusNorm === 'approved' || statusNorm === 'report_generated';
  const isAwaitingReview = statusNorm === 'awaiting_review';
  const canEdit = !isApproved && !isAwaitingReview;
  const canApprove =
    isAwaitingReview &&
    (user?.role === 'lab_engineer' || user?.role === 'lab_manager' || user?.role === 'system_admin' || user?.role === 'super_admin');

  const testTypeCode = (test.testType?.code || '').toUpperCase();

  // Calibration check on assigned equipment
  const hasCalibrationWarning = test.equipment?.some(
    (e) => e.status === 'out_of_service' || (e.nextCalibrationDate && new Date(e.nextCalibrationDate) < new Date())
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
            <Link href="/work-queue" className="hover:text-amber-400 transition flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Testing Work Queue
            </Link>
            <span>/</span>
            <Link href={`/samples/${test.sample.id}`} className="hover:text-amber-400 font-mono transition">
              {test.sample.sampleNumber}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-white font-mono flex items-center gap-2">
              <FileText className="h-6 w-6 text-amber-500" />
              {test.testNumber}
            </h1>
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-bold border tracking-wider uppercase ${
                isApproved
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : isAwaitingReview
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  : statusNorm === 'in_progress'
                  ? 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                  : statusNorm === 'returned' || statusNorm === 'returned_for_correction'
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {test.status.replace(/_/g, ' ')}
            </span>
            {test.revisionNumber > 1 && (
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-amber-400 border border-slate-700">
                Rev {test.revisionNumber}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-1">
            <span className="text-white font-bold">{test.testType?.name}</span> &bull; Method:{' '}
            <span className="font-mono text-amber-400">{test.testType?.standard}</span> &bull; Project:{' '}
            <span className="text-slate-300">{test.sample.project?.name || 'Central Materials'}</span>
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <button
                type="button"
                onClick={handleSaveMeasurements}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition shadow-sm"
              >
                <Save className="h-4 w-4 text-amber-400" />
                {saving ? 'Saving Draft...' : 'Save Draft'}
              </button>

              <button
                type="button"
                onClick={handleSubmitForReview}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-50 transition shadow-sm"
              >
                <ShieldCheck className="h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            </>
          )}

          {canApprove && (
            <>
              <button
                type="button"
                onClick={() => setShowReturnModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition"
              >
                <RotateCcw className="h-4 w-4" />
                Return for Correction
              </button>

              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                {approving ? 'Approving...' : 'Approve Test Results'}
              </button>
            </>
          )}

          {isApproved && (
            <>
              <button
                type="button"
                onClick={() => setShowAmendModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition"
              >
                <Lock className="h-4 w-4" />
                Request Amendment
              </button>

              <button
                type="button"
                onClick={handleGenerateFinalReport}
                disabled={generatingReport}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-300 transition shadow-md"
              >
                <FileText className="h-4 w-4" />
                {generatingReport ? 'Generating...' : 'Generate Final Report'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Official DOW Materials Testing Laboratory Pre-filled Information Card */}
      <div className="rounded-2xl border-2 border-amber-400/40 bg-gradient-to-r from-slate-950 via-slate-900 to-black p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
              Department of Works &amp; Highways &bull; Materials Testing Laboratory
            </div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide uppercase">
              {test.testType?.name || 'Laboratory Test Procedure'}
            </h2>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded bg-amber-400/10 border border-amber-400/30 text-amber-400 font-mono text-xs font-bold">
              Standard: {test.testType?.standard || 'DOW Standard'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sample Number</span>
            <p className="font-mono text-sm font-bold text-amber-400">{test.sample.sampleNumber}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Request Reference</span>
            <p className="font-mono text-sm font-bold text-white">
              {test.sample.request?.requestNumber || 'REQ-PUBLIC-SUBMISSION'}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Client / Proponent</span>
            <p className="font-semibold text-white truncate">
              {test.sample.request?.client?.name || test.sample.project?.clientRecord?.name || test.sample.project?.client || 'Department of Works'}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Project</span>
            <p className="font-semibold text-white truncate">
              {test.sample.project?.name || 'Department Infrastructure Works'}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Material Type</span>
            <p className="font-semibold text-teal-300 capitalize">{test.sample.materialType}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Source / Location</span>
            <p className="text-slate-300 truncate">{test.sample.sourceLocation || test.sample.location || 'Central Materials Lab'}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date Received</span>
            <p className="text-slate-300">{test.sample.dateReceived ? new Date(test.sample.dateReceived).toLocaleDateString() : 'Received'}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Assigned Technician</span>
            <p className="font-bold text-amber-400 truncate">
              {test.technician ? `${test.technician.firstName} ${test.technician.lastName}` : (test.sample.assignedTechnician ? `${test.sample.assignedTechnician.firstName} ${test.sample.assignedTechnician.lastName}` : 'Simon Wari')}
            </p>
          </div>
        </div>
      </div>

      {/* Calibration Warning Banner */}
      {hasCalibrationWarning && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <span className="font-bold">Instrument Calibration Notice:</span> One or more instruments assigned to this
            test have calibration notices. Ensure all measurement tools are calibrated before official report issuance.
          </div>
        </div>
      )}

      {/* Return Notice if previously returned */}
      {test.rejectionReason && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-950/20 p-4 text-xs text-red-300">
          <RotateCcw className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
          <div>
            <span className="font-bold text-red-400 uppercase tracking-wider block mb-1">
              Corrective Action Required by Reviewing Engineer:
            </span>
            <p className="italic">&quot;{test.rejectionReason}&quot;</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Test Worksheet Dynamic Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Worksheet Inputs & Calculations Preview */}
        <div className="space-y-6 lg:col-span-2">
          {/* 1. SOIL MOISTURE / MOISTURE CONTENT (AS 1289.2.1.1) */}
          {(testTypeCode === 'SOIL_MOISTURE' || testTypeCode === 'MOISTURE_CONTENT') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Moisture Content Determination (Oven Drying Method - Form S_2.1.1 MC)
                </h3>
                <span className="font-mono text-xs text-amber-400">AS 1289.2.1.1</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Container / Tare ID
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={measurements.containerId || 'T-101'}
                    onChange={(e) => handleInputChange('containerId', e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none disabled:opacity-60 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Tare Mass $M_c$ (g)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={measurements.tareMass ?? measurements.massContainer ?? 45.2}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleInputChange('tareMass', val);
                      handleInputChange('massContainer', val);
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none disabled:opacity-60 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Mass of Wet Soil + Tare $M_1$ (g)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={measurements.wetSoilPlusTare ?? measurements.massWetSoilAndContainer ?? 195.6}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleInputChange('wetSoilPlusTare', val);
                      handleInputChange('massWetSoilAndContainer', val);
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none disabled:opacity-60 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Mass of Dry Soil + Tare $M_2$ (g)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={measurements.drySoilPlusTare ?? measurements.massDrySoilAndContainer ?? 176.4}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleInputChange('drySoilPlusTare', val);
                      handleInputChange('massDrySoilAndContainer', val);
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none disabled:opacity-60 font-mono"
                  />
                </div>
              </div>

              {/* Calculated Outputs */}
              <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                  Computed Moisture Parameters
                </span>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Mass of Water:</span>
                    <span className="font-mono text-base font-bold text-white">
                      {test.calculatedResults?.waterMass ?? test.calculatedResults?.massWater ?? '-'} g
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Dry Soil Mass:</span>
                    <span className="font-mono text-base font-bold text-white">
                      {test.calculatedResults?.drySoilMass ?? test.calculatedResults?.massDrySoil ?? '-'} g
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Moisture Content (w):</span>
                    <span className="font-mono text-lg font-black text-amber-400">
                      {test.calculatedResults?.moistureContentPct ?? test.calculatedResults?.moistureContent ?? '-'} %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. DYNAMIC CONE PENETROMETER - DCP (AS 1289.6.3.2 / Form No. FDCP 1) */}
          {(testTypeCode === 'DCP_TEST' || testTypeCode === 'DCP') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Dynamic Cone Penetrometer Test (Form No. FDCP 1)
                </h3>
                <span className="font-mono text-xs text-amber-400">AS 1289.6.3.2</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Test Pit / Borehole No.</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={measurements.pitNumber || 'TP-01'}
                    onChange={(e) => handleInputChange('pitNumber', e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Depth Range</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={measurements.depthRange || '0.0m - 1.0m'}
                    onChange={(e) => handleInputChange('depthRange', e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase text-slate-300">
                    Depth Increments &amp; Blow Counts (100mm per stage)
                  </h4>
                  <span className="text-[11px] text-slate-400">Blows/100mm penetration</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Depth (m)</th>
                        <th className="py-2.5 px-3">Blow Count (Blw/100mm)</th>
                        <th className="py-2.5 px-3">e&apos; (mm/blow)</th>
                        <th className="py-2.5 px-3">CBR Value (%)</th>
                        <th className="py-2.5 px-3">Soil Bearing (kPa)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]).map((depth, idx) => {
                        const defaultBlows = [4, 7, 5, 2, 2, 2, 1, 2, 1, 2];
                        const points = measurements.points || defaultBlows.map((b, i) => ({ depthM: (i + 1) * 0.1, blows: b }));
                        const currentPoint = points[idx] || { depthM: depth, blows: defaultBlows[idx] };
                        const calcPoint = test.calculatedResults?.points?.[idx];

                        return (
                          <tr key={depth} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3 text-slate-300 font-bold">{depth.toFixed(1)}m</td>
                            <td className="py-1 px-3">
                              <input
                                type="number"
                                min="1"
                                disabled={!canEdit}
                                value={currentPoint.blows ?? defaultBlows[idx]}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  handleArrayItemChange('points', idx, 'depthM', depth);
                                  handleArrayItemChange('points', idx, 'blows', val);
                                }}
                                className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
                              />
                            </td>
                            <td className="py-2 px-3 text-slate-400">
                              {calcPoint ? calcPoint.eValueMmPerBlow : (100 / (currentPoint.blows || 1)).toFixed(1)}
                            </td>
                            <td className="py-2 px-3 text-amber-400 font-bold">
                              {calcPoint ? `${calcPoint.cbrPct}%` : '-'}
                            </td>
                            <td className="py-2 px-3 text-teal-300">
                              {calcPoint ? `${calcPoint.bearingCapacityKPa} kPa` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DCP Calculated Summary */}
              <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                  Computed DCP Subgrade Characteristics
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Average CBR:</span>
                    <span className="font-mono text-lg font-black text-amber-400">
                      {test.calculatedResults?.averageCbrPct ?? '-'} %
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Min CBR:</span>
                    <span className="font-mono text-base font-bold text-white">
                      {test.calculatedResults?.minCbrPct ?? '-'} %
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Max CBR:</span>
                    <span className="font-mono text-base font-bold text-white">
                      {test.calculatedResults?.maxCbrPct ?? '-'} %
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Subgrade Classification:</span>
                    <span className="font-mono text-xs font-bold text-teal-300 truncate block">
                      {test.calculatedResults?.estimatedSubgradeClass || 'Pending calculation'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. ATTERBERG LIMITS (AS 1289.3.1.1 / 3.2.1) */}
          {testTypeCode === 'ATTERBERG_LIMITS' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Atterberg Limits Determination (Casagrande Method - Form S_3.1.1 AL)
                </h3>
                <span className="font-mono text-xs text-amber-400">AS 1289.3.1.1 / 3.2.1</span>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase">Liquid Limit Multi-point Trials</h4>
                <div className="grid grid-cols-4 gap-2 text-[11px] font-semibold text-slate-400 border-b border-slate-800 pb-1">
                  <span>Blow Count (N)</span>
                  <span>Tare Mass (g)</span>
                  <span>Wet + Tare (g)</span>
                  <span>Dry + Tare (g)</span>
                </div>

                {[0, 1, 2].map((idx) => {
                  const trials = measurements.liquidLimitTrials || [
                    { blows: 30, containerMass: 15.2, wetMass: 38.4, dryMass: 31.6 },
                    { blows: 24, containerMass: 14.8, wetMass: 39.8, dryMass: 32.2 },
                    { blows: 17, containerMass: 15.0, wetMass: 41.2, dryMass: 32.8 },
                  ];
                  const item = trials[idx] || {};
                  return (
                    <div key={idx} className="grid grid-cols-4 gap-2">
                      <input
                        type="number"
                        disabled={!canEdit}
                        placeholder="Blows"
                        value={item.blows ?? ''}
                        onChange={(e) =>
                          handleArrayItemChange('liquidLimitTrials', idx, 'blows', parseInt(e.target.value) || 0)
                        }
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white font-mono"
                      />
                      <input
                        type="number"
                        step="0.01"
                        disabled={!canEdit}
                        placeholder="Tare"
                        value={item.containerMass ?? ''}
                        onChange={(e) =>
                          handleArrayItemChange('liquidLimitTrials', idx, 'containerMass', parseFloat(e.target.value) || 0)
                        }
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white font-mono"
                      />
                      <input
                        type="number"
                        step="0.01"
                        disabled={!canEdit}
                        placeholder="Wet"
                        value={item.wetMass ?? ''}
                        onChange={(e) =>
                          handleArrayItemChange('liquidLimitTrials', idx, 'wetMass', parseFloat(e.target.value) || 0)
                        }
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white font-mono"
                      />
                      <input
                        type="number"
                        step="0.01"
                        disabled={!canEdit}
                        placeholder="Dry"
                        value={item.dryMass ?? ''}
                        onChange={(e) =>
                          handleArrayItemChange('liquidLimitTrials', idx, 'dryMass', parseFloat(e.target.value) || 0)
                        }
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  );
                })}

                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase">Plastic Limit (3mm Thread Trials)</h4>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Tare Mass (g)</label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!canEdit}
                        value={measurements.plasticLimitContainerMass ?? 12.4}
                        onChange={(e) =>
                          handleInputChange('plasticLimitContainerMass', parseFloat(e.target.value) || 0)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Wet Threads + Tare (g)</label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!canEdit}
                        value={measurements.plasticLimitWetMass ?? 26.8}
                        onChange={(e) =>
                          handleInputChange('plasticLimitWetMass', parseFloat(e.target.value) || 0)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Dry Threads + Tare (g)</label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!canEdit}
                        value={measurements.plasticLimitDryMass ?? 24.2}
                        onChange={(e) =>
                          handleInputChange('plasticLimitDryMass', parseFloat(e.target.value) || 0)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculation Outputs */}
                <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 p-4 space-y-2 mt-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                    Calculated Consistency Parameters
                  </span>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Liquid Limit (LL):</span>
                      <span className="font-mono text-base font-bold text-white">
                        {test.calculatedResults?.liquidLimitLL ?? test.calculatedResults?.liquidLimit ?? '-'} %
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Plastic Limit (PL):</span>
                      <span className="font-mono text-base font-bold text-white">
                        {test.calculatedResults?.plasticLimitPL ?? test.calculatedResults?.plasticLimit ?? '-'} %
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Plasticity Index (PI):</span>
                      <span className="font-mono text-lg font-black text-amber-400">
                        {test.calculatedResults?.plasticityIndexPI ?? test.calculatedResults?.plasticityIndex ?? '-'} %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. SIEVE ANALYSIS (AS 1289.3.6.1) */}
          {testTypeCode === 'SIEVE_ANALYSIS' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Particle Size Distribution (Dry Sieving - Form S_3.6.1 PSD)
                </h3>
                <span className="font-mono text-xs text-amber-400">AS 1289.3.6.1</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Total Initial Dry Sample Mass (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  disabled={!canEdit}
                  value={measurements.totalInitialMass ?? measurements.totalDryMass ?? 2500.0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    handleInputChange('totalInitialMass', val);
                    handleInputChange('totalDryMass', val);
                  }}
                  className="w-48 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    <tr>
                      <th className="py-2">Sieve Aperture</th>
                      <th className="py-2">Mass Retained (g)</th>
                      <th className="py-2">Passing (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {(
                      measurements.sieveFractions || measurements.sieves || [
                        { sieve: '75.0 mm', massRetained: 0 },
                        { sieve: '37.5 mm', massRetained: 120 },
                        { sieve: '19.0 mm', massRetained: 450 },
                        { sieve: '9.5 mm', massRetained: 520 },
                        { sieve: '4.75 mm', massRetained: 380 },
                        { sieve: '2.36 mm', massRetained: 290 },
                        { sieve: '1.18 mm', massRetained: 210 },
                        { sieve: '0.60 mm', massRetained: 160 },
                        { sieve: '0.30 mm', massRetained: 140 },
                        { sieve: '0.15 mm', massRetained: 110 },
                        { sieve: '0.075 mm', massRetained: 80 },
                        { sieve: 'Pan', massRetained: 40 },
                      ]
                    ).map((s: any, idx: number) => {
                      const passingCurvePoint = test.calculatedResults?.passingCurve?.[idx];
                      const passingVal = passingCurvePoint?.percentPassing ?? test.calculatedResults?.sieveCurve?.[idx]?.passing;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2 text-slate-300 font-bold">{s.sieve}</td>
                          <td className="py-1">
                            <input
                              type="number"
                              step="0.1"
                              disabled={!canEdit}
                              value={s.massRetained ?? 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleArrayItemChange('sieveFractions', idx, 'sieve', s.sieve);
                                handleArrayItemChange('sieveFractions', idx, 'massRetained', val);
                                handleArrayItemChange('sieves', idx, 'sieve', s.sieve);
                                handleArrayItemChange('sieves', idx, 'massRetained', val);
                              }}
                              className="w-28 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
                            />
                          </td>
                          <td className="py-2 font-bold text-amber-400">
                            {passingVal !== undefined ? `${Number(passingVal).toFixed(1)}%` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. PROCTOR COMPACTION (AS 1289.5.1.1) */}
          {(testTypeCode === 'PROCTOR_COMPACTION' || testTypeCode === 'COMPACTION_PROCTOR') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Standard Proctor Compaction Test (Form S_5.1.1 MC_DD)
                </h3>
                <span className="font-mono text-xs text-amber-400">AS 1289.5.1.1</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">
                    Compaction Mould Volume ($cm^3$)
                  </label>
                  <input
                    type="number"
                    disabled={!canEdit}
                    value={measurements.moldVolumeCm3 ?? measurements.mouldVolume ?? 1000}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleInputChange('moldVolumeCm3', val);
                      handleInputChange('mouldVolume', val);
                    }}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">
                    Mould Mass ($g$)
                  </label>
                  <input
                    type="number"
                    disabled={!canEdit}
                    value={measurements.moldWeightG ?? measurements.mouldMass ?? 2140}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleInputChange('moldWeightG', val);
                      handleInputChange('mouldMass', val);
                    }}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Real-time Calculation Summary Display */}
              <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                  Compaction Characteristics
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Optimum Moisture Content (OMC):</span>
                    <span className="font-mono text-xl font-bold text-amber-400">
                      {test.calculatedResults?.optimumMoistureContentOMC ?? test.calculatedResults?.optimumMoistureContent ?? '-'} %
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Maximum Dry Density (MDD):</span>
                    <span className="font-mono text-xl font-bold text-white">
                      {test.calculatedResults?.maximumDryDensityMDD ?? test.calculatedResults?.maximumDryDensity ?? '-'} t/m³
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. CALIFORNIA BEARING RATIO - CBR (AS 1289.6.1.1) */}
          {(testTypeCode === 'CBR_TEST' || testTypeCode === 'CBR') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  California Bearing Ratio - Standard 4-Day Soaked (Form S_6.1.1 CBR)
                </h3>
                <span className="font-mono text-xs text-amber-400">AS 1289.6.1.1</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">
                    Piston Penetration Load at 2.5mm (kN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={measurements.penetrationLoadKn?.['2.5mm'] ?? measurements.penetration2_5mm ?? 1.85}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleInputChange('penetration2_5mm', val);
                      setMeasurements((prev) => ({
                        ...prev,
                        penetrationLoadKn: { ...(prev.penetrationLoadKn || {}), '2.5mm': val },
                      }));
                    }}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">
                    Piston Penetration Load at 5.0mm (kN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={measurements.penetrationLoadKn?.['5.0mm'] ?? measurements.penetration5_0mm ?? 2.75}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleInputChange('penetration5_0mm', val);
                      setMeasurements((prev) => ({
                        ...prev,
                        penetrationLoadKn: { ...(prev.penetrationLoadKn || {}), '5.0mm': val },
                      }));
                    }}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Initial Swell (mm)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={measurements.swellGaugeInitialMm ?? 0.0}
                    onChange={(e) => handleInputChange('swellGaugeInitialMm', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Final Swell (mm)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={measurements.swellGaugeFinalMm ?? 0.85}
                    onChange={(e) => handleInputChange('swellGaugeFinalMm', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Surcharge (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    disabled={!canEdit}
                    value={measurements.surchargeWeightKg ?? 4.5}
                    onChange={(e) => handleInputChange('surchargeWeightKg', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* CBR Calculated Summary */}
              <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                  Computed California Bearing Ratio
                </span>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">CBR Value:</span>
                    <span className="font-mono text-xl font-black text-amber-400">
                      {test.calculatedResults?.cbrValuePct ?? '-'} %
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">4-Day Swell:</span>
                    <span className="font-mono text-base font-bold text-white">
                      {test.calculatedResults?.swellPercentage ?? '-'} %
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Subgrade Class:</span>
                    <span className="font-mono text-xs font-bold text-teal-300">
                      {test.calculatedResults?.subgradeClass || 'Pending calculation'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7. CONCRETE CYLINDER (AS 1012.9 / Form No. CCTR 1) */}
          {testTypeCode === 'CONCRETE_CYLINDER' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Compressive Strength of Concrete Cylinders (Form No. CCTR 1)
                </h3>
                <span className="font-mono text-xs text-amber-400">AS 1012.9</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Diameter (mm)</label>
                  <input
                    type="number"
                    disabled={!canEdit}
                    value={measurements.specimenDiameterMm ?? 100}
                    onChange={(e) => handleInputChange('specimenDiameterMm', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Height (mm)</label>
                  <input
                    type="number"
                    disabled={!canEdit}
                    value={measurements.specimenHeightMm ?? 200}
                    onChange={(e) => handleInputChange('specimenHeightMm', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Curing Age (Days)</label>
                  <input
                    type="number"
                    disabled={!canEdit}
                    value={measurements.specimenAgeDays ?? 28}
                    onChange={(e) => handleInputChange('specimenAgeDays', parseInt(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">
                    Maximum Compressive Failure Load (kN)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!canEdit}
                    value={measurements.failureLoadKn ?? 275.4}
                    onChange={(e) => handleInputChange('failureLoadKn', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Specimen Mass (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={measurements.massKg ?? 3.75}
                    onChange={(e) => handleInputChange('massKg', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Concrete Compressive Strength Summary */}
              <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                  Computed Compressive Strength
                </span>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Cross Section:</span>
                    <span className="font-mono text-base font-bold text-white">
                      {test.calculatedResults?.crossSectionalAreaMm2 ?? '7854'} mm²
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Strength ($f&apos;_c$):</span>
                    <span className="font-mono text-xl font-black text-amber-400">
                      {test.calculatedResults?.compressiveStrengthMpa ?? '-'} MPa
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Density:</span>
                    <span className="font-mono text-base font-bold text-teal-300">
                      {test.calculatedResults?.densityKgM3 ? `${test.calculatedResults.densityKgM3} kg/m³` : '2387 kg/m³'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. AGGREGATE LOS ANGELES ABRASION (AS 1141.23 / Form No. ATR 1) */}
          {(testTypeCode === 'AGGREGATE_TEST' || testTypeCode === 'LA_ABRASION') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Los Angeles Abrasion Loss (Form No. ATR 1 / Form A_23 LA)
                </h3>
                <span className="font-mono text-xs text-amber-400">AS 1141.23</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Grading Type</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={measurements.grading || 'B'}
                    onChange={(e) => handleInputChange('grading', e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Initial Test Mass $M_1$ (g)</label>
                  <input
                    type="number"
                    disabled={!canEdit}
                    value={measurements.initialMassG ?? 5000}
                    onChange={(e) => handleInputChange('initialMassG', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Retained on 1.70mm $M_2$ (g)</label>
                  <input
                    type="number"
                    disabled={!canEdit}
                    value={measurements.retainedMass1_7mmG ?? 3650}
                    onChange={(e) => handleInputChange('retainedMass1_7mmG', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                  Computed Abrasion Characteristics
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Loss Mass:</span>
                    <span className="font-mono text-base font-bold text-white">
                      {test.calculatedResults?.lossMassG ?? '1350'} g
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">LA Abrasion Loss:</span>
                    <span className="font-mono text-xl font-black text-amber-400">
                      {test.calculatedResults?.abrasionLossPct ?? '27.0'} %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 9. SPECIFIC GRAVITY (AS 1141.6 / Form A_5 PDWA) */}
          {testTypeCode === 'SPECIFIC_GRAVITY' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Particle Density &amp; Water Absorption (Form A_5 PDWA)
                </h3>
                <span className="font-mono text-xs text-amber-400">AS 1141.6</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Pycnometer Container Mass (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={measurements.pycnometerMassG ?? 450.2}
                    onChange={(e) => handleInputChange('pycnometerMassG', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Pycnometer + Dry Soil (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={measurements.pycnometerPlusDrySoilG ?? 950.5}
                    onChange={(e) => handleInputChange('pycnometerPlusDrySoilG', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Pycnometer + Soil + Water (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={measurements.pycnometerSoilWaterG ?? 1812.4}
                    onChange={(e) => handleInputChange('pycnometerSoilWaterG', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Pycnometer + Water Only (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={measurements.pycnometerWaterOnlyG ?? 1500.0}
                    onChange={(e) => handleInputChange('pycnometerWaterOnlyG', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                  Computed Specific Gravity
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Displaced Water Mass:</span>
                    <span className="font-mono text-base font-bold text-white">
                      {test.calculatedResults?.displacedWaterMassG ?? '-'} g
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Specific Gravity ($G_s$):</span>
                    <span className="font-mono text-xl font-black text-amber-400">
                      {test.calculatedResults?.specificGravityGs ?? '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 10. CONCRETE MASONRY (AS/NZS 4456.4 / Form No. CMTR 2 / Form M_4 CSM) */}
          {(testTypeCode === 'CONCRETE_MASONRY' || testTypeCode === 'CONC_MASONRY_COMP') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Compressive Strength of Concrete Masonry Units (Form No. CMTR 2)
                </h3>
                <span className="font-mono text-xs text-amber-400">AS/NZS 4456.4</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Length (mm)</label>
                  <input
                    type="number"
                    disabled={!canEdit}
                    value={measurements.lengthMm ?? 400}
                    onChange={(e) => handleInputChange('lengthMm', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Height (mm)</label>
                  <input
                    type="number"
                    disabled={!canEdit}
                    value={measurements.heightMm ?? 200}
                    onChange={(e) => handleInputChange('heightMm', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Net Area (mm²)</label>
                  <input
                    type="number"
                    disabled={!canEdit}
                    value={measurements.netAreaMm2 ?? 44654}
                    onChange={(e) => handleInputChange('netAreaMm2', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Max Failure Load (kN)</label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!canEdit}
                    value={measurements.failureLoadKn ?? 450.0}
                    onChange={(e) => handleInputChange('failureLoadKn', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                  Computed Masonry Strengths
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Uncorrected Strength (Gross Area):</span>
                    <span className="font-mono text-base font-bold text-white">
                      {test.calculatedResults?.uncorrectedStrengthMpa ?? '-'} MPa
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Corrected Compressive Strength (Net Area):</span>
                    <span className="font-mono text-xl font-black text-amber-400">
                      {test.calculatedResults?.compressiveStrengthMpa ?? '-'} MPa
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 11. FIELD DENSITY / COMPACTION (AS 1289.5.3.1 / Form No. FSTR 1) */}
          {(testTypeCode === 'SAND_REPLACEMENT' || testTypeCode === 'FIELD_DENSITY' || testTypeCode === 'FIELD_DENSITY_SRT') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Field Density &amp; Compaction (Sand Replacement Method - Form No. FSTR 1)
                </h3>
                <span className="font-mono text-xs text-amber-400">AS 1289.5.3.1</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Chainage / Road CH</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={measurements.chainage || 'CH-1+100'}
                    onChange={(e) => handleInputChange('chainage', e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Offset (m)</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={measurements.offsetM || 'LHS'}
                    onChange={(e) => handleInputChange('offsetM', e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Wet Density (t/m³)</label>
                  <input
                    type="number"
                    step="0.001"
                    disabled={!canEdit}
                    value={measurements.wetDensityTM3 ?? 2.180}
                    onChange={(e) => handleInputChange('wetDensityTM3', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Moisture Content (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!canEdit}
                    value={measurements.moistureContentPct ?? 8.5}
                    onChange={(e) => handleInputChange('moistureContentPct', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Adjusted MDD (t/m³)</label>
                  <input
                    type="number"
                    step="0.001"
                    disabled={!canEdit}
                    value={measurements.adjustedMddTM3 ?? 2.000}
                    onChange={(e) => handleInputChange('adjustedMddTM3', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Specified Compaction (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    disabled={!canEdit}
                    value={measurements.specifiedCompactionPct ?? 98.0}
                    onChange={(e) => handleInputChange('specifiedCompactionPct', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                  Computed Relative Compaction
                </span>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Field Dry Density:</span>
                    <span className="font-mono text-base font-bold text-white">
                      {test.calculatedResults?.dryDensityTM3 ? `${test.calculatedResults.dryDensityTM3} t/m³` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Density Ratio:</span>
                    <span className="font-mono text-xl font-black text-amber-400">
                      {test.calculatedResults?.densityRatioPct ? `${test.calculatedResults.densityRatioPct}%` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Compliance Status:</span>
                    <span className={`font-mono text-xs font-bold ${test.calculatedResults?.passesSpecification ? 'text-emerald-400' : 'text-red-400'}`}>
                      {test.calculatedResults?.passesSpecification ? 'PASSES SPECIFICATION' : 'CHECK SPECIFICATION'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 12. ROCK POINT LOAD (IS 8764 / ASTM D5731 / Form No. PLTR 1) */}
          {(testTypeCode === 'POINT_LOAD' || testTypeCode === 'ROCK_POINT_LOAD') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Point Load Strength Index of Rock (Form No. PLTR 1)
                </h3>
                <span className="font-mono text-xs text-amber-400">ASTM D5731 / IS 8764</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Specimen Dimension / Diameter (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!canEdit}
                    value={measurements.specimenWidthDOrWMm ?? 50.0}
                    onChange={(e) => handleInputChange('specimenWidthDOrWMm', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Failure Load P (kN)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={measurements.failureLoadKn ?? 12.50}
                    onChange={(e) => handleInputChange('failureLoadKn', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-semibold mb-1">Moisture Condition</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={measurements.moistureCondition || 'Unsoaked'}
                    onChange={(e) => handleInputChange('moistureCondition', e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                  Computed Point Load Index &amp; Estimated UCS
                </span>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Is(50) Strength Index:</span>
                    <span className="font-mono text-xl font-black text-amber-400">
                      {test.calculatedResults?.is50Mpa ?? '-'} MPa
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Estimated UCS:</span>
                    <span className="font-mono text-base font-bold text-white">
                      {test.calculatedResults?.estimatedUcsMpa ? `~${test.calculatedResults.estimatedUcsMpa} MPa` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Classification:</span>
                    <span className="font-mono text-xs font-bold text-teal-300">
                      {test.calculatedResults?.strengthClassification || 'Pending calculation'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 13. Fallback for other standard test types */}
          {![
            'SOIL_MOISTURE', 'MOISTURE_CONTENT',
            'DCP_TEST', 'DCP', 'DCP_FOUNDATION', 'FIELD_DCP_PAVEMENT',
            'ATTERBERG_LIMITS',
            'SIEVE_ANALYSIS',
            'PROCTOR_COMPACTION', 'COMPACTION_PROCTOR', 'STD_COMPACTION', 'MOD_COMPACTION',
            'CBR_TEST', 'CBR', 'CBR_SOAKED_4D', 'CBR_UNSOAKED',
            'CONCRETE_CYLINDER', 'CONC_CYLINDER_COMP',
            'CONCRETE_MASONRY', 'CONC_MASONRY_COMP',
            'SAND_REPLACEMENT', 'FIELD_DENSITY', 'FIELD_DENSITY_SRT',
            'POINT_LOAD', 'ROCK_POINT_LOAD',
            'AGGREGATE_TEST', 'LA_ABRASION',
            'SPECIFIC_GRAVITY', 'SOIL_PARTICLE_DENSITY'
          ].includes(testTypeCode) && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  {test.testType?.name || 'Laboratory Test'}
                </h3>
                <span className="font-mono text-xs text-amber-400">{test.testType?.standard || 'DOW Standard'}</span>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Record laboratory observations and measurement parameters according to {test.testType?.standard || 'DOW Standard'}.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block font-semibold mb-1">
                      Primary Observation / Mass
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={!canEdit}
                      value={measurements.reading1 ?? 125.4}
                      onChange={(e) => handleInputChange('reading1', parseFloat(e.target.value) || 0)}
                      className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block font-semibold mb-1">
                      Secondary Observation / Force
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={!canEdit}
                      value={measurements.reading2 ?? 245.8}
                      onChange={(e) => handleInputChange('reading2', parseFloat(e.target.value) || 0)}
                      className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Test Observations & Notes */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Technician Observations &amp; Field Notes
            </h4>
            <textarea
              rows={3}
              disabled={!canEdit}
              value={measurements.remarks || measurements.notes || ''}
              onChange={(e) => {
                handleInputChange('remarks', e.target.value);
                handleInputChange('notes', e.target.value);
              }}
              placeholder="Record any anomalous material behaviour, moisture variation, or ambient conditions..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none disabled:opacity-60"
            />
          </div>
        </div>

        {/* Right Col: Equipment, Signoffs & Audit Trail */}
        <div className="space-y-6">
          {/* Assigned Instruments & Calibration */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Wrench className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Assigned Instruments &amp; Calibration
              </h3>
            </div>

            <div className="space-y-2">
              {allEquipment.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No equipment configured in inventory.</p>
              ) : (
                allEquipment.map((eq) => {
                  const isSelected = selectedEquipmentIds.includes(eq.id);
                  const isExpired = eq.nextCalibrationDate && new Date(eq.nextCalibrationDate) < new Date();
                  return (
                    <label
                      key={eq.id}
                      className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer text-xs transition ${
                        isSelected
                          ? 'border-amber-500/50 bg-amber-500/10'
                          : 'border-slate-800 bg-slate-850 hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!canEdit}
                        checked={isSelected}
                        onChange={() => {
                          if (!canEdit) return;
                          setSelectedEquipmentIds((prev) =>
                            prev.includes(eq.id) ? prev.filter((i) => i !== eq.id) : [...prev, eq.id]
                          );
                        }}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-700 text-amber-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-white">{eq.assetNumber}</span>
                          {isExpired ? (
                            <span className="text-[10px] font-bold text-red-400">CAL DUE</span>
                          ) : (
                            <span className="text-[10px] font-medium text-emerald-400">CAL OK</span>
                          )}
                        </div>
                        <span className="block text-[11px] text-slate-400">{eq.name}</span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Dual Verification Sign-offs */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <ShieldCheck className="h-4 w-4 text-teal-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Dual Verification Sign-offs
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700/50">
                <span className="text-slate-400 block text-[11px]">Primary Testing Technician:</span>
                <span className="font-semibold text-white">
                  {test.technician ? `${test.technician.firstName} ${test.technician.lastName}` : (test.sample.assignedTechnician ? `${test.sample.assignedTechnician.firstName} ${test.sample.assignedTechnician.lastName}` : 'Simon Wari')}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Test Date: {test.testDate ? new Date(test.testDate).toLocaleDateString() : new Date().toLocaleDateString()}
                </span>
              </div>

              <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700/50">
                <span className="text-slate-400 block text-[11px]">Independent Engineering Reviewer:</span>
                <span className="font-semibold text-white">
                  {test.reviewer ? `${test.reviewer.firstName} ${test.reviewer.lastName}` : 'Pending Verification'}
                </span>
                {isApproved && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 mt-1">
                    <CheckCircle2 className="h-3 w-3" /> Officially Certified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Revision History */}
          {test.revisions && test.revisions.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <History className="h-4 w-4 text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Worksheet Revision Audit
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                {test.revisions.map((rev) => (
                  <div key={rev.id} className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
                    <div className="flex items-center justify-between font-mono text-[11px] text-amber-400">
                      <span>Rev {rev.revisionNumber}</span>
                      <span className="text-slate-500">{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300 italic">&quot;{rev.reason}&quot;</p>
                    {rev.changedBy && (
                      <span className="mt-1 block text-[10px] text-slate-500">
                        By {rev.changedBy.firstName} {rev.changedBy.lastName}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Return for Correction Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-red-400" />
              Return Worksheet to Technician
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Specify the corrective actions required for test{' '}
              <span className="font-mono text-amber-400">{test.testNumber}</span>.
            </p>

            <form onSubmit={handleReturn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Required Corrections / Review Comments <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={returnComments}
                  onChange={(e) => setReturnComments(e.target.value)}
                  placeholder="e.g. Please verify dry soil mass for Tare T-101. The moisture content reading appears anomalous relative to adjacent test samples."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500"
                >
                  Return Worksheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Amend Approved Test Modal */}
      {showAmendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-400" />
              Request Formal Amendment
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Approved engineering test results cannot be silently overwritten. Requesting an amendment creates a new
              revision number and preserves current results in permanent audit logs.
            </p>

            <form onSubmit={handleAmend} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Amendment <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={amendReason}
                  onChange={(e) => setAmendReason(e.target.value)}
                  placeholder="e.g. Project Engineer requested re-verification following supplementary compaction testing."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAmendModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
                >
                  Unlock &amp; Increment Revision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
