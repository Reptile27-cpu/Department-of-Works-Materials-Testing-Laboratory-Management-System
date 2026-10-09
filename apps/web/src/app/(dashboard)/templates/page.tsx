'use client';

import { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  FileText,
  CheckCircle2,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Calculator,
} from 'lucide-react';

interface TemplateDoc {
  id: string;
  formNumber: string;
  title: string;
  standard: string;
  material: string;
  description: string;
  requiredInputs: string[];
  calculatedOutputs: string[];
  referenceFile: string;
}

const TEMPLATES: TemplateDoc[] = [
  {
    id: 'str-1',
    formNumber: 'Form No. STR 1',
    title: 'Soils Test Report',
    standard: 'AS 1289 (Methods of testing soils for engineering purposes)',
    material: 'Soils / Subgrade / Gravel',
    description:
      'Official report for moisture content, particle size distribution (sieve analysis), liquid limit, plastic limit, plasticity index, linear shrinkage, standard compaction, and 4-day soaked California Bearing Ratio (CBR).',
    requiredInputs: [
      'Moisture tin tare mass & wet soil mass (g)',
      'Dry soil mass after 105°C oven drying (g)',
      'Cumulative mass retained on 75mm to 0.075mm sieves (g)',
      'Compaction mold volume & mass of compacted specimen (g)',
      'CBR penetration force gauge readings (kN)',
    ],
    calculatedOutputs: [
      'Moisture Content (%)',
      'Percent Passing Each Sieve Size (%)',
      'Liquid Limit (LL), Plastic Limit (PL), Plasticity Index (PI)',
      'Maximum Dry Density (MDD in t/m³)',
      'Optimum Moisture Content (OMC in %)',
      'CBR at 2.5mm and 5.0mm penetration (%)',
    ],
    referenceFile: 'Form No. STR 1_ Soils Test Report 10_02_23.xlsx',
  },
  {
    id: 'atr-1',
    formNumber: 'Form No. ATR 1',
    title: 'Aggregate Test Report',
    standard: 'AS 1141 (Methods for sampling and testing aggregates)',
    material: 'Coarse Aggregate / Fine Aggregate / Crushed Rock',
    description:
      'Official report for aggregate grading, flakiness index, aggregate crushing value (ACV), 10% fines value (TFV), Los Angeles abrasion value, water absorption, and particle density.',
    requiredInputs: [
      'Total sample mass (kg)',
      'Mass passing slotted sieves for flakiness (g)',
      'Crushing cylinder load reading (kN)',
      'Oven dry mass and saturated surface-dry mass (g)',
    ],
    calculatedOutputs: [
      'Gradation curves & uniformity coefficient (Cu, Cc)',
      'Flakiness Index (%)',
      'Aggregate Crushing Value (%)',
      'Ten Percent Fines Value (kN)',
      'Los Angeles Abrasion Loss (%)',
    ],
    referenceFile: 'Form No. ATR 1_ Aggregate Test Report 10_02_2023 .xlsx',
  },
  {
    id: 'cctr-1',
    formNumber: 'Form No. CCTR 1',
    title: 'Concrete Cylinder Test Report',
    standard: 'AS 1012.9 (Compressive strength tests - Concrete, mortar and grout)',
    material: 'Concrete Cylinders / Core Samples',
    description:
      'Official report for compressive strength testing of standard 100mm and 150mm diameter concrete cylinders at 7, 14, and 28 days of curing.',
    requiredInputs: [
      'Cylinder diameter & height (mm)',
      'Mass of specimen (g)',
      'Curing condition & age (days)',
      'Maximum applied load at failure (kN)',
    ],
    calculatedOutputs: [
      'Cross-sectional area (mm²)',
      'Specimen density (kg/m³)',
      'Compressive Strength (MPa)',
      'Fracture pattern classification',
    ],
    referenceFile: 'Form No. CCTR 1 _Concrete Cylinder Test Report.xlsx',
  },
  {
    id: 'mctr-1',
    formNumber: 'Form No. MCTR 1',
    title: 'Moisture Content Determination Register',
    standard: 'AS 1289.2.1.1',
    material: 'All Earth & Aggregate Materials',
    description:
      'Bench worksheet for multi-trial oven-drying determination of soil and granular material moisture contents.',
    requiredInputs: [
      'Container ID & Tare mass (M1 in g)',
      'Mass of container + wet sample (M2 in g)',
      'Mass of container + dry sample (M3 in g)',
    ],
    calculatedOutputs: [
      'Mass of moisture: M2 - M3 (g)',
      'Mass of dry soil: M3 - M1 (g)',
      'Moisture Content: [(M2 - M3) / (M3 - M1)] × 100 (%)',
    ],
    referenceFile: 'Form No. MCTR 1 _ Moisture Content 10_02_2023.xlsx',
  },
  {
    id: 'qt-01',
    formNumber: 'Form QT-01',
    title: 'Laboratory Testing Quotation & Rate Schedule',
    standard: 'PNG Public Finances Act / DoW Tariffs',
    material: 'Financial & Contractual Document',
    description:
      'Official commercial quotation with statutory 3.0% administrative surcharge, mobilization rates, testing itemization, and validity terms.',
    requiredInputs: [
      'Client name & Project reference',
      'Selected test methods & quantities',
      'Rate schedule type (public vs private)',
    ],
    calculatedOutputs: [
      'Itemized testing totals (PGK)',
      'Subtotal (PGK)',
      'Administrative Surcharge 3% (PGK)',
      'Grand Total (PGK)',
    ],
    referenceFile: 'DoW_Testing_Quotation_Form_QT01.xlsx',
  },
];

