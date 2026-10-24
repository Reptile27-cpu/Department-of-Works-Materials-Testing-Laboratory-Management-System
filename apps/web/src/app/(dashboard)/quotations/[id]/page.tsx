'use client';

import { useState, useEffect } from 'react';
import { DetailViewSkeleton } from '@/components/ui/skeleton';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Receipt,
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  FlaskConical,
  FileSpreadsheet
} from 'lucide-react';

interface QuotationLineItem {
  id: string;
  testCode: string;
  testName: string;
  standard: string;
  quantity: number;
  unitRate: number;
  total: number;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  requestId: string;
  requestNumber: string;
  clientName: string;
  projectName: string;
  location: string;
  lineItems: QuotationLineItem[];
  subtotal: number;
  administrativeSurchargeRate: number;
  administrativeSurchargeAmount: number;
  grandTotal: number;
  currency: 'PGK';
  termsAndConditions: string;
  preparedBy: string;
  validUntil: string;
  status: string;
  createdAt: string;
}

export default function QuotationDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuotation() {
      setLoading(true);
      try {
        const res = await api.get(`/quotations/${id}`);
        if (res.data?.success) {
          setQuotation(res.data.data);
        }
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || 'Failed to load quotation.');
      } finally {
        setLoading(false);
      }
    }
    if (id) loadQuotation();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <DetailViewSkeleton />;
  }

  if (error || !quotation) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quotation Not Found</h2>
        <p className="text-sm text-slate-500">{error || 'Unable to locate quotation record.'}</p>
        <Link href="/quotations" className="inline-block text-sm text-yellow-500 font-semibold hover:underline">
          Return to Quotations List
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/quotations"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                {quotation.quotationNumber}
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Official Quotation (Form QT-01)
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Client: {quotation.clientName} &bull; Project: {quotation.projectName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Form QT-01
          </button>
          <Link
            href={`/samples/new?client=${encodeURIComponent(quotation.clientName)}&project=${encodeURIComponent(quotation.projectName)}`}
            className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <FlaskConical className="w-4 h-4" />
            Register Sample &amp; Tests
          </Link>
        </div>
      </div>

      {/* Official Form QT-01 Sheet */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm space-y-6 text-slate-900 dark:text-white print:border-none print:shadow-none print:p-0">
        {/* DoW Header */}
        <div className="text-center border-b-2 border-yellow-500 pb-5 space-y-1">
          <p className="text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
            Independent State of Papua New Guinea
          </p>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Department of Works and Highways
          </h2>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Materials Testing &amp; Quality Assurance Division &bull; Central Testing Laboratory
          </p>
          <p className="text-[11px] text-slate-400">
            P.O. Box 1108, Boroko, NCD, Papua New Guinea &bull; Phone: (675) 324 1200 &bull; Fax: (675) 324 1234
          </p>
          <div className="inline-block mt-2 px-3 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 font-bold text-xs uppercase tracking-wider rounded border border-yellow-500/30">
            Form QT-01: Quotation for Laboratory Services
          </div>
        </div>

        {/* Quotation Metadata */}
        <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg">
          <div className="space-y-1.5">
            <div>
              <span className="font-semibold text-slate-500">Quotation No:</span>{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-white">{quotation.quotationNumber}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Client / Department:</span>{' '}
              <span className="font-bold text-slate-900 dark:text-white">{quotation.clientName}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Project:</span>{' '}
              <span className="text-slate-800 dark:text-slate-200">{quotation.projectName}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Location:</span>{' '}
              <span className="text-slate-800 dark:text-slate-200">{quotation.location}</span>
            </div>
          </div>
          <div className="space-y-1.5 text-right">
            <div>
              <span className="font-semibold text-slate-500">Date Issued:</span>{' '}
              <span>{new Date(quotation.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Valid Until:</span>{' '}
              <span>{quotation.validUntil}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Originating Request:</span>{' '}
              <span className="font-mono">{quotation.requestNumber || 'Form RQ-LT Direct'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Prepared By:</span>{' '}
              <span>{quotation.preparedBy}</span>
            </div>
          </div>
        </div>

        {/* Schedule of Testing Fees Table */}
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3 w-10 text-center">Item</th>
                <th className="py-2.5 px-3">Test Code &amp; Description of Service</th>
                <th className="py-2.5 px-3">Test Standard</th>
                <th className="py-2.5 px-3 text-center w-16">Qty</th>
                <th className="py-2.5 px-3 text-right w-28">Unit Rate (PGK)</th>
                <th className="py-2.5 px-3 text-right w-28">Amount (PGK)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {quotation.lineItems?.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 text-center font-mono text-slate-400">{index + 1}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{item.testName}</div>
                    <div className="text-[10px] font-mono text-slate-400">{item.testCode}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                    {item.standard}
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold">{item.quantity}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    K{item.unitRate.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                    K{item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Calculation Section with 3% Admin Surcharge */}
        <div className="flex justify-end pt-2">
          <div className="w-full sm:w-80 space-y-2 text-xs border border-slate-200 dark:border-slate-800 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal (Testing Fees):</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                K{quotation.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium">
              <span>Administrative Surcharge (3.0%):</span>
              <span className="font-mono">
                +K{quotation.administrativeSurchargeAmount.toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-bold text-slate-900 dark:text-white">
              <span>Total Payable (PGK):</span>
              <span className="font-mono text-base text-yellow-600 dark:text-yellow-400">
                K{quotation.grandTotal.toFixed(2)}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 italic pt-1">
              * Admin Cost = Subtotal &times; 0.03 as mandated by DoW Financial Regulations.
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="text-xs text-slate-500 space-y-1 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Terms and Conditions:
          </div>
          <p>{quotation.termsAndConditions}</p>
          <p>
            All test reports and certificates are issued in accordance with ISO/IEC 17025 accredited procedures. Results will be released upon receipt of official purchase order or payment confirmation.
          </p>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 pt-8 text-xs text-slate-600 dark:text-slate-400">
          <div className="border-t border-slate-300 dark:border-slate-700 pt-2 text-center">
            <p className="font-semibold text-slate-900 dark:text-white">Tracey Pinje</p>
            <p>Laboratory Manager &bull; Central Testing Laboratory</p>
            <p className="text-[10px] text-slate-400">Department of Works &amp; Highways</p>
          </div>
          <div className="border-t border-slate-300 dark:border-slate-700 pt-2 text-center">
            <p className="font-semibold text-slate-900 dark:text-white">Client Authorized Acceptance</p>
            <p>Signature, Official Stamp &amp; Date</p>
            <p className="text-[10px] text-slate-400">Approved for Testing Commencement</p>
          </div>
        </div>
      </div>
    </div>
  );
}

