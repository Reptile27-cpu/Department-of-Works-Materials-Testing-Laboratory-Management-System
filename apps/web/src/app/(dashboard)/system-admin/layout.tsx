'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function SystemAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const isSystemAdmin = user?.role === 'system_admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (!isLoading && !isSystemAdmin) router.replace('/dashboard');
  }, [isLoading, router, isSystemAdmin]);

  if (isLoading || !isSystemAdmin) return <div className="p-8 text-slate-400">Verifying administrative access...</div>;
  return <>{children}</>;
}
