'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  Send,
  RefreshCw,
  AlertCircle,
  X,
  CheckCircle2,
  Megaphone,
  Clock,
  Info
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Send Announcement Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [announcement, setAnnouncement] = useState({
    title: '',
    message: '',
    role: 'all',
  });

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
    } catch {
      setError('Unable to load notification feed.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setSuccessMessage('All notifications marked as read.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      alert('Failed to mark notifications as read.');
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setError('');
    try {
      await api.post('/notifications/announcement', announcement);
      setIsModalOpen(false);
      setSuccessMessage('Announcement broadcasted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setAnnouncement({ title: '', message: '', role: 'all' });
      await loadNotifications();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Failed to send announcement.');
    } finally {
      setIsSending(false);
    }
  };

  const isStaff = user?.role === 'system_admin' || user?.role === 'super_admin' || user?.role === 'lab_manager' || user?.role === 'lab_engineer' || user?.role === 'lab_technician';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notifications & Bulletins</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Stay informed with laboratory notices, test assignments, and calibration alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-secondary flex items-center gap-2"
            onClick={handleMarkAllRead}
            disabled={isLoading || notifications.length === 0}
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
          {isStaff && (
            <button
              type="button"
              className="btn-primary flex items-center gap-2"
              onClick={() => setIsModalOpen(true)}
            >
              <Megaphone className="w-4 h-4" />
              Broadcast Notice
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-success flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">{successMessage}</p>
        </div>
      )}

      {/* Notifications Feed */}
      <div className="card p-0 overflow-hidden border border-border divide-y divide-border">
        {isLoading ? (
          <div className="py-16 text-center text-[var(--text-muted)]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)] space-y-2">
            <Bell className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-50" />
            <p className="text-sm font-semibold">No notifications right now</p>
            <p className="text-xs">You are completely up to date.</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`p-5 flex items-start gap-4 transition-colors ${
                item.isRead ? 'bg-transparent' : 'bg-primary/5'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  item.type === 'announcement'
                    ? 'bg-amber-500/10 text-amber-500'
                    : item.type === 'grade'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-blue-500/10 text-blue-500'
                }`}
              >
                {item.type === 'announcement' ? (
                  <Megaphone className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm leading-tight flex items-center gap-2">
                    {item.title}
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </h3>
                  <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  {item.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Broadcast Announcement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="card max-w-lg w-full p-6 relative border border-border shadow-2xl my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              Broadcast Announcement
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1 mb-6">
              Send an official bulletin to laboratory personnel across the facility.
            </p>

            <form onSubmit={handleSendAnnouncement} className="space-y-4">
              <div>
                <label className="label text-xs">Announcement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laboratory Equipment Calibration Notice"
                  className="input-field w-full text-sm"
                  value={announcement.title}
                  onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                />
              </div>

              <div>
                <label className="label text-xs">Target Audience</label>
                <select
                  className="input-field w-full text-sm"
                  value={announcement.role}
                  onChange={(e) => setAnnouncement({ ...announcement, role: e.target.value })}
                >
                  <option value="all">Whole Facility (All Staff)</option>
                  <option value="lab_technician">Technicians Only</option>
                  <option value="lab_engineer">Materials Engineers Only</option>
                  <option value="lab_manager">Laboratory Managers Only</option>
                </select>
              </div>

              <div>
                <label className="label text-xs">Message Content *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter detailed notification message..."
                  className="input-field w-full text-sm"
                  value={announcement.message}
                  onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs"
                  disabled={isSending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs flex items-center gap-1.5"
                  disabled={isSending}
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? 'Broadcasting...' : 'Broadcast Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
