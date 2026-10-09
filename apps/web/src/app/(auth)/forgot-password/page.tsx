'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { AuthError, AuthShell, AuthSuccess } from '@/components/auth/auth-shell';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      setTimeout(() => router.push(`/reset-password?email=${encodeURIComponent(email)}`), 900);
    } catch (err: unknown) { const response = (err as { response?: { data?: { error?: { message?: string } } } }).response; setError(response?.data?.error?.message || 'Unable to request a reset code'); } finally { setIsLoading(false); }
  };

  return <AuthShell eyebrow="Password recovery" title="Reset your password" description="Enter your account email and we will send a secure reset code.">
    {error && <AuthError message={error} />}
    {sent && <AuthSuccess message="Reset code sent. Opening the verification step..." />}
    <form onSubmit={submit} className="space-y-5">
      <div><label className="label">Email address</label><input type="email" className="input-field" placeholder="name@dow.gov.pg" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <button type="submit" className="btn-primary w-full py-3" disabled={isLoading || sent}>{isLoading ? <span className="flex justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Sending code...</span> : <span className="flex justify-center items-center gap-2"><Send className="w-4 h-4" />Send reset code</span>}</button>
    </form>
    <p className="mt-7 text-center text-sm"><Link href="/login" className="text-primary font-semibold">Back to sign in</Link></p>
  </AuthShell>;
}
