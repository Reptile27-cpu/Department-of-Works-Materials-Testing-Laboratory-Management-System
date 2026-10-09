'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Audit = { id: string; action: string; entityType: string | null; entityId: string | null; createdAt: string; user?: { email: string; role: string } | null; laboratory?: { name: string; code: string } | null; school?: { name: string; code: string } | null };

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Audit[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/system-admin/audit-logs').then((response) => setLogs(response.data.data)).catch(() => setError('Unable to load audit logs.')); }, []);
  return <div className="space-y-6"><div><p className="text-sm text-primary font-semibold uppercase tracking-[0.15em]">System administration</p><h1 className="text-3xl font-bold mt-2">Audit logs</h1><p className="text-[var(--text-secondary)] mt-1">A record of important platform administration actions.</p></div>{error && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">{error}</div>}<section className="card p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[var(--bg-secondary)] text-left"><tr><th className="px-5 py-3">Action</th><th className="px-5 py-3">Performed by</th><th className="px-5 py-3">Resource</th><th className="px-5 py-3">Time</th></tr></thead><tbody className="divide-y divide-border">{logs.map((log) => <tr key={log.id}><td className="px-5 py-4 font-medium">{log.action.replaceAll('_', ' ')}</td><td className="px-5 py-4">{log.user?.email || 'System'}</td><td className="px-5 py-4">{log.entityType || 'Platform'} {log.laboratory ? `· ${log.laboratory.name}` : log.school ? `· ${log.school.name}` : ''}</td><td className="px-5 py-4 text-[var(--text-secondary)]">{new Date(log.createdAt).toLocaleString()}</td></tr>)}</tbody></table>{logs.length === 0 && <p className="p-8 text-center text-[var(--text-secondary)]">No audit activity yet.</p>}</div></section></div>;
}

