'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  FlaskConical,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  HardHat,
  Compass,
  QrCode,
  Building2,
  Clock,
  MapPin,
  ClipboardList,
} from 'lucide-react';

const standards = [
  'Civil Engineering Soil Mechanics (AS 1289 / ASTM)',
  'Chain of Custody Specimen Intake (26P-S-XXXX / REQ-YYYY-XXXX)',
  'Dual-Verification Engineering Validation (Technician → Engineer → Manager)',
  'Equipment Calibration Interlocks & Metrology (ISO/IEC 17025 Compliance)',
  'Official Test Certificates & Materials Quality Reports',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white selection:bg-amber-400 selection:text-black">
      {/* Hero Section */}
      <section className="relative min-h-screen overflow-hidden bg-neutral-950">
        {/* Subtle Engineering Grid Background */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #f59e0b 1px, transparent 1px), linear-gradient(to bottom, #f59e0b 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Ambient Gold and Charcoal Glow */}
        <div className="absolute top-0 right-1/4 w-[600px] h-[500px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[500px] h-[400px] bg-neutral-800/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-12">
          {/* Top Header */}
          <header className="flex items-center justify-between border-b border-neutral-800/80 pb-6">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/30 bg-neutral-900/90 shadow-lg overflow-hidden shrink-0">
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
                <p className="text-base font-black tracking-tight text-white uppercase">
                  Department of Works & Highways
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Materials Testing Laboratory &bull; Papua New Guinea
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/request"
                className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black shadow-md hover:bg-amber-300 transition-all shadow-amber-400/20"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Submit Request</span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs font-semibold text-neutral-200 hover:text-white hover:border-amber-400 transition-colors"
              >
                <span>Staff Portal</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </Link>
            </div>
          </header>

          {/* Hero Content */}
          <div className="flex flex-1 items-center py-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="max-w-3xl"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-400 shadow-inner">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Central Materials Testing & Quality Assurance Division</span>
              </div>

              <h1 className="text-4xl font-black leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl text-white">
                Department of Works{' '}
                <span className="block text-amber-400">
                  Materials Testing Laboratory
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base text-neutral-300 sm:text-lg leading-relaxed">
                Official civil engineering materials testing, geotechnical analysis, and certified quality verification
                for national highways, bridges, and infrastructure works across Papua New Guinea.
              </p>

              {/* Primary Call to Action */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/request"
                    className="inline-flex items-center gap-2.5 rounded-xl bg-amber-400 px-7 py-3.5 text-sm font-black text-black shadow-xl shadow-amber-400/20 transition hover:bg-amber-300"
                  >
                    <ClipboardList className="w-5 h-5 text-black" />
                    <span>Request Laboratory Testing (Form RQ-LT)</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900/80 px-6 py-3.5 text-sm font-bold text-neutral-200 transition hover:bg-neutral-800 hover:border-amber-400"
                >
                  <FlaskConical className="w-4 h-4 text-amber-400" />
                  <span>Authorized Personnel Sign In</span>
                </Link>
              </div>

              {/* Physical Specimen Intake Card */}
              <div className="mt-10 p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">
                      Physical Sample Intake Counter
                    </span>
                    <span className="text-neutral-400">
                      Central Materials Testing Laboratory &bull; Department of Works HQ, Boroko, Port Moresby
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Mon &ndash; Fri &bull; 08:00 AM &ndash; 04:00 PM</span>
                </div>
              </div>

              {/* Standards Badges */}
              <div className="mt-8 pt-6 border-t border-neutral-800/80">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                  Testing Accreditations & Standards
                </p>
                <div className="flex flex-wrap gap-2">
                  {standards.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/90 px-3 py-1.5 text-xs text-neutral-300 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Feature Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-8">
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 shrink-0">
                <HardHat className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Geotechnical & Soils</h2>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Moisture content, Sieve analysis, Atterberg plastic/liquid limits, Proctor compaction, California Bearing Ratio (CBR) & Specific Gravity.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Aggregates & Concrete</h2>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Los Angeles abrasion resistance, aggregate crushing value, concrete compressive core breaks, and bituminous mix verification.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Official DoW Certificates</h2>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Official laboratory certificates (REP-YYYY-XXXX), chain of custody QR tracking, and dual engineer review sign-offs.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="pt-6 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-2">
            <span>
              &copy; {new Date().getFullYear()} Independent State of Papua New Guinea &mdash; Department of Works and Highways
            </span>
            <span className="text-neutral-400">Central Materials Testing Division | Port Moresby, NCD</span>
          </footer>
        </div>
      </section>
    </main>
  );
}