'use client';

import { useEffect, useState } from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { AuthError, AuthShell } from '@/components/auth/auth-shell';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setEmail(new URLSearchParams(window.location.search).get('email') || '');
  }, []);

  const sendAgain = async () => {
    if (!email) return;
    setError('');
    setIsSending(true);
    try { await api.post('/auth/email-otp/send', { email }); } catch (err: unknown) { const response = (err as { response?: { data?: { error?: { message?: string } } } }).response; setError(response?.data?.error?.message || 'Unable to resend the code'); } finally { setIsSending(false); }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.post('/auth/email-otp/verify', { email, otp });
      const { user, accessToken, refreshToken } = response.data.data;
      login(user, accessToken, refreshToken);
      router.push('/dashboard');
    } catch (err: unknown) { const response = (err as { response?: { data?: { error?: { message?: string } } } }).response; setError(response?.data?.error?.message || 'That code is not valid'); } finally { setIsLoading(false); }
  };

  return <AuthShell eyebrow="Email verification" title="Confirm your email" description={`Enter the 6-digit code sent to ${email || 'your email address'}.`}>
    <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10 mb-6"><MailCheck className="w-5 h-5 text-primary" /><p className="text-sm text-[var(--text-secondary)]">Your code expires in 10 minutes.</p></div>
    {error && <AuthError message={error} />}
    <form onSubmit={verify} className="space-y-5">
      <div><label className="label">Verification code</label><input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" className="input-field text-center text-2xl tracking-[0.35em]" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required /></div>
      <button type="submit" className="btn-primary w-full py-3" disabled={isLoading || otp.length !== 6}>{isLoading ? <span className="flex justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Verifying...</span> : 'Verify email'}</button>
    </form>
    <button type="button" onClick={sendAgain} disabled={isSending || !email} className="btn-ghost w-full mt-3 text-primary">{isSending ? 'Sending...' : 'Send a new code'}</button>
    <p className="mt-6 text-center text-sm"><Link href="/login" className="text-primary font-semibold">Back to sign in</Link></p>
  </AuthShell>;
}
