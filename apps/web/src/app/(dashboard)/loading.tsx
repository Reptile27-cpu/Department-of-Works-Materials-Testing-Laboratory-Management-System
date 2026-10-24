'use client';

import React from 'react';
import { Skeleton, MetricCardsSkeleton, TableSkeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 bg-slate-800" />
          <Skeleton className="h-3.5 w-72 bg-slate-800/60" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-xl bg-slate-800" />
          <Skeleton className="h-9 w-32 rounded-xl bg-amber-400/20 border-amber-500/30" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <MetricCardsSkeleton count={6} />

      {/* Table Skeleton */}
      <TableSkeleton columns={7} rows={6} />
    </div>
  );
}

