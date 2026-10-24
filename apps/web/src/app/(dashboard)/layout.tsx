'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import NavigationProgress from '@/components/layout/navigation-progress';
import { Skeleton, MetricCardsSkeleton, TableSkeleton } from '@/components/ui/skeleton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex animate-fade-in">
        {/* Sidebar skeleton */}
        <div className="hidden lg:flex w-64 flex-col justify-between border-r border-slate-800 bg-slate-900 p-4 space-y-4 shrink-0">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <Skeleton className="w-10 h-10 rounded-xl bg-slate-800 border border-amber-500/20" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-24 bg-slate-800" />
                <Skeleton className="h-2.5 w-16 bg-amber-400/20" />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg bg-slate-800/60" />
              ))}
            </div>
          </div>
        </div>

        {/* Content area skeleton */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-16 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between px-6">
            <Skeleton className="h-7 w-64 rounded-xl bg-slate-800" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-20 rounded-xl bg-slate-800" />
              <Skeleton className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-500/30" />
            </div>
          </div>
          <main className="p-4 lg:p-6 space-y-6">
            <div className="space-y-2 pb-2 border-b border-slate-800/80">
              <Skeleton className="h-6 w-48 bg-slate-800" />
              <Skeleton className="h-3.5 w-72 bg-slate-800/60" />
            </div>
            <MetricCardsSkeleton count={6} />
            <TableSkeleton columns={7} rows={6} />
          </main>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <NavigationProgress />
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div
        className={`transition-all duration-200 ${
          isSidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Topbar onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        <main className="p-4 lg:p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
