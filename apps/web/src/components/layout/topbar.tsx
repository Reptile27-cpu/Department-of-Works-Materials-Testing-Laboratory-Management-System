'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, Moon, Sun, Menu, QrCode } from 'lucide-react';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { getInitials, generateAvatarColor } from '@/lib/utils';
import QrScannerModal from '@/components/qr-scanner-modal';
import WorkerSwitcher from '@/components/layout/worker-switcher';

interface TopbarProps {
  onMenuToggle: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const router = useRouter();
  const { isDark, toggle } = useThemeStore();
  const { user } = useAuthStore();
  const [scannerOpen, setScannerOpen] = useState(false);

  const initials = user ? getInitials(user.firstName, user.lastName) : '?';
  const avatarColor = user ? generateAvatarColor(`${user.firstName} ${user.lastName}`) : '#D97706';

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Left: Mobile Toggle & Global Search */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuToggle}
              aria-label="Toggle Navigation Menu"
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search samples, tests, projects..."
                className="w-64 lg:w-80 pl-9 pr-3.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
              />
            </div>
          </div>

          {/* Right: Quick Tools, Worker Switcher, Notifications, User */}
          <div className="flex items-center gap-2.5">
            {/* Shared Workstation Personnel Switcher (ONLY for shared lab worker account) */}
            {(user?.role === 'lab_worker' || user?.email === 'labworker@dow.gov.pg') && (
              <WorkerSwitcher variant="topbar" />
            )}

            {/* Quick QR Scanner Button */}
            <button
              onClick={() => setScannerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all shadow-sm"
              title="Scan Sample QR Tag"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Notifications */}
            <button
              onClick={() => router.push('/notifications')}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full" />
            </button>

            {/* User Avatar */}
            <div
              onClick={() => router.push('/settings')}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-black text-xs font-bold cursor-pointer border border-amber-400/40 shadow-sm transition-transform hover:scale-105"
              style={{ backgroundColor: avatarColor || '#F59E0B' }}
              title={user ? `${user.firstName} ${user.lastName} (${user.role})` : 'User'}
            >
              {initials}
            </div>
          </div>
        </div>
      </header>

      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(token) => {
          setScannerOpen(false);
          router.push(`/samples/scan?token=${encodeURIComponent(token)}`);
        }}
      />
    </>
  );
}
