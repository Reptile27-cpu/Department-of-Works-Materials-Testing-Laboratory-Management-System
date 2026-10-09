'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle2, FlaskConical, Building2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen grid lg:grid-cols-[0.9fr_1.1fr] bg-slate-950 text-slate-100">
      {/* Left Column: Official Department of Works Identity */}
      <section className="hidden lg:flex relative overflow-hidden p-12 bg-gradient-to-br from-neutral-950 via-slate-900 to-neutral-950 border-r border-slate-800 text-white">
        {/* Subtle engineering grid */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #f59e0b 1px, transparent 1px), linear-gradient(to bottom, #f59e0b 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        {/* Amber Ambient Glow */}
        <div className="absolute top-1/4 right-0 w-[450px] h-[400px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between max-w-lg">
          <div>
            <Link href="/" className="flex items-center gap-3.5 w-fit">
              <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-amber-500/30 overflow-hidden shadow-lg flex items-center justify-center p-1 shrink-0">
                <Image
                  src="/logo.png"
                  alt="Department of Works Crest"
                  width={40}
                  height={40}
                  className="w-9 h-9 object-contain"
                  priority
                />
              </div>
              <div>
                <span className="text-base font-black tracking-tight text-white block uppercase">
                  Department of Works & Highways
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                  Materials Testing Laboratory
                </span>
              </div>
            </Link>

            <div className="mt-14 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Central Materials Testing & Quality Assurance Division</span>
              </div>

              <h1 className="text-3xl font-black leading-tight text-white">
                Authorized Engineering & Materials Quality Control Portal
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed">
                Centralized platform for civil materials sample tracking, laboratory testing worksheets (AS 1289 / ASTM),
                equipment metrology compliance, and official test certification.
              </p>
            </div>

            <div className="mt-10 space-y-3 text-xs text-slate-300">
              {[
                'Chain of Custody Specimen Intake (26P-S-XXXX / REQ-YYYY-XXXX)',
                'Automated Civil Engineering Calculation Engines (Soils, Concrete, Aggregates)',
                'Equipment Metrology Calibration Interlocks (ISO/IEC 17025 Compliance)',
                'Dual-Verification Sign-Off Workflow (Technician → Reviewer → Manager)',
                'Official Tamper-Evident QR Tracking & Test Certificates',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>Central Materials Laboratory | Port Moresby, NCD</span>
            <span className="text-amber-400/80 font-mono">DOW-LAB-V1</span>
          </div>
        </div>
      </section>

      {/* Right Column: Form Container */}
      <section className="flex items-center justify-center p-6 sm:p-12 bg-slate-900/60">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Mobile Top Header */}
          <div className="lg:hidden flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-amber-500/30 overflow-hidden flex items-center justify-center p-1">
              <Image
                src="/logo.png"
                alt="DoW Logo"
                width={32}
                height={32}
                className="w-7 h-7 object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Department of Works</p>
              <p className="text-[11px] text-amber-400 font-semibold">Materials Testing Laboratory</p>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-amber-400 font-bold mb-1">
              {eyebrow}
            </p>
            <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
            <p className="text-xs text-slate-400 mt-1">{description}</p>
          </div>

          {children}
        </motion.div>
      </section>
    </main>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
      {message}
    </div>
  );
}

export function AuthSuccess({ message }: { message: string }) {
  return (
    <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs">
      {message}
    </div>
  );
}
