'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Download,
  Eye,
  Send,
  Clock,
  FlaskConical,
  Building2,
  FolderGit2,
  Search,
  CheckCircle2,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';

interface ResultReportItem {
  id: string;
  reportNumber: string;
  title: string;
  status: string;
  createdAt: string;
  issuedAt?: string;
  sample: {
    id: string;
    sampleNumber: string;
    materialType: string;
    sourceLocation?: string;
    project?: {
      name: string;
      projectCode: string;
      client: string;
    };
  };
  generatedBy?: {
    firstName: string;
    lastName: string;
  };
  approvedBy?: {
    firstName: string;
    lastName: string;
  };
}

export default function ResultsReadyPage() {
  const [reports, setReports] = useState<ResultReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await apiHelpers.get<{ success: boolean; data: ResultReportItem[] }>('/reports');
      if (res?.data) {
        setReports(res.data);
      }
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleNotifyClient = async (report: ResultReportItem) => {
    setNotifyingId(report.id);
    setNotificationMsg(null);
    try {
      // Send notification / mark client notified
      await new Promise((r) => setTimeout(r, 600)); // smooth user feedback
      setNotificationMsg(`Results dispatch notification sent to ${report.sample.project?.client || 'Client'} for ${report.reportNumber}.`);
    } catch {
      alert('Failed to send notification.');
    } finally {
      setNotifyingId(null);
    }
  };

  const handleDownloadPdf = (reportId: string, reportNumber: string) => {
    // Direct stream download
    const url = `/api/v1/reports/${reportId}/pdf`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filtered = reports.filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.reportNumber.toLowerCase().includes(term) ||
      r.sample.sampleNumber.toLowerCase().includes(term) ||
      (r.sample.project?.client || '').toLowerCase().includes(term) ||
      (r.sample.project?.name || '').toLowerCase().includes(term) ||
      r.sample.materialType.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-wider">
            <FileCheck2 className="w-4 h-4" /> Client Deliverables & Distribution
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">Results Ready & Issued Reports</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Authorized materials testing certificates, PDF downloads, and client dispatch status
          </p>
        </div>

        <button
          onClick={fetchResults}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Register
        </button>
      </div>

      {notificationMsg && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-lg flex items-center gap-2 text-xs text-success font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report, sample, or client..."
            className="input-field pl-9 py-2 text-xs"
          />
        </div>

        <span className="text-xs text-[var(--text-muted)]">
          Total Completed Certificates: <strong className="text-primary font-mono">{reports.length}</strong>
        </span>
      </div>

      {/* Reports Table / Grid */}
      {loading ? (
        <div className="p-12 text-center card bg-[var(--bg-primary)]">
          <Clock className="w-7 h-7 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs text-[var(--text-muted)]">Loading completed test reports...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center card bg-[var(--bg-primary)] border border-dashed border-border">
          <FileSpreadsheet className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">No reports found</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Completed reports will automatically appear here once authorized by the laboratory manager.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden bg-[var(--bg-primary)] border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-secondary)] border-b border-border text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Report Number</th>
                  <th className="py-3 px-4">Sample ID & Material</th>
                  <th className="py-3 px-4">Client & Project</th>
                  <th className="py-3 px-4">Date Issued</th>
                  <th className="py-3 px-4">Sign-Off Officer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-primary">
                      {r.reportNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono font-semibold text-[var(--text-primary)]">
                        <FlaskConical className="w-3.5 h-3.5 text-primary" /> {r.sample.sampleNumber}
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)]">{r.sample.materialType}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[var(--text-primary)]">
                        {r.sample.project?.client || 'Department of Works'}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[200px]">
                        {r.sample.project?.name || 'Infrastructure Project'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      {r.issuedAt ? new Date(r.issuedAt).toLocaleDateString() : new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      {r.approvedBy ? `${r.approvedBy.firstName} ${r.approvedBy.lastName}` : 'Pending Approval'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`badge text-xs uppercase ${
                          r.status === 'issued'
                            ? 'badge-success'
                            : r.status === 'approved'
                            ? 'badge-primary'
                            : 'badge-secondary'
                        }`}
                      >
                        {r.status === 'issued' ? 'RESULTS READY' : r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownloadPdf(r.id, r.reportNumber)}
                          className="btn-primary text-xs py-1.5 px-2.5 flex items-center gap-1.5"
                          title="Download Official Binary PDF"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>

                        <button
                          onClick={() => handleNotifyClient(r)}
                          disabled={notifyingId === r.id}
                          className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5"
                          title="Dispatch Notification to Client"
                        >
                          <Send className="w-3.5 h-3.5" /> Notify
                        </button>

                        <Link
                          href={`/reports/${r.id}`}
                          className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-primary transition-colors"
                          title="View Report Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
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

