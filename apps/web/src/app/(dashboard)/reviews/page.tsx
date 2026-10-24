'use client';
import { TableSkeleton, CardGridSkeleton, DetailViewSkeleton, Skeleton } from '@/components/ui/skeleton';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  FlaskConical,
  TestTube2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Search,
  MessageSquare,
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';

interface ReviewTestItem {
  id: string;
  testNumber: string;
  status: string;
  testDate?: string;
  calculatedResults: any;
  remarks?: string;
  sample: {
    id: string;
    sampleNumber: string;
    materialType: string;
    project?: { name: string; projectCode: string; client: string };
  };
  testType: {
    id: string;
    name: string;
    standard: string;
    category: string;
    unit?: string;
  };
  technician?: {
    firstName: string;
    lastName: string;
    designation?: string;
  };
}

export default function EngineeringReviewQueuePage() {
  const [tests, setTests] = useState<ReviewTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTestForReject, setActiveTestForReject] = useState<ReviewTestItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchReviewQueue = async () => {
    setLoading(true);
    try {
      const res = await apiHelpers.get<{ success: boolean; data: ReviewTestItem[] }>(
        '/tests',
        { status: 'awaiting_review' }
      );
      if (res?.data) {
        setTests(res.data);
      }
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewQueue();
  }, []);

  const handleApprove = async (testId: string) => {
    setSubmittingAction(testId);
    setActionSuccessMsg(null);
    try {
      await apiHelpers.post(`/tests/${testId}/review`, {
        decision: 'approved',
      });
      setActionSuccessMsg('Test calculation approved and signed off successfully.');
      await fetchReviewQueue();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve test.');
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTestForReject || !rejectionReason.trim()) return;

    setSubmittingAction(activeTestForReject.id);
    setActionSuccessMsg(null);
    try {
      await apiHelpers.post(`/tests/${activeTestForReject.id}/review`, {
        decision: 'rejected',
        rejectionReason: rejectionReason.trim(),
      });
      setActionSuccessMsg('Test has been returned to technician with correction instructions.');
      setActiveTestForReject(null);
      setRejectionReason('');
      await fetchReviewQueue();
    } catch (err: any) {
      alert(err?.message || 'Failed to return test.');
    } finally {
      setSubmittingAction(null);
    }
  };

  const filteredTests = tests.filter((t) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      t.testNumber.toLowerCase().includes(term) ||
      t.testType.name.toLowerCase().includes(term) ||
      t.sample.sampleNumber.toLowerCase().includes(term) ||
      (t.sample.project?.name || '').toLowerCase().includes(term) ||
      (t.technician?.firstName || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-wider">
            <ClipboardCheck className="w-4 h-4" /> Technical Quality Assurance
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            Engineering Review Queue
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Review raw measurement logs, calculated formulas, and verify conformance with Papua New Guinea standards
          </p>
        </div>

        <button
          onClick={fetchReviewQueue}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Queue
        </button>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-lg flex items-center gap-2 text-xs text-success font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Search Bar & Counter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sample, test, or technician..."
            className="input-field pl-9 py-2 text-xs"
          />
        </div>

        <span className="text-xs text-[var(--text-muted)] self-end sm:self-auto">
          Pending Technical Approvals: <strong className="text-primary font-mono">{tests.length}</strong>
        </span>
      </div>

      {/* Review Queue List */}
      {loading ? (
        <TableSkeleton columns={7} rows={6} showHeader={false} />
      ) : filteredTests.length === 0 ? (
        <div className="p-12 text-center card bg-[var(--bg-primary)] border border-dashed border-border">
          <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">No tests currently awaiting review</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            All submitted measurements have been reviewed and authorized. Great job!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTests.map((test) => {
            const calcEntries = Object.entries(test.calculatedResults || {});
            return (
              <div
                key={test.id}
                className="card p-5 bg-[var(--bg-primary)] border border-border hover:border-primary/40 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{test.testNumber}</span>
                      <span className="badge badge-warning text-xs uppercase">Awaiting Engineering Review</span>
                      <span className="badge badge-secondary text-xs">{test.testType.standard}</span>
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] mt-1">{test.testType.name}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                      <span className="flex items-center gap-1">
                        <FlaskConical className="w-3.5 h-3.5 text-primary" /> Sample:
                        <Link
                          href={`/samples/${test.sample.id}`}
                          className="font-mono font-medium text-primary hover:underline ml-1"
                        >
                          {test.sample.sampleNumber}
                        </Link>
                      </span>
                      <span>•</span>
                      <span>Category: {test.testType.category}</span>
                      <span>•</span>
                      <span>
                        Technician: {test.technician ? `${test.technician.firstName} ${test.technician.lastName}` : 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end lg:self-auto">
                    <Link
                      href={`/tests/${test.id}`}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                    >
                      Audit Worksheet <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      onClick={() => {
                        setActiveTestForReject(test);
                        setRejectionReason('');
                      }}
                      disabled={submittingAction === test.id}
                      className="px-3 py-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 font-medium text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Return for Correction
                    </button>

                    <button
                      onClick={() => handleApprove(test.id)}
                      disabled={submittingAction === test.id}
                      className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve & Sign Off
                    </button>
                  </div>
                </div>

                {/* Calculated Results Summary Grid */}
                <div className="pt-3">
                  <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
                    Calculated Engineering Outputs
                  </span>

                  {calcEntries.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] italic">
                      No calculated results generated yet. Please inspect worksheet for raw measurements.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {calcEntries.map(([k, v]) => {
                        if (typeof v === 'object' && v !== null) return null;
                        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
                        const displayVal = typeof v === 'number' ? v.toFixed(2) : String(v);
                        return (
                          <div key={k} className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-border">
                            <span className="text-[11px] text-[var(--text-muted)] block truncate">{label}</span>
                            <span className="text-sm font-bold text-[var(--text-primary)] font-mono">
                              {displayVal}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Return for Correction Modal */}
      {activeTestForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-primary)] border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-danger">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">Return Test for Correction</h3>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Specify the exact reason or correction required for{' '}
              <strong className="text-[var(--text-primary)]">{activeTestForReject.testNumber}</strong> (
              {activeTestForReject.testType.name}). The technician will receive an alert to rectify the data.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">
                  Mandatory Rejection / Correction Reason
                </label>
                <textarea
                  required
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Moisture content trial 2 exceeds allowable tolerance; check tare mass and recalculate..."
                  className="input-field text-xs py-2 w-full"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setActiveTestForReject(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rejectionReason.trim() || submittingAction === activeTestForReject.id}
                  className="btn-danger text-xs flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Confirm Return to Tech
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

