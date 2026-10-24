'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-slate-800/70 border border-slate-700/20 motion-reduce:animate-none',
        className
      )}
      {...props}
    />
  );
}

/**
 * Refined Black & Gold Table Skeleton
 * Matches the layout of laboratory registers (samples, tests, equipment, audit logs)
 */
export function TableSkeleton({
  columns = 6,
  rows = 5,
  showHeader = true,
  className,
}: {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm', className)}>
      {showHeader && (
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-4 py-3">
          <Skeleton className="h-4 w-32 bg-slate-800" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 bg-slate-800" />
            <Skeleton className="h-7 w-20 bg-slate-800" />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/40">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Skeleton className="h-3.5 w-16 bg-slate-800/80" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-800/20">
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <td key={colIdx} className="px-4 py-3.5">
                    <Skeleton
                      className={cn(
                        'h-3.5 bg-slate-800/60',
                        colIdx === 0 ? 'w-24 bg-amber-400/10 border-amber-500/20' :
                        colIdx === 1 ? 'w-36' :
                        colIdx === columns - 1 ? 'w-16 ml-auto' : 'w-20'
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Refined Card Grid Skeleton
 * Matches project cards, template cards, equipment cards
 */
export function CardGridSkeleton({
  count = 6,
  columns = 3,
  className,
}: {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const colClass =
    columns === 2 ? 'grid-cols-1 md:grid-cols-2' :
    columns === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={cn('grid gap-5', colClass, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-20 bg-amber-400/10 border-amber-500/20" />
              <Skeleton className="h-4 w-3/4 bg-slate-800" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full bg-slate-800" />
          </div>
          <Skeleton className="h-3 w-full bg-slate-800/60" />
          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
            <Skeleton className="h-3 w-24 bg-slate-800/60" />
            <Skeleton className="h-3 w-16 bg-slate-800/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Metric Cards Skeleton
 * Matches dashboard top statistics cards
 */
export function MetricCardsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-2">
          <Skeleton className="h-3 w-20 bg-slate-800/80" />
          <Skeleton className="h-7 w-14 bg-amber-400/15 border-amber-500/20" />
          <Skeleton className="h-2.5 w-24 bg-slate-800/60" />
        </div>
      ))}
    </div>
  );
}

/**
 * Detail View Skeleton
 * Matches worksheets, sample detail, request detail
 */
export function DetailViewSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header bar skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl border border-slate-800 bg-slate-900/90">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-28 bg-amber-400/15 border-amber-500/20" />
          <Skeleton className="h-6 w-64 bg-slate-800" />
        </div>
        <div className="flex gap-2.5">
          <Skeleton className="h-8 w-24 rounded-lg bg-slate-800" />
          <Skeleton className="h-8 w-28 rounded-lg bg-amber-400/20 border-amber-500/30" />
        </div>
      </div>

      {/* Grid content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 space-y-3">
            <Skeleton className="h-4 w-40 bg-slate-800" />
            <Skeleton className="h-20 w-full bg-slate-800/60" />
          </div>
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 space-y-3">
            <Skeleton className="h-4 w-48 bg-slate-800" />
            <Skeleton className="h-32 w-full bg-slate-800/60" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 space-y-3">
            <Skeleton className="h-4 w-32 bg-slate-800" />
            <Skeleton className="h-12 w-full bg-slate-800/60" />
            <Skeleton className="h-12 w-full bg-slate-800/60" />
          </div>
        </div>
      </div>
    </div>
  );
}

