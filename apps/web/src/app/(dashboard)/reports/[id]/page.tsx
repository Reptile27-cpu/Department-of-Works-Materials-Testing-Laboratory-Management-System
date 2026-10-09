'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  FileSpreadsheet,
  ArrowLeft,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  ShieldCheck,
  Lock
} from 'lucide-react';

interface TestReportDetail {
  id: string;
  reportNumber: string;
  title: string;
  status: string;
  revisionNumber: number;
  summary: string | null;
  reportData: Record<string, any>;
  issuedAt: string | null;
  createdAt: string;
  laboratory?: {
    name: string;
    department: string;
    division: string;
    phone: string;
    email: string;
  };
  sample?: {
    id: string;
    sampleNumber: string;
    materialType: string;
    description: string;
    sourceLocation: string;
    dateReceived: string;
    project?: {
      name: string;
      projectCode: string;
      client: string;
      location: string;
    };
    tests?: Array<{
      id: string;
      testNumber: string;
      status: string;
      rawMeasurements: Record<string, any>;
      calculatedResults: Record<string, any>;
      testType: {
        code: string;
        name: string;
        standard: string;
      };
      technician?: { firstName: string; lastName: string };
      reviewer?: { firstName: string; lastName: string };
    }>;
  };
  generatedBy?: { firstName: string; lastName: string; designation: string };
  approvedBy?: { firstName: string; lastName: string; designation: string };
}

