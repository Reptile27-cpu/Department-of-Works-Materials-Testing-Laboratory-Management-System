'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FlaskConical,
  TestTube2,
  FolderGit2,
  Wrench,
  FileSpreadsheet,
  Activity,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  LogOut,
  QrCode,
  ClipboardList,
  CheckSquare,
  Award,
  Users,
  DollarSign,
  BookOpen,
  FileCode2,
  History,
  FileCheck,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useLabTheme } from '@/components/lab-theme-provider';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navItems = {
  system_admin: [
    { href: '/system-admin', label: 'System Overview', icon: LayoutDashboard },
    { href: '/system-admin/users', label: 'Authorized Staff & Users', icon: Users },
    { href: '/system-admin/audit-logs', label: 'Security & Audit Logs', icon: History },
    { href: '/system-admin/settings', label: 'System Configuration', icon: Settings },
    { href: '/equipment', label: 'Equipment & Calibration', icon: Wrench },
    { href: '/test-methods', label: 'Test Methods & Standards', icon: BookOpen },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/settings', label: 'My Preferences', icon: Settings },
  ],
  lab_manager: [
    { href: '/dashboard', label: 'Operations Command Center', icon: LayoutDashboard },
    { href: '/requests', label: 'Intake Requests', icon: ClipboardList },
    { href: '/quotations', label: 'Quotations & Billing', icon: DollarSign },
    { href: '/samples', label: 'Sample Custody Registry', icon: FlaskConical },
    { href: '/samples/scan', label: 'QR Tag Scanner', icon: QrCode },
    { href: '/tests', label: 'Testing & Worksheets', icon: TestTube2 },
    { href: '/work-queue', label: 'Work Queue & Backlog', icon: CheckSquare },
    { href: '/reviews', label: 'Technical Reviews', icon: FileCheck },
    { href: '/results', label: 'Results Register', icon: Award },
    { href: '/reports', label: 'Official Reports', icon: FileSpreadsheet },
    { href: '/personnel', label: 'Personnel & Availability', icon: Users },
    { href: '/projects', label: 'Major Works & Projects', icon: FolderGit2 },
    { href: '/equipment', label: 'Metrology Registry', icon: Wrench },
    { href: '/pricing', label: 'Pricing Schedule', icon: DollarSign },
    { href: '/test-methods', label: 'Test Methods', icon: BookOpen },
    { href: '/templates', label: 'Specifications & Templates', icon: FileCode2 },
    { href: '/analytics', label: 'Operations Analytics', icon: Activity },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/settings', label: 'Lab Settings', icon: Settings },
  ],
  lab_worker: [
    { href: '/worker/dashboard', label: 'Worker Workspace', icon: LayoutDashboard },
    { href: '/work-queue', label: 'My Work Queue', icon: CheckSquare },
    { href: '/tests', label: 'Measurement Data Entry', icon: TestTube2 },
    { href: '/samples/scan', label: 'Scan Sample QR', icon: QrCode },
    { href: '/samples', label: 'Assigned Samples', icon: FlaskConical },
    { href: '/test-methods', label: 'Standard Test Methods', icon: BookOpen },
    { href: '/worker/select', label: 'Switch Operating Worker', icon: Users },
    { href: '/notifications', label: 'Notifications', icon: Bell },
  ],
  lab_technician: [
    { href: '/worker/dashboard', label: 'Worker Workspace', icon: LayoutDashboard },
    { href: '/work-queue', label: 'My Work Queue', icon: CheckSquare },
    { href: '/tests', label: 'Measurement Data Entry', icon: TestTube2 },
    { href: '/samples/scan', label: 'Scan Sample QR', icon: QrCode },
    { href: '/samples', label: 'Assigned Samples', icon: FlaskConical },
    { href: '/test-methods', label: 'Standard Test Methods', icon: BookOpen },
    { href: '/worker/select', label: 'Switch Operating Worker', icon: Users },
    { href: '/notifications', label: 'Notifications', icon: Bell },
  ],
  lab_engineer: [
    { href: '/dashboard', label: 'Reviewer Dashboard', icon: LayoutDashboard },
    { href: '/reviews', label: 'Technical Reviews', icon: FileCheck },
    { href: '/tests', label: 'Calculations & Review', icon: TestTube2 },
    { href: '/results', label: 'Results Register', icon: Award },
    { href: '/reports', label: 'Certificates & Sign-Off', icon: FileSpreadsheet },
    { href: '/samples', label: 'Sample Register', icon: FlaskConical },
    { href: '/samples/scan', label: 'QR Scanner', icon: QrCode },
    { href: '/projects', label: 'Engineering Projects', icon: FolderGit2 },
    { href: '/equipment', label: 'Equipment Log', icon: Wrench },
    { href: '/test-methods', label: 'Test Methods', icon: BookOpen },
    { href: '/analytics', label: 'Quality Analytics', icon: Activity },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
};

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const labTheme = useLabTheme();

  const isLabWorker = user?.role === 'lab_worker' || user?.email === 'labworker@dow.gov.pg';
  let roleKey: keyof typeof navItems = 'lab_manager';
  if (user?.role === 'system_admin' || user?.role === 'super_admin') {
    roleKey = 'system_admin';
  } else if (isLabWorker) {
    roleKey = 'lab_worker';
  } else if (user?.role === 'lab_engineer') {
    roleKey = 'lab_engineer';
  } else {
    roleKey = 'lab_manager';
  }

  const items = navItems[roleKey] || navItems.lab_manager;

  const homeHref =
    user?.role === 'system_admin' || user?.role === 'super_admin'
      ? '/system-admin'
      : isLabWorker
      ? '/worker/dashboard'
      : '/dashboard';

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const getRoleBadge = (r?: string) => {
    if (isLabWorker) return 'Laboratory Workstation';
    switch (r) {
      case 'system_admin':
      case 'super_admin':
        return 'System Administrator';
      case 'lab_manager':
        return 'Laboratory Manager';
      case 'lab_engineer':
        return 'Materials Engineer';
      case 'lab_technician':
      case 'lab_worker':
        return 'Testing Technician';
      default:
        return r?.replace('_', ' ') || 'Staff';
    }
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-slate-900 text-slate-100 border-r border-slate-800 transition-all duration-200 flex flex-col',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        {!isCollapsed ? (
          <Link href={homeHref} className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-neutral-950 border border-amber-500/30 overflow-hidden shadow-sm p-1">
              <Image
                src="/logo.png"
                alt="DoW Logo"
                width={36}
                height={36}
                className="w-8 h-8 object-contain"
                priority
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-black text-sm tracking-tight text-white block truncate">
                DoW Lab System
              </span>
              <span className="text-[10px] text-amber-400 font-bold block truncate tracking-wide uppercase">
                Materials Testing Lab
              </span>
            </div>
          </Link>
        ) : (
          <Link href={homeHref} className="mx-auto block" title="DoW Lab System">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-neutral-950 border border-amber-500/30 overflow-hidden p-1">
              <Image
                src="/logo.png"
                alt="DoW Logo"
                width={32}
                height={32}
                className="w-7 h-7 object-contain"
                priority
              />
            </div>
          </Link>
        )}
        <button
          onClick={onToggle}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-amber-400/10 text-amber-300 font-bold border-l-2 border-amber-400 pl-2.5 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-amber-400' : 'text-slate-400')} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Information & Session Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        {!isCollapsed && user && (
          <div className="mb-2.5 px-2">
            <p className="text-xs font-semibold text-white truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-[11px] text-amber-400 font-semibold truncate">
              {getRoleBadge(user.role)}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-all w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
