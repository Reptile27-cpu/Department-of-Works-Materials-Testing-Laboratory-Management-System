'use client';

import {
  Shield,
  Lock,
  Database
} from 'lucide-react';
import SettingsPage from '@/app/(dashboard)/settings/page';

export default function SystemAdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-primary">System Administration</span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">Platform Settings</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Configure global system parameters, laboratory organization defaults, and administrative security.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 border border-border">
          <p className="text-xs text-[var(--text-muted)]">Database Engine</p>
          <p className="text-base font-bold flex items-center gap-2 mt-1">
            <Database className="w-4 h-4 text-primary" /> PostgreSQL (Prisma)
          </p>
        </div>

        <div className="card p-4 border border-border">
          <p className="text-xs text-[var(--text-muted)]">Multi-Tenant Scoping</p>
          <p className="text-base font-bold flex items-center gap-2 mt-1 text-success">
            <Shield className="w-4 h-4" /> Enabled (Laboratory ID Scoped)
          </p>
        </div>

        <div className="card p-4 border border-border">
          <p className="text-xs text-[var(--text-muted)]">Authentication</p>
          <p className="text-base font-bold flex items-center gap-2 mt-1 text-blue-500">
            <Lock className="w-4 h-4" /> JWT + HTTP-Only Cookies
          </p>
        </div>
      </div>

      <SettingsPage />
    </div>
  );
}
