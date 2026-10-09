'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { AuthError, AuthShell } from '@/components/auth/auth-shell';

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '' });

  const update = (field: string, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const email = form.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address, for example name@dow.gov.pg');
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and a number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', {
        email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
      });
      const emailVerificationRequired = response.data?.data?.emailVerificationRequired === true;

      if (emailVerificationRequired) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      setError('Your account was not created because email verification is not enabled. Please contact the administrator.');
    } catch (err: unknown) {
      const axiosError = err as {
        response?: {
          data?: {
            error?: {
              message?: string;
              details?: Array<{ field?: string; message?: string }>;
            };
          };
        };
        request?: unknown;
        message?: string;
      };
      const responseError = axiosError.response?.data?.error;
      const validationMessage = responseError?.details
        ?.map((detail) => detail.message)
        .filter(Boolean)
        .join(', ');

      setError(
        validationMessage ||
        responseError?.message ||
        (axiosError.request ? 'The server could not be reached. Please make sure the backend is running.' : '') ||
        axiosError.message ||
        'Unable to create your account'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="Staff Registration" title="Create Laboratory Account" description="Register authorized staff credentials, then verify your email to unlock access.">
      {error && <AuthError message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">First name</label><input className="input-field" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required /></div>
          <div><label className="label">Last name</label><input className="input-field" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required /></div>
        </div>
        <div><label className="label">Email address</label><input type="email" className="input-field" placeholder="name@dow.gov.pg" value={form.email} onChange={(e) => update('email', e.target.value)} required /></div>
        <div><label className="label">Account type</label><input className="input-field bg-[var(--bg-secondary)]" value="Laboratory Staff" readOnly /><p className="text-xs text-[var(--text-muted)] mt-1">Laboratory administrators assign functional tiers (Technician, Engineer, Manager) upon credential review.</p></div>
        <div><label className="label">Password</label><input type="password" className="input-field" placeholder="8+ characters, upper/lowercase and number" value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={8} /></div>
        <div><label className="label">Phone <span className="font-normal text-[var(--text-muted)]">(optional)</span></label><input className="input-field" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></div>
        <button type="submit" className="btn-primary w-full py-3" disabled={isLoading}>{isLoading ? <span className="flex justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Creating account...</span> : 'Create account'}</button>
      </form>
      <p className="mt-7 text-center text-sm text-[var(--text-secondary)]">Already have an account? <Link href="/login" className="text-primary font-semibold">Sign in</Link></p>
    </AuthShell>
  );
}
