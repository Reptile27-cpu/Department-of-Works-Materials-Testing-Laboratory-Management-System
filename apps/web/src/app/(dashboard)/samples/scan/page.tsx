'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import QrScannerModal from '@/components/qr-scanner-modal';
import TestFormViewerModal from '@/components/test-form-viewer-modal';
import { printTestFormPdf, downloadTestFormPdf } from '@/lib/test-form-utils';
import {
  QrCode,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  Building2,
  Calendar,
  User,
  MapPin,
  RefreshCw,
  Search,
  Printer,
  Download,
  Eye,
  Layers,
  Tag,
} from 'lucide-react';

function SampleScanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tokenParam = searchParams.get('token');
  const [tokenInput, setTokenInput] = useState(tokenParam || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleData, setSampleData] = useState<any | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Modal viewer state
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

  useEffect(() => {
    if (tokenParam) {
      fetchSampleScan(tokenParam);
    }
  }, [tokenParam]);

  const fetchSampleScan = async (token: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const headers = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};
      const res = await axios.get(`${apiUrl}/samples/scan/${encodeURIComponent(token)}`, {
        headers,
      });

      if (res.data?.success && res.data?.data?.sample) {
        setSampleData(res.data.data.sample);
      } else {
        setError('Sample record could not be resolved from scan token.');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to locate sample record for this QR code.';
      setError(msg);
      setSampleData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    router.push(`/samples/scan?token=${encodeURIComponent(tokenInput.trim())}`);
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'registered':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">Registered</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">In Progress</span>;
      case 'awaiting_review':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">Awaiting Review</span>;
      case 'approved':
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Approved / Ready</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  const handleOpenPreview = (test: any) => {
    setSelectedFormContext({
      title: `${test.testType?.name || 'Laboratory Test Form'}`,
      testCode: test.testType?.code || 'TEST',
      testStandard: test.testType?.standard,
      sampleNumber: sampleData.sampleNumber,
      pdfEndpoint: `/test-forms/test/${test.id}/pdf`,
      defaultFilename: `${sampleData.sampleNumber}_${test.testType?.code || 'Test'}_Form.pdf`,
    });
    setViewerModalOpen(true);
  };

  const handlePrintForm = (testId: string) => {
    printTestFormPdf(`/test-forms/test/${testId}/pdf`);
  };

  const handleDownloadForm = (test: any) => {
    downloadTestFormPdf(
      `/test-forms/test/${test.id}/pdf`,
      `${sampleData.sampleNumber}_${test.testType?.code || 'Test'}_Form.pdf`
    );
  };

  const handlePrintLabel = (testId: string) => {
    printTestFormPdf(`/test-forms/test/${testId}/label`);
  };

  const handlePrintBundle = () => {
    if (!sampleData?.id) return;
    printTestFormPdf(`/test-forms/sample/${sampleData.id}/bundle`);
  };

  const handleDownloadBundle = () => {
    if (!sampleData?.id) return;
    downloadTestFormPdf(
      `/test-forms/sample/${sampleData.id}/bundle`,
      `${sampleData.sampleNumber}_All_Test_Forms_Bundle.pdf`
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <QrCode className="w-7 h-7 text-teal-400" />
            Misplaced Form &amp; Sample Custody Recovery
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Scan physical sample labels or test worksheet QR codes to verify custody, identify associated requests, and print matching forms.
          </p>
        </div>

        <button
          onClick={() => setScannerOpen(true)}
          className="px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-900/30 shrink-0"
        >
          <QrCode className="w-4 h-4" />
          Launch Camera Scanner
        </button>
      </div>

      {/* Lookup Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <form onSubmit={handleManualSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Scan or enter Sample Number (e.g. 26P-S-001), Test Number (TST-2026-0001), or QR Token..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !tokenInput.trim()}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Lookup'}
          </button>
        </form>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center">
          <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mb-3" />
          <h3 className="text-sm font-semibold text-white">Scanning Custody Database...</h3>
          <p className="text-xs text-slate-400 mt-1">Verifying token security and resolving specimen record</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm text-white mb-1">Scan Lookup Notice</h3>
              <p className="text-xs text-rose-300/90">{error}</p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setScannerOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-xs font-semibold text-white transition-colors"
                >
                  Try Camera Again
                </button>
                <Link
                  href="/samples"
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
                >
                  Browse Sample Registry
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success State / Recovered Sample Record */}
      {sampleData && !loading && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Banner Card with Recovery Metadata */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 border border-teal-500/30 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-2xl font-black text-teal-300 tracking-tight">
                    {sampleData.sampleNumber}
                  </span>
                  {getStatusBadge(sampleData.status)}
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-slate-800 text-slate-200 border border-slate-700">
                    {sampleData.materialType}
                  </span>
                  {sampleData.request?.requestNumber && (
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Req: {sampleData.request.requestNumber}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-200 font-medium">{sampleData.description}</p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePrintBundle}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition shadow-md"
                  title="Print all test forms for this specimen in one multi-page packet"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print All Forms (Bundle)
                </button>
                <Link
                  href={`/samples/${sampleData.id}`}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
                >
                  Open Full Custody File <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Specimen and Project Metadata Grid */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Requesting Client</span>
                <span className="text-slate-200 font-semibold flex items-center gap-1 truncate">
                  <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  {sampleData.request?.client?.name || sampleData.project?.client || 'Department Client'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Project Title</span>
                <span className="text-slate-200 font-medium truncate block">
                  {sampleData.request?.project?.name || sampleData.project?.name || 'Public Works Project'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Source / Storage Location</span>
                <span className="text-slate-200 font-medium flex items-center gap-1 truncate">
                  <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  {sampleData.sourceLocation || 'Intake'} &bull; Bin: {sampleData.storageLocation || 'A-01'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Assigned Technician</span>
                <span className="text-slate-200 font-medium flex items-center gap-1 truncate">
                  <User className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  {sampleData.assignedTechnician
                    ? `${sampleData.assignedTechnician.firstName} ${sampleData.assignedTechnician.lastName}`
                    : 'Unassigned'}
                </span>
              </div>
            </div>
          </div>

          {/* Associated Test Forms and Worksheets */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FlaskConical className="w-5 h-5 text-teal-400" />
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Associated Test Forms &amp; Worksheets
                  </h2>
                  <p className="text-xs text-slate-400">
                    Select a test to preview, print official QR-linked forms, or download printable tracking labels.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadBundle}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Bundle PDF
                </button>
              </div>
            </div>

            {sampleData.tests && sampleData.tests.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {sampleData.tests.map((test: any) => (
                  <div
                    key={test.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {test.testNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {test.testType?.code}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                          {test.testType?.standard}
                        </span>
                        {getStatusBadge(test.status)}
                      </div>

                      <h4 className="text-sm font-bold text-white">
                        {test.testType?.name}
                      </h4>

                      <p className="text-xs text-slate-400">
                        Category: <strong className="text-slate-300">{test.testType?.category}</strong> &bull; Worker:{' '}
                        <span className="text-slate-300">
                          {test.technician ? `${test.technician.firstName} ${test.technician.lastName}` : 'Unassigned'}
                        </span>
                      </p>
                    </div>

                    {/* Action button row for this form */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenPreview(test)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
                        title="Preview PDF form in viewer"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-400" />
                        Preview
                      </button>

                      <button
                        onClick={() => handlePrintForm(test.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                        title="Print clean official test form with QR code"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Form
                      </button>

                      <button
                        onClick={() => handleDownloadForm(test)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handlePrintLabel(test.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1 transition border border-amber-500/20"
                        title="Print QR tracking label for physical sample or binder"
                      >
                        <Tag className="w-3 h-3 text-amber-400" />
                        QR Label
                      </button>

                      <Link
                        href={`/tests/${test.id}`}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Worksheet
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4 text-center">
                No testing items attached to this sample record yet.
              </p>
            )}
          </div>

          {/* Chain of Custody & Audit Timeline */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              Chain of Custody Timeline
            </h2>

            <div className="space-y-3 border-l-2 border-slate-800 pl-4 ml-2">
              <div className="relative">
                <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-teal-500 ring-4 ring-slate-900" />
                <span className="text-xs font-semibold text-teal-400 block">QR Custody Scan Logged</span>
                <p className="text-xs text-slate-400">Specimen verified via barcode terminal or camera scanner.</p>
              </div>
              {sampleData.statusHistory?.map((hist: any) => (
                <div key={hist.id} className="relative pt-2">
                  <span className="absolute -left-[23px] top-3 w-3 h-3 rounded-full bg-slate-600 ring-4 ring-slate-900" />
                  <span className="text-xs font-medium text-slate-300 block">
                    Status: {hist.toStatus}
                  </span>
                  <p className="text-xs text-slate-400">{hist.reason || 'Status transition'}</p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {new Date(hist.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Camera QR Scanner Modal */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(code) => {
          setScannerOpen(false);
          router.push(`/samples/scan?token=${encodeURIComponent(code)}`);
        }}
      />

      {/* PDF Form Viewer Modal */}
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

export default function SampleScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin text-amber-400 mr-2" />
          <span>Loading specimen scanner...</span>
        </div>
      }
    >
      <SampleScanContent />
    </Suspense>
  );
}
