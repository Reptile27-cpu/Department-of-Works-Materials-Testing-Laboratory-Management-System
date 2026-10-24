'use client';
import { TableSkeleton, CardGridSkeleton, DetailViewSkeleton, Skeleton } from '@/components/ui/skeleton';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  FlaskConical,
  Wrench,
  Calculator,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';

interface TestMethodItem {
  id: string;
  code: string;
  name: string;
  standard: string;
  category: string;
  description?: string;
  defaultTurnaroundDays: number;
  reportTemplate?: string;
  parametersSchema?: any;
  calculationRules?: any;
}

export default function TestMethodsCataloguePage() {
  const [methods, setMethods] = useState<TestMethodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const res = await apiHelpers.get<{ success: boolean; data: TestMethodItem[] }>('/test-methods');
      if (res?.data) {
        setMethods(res.data);
      }
    } catch (err) {
      console.error('Failed to load test methods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const categories = Array.from(new Set(methods.map((m) => m.category))).filter(Boolean);

  const filtered = methods.filter((m) => {
    if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(term) ||
      m.code.toLowerCase().includes(term) ||
      m.standard.toLowerCase().includes(term) ||
      m.category.toLowerCase().includes(term) ||
      (m.description || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-wider">
            <BookOpen className="w-4 h-4" /> Technical Standards Catalogue
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            Test Methods & Engineering Specifications
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Official Papua New Guinea Department of Works laboratory testing standards and mathematical calculation rules
          </p>
        </div>

        <span className="badge badge-primary text-xs self-start sm:self-auto">
          {methods.length} Standardized Methods
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search method name, AS standard, or code..."
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
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Methods List */}
      {loading ? (
        <TableSkeleton columns={5} rows={6} showHeader={false} />
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center card bg-[var(--bg-primary)] border border-dashed border-border">
          <BookOpen className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">No test methods found</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">Try another search keyword.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="card p-5 bg-[var(--bg-primary)] border border-border hover:border-primary/40 transition-all"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{item.code}</span>
                      <span className="badge badge-secondary text-xs">{item.standard}</span>
                      <span className="badge badge-primary text-xs">{item.category}</span>
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] mt-1">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-1 max-w-2xl">{item.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <span className="text-xs text-[var(--text-muted)]">
                      Turnaround: <strong>{item.defaultTurnaroundDays} days</strong>
                    </span>
                    <button className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-primary">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border space-y-4 animate-in fade-in text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-border space-y-2">
                        <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                          <Calculator className="w-4 h-4 text-primary" /> Mathematical Calculation Rules
                        </span>
                        <p className="text-[var(--text-secondary)]">
                          Formulas conform to Australian Standard / Papua New Guinea Technical Specifications.
                        </p>
                        {item.reportTemplate && (
                          <p className="text-[var(--text-muted)]">
                            Official Report Template: <strong className="text-primary">{item.reportTemplate}</strong>
                          </p>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-border space-y-2">
                        <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                          <Wrench className="w-4 h-4 text-primary" /> Calibration & Equipment Requirements
                        </span>
                        <p className="text-[var(--text-secondary)]">
                          Requires active calibration certification for all balances, compactors, and measuring gauges.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

