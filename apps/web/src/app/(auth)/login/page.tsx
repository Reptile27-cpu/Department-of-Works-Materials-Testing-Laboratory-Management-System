'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', form);
      const { user, accessToken, refreshToken } = response.data.data;

      login(user, accessToken, refreshToken);

      if (user.mustChangePassword) {
        router.push('/change-password');
        return;
      }

      if (user.role === 'system_admin' || user.role === 'super_admin') {
        router.push('/system-admin');
        return;
      }

      if (user.role === 'lab_worker' || user.email === 'labworker@dow.gov.pg') {
        router.push('/worker/select');
        return;
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: {
            data?: {
              error?: {
                message?: string;
              };
            };
          };
        };

        setError(axiosErr.response?.data?.error?.message || 'Invalid email or password');
      } else {
        setError('Unable to connect to laboratory API server. Ensure the backend service is running.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* LEFT SIDE - Official Department Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-black border-r border-slate-800">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-amber-400/10 rounded-xl flex items-center justify-center border border-amber-400/30 p-2 shadow-lg">
              <img src="/logo.png" alt="DoW Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">
                Independent State of Papua New Guinea
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 block">
                Department of Works &amp; Highways
              </span>
            </div>
          </div>

          <div className="mt-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Central Materials Testing & Quality Assurance Division</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">
              Materials Testing Laboratory Management System
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-lg">
              Authorized custody tracking, civil engineering test calculation engines (AS 1289 / ASTM),
              equipment metrology calibration interlocks, and official test certification for public infrastructure projects.
            </p>
          </div>

          <div className="mt-10 space-y-3.5 text-xs text-slate-300">
            {[
              'Sample Custody Intake with Collision-Proof References (26P-S-XXXX / REQ-YYYY-XXXX)',
              'Mathematical Verification Engine (Moisture, Sieve, Atterberg, Compaction, CBR, SG)',
              'Equipment Metrology with Automated Calibration Expiry Enforcement',
              'Dual Verification Workflow (Technician Entry → Engineer Review → Manager Approval)',
              'Audit-Logged Data Integrity and Official Test Certificates',
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>Central Materials Laboratory | Boroko, Port Moresby NCD</span>
          <span>Version 1.0 (Engineering Release)</span>
        </div>
      </div>

      {/* RIGHT SIDE - Authentication Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-slate-900/50">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex w-14 h-14 bg-amber-400/10 border border-amber-400/30 rounded-xl items-center justify-center p-2 mb-3">
              <img src="/logo.png" alt="DoW Logo" className="w-10 h-10 object-contain" />
            </div>
            <h2 className="text-xl font-bold text-white">DoW Materials Laboratory</h2>
            <p className="text-xs text-amber-400 font-medium">Department of Works &amp; Highways</p>
          </div>

          <div className="text-left">
            <h2 className="text-2xl font-bold text-white tracking-tight">Staff Sign In</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your authorized Department of Works credentials
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Department Email Address
              </label>
              <input
                type="email"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                placeholder="name@dow.gov.pg"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                  placeholder="Enter security password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Access Laboratory Portal</span>
              )}
            </button>
          </form>

          {/* Public Client Notice */}
          <div className="mt-5 pt-3 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Requesting material testing?{' '}
              <a href="/request" className="text-amber-400 font-bold hover:underline">
                Submit Testing Request &rarr;
              </a>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Clients do not require an account. All requests are submitted via the public intake form.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
