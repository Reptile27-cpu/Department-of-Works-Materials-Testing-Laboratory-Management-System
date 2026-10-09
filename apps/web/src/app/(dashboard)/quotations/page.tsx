'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Receipt, Search, ArrowRight, FileSpreadsheet } from 'lucide-react';

interface QuotationItem {
  id: string;
  quotationNumber: string;
  clientName: string;
  projectName: string;
  subtotal: number;
  administrativeSurchargeAmount: number;
  grandTotal: number;
  currency: string;
  status: string;
  validUntil: string;
  createdAt: string;
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<QuotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quotations', { params: { search } });
      if (res.data?.success) {
        setQuotations(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-7 h-7 text-yellow-500" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Official Quotations (Form QT-01)
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Department of Works fee schedule quotations including mandatory 3.0% administrative surcharge.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search by quotation number, client, or project..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-900 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading quotations...</div>
      ) : quotations.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500">
          No quotations generated yet.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Quotation No</th>
                <th className="py-3 px-4">Client / Department</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4 text-right">Subtotal (PGK)</th>
                <th className="py-3 px-4 text-right">3% Admin Surcharge</th>
                <th className="py-3 px-4 text-right">Grand Total (PGK)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {quotations.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-yellow-600 dark:text-yellow-400">
                    <Link href={`/quotations/${q.id}`} className="hover:underline">
                      {q.quotationNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                    {q.clientName}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {q.projectName}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                    K{q.subtotal.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-amber-600 dark:text-amber-400">
                    +K{q.administrativeSurchargeAmount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                    K{q.grandTotal.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                      {q.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/quotations/${q.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400 hover:text-yellow-500"
                    >
                      View Form QT-01
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

