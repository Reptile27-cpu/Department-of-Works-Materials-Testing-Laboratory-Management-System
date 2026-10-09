'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Building2,
  Layers,
  MapPin,
  Calendar,
  FlaskConical,
  DollarSign,
  Printer,
  Search,
  Clock,
  ShieldCheck,
  Send,
  Loader2,
} from 'lucide-react';

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
  id: string;
  requestNumber: string;
  createdAt: string;
  client?: { name: string; contactPerson?: string; phone?: string; email?: string };
  project?: { name: string; location?: string };
  sampleCategory?: string;
  sampleDescription?: string;
  priority?: string;
  estimatedCost?: number;
  requestItems?: Array<{
    id: string;
    unitPrice: number;
    testType?: { name: string; standard: string; code: string };
  }>;
}

export default function NewRequestPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [categories, setCategories] = useState<Record<string, TestTypeItem[]>>({});
  const [loadingCatalogue, setLoadingCatalogue] = useState(true);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);

  // Form State
  const [clientType, setClientType] = useState<'private' | 'public'>('private');
  const [clientName, setClientName] = useState(
    user?.role === 'client' ? `${user.firstName} ${user.lastName}` : 'Highlands Highway JV Contractors'
  );
  const [contactPerson, setContactPerson] = useState(
    user?.role === 'client' ? `${user.firstName} ${user.lastName}` : 'Kila Vagi'
  );
  const [phone, setPhone] = useState('+675 7123 4567');
  const [email, setEmail] = useState(user?.email || 'client@highlands.com.pg');
  const [address, setAddress] = useState('Port Moresby, Papua New Guinea');

  const [projectName, setProjectName] = useState('Highlands Highway Rehabilitation — Section 4B');
  const [projectLocation, setProjectLocation] = useState('Kassam Pass, Eastern Highlands');
  const [poNumber, setPoNumber] = useState('PO-2026-DOW-091');

  const [sampleCategory, setSampleCategory] = useState('Soils');
  const [materialType, setMaterialType] = useState('Subgrade Soil / Crushed Granular Base');
  const [sampleDescription, setSampleDescription] = useState(
    'Subgrade soil sample retrieved at Chainage 24+500 for compaction and CBR verification.'
  );
  const [sampleQuantity, setSampleQuantity] = useState('2 bags (approx 50kg)');
  const [materialSource, setMaterialSource] = useState('Borrow Pit Km 22');
  const [samplingDepth, setSamplingDepth] = useState('0.5m - 1.2m');
  const [dateSampled, setDateSampled] = useState(new Date().toISOString().split('T')[0]);
  const [sampledBy, setSampledBy] = useState('J. Kaupa (Field Tech)');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [remarks, setRemarks] = useState('Urgent turnaround required for bridge abutment fill compliance.');

  // Test Selection State
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SubmittedReceipt | null>(null);

  // Load test catalogue from API
  useEffect(() => {
    async function fetchCatalogue() {
      try {
        setLoadingCatalogue(true);
        const res = await api.get('/requests/public/categories');
        const data = res.data?.data?.categories || {};
        setCategories(data);

        // Pre-select 3 standard tests for convenience
        const all = Object.values(data).flat() as TestTypeItem[];
        if (all.length > 0) {
          const preselected = all.slice(0, 3).map((t) => t.id);
          setSelectedTestIds(preselected);
        }
      } catch (err) {
        console.error('Failed to load test catalogue:', err);
        setCatalogueError('Unable to load standard testing catalogue.');
      } finally {
        setLoadingCatalogue(false);
      }
    }
    fetchCatalogue();
  }, []);

  const allTests: TestTypeItem[] = Object.values(categories).flat();

  const toggleTest = (id: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // Pricing calculations
  const selectedTests = allTests.filter((t) => selectedTestIds.includes(t.id));
  const subtotal = selectedTests.reduce((acc, t) => {
    const price = clientType === 'public' ? Number(t.unitPricePublic) : Number(t.unitPricePrivate);
    return acc + (isNaN(price) ? 0 : price);
  }, 0);
  const adminSurcharge = Math.round(subtotal * 0.03 * 100) / 100;
  const totalCost = subtotal + adminSurcharge;

  // Filtered tests
  const filteredTests = allTests.filter((t) => {
    const matchesCategory =
      activeCategoryTab === 'All' ||
      t.category?.toLowerCase() === activeCategoryTab.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.standard.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoryKeys = ['All', ...Object.keys(categories)];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !projectName.trim()) {
      setSubmitError('Please provide Client Name and Project Name.');
      return;
    }
    if (!sampleDescription.trim()) {
      setSubmitError('Please provide a sample description.');
      return;
    }
    if (selectedTestIds.length === 0) {
      setSubmitError('Please select at least one laboratory test.');
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
        location: projectLocation.trim(),
        poNumber: poNumber.trim(),
        sampleCategory,
        materialType,
        sampleDescription: sampleDescription.trim(),
        sampleQuantity,
        materialSource: materialSource.trim(),
        sourceLocation: materialSource.trim(),
        samplingDepth: samplingDepth.trim(),
        dateSampled,
        samplingDate: dateSampled,
        sampledBy: sampledBy.trim(),
        priority,
        testTypeIds: selectedTestIds,
        requestedTests: selectedTests.map((t) => t.name),
        remarks: remarks.trim(),
      };

      const res = await api.post('/requests', payload);
      if (res.data?.success && res.data?.data) {
        setReceipt(res.data.data);
      } else {
        setSubmitError('Submission received but failed to parse receipt.');
      }
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'Failed to submit testing request. Please check inputs.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // If already submitted, display official receipt
  if (receipt) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/requests"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Requests List
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Receipt
          </button>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                  Testing Request Registered Successfully
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                  {receipt.requestNumber}
                </h1>
                <p className="text-xs text-slate-400">
                  Official Form RQ-LT &bull; PNG Department of Works & Highways
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Estimated Schedule Total</span>
              <span className="text-2xl font-black text-amber-400 font-mono">
                PGK K{Number(receipt.estimatedCost || totalCost).toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 block">Includes 3% admin surcharge</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Project & Proponent
              </h3>
              <div className="space-y-1.5">
                <div>
                  <span className="text-slate-500 block">Requesting Organization:</span>
                  <span className="font-semibold text-white">{clientName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Project Title:</span>
                  <span className="font-semibold text-white">{projectName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Location / Chainage:</span>
                  <span className="text-slate-300">{projectLocation}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Contact:</span>
                  <span className="text-slate-300">{contactPerson} ({phone} &bull; {email})</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Specimen Intake Details
              </h3>
              <div className="space-y-1.5">
                <div>
                  <span className="text-slate-500 block">Category & Material:</span>
                  <span className="font-semibold text-amber-400">{sampleCategory} &mdash; {materialType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Field Description:</span>
                  <span className="text-slate-300">{sampleDescription}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Source Location:</span>
                  <span className="text-slate-300">{materialSource} (Depth: {samplingDepth})</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sampled On:</span>
                  <span className="text-slate-300">{dateSampled} by {sampledBy}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scope of Tests */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Requested Laboratory Standards ({selectedTests.length} tests)
            </h3>
            <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800 bg-slate-950/40 text-xs">
              {selectedTests.map((t) => (
                <div key={t.id} className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">{t.name}</span>
                    <span className="text-[11px] text-slate-400">
                      Standard: <span className="text-amber-400 font-mono">{t.standard}</span> &bull; Code: {t.code} &bull; {t.defaultTurnaroundDays} days SLA
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-200">
                    PGK K{Number(clientType === 'public' ? t.unitPricePublic : t.unitPricePrivate).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Guidance */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
            <div className="font-bold flex items-center gap-2 text-amber-400">
              <ShieldCheck className="w-4 h-4" />
              Physical Sample Delivery & Laboratory Custody Notice
            </div>
            <p>
              Please present your official Reference ID <span className="font-mono font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded">{receipt.requestNumber}</span> when dropping off sample containers at:
            </p>
            <p className="font-semibold text-white">
              Central Materials Testing Laboratory &bull; Department of Works HQ, Boroko, Port Moresby, NCD
            </p>
            <p className="text-[11px] text-amber-300/80">
              Operating Hours: Monday &ndash; Friday 08:00 AM &ndash; 04:00 PM. A tamper-evident DoW QR tracking tag will be generated and affixed to each physical specimen upon intake.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-800">
            <Link
              href="/requests"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold text-center transition-colors"
            >
              View My Requests
            </Link>
            <Link
              href={`/requests/${receipt.id}`}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold text-center transition-all shadow-md shadow-amber-400/20"
            >
              Open Request Workspace &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/requests"
          className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Form RQ-LT: Request for Laboratory Testing
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Papua New Guinea Department of Works & Highways &bull; Central Materials Testing Laboratory
          </p>
        </div>
      </div>

      {submitError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Client & Project Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                1. Requesting Organization & Project Details
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Pricing Tier:</span>
              <select
                value={clientType}
                onChange={(e) => setClientType(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-amber-400"
              >
                <option value="private">Commercial / Private Contractor</option>
                <option value="public">Government Agency / DoW Project</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Client / Proponent Organization *
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Highlands Highway JV Contractors"
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Project Title / Works *
              </label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Highlands Highway Rehabilitation — Section 4B"
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Project Location / Chainage
              </label>
              <input
                type="text"
                value={projectLocation}
                onChange={(e) => setProjectLocation(e.target.value)}
                placeholder="e.g. Kassam Pass, Eastern Highlands"
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                PO / Reference Number
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. PO-2026-DOW-091"
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Contact Person & Phone
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Kila Vagi (+675 7123 4567)"
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Official Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. client@highlands.com.pg"
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Specimen & Sampling Specifications */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <FlaskConical className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              2. Material Sampling & Specimen Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Material Category *
              </label>
              <select
                value={sampleCategory}
                onChange={(e) => setSampleCategory(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              >
                <option value="Soils">Soils & Subgrades</option>
                <option value="Aggregates">Aggregates & Gravels</option>
                <option value="Concrete">Concrete & Mortar</option>
                <option value="Rock">Rock Core & Armour Stone</option>
                <option value="Asphalt">Bituminous / Asphalt</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Material Description *
              </label>
              <input
                type="text"
                required
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                placeholder="e.g. Crushed Rock Basecourse 20mm"
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Sample Quantity
              </label>
              <input
                type="text"
                value={sampleQuantity}
                onChange={(e) => setSampleQuantity(e.target.value)}
                placeholder="e.g. 2 bags (50kg)"
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Quarry / Borrow Pit Source
              </label>
              <input
                type="text"
                value={materialSource}
                onChange={(e) => setMaterialSource(e.target.value)}
                placeholder="e.g. Markham River Quarry / Km 22 Pit"
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Sampling Depth / Horizon
              </label>
              <input
                type="text"
                value={samplingDepth}
                onChange={(e) => setSamplingDepth(e.target.value)}
                placeholder="e.g. 0.5m - 1.2m"
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Date Sampled & Sampler Name
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateSampled}
                  onChange={(e) => setDateSampled(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
                <input
                  type="text"
                  value={sampledBy}
                  onChange={(e) => setSampledBy(e.target.value)}
                  placeholder="Sampler Name"
                  className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Field Observations & Test Objectives *
              </label>
              <textarea
                rows={2}
                required
                value={sampleDescription}
                onChange={(e) => setSampleDescription(e.target.value)}
                placeholder="Describe material grading, in-situ moisture, and proposed engineering use..."
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Select Required Tests from Official Catalogue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  3. Select Required Laboratory Tests & Fee Schedule
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Select testing procedures conforming to AS 1289 / ASTM specifications.
              </p>
            </div>
            {/* Search Filter */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search test name or standard..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:border-amber-400"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 pb-2">
            {categoryKeys.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategoryTab(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  activeCategoryTab.toLowerCase() === cat.toLowerCase()
                    ? 'bg-amber-400 text-black shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Test Cards Grid */}
          {loadingCatalogue ? (
            <div className="text-center py-8 text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              Loading testing catalogue...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredTests.map((test) => {
                const isSelected = selectedTestIds.includes(test.id);
                const price = Number(
                  clientType === 'public' ? test.unitPricePublic : test.unitPricePrivate
                );
                return (
                  <div
                    key={test.id}
                    onClick={() => toggleTest(test.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400/10 text-white'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-amber-400 border-amber-400 text-black'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-xs block truncate text-slate-100">
                          {test.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Standard: <span className="text-amber-400">{test.standard}</span> &bull; {test.defaultTurnaroundDays}d SLA
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-400 shrink-0">
                      PGK K{price.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 4: Live Running Total & Submission Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                Official Estimate Summary
              </span>
              <h3 className="text-sm font-semibold text-slate-200">
                {selectedTests.length} Laboratory Tests Selected
              </h3>
            </div>
            <div className="flex items-baseline gap-4 sm:text-right">
              <div>
                <span className="text-[10px] text-slate-400 block">Tests Subtotal</span>
                <span className="font-mono text-sm text-slate-300">PGK K{subtotal.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Admin Surcharge (3%)</span>
                <span className="font-mono text-sm text-slate-300">PGK K{adminSurcharge.toFixed(2)}</span>
              </div>
              <div className="pl-4 border-l border-slate-800">
                <span className="text-[11px] font-bold text-amber-400 block uppercase tracking-wide">
                  Total Payable
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                  PGK K{totalCost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-[11px] text-slate-500 max-w-lg">
              Upon submission, an official Department of Works Testing Request (Form RQ-LT) Reference Number will be generated. Deliver physical specimens to the Central Materials Laboratory intake counter.
            </p>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link
                href="/requests"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-center w-full sm:w-auto"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || selectedTests.length === 0}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black text-xs font-bold transition-all shadow-lg shadow-amber-400/20 w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Testing Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
