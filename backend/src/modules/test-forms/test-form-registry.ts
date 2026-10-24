import path from 'path';
import fs from 'fs';

export interface FormTemplateInfo {
  testCode: string;
  hasTemplate: boolean;
  templateFiles: string[]; // relative to reference-templates/test_forms
  formNumber?: string;
  standard: string;
  category: string;
  name: string;
  notes?: string;
}

// Absolute base directory for read-only reference templates
export function getReferenceTemplatesBaseDir(): string {
  if (process.env.REFERENCE_TEMPLATES_DIR && fs.existsSync(process.env.REFERENCE_TEMPLATES_DIR)) {
    return process.env.REFERENCE_TEMPLATES_DIR;
  }
  const candidates = [
    path.resolve(process.cwd(), 'reference-templates/test_forms'),
    path.resolve(process.cwd(), '../reference-templates/test_forms'),
    path.resolve(__dirname, '../../../../reference-templates/test_forms'),
    path.resolve(__dirname, '../../../reference-templates/test_forms'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return path.resolve(process.cwd(), 'reference-templates/test_forms');
}

/**
 * Exact, verified mapping between DoW MS Test Catalogue codes and
 * the official read-only PDF templates in reference-templates/test_forms.
 */
export const TEST_FORM_REGISTRY: Record<string, FormTemplateInfo> = {
  // ==================== AGGREGATES (15/15 MATCHED) ====================
  AGGREGATE_TEST: {
    testCode: 'AGGREGATE_TEST',
    hasTemplate: true,
    templateFiles: ['AGGREGATE/Form A_23 LA.pdf'],
    formNumber: 'Form A_23',
    standard: 'AS 1141.23',
    category: 'Aggregates',
    name: 'Los Angeles Abrasion Loss (LA Value)',
  },
  AGG_ACV: {
    testCode: 'AGG_ACV',
    hasTemplate: true,
    templateFiles: ['AGGREGATE/Form A_21 ACV.pdf'],
    formNumber: 'Form A_21',
    standard: 'AS 1141.21',
    category: 'Aggregates',
    name: 'Aggregate Crushing Value (ACV - Two Tests)',
  },
  AGG_ALD_5_7: {
    testCode: 'AGG_ALD_5_7',
    hasTemplate: true,
    templateFiles: ['AGGREGATE/Form A_20.2 ALD5_7.pdf'],
    formNumber: 'Form A_20.2',
    standard: 'AS 1141.20.2',
    category: 'Aggregates',
    name: 'Average Least Dimension of Fine Aggregates (5mm - 7mm)',
  },
  AGG_ALD_GT10: {
    testCode: 'AGG_ALD_GT10',
    hasTemplate: true,
    templateFiles: ['AGGREGATE/Form A_20.1 ALD10.pdf'],
    formNumber: 'Form A_20.1',
    standard: 'AS 1141.20.1',
    category: 'Aggregates',
    name: 'Average Least Dimension of Coarse Aggregates (> 10mm)',
  },
  AGG_BULK_DENSITY: {
    testCode: 'AGG_BULK_DENSITY',
    hasTemplate: true,
    templateFiles: ['AGGREGATE/Form A_4 BD.pdf'],
    formNumber: 'Form A_4',
    standard: 'AS 1141.4',
    category: 'Aggregates',
    name: 'Bulk Density of Aggregate (Compacted & Uncompacted)',
  },
  AGG_CRUSHED_PART: {
    testCode: 'AGG_CRUSHED_PART',
    hasTemplate: true,
    templateFiles: ['AGGREGATE/Form A_18.CP.pdf'],
    formNumber: 'Form A_18.CP',
    standard: 'AS 1141.18',
    category: 'Aggregates',
    name: 'Crushed Particles in Coarse Aggregate',
  },
  AGG_FLAKINESS: {
    testCode: 'AGG_FLAKINESS',
    hasTemplate: true,
    templateFiles: ['AGGREGATE/Form A_15 FI.pdf'],
    formNumber: 'Form A_15',
    standard: 'AS 1141.15',
    category: 'Aggregates',
    name: 'Flakiness Index of Aggregate',
  },
  AGG_FRACTURE_FACES: {
    testCode: 'AGG_FRACTURE_FACES',
    hasTemplate: true,
    templateFiles: ['AGGREGATE/Form A_G6.2 FF.pdf'],
    formNumber: 'Form A_G6.2',
    standard: 'DoW Specs 6.2.4(e)',
    category: 'Aggregates',
    name: 'Fractured Faces in Crushed Aggregate',
  },
  AGG_MINUS_75UM: {
    testCode: 'AGG_MINUS_75UM',
    hasTemplate: true,
    templateFiles: ['AGGREGATE/Form A_12 MF.pdf'],
    formNumber: 'Form A_12',
    standard: 'AS 1141.12',
    category: 'Aggregates',
    name: 'Materials Finer than 75um by Washing',
  },
  AGG_PARTICLE_SHAPE: {
    testCode: 'AGG_PARTICLE_SHAPE',
    hasTemplate: true,
    templateFiles: ['AGGREGATE/Form A_14 PS.pdf'],
    formNumber: 'Form A_14',
    standard: 'AS 1141.14',
    category: 'Aggregates',
    name: 'Particle Shape by Proportional Calliper',
  },
  AGG_PSD_DRY: {
    testCode: 'AGG_PSD_DRY',
    hasTemplate: true,
    templateFiles: ['AGGREGATE/Form A_11 PSD.pdf'],
    formNumber: 'Form A_11',
    standard: 'AS 1141.11.1',
    category: 'Aggregates',
    name: 'Particle Size Distribution - Aggregates (Dry Sieving)',
  },
  AGG_SULPHATE_SOUNDNESS: {
    testCode: 'AGG_SULPHATE_SOUNDNESS',
    hasTemplate: true,
    templateFiles: ['AGGREGATE/Form A_24 SS_CA.pdf', 'AGGREGATE/Form A_24 SS-FA.pdf'],
    formNumber: 'Form A_24',
    standard: 'AS 1141.24',
    category: 'Aggregates',
    name: 'Sodium Sulphate Soundness Test (Coarse & Fine)',
    notes: 'Includes both Coarse Aggregate (SS_CA) and Fine Aggregate (SS-FA) worksheets',
  },
  AGG_WEAK_PARTICLES: {
    testCode: 'AGG_WEAK_PARTICLES',
    hasTemplate: true,
    templateFiles: ['AGGREGATE/Form A_32 WP.pdf'],
    formNumber: 'Form A_32',
    standard: 'AS 1141.32',
    category: 'Aggregates',
    name: 'Weak Particles (Clay Lumps, Soft & Friable Particles)',
  },
  AGG_WET_DRY: {
    testCode: 'AGG_WET_DRY',
    hasTemplate: true,
    templateFiles: ['AGGREGATE/Form A_22 WD.pdf'],
    formNumber: 'Form A_22',
    standard: 'AS 1141.22',
    category: 'Aggregates',
    name: 'Wet / Dry Strength Variation / 10% Fines Value',
  },
  SPECIFIC_GRAVITY: {
    testCode: 'SPECIFIC_GRAVITY',
    hasTemplate: true,
    templateFiles: ['AGGREGATE/Form A_5 PDWA.pdf'],
    formNumber: 'Form A_5',
    standard: 'AS 1141.5 & AS 1141.6.1',
    category: 'Aggregates',
    name: 'Particle Density & Water Absorption (Fine & Coarse)',
  },

  // ==================== CONCRETE (4 MATCHED, 2 LABEL FALLBACK) ====================
  CONCRETE_CYLINDER: {
    testCode: 'CONCRETE_CYLINDER',
    hasTemplate: true,
    templateFiles: ['CONCRETE/Form C_9 CSC.pdf'],
    formNumber: 'Form C-9',
    standard: 'AS 1012.9',
    category: 'Concrete',
    name: 'Compressive Strength & Density of Concrete Cylinders',
  },
  CONCRETE_MASONRY: {
    testCode: 'CONCRETE_MASONRY',
    hasTemplate: true,
    templateFiles: ['CONCRETE/Form M_4 CSM.pdf'],
    formNumber: 'Form CM-4',
    standard: 'AS/NZS 4456.4',
    category: 'Concrete',
    name: 'Compressive Strength of Concrete Masonry Units (Blocks)',
    notes: 'Header specifies AS/NZS 4456.4 compressive strength with 4456.3 direct area measurement',
  },
  CONC_PAVER_BREAK: {
    testCode: 'CONC_PAVER_BREAK',
    hasTemplate: true,
    templateFiles: ['CONCRETE/Form CP_5 BLCP.pdf'],
    formNumber: 'Form CP-5',
    standard: 'AS/NZS 4456.5',
    category: 'Concrete',
    name: 'Breaking Load of Concrete Paver Blocks',
  },
  CONC_SLUMP: {
    testCode: 'CONC_SLUMP',
    hasTemplate: true,
    templateFiles: ['FIELD/Form C_1 CS_ST.pdf', 'FIELD/Form C_1 CS_CL.pdf'],
    formNumber: 'Form C_1',
    standard: 'AS 1012.1 & AS 1012.3.1',
    category: 'Concrete',
    name: 'Slump Test & Sampling of Fresh Concrete',
    notes: 'Includes both field slump testing worksheet (CS_ST) and specimen identification labels (CS_CL)',
  },
  CONC_FLEXURAL_RUPTURE: {
    testCode: 'CONC_FLEXURAL_RUPTURE',
    hasTemplate: false,
    templateFiles: [],
    standard: 'AS 1012.11',
    category: 'Concrete',
    name: 'Modulus of Rupture (Flexural Strength of Concrete)',
    notes: 'No official PDF template in archive. Printable QR tracking label provided.',
  },
  CONC_INDIRECT_TENSILE: {
    testCode: 'CONC_INDIRECT_TENSILE',
    hasTemplate: false,
    templateFiles: [],
    standard: 'AS 1012.10',
    category: 'Concrete',
    name: 'Indirect Tensile Strength of Concrete Cylinders',
    notes: 'No official PDF template in archive. Printable QR tracking label provided.',
  },

  // ==================== FIELD (3 MATCHED [4 TESTS], 3 LABEL FALLBACK) ====================
  DCP_TEST: {
    testCode: 'DCP_TEST',
    hasTemplate: true,
    templateFiles: ['FIELD/Form GI_6.3.2E DCP.pdf'],
    formNumber: 'Form GI-6.3.2E',
    standard: 'AS 1289.6.3.2',
    category: 'Field',
    name: 'Dynamic Cone Penetrometer (DCP) Test (9kg Extendable)',
  },
  DCP_FOUNDATION: {
    testCode: 'DCP_FOUNDATION',
    hasTemplate: true,
    templateFiles: ['FIELD/Form GI_6.3.2E DCP.pdf'],
    formNumber: 'Form GI-6.3.2E',
    standard: 'AS 1289.6.3.2',
    category: 'Field',
    name: 'Dynamic Cone Penetrometer (DCP) Test (Foundation)',
  },
  SAND_REPLACEMENT: {
    testCode: 'SAND_REPLACEMENT',
    hasTemplate: true,
    templateFiles: ['FIELD/Form S_5.3.1 SRT.pdf'],
    formNumber: 'Form S_5.3.1',
    standard: 'AS 1289.5.3.1',
    category: 'Field',
    name: 'Field Density by Sand Replacement Method (SRT)',
  },
  BENKELMAN_BEAM: {
    testCode: 'BENKELMAN_BEAM',
    hasTemplate: false,
    templateFiles: [],
    standard: 'Q701-1978',
    category: 'Field',
    name: 'Benkelman Beam Deflection Test (Pavement Deflection)',
    notes: 'No official PDF template in archive. Printable QR tracking label provided.',
  },
  FIELD_DENSITY_NUCLEAR: {
    testCode: 'FIELD_DENSITY_NUCLEAR',
    hasTemplate: false,
    templateFiles: [],
    standard: 'AS 1289.5.8.1',
    category: 'Field',
    name: 'Field Density Test (Nuclear Moisture-Density Gauge)',
    notes: 'No official PDF template in archive. Printable QR tracking label provided.',
  },
  SCHMIDT_HAMMER: {
    testCode: 'SCHMIDT_HAMMER',
    hasTemplate: false,
    templateFiles: [],
    standard: 'AS 1012.14',
    category: 'Field',
    name: 'Schmidt Rebound Hammer Hardness on Hardened Concrete',
    notes: 'No official PDF template in archive. Printable QR tracking label provided.',
  },

  // ==================== ROCK (1/1 MATCHED) ====================
  POINT_LOAD: {
    testCode: 'POINT_LOAD',
    hasTemplate: true,
    templateFiles: ['ROCK/Form GI_PTLoad .pdf'],
    formNumber: 'Form GI_PTLoad',
    standard: 'IS 8764 & ASTM D5731',
    category: 'Rock',
    name: 'Point Load Strength Index of Rock Specimen (Is50)',
  },

  // ==================== SOILS (9 MATCHED, 4 LABEL FALLBACK) ====================
  ATTERBERG_LIMITS: {
    testCode: 'ATTERBERG_LIMITS',
    hasTemplate: true,
    templateFiles: ['SOILS/Form S_3.1.1 AL.pdf'],
    formNumber: 'Form S_3.1.1',
    standard: 'AS 1289.3.1.1, 3.2.1, 3.3.1, 3.4.1',
    category: 'Soils',
    name: 'Atterberg Limits & Linear Shrinkage (LL, PL, PI, LS)',
  },
  CBR_TEST: {
    testCode: 'CBR_TEST',
    hasTemplate: true,
    templateFiles: ['SOILS/Form S_6.1.1 CBR p1.pdf', 'SOILS/Form S_6.1.1 CBR p2.pdf'],
    formNumber: 'Form S_6.1.1',
    standard: 'AS 1289.6.1.1',
    category: 'Soils',
    name: 'California Bearing Ratio (CBR) - Standard 4-Day Soaked',
    notes: '2-page complete official test worksheet (Page 1 + Page 2)',
  },
  CBR_UNSOAKED: {
    testCode: 'CBR_UNSOAKED',
    hasTemplate: true,
    templateFiles: ['SOILS/Form S_6.1.1 CBR p1.pdf', 'SOILS/Form S_6.1.1 CBR p2.pdf'],
    formNumber: 'Form S_6.1.1',
    standard: 'AS 1289.6.1.1',
    category: 'Soils',
    name: 'California Bearing Ratio (CBR) - Remoulded Unsoaked',
    notes: '2-page complete official test worksheet (Page 1 + Page 2)',
  },
  CONE_LIQUID_LIMIT: {
    testCode: 'CONE_LIQUID_LIMIT',
    hasTemplate: true,
    templateFiles: ['SOILS/Form S_3.9 CL.pdf'],
    formNumber: 'Form S_3.9',
    standard: 'AS 1289.3.9, 3.3.1, 3.3.2',
    category: 'Soils',
    name: 'Cone Liquid Limit & Linear Shrinkage',
  },
  MOD_COMPACTION: {
    testCode: 'MOD_COMPACTION',
    hasTemplate: true,
    templateFiles: ['SOILS/Form S_5.1.1 MC_DD.pdf'],
    formNumber: 'Form S_5.1.1',
    standard: 'AS 1289.5.2.1',
    category: 'Soils',
    name: 'Dry Density / Moisture Relationship (Modified Compaction)',
  },
  PROCTOR_COMPACTION: {
    testCode: 'PROCTOR_COMPACTION',
    hasTemplate: true,
    templateFiles: ['SOILS/Form S_5.1.1 MC_DD.pdf'],
    formNumber: 'Form S_5.1.1',
    standard: 'AS 1289.5.1.1',
    category: 'Soils',
    name: 'Dry Density / Moisture Relationship (Standard Compaction)',
  },
  SIEVE_ANALYSIS: {
    testCode: 'SIEVE_ANALYSIS',
    hasTemplate: true,
    templateFiles: ['SOILS/Form S_3.6.1 PSD.pdf'],
    formNumber: 'Form S_3.6.1',
    standard: 'AS 1289.3.6.1 & AS 1141.11.1',
    category: 'Soils',
    name: 'Particle Size Distribution (Dry / Wet Sieving)',
  },
  SOIL_MOISTURE: {
    testCode: 'SOIL_MOISTURE',
    hasTemplate: true,
    templateFiles: ['SOILS/Form S_2.1.1 MC.pdf'],
    formNumber: 'Form S_2.1.1',
    standard: 'AS 1289.2.1.1 & 2.1.4',
    category: 'Soils',
    name: 'Moisture Content Determination',
    notes: 'Uses official Form S_2.1.1 MC.pdf (MC.pdf is an empty placeholder)',
  },
  SOIL_PARTICLE_DENSITY: {
    testCode: 'SOIL_PARTICLE_DENSITY',
    hasTemplate: true,
    templateFiles: ['SOILS/Form S_3.5.1 SPD.pdf'],
    formNumber: 'Form S_3.5.1',
    standard: 'AS 1289.3.5.1',
    category: 'Soils',
    name: 'Soil Particle Density of a Soil',
  },
  CONSOLIDATION_TEST: {
    testCode: 'CONSOLIDATION_TEST',
    hasTemplate: false,
    templateFiles: [],
    standard: 'AS 1289.6.6.1',
    category: 'Soils',
    name: 'One-Dimensional Consolidation Properties',
    notes: 'No official PDF template in archive. Printable QR tracking label provided.',
  },
  PSD_HYDROMETER: {
    testCode: 'PSD_HYDROMETER',
    hasTemplate: false,
    templateFiles: [],
    standard: 'AS 1289.3.6.3',
    category: 'Soils',
    name: 'Particle Size Distribution - Hydrometer Analysis',
    notes: 'No official PDF template in archive. Printable QR tracking label provided.',
  },
  SHRINK_SWELL_INDEX: {
    testCode: 'SHRINK_SWELL_INDEX',
    hasTemplate: false,
    templateFiles: [],
    standard: 'AS 1289.7.1.1',
    category: 'Soils',
    name: 'Shrink-Swell Index of Soil',
    notes: 'No official PDF template in archive. Printable QR tracking label provided.',
  },
  SOIL_PERMEABILITY: {
    testCode: 'SOIL_PERMEABILITY',
    hasTemplate: false,
    templateFiles: [],
    standard: 'AS 1289.6.7.1 / .2',
    category: 'Soils',
    name: 'Soil Permeability Test (Constant / Falling Head)',
    notes: 'No official PDF template in archive. Printable QR tracking label provided.',
  },
};

export function getFormTemplateInfo(testCode: string): FormTemplateInfo | null {
  return TEST_FORM_REGISTRY[testCode] || null;
}
