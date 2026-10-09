'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { AuthError, AuthShell, AuthSuccess } from '@/components/auth/auth-shell';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setEmail(new URLSearchParams(window.location.search).get('email') || '');
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, password });
      setSuccess('Password updated. Redirecting to sign in...');
      setTimeout(() => router.push('/login'), 1000);
    } catch (err: unknown) { const response = (err as { response?: { data?: { error?: { message?: string } } } }).response; setError(response?.data?.error?.message || 'Unable to reset your password'); } finally { setIsLoading(false); }
  };

  return <AuthShell eyebrow="Password recovery" title="Choose a new password" description={`Use the reset code sent to ${email || 'your email address'}.`}>
    {error && <AuthError message={error} />}
    {success && <AuthSuccess message={success} />}
    <form onSubmit={submit} className="space-y-5">
      <div><label className="label">Reset code</label><input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" className="input-field text-center text-2xl tracking-[0.35em]" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required /></div>
      <div><label className="label">New password</label><div className="relative"><input type={showPassword ? 'text' : 'password'} className="input-field pr-11" placeholder="8+ characters, upper/lowercase and number" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
      <button type="submit" className="btn-primary w-full py-3" disabled={isLoading || otp.length !== 6}>{isLoading ? <span className="flex justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Updating password...</span> : 'Update password'}</button>
    </form>
    <p className="mt-6 text-center text-sm"><Link href="/login" className="text-primary font-semibold">Back to sign in</Link></p>
  </AuthShell>;
}
