'use client';
import { Skeleton, TableSkeleton, CardGridSkeleton, DetailViewSkeleton, MetricCardsSkeleton } from '@/components/ui/skeleton';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import TestFormViewerModal from '@/components/test-form-viewer-modal';
import { printTestFormPdf, downloadTestFormPdf } from '@/lib/test-form-utils';
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Receipt,
  AlertCircle,
  Building2,
  MapPin,
  Calendar,
  Layers,
  FlaskConical,
  UserCheck,
  QrCode,
  DollarSign,
  Loader2,
  HelpCircle,
  XCircle,
  FileSpreadsheet,
  Printer,
  Eye,
  Download,
  Tag,
} from 'lucide-react';

interface LabRequest {
  id: string;
  requestNumber: string;
  clientName: string;
  projectName: string;
  location: string;
  sourceLocation?: string;
  materialSource?: string;
  materialType?: string;
  sampleCategory?: string;
  sampleDescription: string;
  samplingDate?: string;
  dateSampled?: string;
  sampledBy?: string;
  priority: string;
  status: string;
  estimatedCost?: number | string;
  requestedTests: string[];
  requestItems?: Array<{
    id: string;
    unitPrice: number | string;
    testType?: { name: string; code: string; standard: string };
  }>;
  evaluatedBy?: string;
  evaluationNotes?: string;
  evaluatedAt?: string;
  quotationId?: string;
  sampleId?: string;
  sampleNumber?: string;
  createdAt: string;
}

interface TechnicianOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  designation?: string;
  role: string;
}

