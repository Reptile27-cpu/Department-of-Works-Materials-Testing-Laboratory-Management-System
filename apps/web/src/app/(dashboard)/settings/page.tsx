'use client';

import { useState } from 'react';
import {
  User,
  Lock,
  Palette,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Moon,
  Sun
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { isDark, setDark } = useThemeStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance'>('profile');

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      const res = await api.patch('/auth/profile', {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone || undefined,
      });

      const updated = res.data.data;
      updateUser({
        firstName: updated.firstName,
        lastName: updated.lastName,
      });

      setProfileSuccess('Profile successfully updated!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setProfileError(axiosErr.response?.data?.error?.message || 'Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordSuccess('');
    setPasswordError('');

    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordSuccess('Password successfully updated! Use your new password on next login.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setPasswordError(axiosErr.response?.data?.error?.message || 'Failed to change password. Please verify current password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Manage your personal details, password security, and dashboard appearance.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <User className="w-4 h-4" />
          Profile Details
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Lock className="w-4 h-4" />
          Password & Security
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'appearance'
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Palette className="w-4 h-4" />
          Theme & Display
        </button>
      </div>

      {/* Profile Details Tab */}
      {activeTab === 'profile' && (
        <div className="card border border-border p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold">Personal Profile</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Update your name and primary contact details.
            </p>
          </div>

          {profileError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {profileError}
            </div>
          )}

          {profileSuccess && (
            <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {profileSuccess}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">First Name *</label>
                <input
                  type="text"
                  required
                  className="input-field w-full text-sm"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                />
              </div>

              <div>
                <label className="label text-xs">Last Name *</label>
                <input
                  type="text"
                  required
                  className="input-field w-full text-sm"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">Email Address (Read-Only)</label>
                <input
                  type="email"
                  disabled
                  className="input-field w-full text-sm opacity-70 cursor-not-allowed bg-[var(--bg-secondary)]"
                  value={user?.email || ''}
                />
              </div>

              <div>
                <label className="label text-xs">System Role</label>
                <input
                  type="text"
                  disabled
                  className="input-field w-full text-sm opacity-70 cursor-not-allowed bg-[var(--bg-secondary)] capitalize"
                  value={user?.role ? user.role.replace('_', ' ') : 'User'}
                />
              </div>
            </div>

            <div>
              <label className="label text-xs">Phone Number</label>
              <input
                type="tel"
                placeholder="+675 7xxx xxxx"
                className="input-field w-full text-sm"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card border border-border p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Change Password
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Ensure your account has a strong, unique passphrase with numbers and symbols.
            </p>
          </div>

          {passwordError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {passwordSuccess}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
            <div>
              <label className="label text-xs">Current Password *</label>
              <input
                type="password"
                required
                className="input-field w-full text-sm"
                placeholder="Enter current password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              />
            </div>

            <div>
              <label className="label text-xs">New Password *</label>
              <input
                type="password"
                required
                minLength={8}
                className="input-field w-full text-sm"
                placeholder="At least 8 characters"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
            </div>

            <div>
              <label className="label text-xs">Confirm New Password *</label>
              <input
                type="password"
                required
                minLength={8}
                className="input-field w-full text-sm"
                placeholder="Re-enter new password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="card border border-border p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold">Theme & Visual Mode</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Customize the interface color theme according to your preference.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setDark(false)}
              className={`p-4 rounded-xl border text-left flex flex-col items-center gap-3 transition-all ${
                !isDark
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <Sun className="w-8 h-8 text-amber-500" />
              <span className="font-semibold text-sm">Light Mode</span>
            </button>

            <button
              onClick={() => setDark(true)}
              className={`p-4 rounded-xl border text-left flex flex-col items-center gap-3 transition-all ${
                isDark
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <Moon className="w-8 h-8 text-blue-400" />
              <span className="font-semibold text-sm">Dark Mode</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
