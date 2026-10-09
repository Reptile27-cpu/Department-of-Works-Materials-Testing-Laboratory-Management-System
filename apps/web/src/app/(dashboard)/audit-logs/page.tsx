'use client';

import { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Clock,
  Search,
  Filter,
  User,
  Activity,
  FileCode,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';

interface AuditLogItem {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
  ipAddress?: string;
  changes?: any;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiHelpers.get<{
        success: boolean;
        data: { logs: AuditLogItem[] } | AuditLogItem[];
      }>('/system-admin/audit-logs');

      if (res?.data) {
        if (Array.isArray(res.data)) {
          setLogs(res.data);
        } else if (res.data.logs) {
          setLogs(res.data.logs);
        }
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      (log.entityType || '').toLowerCase().includes(term) ||
      (log.user?.email || '').toLowerCase().includes(term) ||
      (log.user?.firstName || '').toLowerCase().includes(term) ||
      (log.user?.lastName || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" /> Security & Chain of Custody
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">Audit Trail & Custody Logs</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Immutable log of sample intake, QR scans, measurement edits, engineering approvals, and report issues
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Log
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, entity, user..."
            className="input-field pl-9 py-2 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input-field text-xs py-2"
          >
            <option value="all">All Actions</option>
            <option value="sample_registered">Sample Registered</option>
            <option value="QR_SCANNED">QR Scanned</option>
            <option value="test_measurements_updated">Measurements Updated</option>
            <option value="test_reviewed_approved">Test Approved</option>
            <option value="report_issued">Report Issued</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="p-12 text-center card bg-[var(--bg-primary)]">
          <Clock className="w-7 h-7 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs text-[var(--text-muted)]">Loading security audit records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center card bg-[var(--bg-primary)] border border-dashed border-border">
          <Activity className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">No audit events found</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            System actions and chain of custody scans will be permanently recorded here.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden bg-[var(--bg-primary)] border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-secondary)] border-b border-border text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">User / Officer</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Changes / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                    <td className="py-3 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge badge-primary text-[11px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--text-primary)]">
                      {log.entityType || 'Record'}
                      {log.entityId && (
                        <span className="block text-[10px] text-[var(--text-muted)] truncate max-w-[120px]">
                          {log.entityId}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {log.user ? (
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">
                            {log.user.firstName} {log.user.lastName}
                          </p>
                          <span className="text-[11px] text-[var(--text-muted)]">{log.user.email}</span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)]">System</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-muted)] text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {log.changes ? (
                        <pre className="text-[10px] text-[var(--text-secondary)] bg-[var(--bg-secondary)] p-1.5 rounded max-w-xs overflow-x-auto">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-[var(--text-muted)] text-[11px]">-</span>
                      )}
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