export default function RequestDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuthStore();

  const [request, setRequest] = useState<LabRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected' | 'clarification_needed'>('approved');
  const [reviewNotes, setReviewNotes] = useState(
    'All requested test procedures conform to AS 1289 and ASTM specifications. Calibration and laboratory capacity confirmed.'
  );

  // Intake & Assign Modal State
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [sampleCondition, setSampleCondition] = useState('intact');
  const [storageLocation, setStorageLocation] = useState('Soils Bay A');
  const [dueDate, setDueDate] = useState('');
  const [intakeRemarks, setIntakeRemarks] = useState('');

  // Test Form Registry & Viewer Modal State
  const [formList, setFormList] = useState<any[]>([]);
  const [sampleInfo, setSampleInfo] = useState<any | null>(null);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [selectedFormContext, setSelectedFormContext] = useState<{
    title: string;
    testCode: string;
    testStandard?: string;
    sampleNumber?: string;
    pdfEndpoint: string;
    hasTemplate?: boolean;
    defaultFilename?: string;
  } | null>(null);

  const isStaff = user?.role && user.role !== 'client';
  const isManagerOrAdmin = user?.role === 'lab_manager' || user?.role === 'system_admin' || user?.role === 'super_admin';

  const fetchRequest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/requests/${id}`);
      if (res.data?.success) {
        setRequest(res.data.data);
      }

      try {
        const formRes = await api.get(`/test-forms/request/${id}`);
        if (formRes.data?.success) {
          setFormList(formRes.data.data.forms || []);
          setSampleInfo(formRes.data.data.sample || null);
        }
      } catch (fErr) {
        console.warn('Test form mapping fetch note:', fErr);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load request record.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleOpenFormPreview = (form: any) => {
    if (!form.labTestId) return;
    setSelectedFormContext({
      title: form.testName,
      testCode: form.testCode,
      testStandard: form.standard,
      sampleNumber: sampleInfo?.sampleNumber || request?.sampleNumber,
      pdfEndpoint: `/test-forms/test/${form.labTestId}/pdf`,
      hasTemplate: form.hasTemplate,
      defaultFilename: `${sampleInfo?.sampleNumber || request?.sampleNumber || 'DOW'}_${form.testCode}_Form.pdf`,
    });
    setViewerModalOpen(true);
  };

  useEffect(() => {
    if (id) fetchRequest();
  }, [id, fetchRequest]);

  // Load technicians when intake modal opens
  const openIntakeModal = async () => {
    setShowIntakeModal(true);
    if (technicians.length === 0) {
      setLoadingTechs(true);
      try {
        const res = await api.get('/laboratory/workers');
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const workerOptions = res.data.data.map((w: any) => ({
            id: w.id,
            firstName: w.firstName,
            lastName: w.lastName,
            email: w.email,
            role: w.roleKey || w.role,
            designation: `${w.workerId ? w.workerId + ' • ' : ''}${w.role || w.designation}`,
          }));
          setTechnicians(workerOptions);
          setSelectedTechId(workerOptions[0].id);
        } else {
          const usersRes = await api.get('/users');
          if (usersRes.data?.success) {
            const techs = usersRes.data.data.filter(
              (u: TechnicianOption) => (u.role === 'lab_technician' || u.role === 'lab_engineer') && u.email !== 'labworker@dow.gov.pg'
            );
            setTechnicians(techs);
            if (techs.length > 0) {
              setSelectedTechId(techs[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load personnel identities:', err);
      } finally {
        setLoadingTechs(false);
      }
    }
  };

  const handleEvaluate = async () => {
    setActionLoading(true);
    try {
      const res = await api.post(`/requests/${id}/evaluate`, {
        decision: reviewDecision,
        technicalFeasible: true,
        equipmentAvailable: true,
        workloadCapacity: true,
        evaluationNotes: reviewNotes,
        comments: reviewNotes,
      });
      if (res.data?.success) {
        setShowReviewModal(false);
        await fetchRequest();
      }
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to complete technical review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToSample = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post(`/requests/${id}/convert-to-sample`, {
        technicianId: selectedTechId || null,
        condition: sampleCondition,
        storageLocation,
        dueDate: dueDate || null,
        remarks: intakeRemarks,
      });
      if (res.data?.success) {
        setShowIntakeModal(false);
        const createdSampleId = res.data.data.sample?.id;
        if (createdSampleId) {
          router.push(`/samples/${createdSampleId}`);
        } else {
          await fetchRequest();
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to intake specimen into laboratory custody');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateQuotation = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/quotations', {
        requestId: request?.id,
        clientName: request?.clientName,
        projectName: request?.projectName,
        location: request?.location,
      });
      if (res.data?.success) {
        router.push(`/quotations/${res.data.data.id}`);
      }
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to generate quotation');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <DetailViewSkeleton />;
  }

  if (error || !request) {
    return (
      <div className="p-8 bg-slate-900 rounded-2xl border border-slate-800 text-center space-y-4 max-w-lg mx-auto mt-12">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Testing Request Not Found</h2>
        <p className="text-xs text-slate-400">{error || 'Unable to locate request record in database.'}</p>
        <Link
          href="/requests"
          className="inline-block px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold rounded-xl transition-colors"
        >
          Return to Requests Register
        </Link>
      </div>
    );
  }

  const rawStatus = (request.status || '').toLowerCase();

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'approved':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Technically Approved
          </span>
        );
      case 'quoted':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Quotation Issued
          </span>
        );
      case 'converted_to_sample':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5">
            <FlaskConical className="w-3.5 h-3.5" /> Sample Active in Lab
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Request Declined
          </span>
        );
      case 'clarification_needed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" /> Clarification Required
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Awaiting Technical Review
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/requests"
            className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-400 text-black shadow-sm">
                {request.requestNumber}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Request for Testing (Form RQ-LT)
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Proponent: <span className="text-white font-medium">{request.clientName}</span> &bull; Project: <span className="text-white font-medium">{request.projectName}</span>
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {getStatusBadge(rawStatus)}

          {/* Manager / Reviewer Actions */}
          {isStaff && rawStatus === 'submitted' && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Technical Review (Form RR)
            </button>
          )}

          {isStaff && (rawStatus === 'submitted' || rawStatus === 'approved' || rawStatus === 'quoted') && (
            <button
              onClick={openIntakeModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-black rounded-xl text-xs font-bold shadow-md shadow-amber-400/10 transition-all"
            >
              <FlaskConical className="w-4 h-4" />
              Intake Specimen & Assign Worker
            </button>
          )}

          {isStaff && rawStatus === 'approved' && !request.quotationId && (
            <button
              onClick={handleGenerateQuotation}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <Receipt className="w-4 h-4" />
              Generate Quotation (QT-01)
            </button>
          )}

          {request.quotationId && (
            <Link
              href={`/quotations/${request.quotationId}`}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <Receipt className="w-4 h-4" />
              View Quotation
            </Link>
          )}

          {request.sampleId && (
            <Link
              href={`/samples/${request.sampleId}`}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-black rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <FlaskConical className="w-4 h-4" />
              View Specimen #{request.sampleNumber || '26P-S'}
            </Link>
          )}
        </div>
      </div>

      {/* Specimen Converted Banner */}
      {rawStatus === 'converted_to_sample' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-black flex items-center justify-center font-bold shrink-0">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">
                Specimen Intaked into Laboratory Custody
              </span>
              <span className="text-amber-300">
                Official Sample Number: <strong className="font-mono text-white">{request.sampleNumber || 'Active Sample'}</strong> &bull; Assigned to Testing Technician
              </span>
            </div>
          </div>
          {request.sampleId && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => printTestFormPdf(`/test-forms/sample/${request.sampleId}/bundle`)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow"
                title="Print all official test forms with QR code for this specimen"
              >
                <Printer className="w-3.5 h-3.5" />
                Print All Test Forms (Bundle)
              </button>
              <Link
                href={`/samples/${request.sampleId}`}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-xl text-xs text-center transition-all shadow-md shrink-0"
              >
                Open Sample Custody & QR Tag &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Main Request Record */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-400" />
              Project & Proponent Details
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Requesting Organization</span>
                <span className="font-bold text-white text-sm">{request.clientName}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Project Title</span>
                <span className="font-bold text-white text-sm">{request.projectName}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Location / Chainage</span>
                <span className="text-slate-300">{request.location}</span>
                {request.sourceLocation && (
                  <span className="text-slate-400 block mt-0.5">
                    Quarry / Borrow Pit: {request.sourceLocation}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4 text-amber-400" />
              Specimen & Sampling Data
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Material Type / Category</span>
                <span className="font-bold text-amber-400 text-sm">
                  {request.materialType || request.sampleCategory || 'Civil Materials'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Field Description</span>
                <span className="text-slate-300">{request.sampleDescription}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[11px]">Date Sampled</span>
                  <span className="text-slate-300">{request.samplingDate || request.dateSampled || 'Recorded on intake'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Sampled By</span>
                  <span className="text-slate-300">{request.sampledBy || 'Field Representative'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Priority</span>
                  <span className="font-bold text-white capitalize">{request.priority || 'Normal'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Requested Tests Scope */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-400" />
                Linked Laboratory Test Worksheets &amp; PDF Forms ({formList.length || request.requestedTests?.length || 0} Standards)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Official DoW testing templates connected to the specimen QR code matrix.
              </p>
            </div>
            {request.estimatedCost && (
              <span className="text-xs font-mono font-bold text-amber-400 shrink-0">
                Estimated Fee: PGK K{Number(request.estimatedCost).toFixed(2)}
              </span>
            )}
          </div>

          {formList.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5">
              {formList.map((form: any, i: number) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-300">
                        {form.testCode}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {form.standard}
                      </span>
                      {form.hasTemplate ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Official Form Available ({form.formNumber || 'Archive'})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-3 h-3" /> Printable QR Label Fallback
                        </span>
                      )}
                      {form.testNumber && (
                        <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          #{form.testNumber}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white">{form.testName}</h4>
                    {form.notes && (
                      <p className="text-[11px] text-slate-500 italic">{form.notes}</p>
                    )}
                  </div>

                  {form.labTestId && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenFormPreview(form)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition border border-slate-700"
                        title="Preview PDF"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-400" />
                        Preview
                      </button>

                      <button
                        type="button"
                        onClick={() => printTestFormPdf(`/test-forms/test/${form.labTestId}/pdf`)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1 transition shadow-sm"
                        title="Print clean test form with QR code"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Form
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          downloadTestFormPdf(
                            `/test-forms/test/${form.labTestId}/pdf`,
                            `${sampleInfo?.sampleNumber || request.sampleNumber || 'DOW'}_${form.testCode}_Form.pdf`
                          )
                        }
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => printTestFormPdf(`/test-forms/test/${form.labTestId}/label`)}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1 transition border border-amber-500/20"
                        title="Print QR Tracking Label"
                      >
                        <Tag className="w-3 h-3 text-amber-400" />
                        Label
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {request.requestedTests?.map((testName, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-medium text-slate-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{testName}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Technical Review Sign-off */}
        {request.evaluatedBy && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-emerald-400 text-sm">
                <ShieldCheck className="w-4 h-4" /> Form Review of Request — Approved by Materials Engineer
              </span>
              <span className="text-[11px] opacity-75">
                {request.evaluatedAt ? new Date(request.evaluatedAt).toLocaleDateString() : 'Signed'}
              </span>
            </div>
            <p className="text-xs text-emerald-100">{request.evaluationNotes}</p>
            <div className="text-[11px] text-emerald-300/80">
              Evaluator: {request.evaluatedBy} &bull; Technical Feasibility: VERIFIED &bull; Equipment: CALIBRATED &bull; Capacity: ALLOCATED
            </div>
          </div>
        )}
      </div>

      {/* Review Modal (Staff Only) */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <h2 className="text-base font-bold text-white">
                  Technical Review of Testing Request (Form RR)
                </h2>
                <p className="text-[11px] text-slate-400">
                  ISO/IEC 17025 Clause 7.1 Review of Requests & Capacity Assessment
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Evaluation Decision *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'approved', label: 'Approve Request' },
                    { id: 'clarification_needed', label: 'Clarification' },
                    { id: 'rejected', label: 'Decline' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setReviewDecision(opt.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        reviewDecision === opt.id
                          ? opt.id === 'approved'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : opt.id === 'clarification_needed'
                            ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                            : 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                <label className="flex items-center gap-2 text-slate-300">
                  <input type="checkbox" defaultChecked disabled className="rounded text-emerald-500" />
                  <span>Test procedures conform to current AS 1289 / ASTM standards</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300">
                  <input type="checkbox" defaultChecked disabled className="rounded text-emerald-500" />
                  <span>Equipment is calibrated and metrology certificate is active</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300">
                  <input type="checkbox" defaultChecked disabled className="rounded text-emerald-500" />
                  <span>Competent technician personnel available for turnaround</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Evaluation Remarks / Engineering Notes
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEvaluate}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl transition-colors shadow-sm"
              >
                {actionLoading ? 'Saving...' : 'Confirm Evaluation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Intake Specimen & Assign Worker Modal (Staff Only) */}
      {showIntakeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConvertToSample}
            className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <FlaskConical className="w-6 h-6 text-amber-400" />
              <div>
                <h2 className="text-base font-bold text-white">
                  Intake Specimen & Assign Laboratory Worker
                </h2>
                <p className="text-[11px] text-slate-400">
                  Generates sequential Sample ID (26P-S-XXXX), QR Tracking Token, and assigns test worksheets
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Assign Testing Technician *
                </label>
                {loadingTechs ? (
                  <div className="p-2.5 bg-slate-950 rounded-xl text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    Loading technician roster...
                  </div>
                ) : (
                  <select
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  >
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName} ({t.designation || 'Technician'} &bull; {t.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Specimen Condition *
                  </label>
                  <select
                    value={sampleCondition}
                    onChange={(e) => setSampleCondition(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="intact">Intact & Sealed</option>
                    <option value="disturbed">Disturbed / Bulk Sample</option>
                    <option value="moisture_sealed">Moisture-Sealed Container</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Storage Location / Bay
                  </label>
                  <input
                    type="text"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    placeholder="e.g. Soils Bay A, Tank 1"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Target Completion Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Intake Remarks / Lab Instructions
                </label>
                <textarea
                  rows={2}
                  value={intakeRemarks}
                  onChange={(e) => setIntakeRemarks(e.target.value)}
                  placeholder="Specific preparation or compaction method notes..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowIntakeModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black rounded-xl transition-all shadow-md shadow-amber-400/20"
              >
                {actionLoading ? 'Registering Specimen...' : 'Intake Specimen & Create Sample'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Official Test Form PDF Viewer Modal */}
      {selectedFormContext && (
        <TestFormViewerModal
          isOpen={viewerModalOpen}
          onClose={() => setViewerModalOpen(false)}
          title={selectedFormContext.title}
          testCode={selectedFormContext.testCode}
          testStandard={selectedFormContext.testStandard}
          sampleNumber={selectedFormContext.sampleNumber}
          pdfEndpoint={selectedFormContext.pdfEndpoint}
          hasTemplate={selectedFormContext.hasTemplate}
          defaultFilename={selectedFormContext.defaultFilename}
        />
      )}
    </div>
  );
}
