'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Skeleton, MetricCardsSkeleton, TableSkeleton } from '@/components/ui/skeleton';

export default function SystemAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const isSystemAdmin = user?.role === 'system_admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (!isLoading && !isSystemAdmin) router.replace('/dashboard');
  }, [isLoading, router, isSystemAdmin]);

  if (isLoading || !isSystemAdmin) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2 pb-2 border-b border-slate-800/80">
          <Skeleton className="h-6 w-52 bg-slate-800" />
          <Skeleton className="h-3.5 w-80 bg-slate-800/60" />
        </div>
        <MetricCardsSkeleton count={4} />
        <TableSkeleton columns={6} rows={5} />
      </div>
    );
  }

  return <>{children}</>;
}