export default function ReportDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [report, setReport] = useState<TestReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      try {
        const res = await api.get(`/reports/${id}`);
        if (res.data?.success) {
          setReport(res.data.data);
        }
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || 'Failed to load official test report.');
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchReport();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading Official Test Report...</div>;
  }

  if (error || !report) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Report Not Found</h2>
        <p className="text-sm text-slate-500">{error || 'Unable to locate official report record.'}</p>
        <Link href="/reports" className="inline-block text-sm text-yellow-500 font-semibold hover:underline">
          Return to Reports Registry
        </Link>
      </div>
    );
  }

  const sample = report.sample;
  const project = sample?.project;
  const tests = sample?.tests || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                {report.reportNumber}
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Official Laboratory Test Report
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sample: {sample?.sampleNumber} &bull; Project: {project?.name || 'Central Materials Lab'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Official Report
          </button>
        </div>
      </div>

      {/* Official Form Report Document */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm space-y-6 text-slate-900 dark:text-white print:border-none print:shadow-none print:p-0">
        {/* DoW Official Letterhead */}
        <div className="text-center border-b-2 border-yellow-500 pb-5 space-y-1">
          <p className="text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
            Independent State of Papua New Guinea
          </p>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Department of Works and Highways
          </h2>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Materials Testing &amp; Quality Assurance Division &bull; Central Materials Testing Laboratory
          </p>
          <p className="text-[11px] text-slate-400">
            P.O. Box 1108, Boroko, NCD, Papua New Guinea &bull; Tel: (675) 324 1200
          </p>
          <div className="inline-block mt-2 px-3 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 font-bold text-xs uppercase tracking-wider rounded border border-yellow-500/30">
            Form STR 1 / ATR 1: Materials Quality &amp; Compliance Test Certificate
          </div>
        </div>

        {/* Report Identification & Metadata */}
        <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg">
          <div className="space-y-1.5">
            <div>
              <span className="font-semibold text-slate-500">Report Certificate No:</span>{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-white">{report.reportNumber}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Sample Identification:</span>{' '}
              <span className="font-mono font-bold text-yellow-600 dark:text-yellow-400">{sample?.sampleNumber}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Client / Requesting Dept:</span>{' '}
              <span className="font-bold text-slate-900 dark:text-white">{project?.client || 'PNG Road Construction'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Project Title:</span>{' '}
              <span className="text-slate-800 dark:text-slate-200">{project?.name || 'Central Infrastructure Project'}</span>
            </div>
          </div>
          <div className="space-y-1.5 text-right">
            <div>
              <span className="font-semibold text-slate-500">Date Issued:</span>{' '}
              <span>{report.issuedAt ? new Date(report.issuedAt).toLocaleDateString() : new Date(report.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Material Description:</span>{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200">{sample?.materialType}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Sample Source / Chainage:</span>{' '}
              <span>{sample?.sourceLocation}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Status / Revision:</span>{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                {report.status} (Rev {report.revisionNumber})
              </span>
            </div>
          </div>
        </div>

        {/* Technical Summary */}
        {report.summary && (
          <div className="text-xs p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-slate-800 dark:text-slate-200">
            <span className="font-bold text-yellow-700 dark:text-yellow-400 block mb-1">
              ENGINEERING SUMMARY &amp; CONFORMANCE FINDINGS:
            </span>
            <p>{report.summary}</p>
          </div>
        )}

        {/* Detailed Test Results Table */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Schedule of Completed Laboratory Test Results
          </h3>
          <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3">Test Code &amp; Procedure</th>
                  <th className="py-2.5 px-3">Standard Reference</th>
                  <th className="py-2.5 px-3">Key Output Parameters</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {tests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">
                      No tests attached to this sample record.
                    </td>
                  </tr>
                ) : (
                  tests.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{t.testType?.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{t.testNumber}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {t.testType?.standard}
                      </td>
                      <td className="py-2.5 px-3">
                        {Object.keys(t.calculatedResults || {}).length > 0 ? (
                          <div className="space-y-0.5">
                            {Object.entries(t.calculatedResults)
                              .filter(([k]) => !['isValid', 'warnings', 'units'].includes(k))
                              .slice(0, 3)
                              .map(([k, v]) => (
                                <div key={k} className="text-[11px] text-slate-600 dark:text-slate-300">
                                  <span className="font-medium text-slate-800 dark:text-slate-200">{k}:</span>{' '}
                                  <span className="font-mono font-semibold text-yellow-600 dark:text-yellow-400">
                                    {typeof v === 'number' ? v.toFixed(2) : String(v)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Measurements recorded</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Official Signatures & Accreditation Stamp */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-6 text-xs text-center text-slate-600 dark:text-slate-400">
          <div className="space-y-2">
            <div className="h-10 flex items-end justify-center font-serif italic text-slate-800 dark:text-slate-200 text-sm">
              {report.generatedBy?.firstName ? `${report.generatedBy.firstName} ${report.generatedBy.lastName}` : 'D. Morea'}
            </div>
            <div className="border-t border-slate-300 dark:border-slate-700 pt-1">
              <p className="font-bold text-slate-900 dark:text-white">Tested / Reported By</p>
              <p className="text-[10px] text-slate-400">Testing Technician &bull; DoW Laboratory</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-10 flex items-end justify-center font-serif italic text-slate-800 dark:text-slate-200 text-sm">
              George Tolipio
            </div>
            <div className="border-t border-slate-300 dark:border-slate-700 pt-1">
              <p className="font-bold text-slate-900 dark:text-white">Checked &amp; Verified By</p>
              <p className="text-[10px] text-slate-400">Senior Materials Technical Officer</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-10 flex items-end justify-center font-serif italic text-slate-800 dark:text-slate-200 text-sm">
              {report.approvedBy?.firstName ? `${report.approvedBy.firstName} ${report.approvedBy.lastName}` : 'Tracey Pinje'}
            </div>
            <div className="border-t border-slate-300 dark:border-slate-700 pt-1">
              <p className="font-bold text-slate-900 dark:text-white">Approved &amp; Certified By</p>
              <p className="text-[10px] text-slate-400">Laboratory Manager &bull; Senior Materials Engineer</p>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 text-center pt-2">
          This test report is issued subject to the terms of DoW Quality Manual &bull; ISO/IEC 17025 Accredited Laboratory &bull; Form STR 1
        </div>
      </div>
    </div>
  );
}