export default function TemplatesRegisterPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDoc>(TEMPLATES[0]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-wider">
            <FileSpreadsheet className="w-4 h-4" /> Laboratory Quality Management
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            Reference Templates & Official Forms Register
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Accredited DoW calculation workbooks, report templates, and standard form definitions
          </p>
        </div>

        <span className="badge badge-primary text-xs self-start sm:self-auto">
          Central Materials Laboratory Standards
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List Selection */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Standard Forms Register
          </h2>

          <div className="space-y-2">
            {TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => setSelectedTemplate(tmpl)}
                className={`card p-4 cursor-pointer transition-all border ${
                  selectedTemplate.id === tmpl.id
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'border-border hover:border-primary/40 bg-[var(--bg-primary)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">{tmpl.formNumber}</span>
                  <span className="badge badge-secondary text-[10px]">{tmpl.material}</span>
                </div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] mt-1.5">{tmpl.title}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{tmpl.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Template Specification Detail */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6 bg-[var(--bg-primary)] border border-border space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-primary font-mono text-xs">{selectedTemplate.formNumber}</span>
                  <span className="badge badge-secondary text-xs">{selectedTemplate.material}</span>
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mt-2">
                  {selectedTemplate.title}
                </h2>
                <p className="text-xs text-primary font-medium mt-0.5">{selectedTemplate.standard}</p>
              </div>
            </div>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {selectedTemplate.description}
            </p>

            {/* Inputs & Outputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-border space-y-3">
                <span className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5 uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-primary" /> Mandatory Raw Measurements
                </span>
                <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                  {selectedTemplate.requiredInputs.map((input, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>{input}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-border space-y-3">
                <span className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5 uppercase tracking-wider">
                  <Calculator className="w-4 h-4 text-success" /> Automated Mathematical Outputs
                </span>
                <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                  {selectedTemplate.calculatedOutputs.map((output, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                      <span>{output}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Quality Assurance Verification Box */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3 text-xs">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--text-primary)]">
                  Conformance with DoW Engineering Standards
                </p>
                <p className="text-[var(--text-muted)] mt-1">
                  The software calculation engine automatically matches the cell formulas from reference workbook{' '}
                  <code className="text-primary font-mono">{selectedTemplate.referenceFile}</code> located in{' '}
                  <code className="text-[var(--text-secondary)]">reference-templates/reports/</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

