'use client';

import { useEffect, useState } from 'react';
import {
  Banknote,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  Info,
  Download,
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';

interface PricingItem {
  id: string;
  code: string;
  name: string;
  standard: string;
  category: string;
  unit: string;
  defaultTurnaroundDays: number;
  unitPricePublic: number | string;
  unitPricePrivate: number | string;
}

export default function PricingFeeSchedulePage() {
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const res = await apiHelpers.get<{ success: boolean; data: PricingItem[] }>('/test-methods');
      if (res?.data) {
        setItems(res.data);
      }
    } catch (err) {
      console.error('Failed to load test methods pricing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const categories = Array.from(new Set(items.map((i) => i.category))).filter(Boolean);

  const filtered = items.filter((i) => {
    if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      i.name.toLowerCase().includes(term) ||
      i.code.toLowerCase().includes(term) ||
      i.standard.toLowerCase().includes(term) ||
      i.category.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-wider">
            <Banknote className="w-4 h-4" /> Official Tariff & Rates
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            Materials Testing Fee Schedule
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Department of Works Central Materials Testing Laboratory official fees in Papua New Guinea Kina (PGK)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="badge badge-primary text-xs">Currency: PGK (Kina)</span>
        </div>
      </div>

      {/* Statutory Surcharge Notice */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3 text-xs text-[var(--text-secondary)]">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-[var(--text-primary)]">
            Statutory Quotation & Invoicing Rules (PNG Public Finances (Management) Act)
          </p>
          <p>
            • <strong>Government / Public Sector:</strong> Concession rate applies to National & Provincial Works contracts, ADB, and World Bank road projects.
          </p>
          <p>
            • <strong>Commercial / Private Sector:</strong> Commercial rate applies. A mandatory <strong>3.0% administrative surcharge</strong> is calculated automatically on all private quotations (Form QT-01).
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search test name, code, or standard..."
            className="input-field pl-9 py-2 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field text-xs py-2"
          >
            <option value="all">All Material Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pricing Table */}
      {loading ? (
        <div className="p-12 text-center card bg-[var(--bg-primary)]">
          <Clock className="w-7 h-7 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs text-[var(--text-muted)]">Loading tariff schedule...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center card bg-[var(--bg-primary)] border border-dashed border-border">
          <Layers className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">No tests found</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">Try searching for a different keyword or category.</p>
        </div>
      ) : (
        <div className="card overflow-hidden bg-[var(--bg-primary)] border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-secondary)] border-b border-border text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Test Code</th>
                  <th className="py-3.5 px-4">Test Name & Method</th>
                  <th className="py-3.5 px-4">Standard</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">Turnaround</th>
                  <th className="py-3.5 px-4 text-right">Public / DoW Rate</th>
                  <th className="py-3.5 px-4 text-right">Commercial Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      {item.code}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[var(--text-primary)]">{item.name}</p>
                      <span className="text-[11px] text-[var(--text-muted)]">Unit: {item.unit}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">
                      {item.standard}
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge badge-secondary text-[11px]">{item.category}</span>
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">
                      {item.defaultTurnaroundDays} days
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[var(--text-primary)]">
                      K {Number(item.unitPricePublic || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-primary">
                      K {Number(item.unitPricePrivate || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

