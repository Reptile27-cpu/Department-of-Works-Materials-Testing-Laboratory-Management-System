'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, CheckCircle2, Shield, Users, FlaskConical, Wrench, Layers } from 'lucide-react';
import { api } from '@/lib/api';

type DashboardData = {
  totalLaboratories: number;
  activeLaboratories: number;
  totalUsers: number;
  totalSamples: number;
  totalTests: number;
  totalEquipment: number;
  recentLaboratories: {
    id: string;
    name: string;
    code: string;
    department?: string;
    division?: string;
    isActive: boolean;
  }[];
  recentActivity: {
    id: string;
    action: string;
    entityType: string | null;
    createdAt: string;
    user?: { email: string; role?: string } | null;
  }[];
};

export default function SystemAdminPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/system-admin/dashboard')
      .then((response) => setData(response.data.data))
      .catch(() => setError('System administrator access is required.'));
  }, []);

  const stats = data
    ? [
        ['Laboratories', data.totalLaboratories, Building2, 'text-blue-400', 'bg-blue-950/40'],
        ['Active Facilities', data.activeLaboratories, CheckCircle2, 'text-emerald-400', 'bg-emerald-950/40'],
        ['Authorized Staff', data.totalUsers, Users, 'text-purple-400', 'bg-purple-950/40'],
        ['Total Samples', data.totalSamples, Layers, 'text-teal-400', 'bg-teal-950/40'],
        ['Lab Tests', data.totalTests, FlaskConical, 'text-amber-400', 'bg-amber-950/40'],
        ['Metrology Equipment', data.totalEquipment, Wrench, 'text-indigo-400', 'bg-indigo-950/40'],
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400">System Administration</span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">Platform Overview</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Global administration across Department of Works testing laboratories, authorized personnel, and metrology standards.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/system-admin/users"
            className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Manage Users
          </Link>
          <Link
            href="/system-admin/audit-logs"
            className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Audit Logs
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {stats.map(([label, value, Icon, colorClass, bgClass]) => (
          <div key={label as string} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 truncate">{label as string}</span>
              <div className={`p-1.5 rounded-lg ${bgClass}`}>
                {/* @ts-expect-error Icon component */}
                <Icon className={`w-4 h-4 ${colorClass}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{value as number}</p>
          </div>
        ))}
      </div>

      {/* Two Column Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Laboratories */}
        <section className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Laboratory Facilities</h2>
              <p className="text-xs text-slate-400">Registered Department materials testing facilities</p>
            </div>
            <span className="text-xs font-medium text-teal-400">
              {data?.recentLaboratories?.length || 0} Facilities
            </span>
          </div>

          <div className="space-y-3">
            {data?.recentLaboratories?.map((lab) => (
              <div
                key={lab.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-700/50"
              >
                <div>
                  <p className="font-semibold text-sm text-white">{lab.name}</p>
                  <p className="text-xs text-slate-400">
                    Code: <span className="font-mono text-teal-400">{lab.code}</span> &bull; {lab.division || 'Materials Division'}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                    lab.isActive
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80'
                      : 'bg-rose-950/60 text-rose-400 border border-rose-800/80'
                  }`}
                >
                  {lab.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
            {(!data?.recentLaboratories || data.recentLaboratories.length === 0) && (
              <p className="p-6 text-center text-xs text-slate-500">No laboratory records available.</p>
            )}
          </div>
        </section>

        {/* Recent System Activity */}
        <section className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Recent System Activity</h2>
              <p className="text-xs text-slate-400">Chronological security and configuration event log</p>
            </div>
            <Link href="/system-admin/audit-logs" className="text-xs text-teal-400 hover:underline">
              Full Audit Trail &rarr;
            </Link>
          </div>

          <div className="space-y-2.5">
            {data?.recentActivity?.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-xs text-white uppercase tracking-wider">
                    {item.action.replaceAll('_', ' ')}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    By: {item.user?.email || 'System'}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(item.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
            {(!data?.recentActivity || data.recentActivity.length === 0) && (
              <p className="p-6 text-center text-xs text-slate-500">No recent system activity.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
