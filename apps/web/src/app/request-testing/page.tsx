'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  FileCheck,
  CheckCircle2,
  Building2,
  HardHat,
  ArrowRight,
  ArrowLeft,
  Printer,
  AlertCircle,
  Loader2,
  DollarSign,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  FlaskConical,
  Info,
} from 'lucide-react';
import { api } from '@/lib/api';

interface TestTypeItem {
  id: string;
  code: string;
  name: string;
  standard: string;
  category: string;
  defaultTurnaroundDays: number;
  unitPricePublic: number | string;
  unitPricePrivate: number | string;
  unit?: string;
  description?: string;
}

interface SubmittedReceipt {
  requestNumber: string;
  createdAt: string;
  client: { name: string; contactPerson?: string; phone?: string; email?: string };
  project?: { name: string; location?: string };
  sampleCategory: string;
  sampleDescription: string;
  priority: string;
  estimatedCost: number;
  requestItems: Array<{
    id: string;
    unitPrice: number;
    testType: { name: string; standard: string; code: string };
  }>;
}

export default function RequestTestingPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [categories, setCategories] = useState<Record<string, TestTypeItem[]>>({});
  const [loadingCatalogue, setLoadingCatalogue] = useState(true);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);

  // Form State
  const [clientType, setClientType] = useState<'private' | 'public'>('private');
  const [clientName, setClientName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const [projectName, setProjectName] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [poNumber, setPoNumber] = useState('');

  const [sampleCategory, setSampleCategory] = useState('Soils');
  const [sampleDescription, setSampleDescription] = useState('');
  const [sampleQuantity, setSampleQuantity] = useState('1');
  const [materialSource, setMaterialSource] = useState('');
  const [dateSampled, setDateSampled] = useState(new Date().toISOString().split('T')[0]);
  const [sampledBy, setSampledBy] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [remarks, setRemarks] = useState('');

  // Selected Tests State
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('All');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SubmittedReceipt | null>(null);

  // Load public test catalogue
  useEffect(() => {
    async function fetchCatalogue() {
      try {
        setLoadingCatalogue(true);
        const res = await api.get('/requests/public/categories');
        const data = res.data?.data?.categories || {};
        setCategories(data);
        const keys = Object.keys(data);
        if (keys.length > 0) {
          setActiveCategoryTab('All');
        }
      } catch (err) {
        console.error('Failed to load test catalogue:', err);
        setCatalogueError('Unable to load standard testing catalogue. Please check network.');
      } finally {
        setLoadingCatalogue(false);
      }
    }
    fetchCatalogue();
  }, []);

  // Flatten all tests
  const allTests: TestTypeItem[] = Object.values(categories).flat();

  const toggleTest = (id: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // Pricing Calculation
  const selectedTests = allTests.filter((t) => selectedTestIds.includes(t.id));
  const subtotal = selectedTests.reduce((acc, t) => {
    const price = clientType === 'public' ? Number(t.unitPricePublic) : Number(t.unitPricePrivate);
    return acc + (isNaN(price) ? 0 : price);
  }, 0);
  const adminSurcharge = Math.round(subtotal * 0.03 * 100) / 100;
  const totalCost = subtotal + adminSurcharge;

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      setSubmitError('Client / Organization Name is required.');
      setStep(1);
      return;
    }
    if (!sampleDescription.trim()) {
      setSubmitError('Sample Description is required.');
      setStep(2);
      return;
    }
    if (selectedTestIds.length === 0) {
      setSubmitError('Please select at least one laboratory test.');
      setStep(3);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        clientName: clientName.trim(),
        requestType: clientType,
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        projectName: projectName.trim(),
        projectLocation: projectLocation.trim(),
        poNumber: poNumber.trim(),
        sampleCategory,
        sampleDescription: sampleDescription.trim(),
        sampleQuantity: parseInt(sampleQuantity, 10) || 1,
        materialSource: materialSource.trim(),
        dateSampled,
        sampledBy: sampledBy.trim(),
        priority,
        testTypeIds: selectedTestIds,
        remarks: remarks.trim(),
      };

      const res = await api.post('/requests/public', payload);
      if (res.data?.success && res.data?.data) {
        setReceipt(res.data.data);
        setStep(4);
      } else {
        setSubmitError('Submission was received but no reference was returned.');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to submit testing request. Please check inputs.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-amber-500 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md px-6 py-4 sticky top-0 z-30 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-neutral-900 border border-amber-500/40 p-1 flex items-center justify-center">
              <Image src="/logo.png" alt="DoW Logo" width={36} height={36} className="object-contain" priority />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">Department of Works</span>
              <span className="text-sm font-bold text-white">Laboratory Testing Intake</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
            >
              &larr; Back to Home
            </Link>
            <Link
              href="/login"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/30 hover:bg-amber-400/10 transition-all"
            >
              Staff Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {step !== 4 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
              <FlaskConical className="w-4 h-4" />
              Public Materials Testing Request
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Central Materials Testing Laboratory Intake
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl">
              Select your required geotechnical, concrete, or aggregate tests. You will receive an immediate
              cost quotation and official Request Reference (REQ-YYYY-XXXX) to present at physical sample delivery.
            </p>

            {/* Stepper Wizard Bar */}
            <div className="grid grid-cols-3 gap-2 mt-6">
              {[
                { s: 1, label: '1. Client & Project' },
                { s: 2, label: '2. Specimen Info' },
                { s: 3, label: '3. Tests & Estimate' },
              ].map((item) => (
                <button
                  key={item.s}
                  type="button"
                  onClick={() => setStep(item.s as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left border ${
                    step === item.s
                      ? 'bg-amber-400 text-black border-amber-400 shadow-lg shadow-amber-400/10'
                      : step > item.s
                      ? 'bg-neutral-900 text-amber-400 border-amber-500/30'
                      : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {submitError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Please check your details</p>
              <p>{submitError}</p>
            </div>
          </div>
        )}

        {/* ================= STEP 1: CLIENT & PROJECT ================= */}
        {step === 1 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-neutral-800 pb-3">
              Organization & Contact Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Requesting Entity Type <span className="text-amber-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setClientType('private')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                      clientType === 'private'
                        ? 'bg-amber-400/10 text-amber-400 border-amber-400'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    Private Contractor / Consultant
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientType('public')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                      clientType === 'public'
                        ? 'bg-amber-400/10 text-amber-400 border-amber-400'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    Department of Works / Public Project
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Client / Organization Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hebou Construction PNG Ltd"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Contact Person
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Kila (Site Engineer)"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +675 7123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Official Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. j.kila@company.com.pg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Postal / Physical Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Section 45, Lot 12, Waigani, NCD"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <h2 className="text-lg font-bold text-white border-t border-b border-neutral-800 py-3 mt-6">
              Engineering Project Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Project Title / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Magi Highway Rehabilitation Phase 2"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Project Location / Province
                </label>
                <input
                  type="text"
                  placeholder="e.g. Central Province (CH 24+500)"
                  value={projectLocation}
                  onChange={(e) => setProjectLocation(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Purchase Order / Reference No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO-2026-9921"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition-all flex items-center gap-2"
              >
                Continue to Specimen Details &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: SPECIMEN DETAILS ================= */}
        {step === 2 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-neutral-800 pb-3">
              Physical Specimen Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Material Classification <span className="text-amber-400">*</span>
                </label>
                <select
                  value={sampleCategory}
                  onChange={(e) => setSampleCategory(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Soils">Soils & Subgrade</option>
                  <option value="Aggregates">Aggregates & Crushed Rock</option>
                  <option value="Concrete">Concrete & Mortar</option>
                  <option value="Bitumen">Bitumen & Asphalt</option>
                  <option value="Field">In-Situ Field Testing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Specimen Quantity (Bags / Cylinders)
                </label>
                <input
                  type="number"
                  min="1"
                  value={sampleQuantity}
                  onChange={(e) => setSampleQuantity(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Detailed Specimen Description <span className="text-amber-400">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Crushed river gravel basecourse nominal 20mm max size sampled from stockpile #3."
                  value={sampleDescription}
                  onChange={(e) => setSampleDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Quarry / Pit / Chainage Source
                </label>
                <input
                  type="text"
                  placeholder="e.g. Laloki River Quarry Pit #2"
                  value={materialSource}
                  onChange={(e) => setMaterialSource(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Date Sampled
                </label>
                <input
                  type="date"
                  value={dateSampled}
                  onChange={(e) => setDateSampled(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Sampled By (Field Technician / Engineer)
                </label>
                <input
                  type="text"
                  placeholder="e.g. S. Wari (DoW Materials Tech)"
                  value={sampledBy}
                  onChange={(e) => setSampledBy(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Turnaround Urgency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('normal')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      priority === 'normal'
                        ? 'bg-amber-400/10 text-amber-400 border-amber-400'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                    }`}
                  >
                    Standard (7-14 Days)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('urgent')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      priority === 'urgent'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                    }`}
                  >
                    Urgent Priority (3-5 Days)
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-neutral-800 text-xs font-semibold text-neutral-300 hover:bg-neutral-800"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition-all flex items-center gap-2"
              >
                Select Laboratory Tests &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: TESTS & LIVE PRICING ================= */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Test Catalogue Selection */}
            <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-white">Select Laboratory Test Methods</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Official rates apply per AS 1289 / ASTM standard testing procedures.
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-amber-400 px-2 py-1 rounded bg-amber-400/10 border border-amber-400/20">
                  {selectedTestIds.length} Selected
                </span>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 border-b border-neutral-800/80 pb-3">
                {['All', ...Object.keys(categories)].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategoryTab(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeCategoryTab === cat
                        ? 'bg-amber-400 text-black'
                        : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {loadingCatalogue ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
                  Loading standard fee schedule catalogue...
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {allTests
                    .filter((t) => activeCategoryTab === 'All' || t.category === activeCategoryTab)
                    .map((test) => {
                      const isSelected = selectedTestIds.includes(test.id);
                      const price = clientType === 'public' ? test.unitPricePublic : test.unitPricePrivate;
                      return (
                        <div
                          key={test.id}
                          onClick={() => toggleTest(test.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-amber-400/10 border-amber-400'
                              : 'bg-neutral-950 border-neutral-800/80 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 mt-0.5 rounded border-neutral-700 text-amber-400 focus:ring-0 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{test.name}</span>
                                <span className="font-mono text-[10px] text-amber-400 font-bold px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800">
                                  {test.standard}
                                </span>
                              </div>
                              <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">{test.description}</p>
                              <p className="text-[10px] text-neutral-500 mt-1">
                                Category: {test.category} &bull; Turnaround: {test.defaultTurnaroundDays} days
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-sm font-extrabold text-amber-400">
                              PGK K{Number(price).toLocaleString()}
                            </span>
                            <span className="block text-[10px] text-neutral-500 uppercase">{test.unit || 'per test'}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl border border-neutral-800 text-xs font-semibold text-neutral-300 hover:bg-neutral-800"
                >
                  &larr; Back to Specimen
                </button>
              </div>
            </div>

            {/* Right 1 Col: Live Quotation Summary */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="border-b border-neutral-800 pb-3">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Live Estimate</span>
                  <h3 className="text-base font-extrabold text-white">Quotation Breakdown</h3>
                </div>

                <div className="space-y-2 text-xs">
                  {selectedTests.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-4 text-center italic">
                      No tests selected yet. Choose test methods from the catalogue on the left.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto divide-y divide-neutral-800/60 pr-1">
                      {selectedTests.map((t) => {
                        const price = clientType === 'public' ? Number(t.unitPricePublic) : Number(t.unitPricePrivate);
                        return (
                          <div key={t.id} className="pt-2 first:pt-0 flex items-center justify-between text-[11px]">
                            <span className="text-neutral-300 truncate max-w-[170px]">{t.name}</span>
                            <span className="font-mono font-bold text-amber-400 shrink-0">
                              K{price.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Testing Subtotal</span>
                    <span className="font-mono text-neutral-200">PGK K{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="flex items-center gap-1">
                      3% Admin & Quality Surcharge
                    </span>
                    <span className="font-mono text-neutral-200">PGK K{adminSurcharge.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-sm font-bold text-white">
                    <span>Total Estimated Fee</span>
                    <span className="font-mono text-amber-400 text-lg font-black">
                      PGK K{totalCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    Official Government Rates
                  </div>
                  <p>
                    Rates fixed per DoW Materials Standards Schedule. Surcharge funds metrology calibration & quality verification.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={submitting || selectedTestIds.length === 0}
                onClick={handleSubmit}
                className="w-full py-3.5 px-4 bg-amber-400 hover:bg-amber-300 disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-amber-400/10 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    Submitting Request & Generating Reference...
                  </>
                ) : (
                  <>
                    Submit Request & Generate Receipt
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: OFFICIAL RECEIPT ================= */}
        {step === 4 && receipt && (
          <div className="space-y-6">
            {/* Top Success Banner */}
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start justify-between gap-4 print:hidden">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-base font-extrabold text-white">
                    Testing Request Successfully Submitted
                  </h2>
                  <p className="text-xs text-neutral-300 mt-1">
                    Your request has been officially recorded in the Department of Works laboratory system.
                    Please print or save this confirmation receipt and present it along with your physical specimens at the laboratory.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition-all flex items-center gap-1.5 shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Official Receipt
              </button>
            </div>

            {/* Printable Official Government Receipt Document */}
            <div className="p-8 sm:p-12 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none space-y-8">
              {/* Receipt Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 print:border-neutral-300 pb-6">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-12 h-12 bg-neutral-950 border border-amber-500/40 rounded-xl p-1 flex items-center justify-center print:border-black">
                    <Image src="/logo.png" alt="DoW Logo" width={40} height={40} className="object-contain" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase text-white print:text-black">
                      Department of Works and Highways
                    </h3>
                    <p className="text-xs text-amber-400 print:text-neutral-700 font-bold">
                      Central Materials Testing Laboratory &bull; 4-Mile, Hubert Murray Highway, Port Moresby
                    </p>
                  </div>
                </div>

                <div className="text-right sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
                    Official Reference Number
                  </span>
                  <span className="font-mono text-2xl font-black text-amber-400 print:text-black block">
                    {receipt.requestNumber}
                  </span>
                  <span className="text-[11px] text-neutral-400 print:text-neutral-600">
                    Date: {new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Client & Project Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-neutral-500 print:text-neutral-600 uppercase text-[10px] font-bold block mb-1">
                    Client / Organization
                  </span>
                  <span className="font-bold text-white print:text-black block">
                    {receipt.client?.name || clientName}
                  </span>
                  <span className="text-neutral-400 print:text-neutral-600 block mt-0.5">
                    {receipt.client?.contactPerson || contactPerson}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-500 print:text-neutral-600 uppercase text-[10px] font-bold block mb-1">
                    Project Reference
                  </span>
                  <span className="font-bold text-white print:text-black block">
                    {receipt.project?.name || projectName || 'Standard Project'}
                  </span>
                  <span className="text-neutral-400 print:text-neutral-600 block mt-0.5">
                    {receipt.project?.location || projectLocation || 'Port Moresby'}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-500 print:text-neutral-600 uppercase text-[10px] font-bold block mb-1">
                    Material / Category
                  </span>
                  <span className="font-bold text-white print:text-black block">
                    {receipt.sampleCategory || sampleCategory}
                  </span>
                  <span className="text-neutral-400 print:text-neutral-600 block mt-0.5">
                    Priority: {receipt.priority?.toUpperCase()}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-500 print:text-neutral-600 uppercase text-[10px] font-bold block mb-1">
                    Physical Delivery Location
                  </span>
                  <span className="font-bold text-white print:text-black block">
                    Central Materials Lab
                  </span>
                  <span className="text-neutral-400 print:text-neutral-600 block mt-0.5">
                    Receiving Desk: Mon-Fri 08:00 - 15:30
                  </span>
                </div>
              </div>

              {/* Specimen Description */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 print:bg-neutral-100 print:border-neutral-300 text-xs">
                <span className="text-[10px] font-bold uppercase text-neutral-400 print:text-neutral-600 block mb-1">
                  Specimen Observations & Origin:
                </span>
                <p className="text-neutral-200 print:text-black font-medium">
                  {receipt.sampleDescription || sampleDescription}
                </p>
              </div>

              {/* Itemized Tests Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 print:text-neutral-700">
                  Requested Standard Tests & Estimated Quotation
                </h4>

                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 print:border-neutral-400 text-left text-neutral-400 print:text-neutral-700">
                      <th className="py-2">#</th>
                      <th className="py-2">Test Description</th>
                      <th className="py-2">Standard Code</th>
                      <th className="py-2 text-right">Fee (PGK)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 print:divide-neutral-300">
                    {receipt.requestItems?.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-2 font-mono text-neutral-500">{idx + 1}</td>
                        <td className="py-2 font-medium text-white print:text-black">{item.testType?.name}</td>
                        <td className="py-2 font-mono text-amber-400 print:text-neutral-800">{item.testType?.standard}</td>
                        <td className="py-2 text-right font-mono text-white print:text-black">
                          K{Number(item.unitPrice).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-neutral-800 print:border-neutral-400 font-bold">
                      <td colSpan={3} className="py-3 text-right text-neutral-400 print:text-neutral-700">
                        Total Estimated Fee (inc. 3% Quality Surcharge):
                      </td>
                      <td className="py-3 text-right font-mono text-amber-400 print:text-black text-base font-black">
                        PGK K{Number(receipt.estimatedCost || totalCost).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Instructions on Physical Delivery */}
              <div className="p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800 print:bg-neutral-50 print:border-neutral-300 text-xs space-y-2">
                <h5 className="font-bold text-amber-400 print:text-black uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Next Steps for Physical Specimen Delivery
                </h5>
                <ol className="list-decimal list-inside space-y-1 text-neutral-300 print:text-neutral-800">
                  <li>Securely pack and clearly tag your physical specimens with Reference: <strong>{receipt.requestNumber}</strong>.</li>
                  <li>Deliver specimens to the Central Materials Testing Laboratory at 4-Mile, Hubert Murray Highway, Port Moresby.</li>
                  <li>Present this confirmation receipt at the specimen intake desk for barcode labeling and chain-of-custody entry.</li>
                </ol>
              </div>

              {/* Signatures Strip */}
              <div className="pt-8 border-t border-neutral-800 print:border-neutral-300 grid grid-cols-2 gap-8 text-xs text-neutral-400 print:text-black">
                <div className="border-t border-dashed border-neutral-700 print:border-neutral-400 pt-2 text-center">
                  <span className="block font-semibold">Client Representative Signature</span>
                  <span className="text-[10px] text-neutral-500">Date: _______________</span>
                </div>
                <div className="border-t border-dashed border-neutral-700 print:border-neutral-400 pt-2 text-center">
                  <span className="block font-semibold">DoW Sample Receiving Officer</span>
                  <span className="text-[10px] text-neutral-500">Stamp &amp; Verification</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 print:hidden">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setReceipt(null);
                  setSelectedTestIds([]);
                }}
                className="px-5 py-2.5 rounded-xl border border-neutral-800 text-xs font-semibold text-neutral-300 hover:bg-neutral-800"
              >
                Submit Another Request
              </button>

              <Link
                href="/"
                className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition-all"
              >
                Return to Laboratory Homepage
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
