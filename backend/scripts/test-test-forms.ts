import fs from 'fs';
import path from 'path';
import {
  TEST_FORM_REGISTRY,
  getReferenceTemplatesBaseDir,
} from '../src/modules/test-forms/test-form-registry';
import {
  TestFormGeneratorService,
  TestFormContext,
} from '../src/modules/test-forms/test-form-generator.service';

async function main() {
  console.log('===============================================================');
  console.log('   TESTING TEST FORM REGISTRY AND GENERATION PIPELINE          ');
  console.log('===============================================================\n');

  // 1. Verify physical files on disk for all registry entries
  const baseDir = getReferenceTemplatesBaseDir();
  console.log(`Base templates directory: ${baseDir}`);
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Templates directory does not exist: ${baseDir}`);
  }

  let totalMapped = 0;
  let availableCount = 0;
  let missingTemplateCount = 0;
  let missingFilesOnDisk: string[] = [];

  for (const [code, info] of Object.entries(TEST_FORM_REGISTRY)) {
    totalMapped++;
    if (info.hasTemplate) {
      availableCount++;
      for (const rel of info.templateFiles) {
        const full = path.resolve(baseDir, rel);
        if (!fs.existsSync(full)) {
          missingFilesOnDisk.push(`${code}: ${rel}`);
        }
      }
    } else {
      missingTemplateCount++;
    }
  }

  console.log(`✓ Total registry entries: ${totalMapped}`);
  console.log(`✓ With available templates: ${availableCount}`);
  console.log(`✓ With fallback label only: ${missingTemplateCount}`);
  if (missingFilesOnDisk.length > 0) {
    console.error('❌ Missing physical template files on disk:', missingFilesOnDisk);
    process.exit(1);
  } else {
    console.log('✓ All 32 template files exist and are verified on disk!\n');
  }

  const outDir = path.resolve(__dirname, '../../scratch/verification_pdfs');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const sampleCtx: TestFormContext['sample'] = {
    id: 'f87e2210-9999-4444-8888-abcdef123456',
    sampleNumber: '26P-S-099',
    qrToken: 'qr-custody-token-777',
    materialType: 'Subbase Aggregate / Soil',
    description: 'Highlands culvert bed verification material',
    sourceLocation: 'Kassam Pit 3',
    storageLocation: 'Bin C-04',
    dateReceived: new Date(),
    dateSampled: new Date(),
  };

  const reqCtx: TestFormContext['request'] = {
    id: 'req-uuid-1111',
    requestNumber: 'RQ-2026-0999',
    clientName: 'Highlands Highway JV Contractors',
    projectName: 'Highlands Highway Section 4B',
    location: 'Kassam Pass Chainage 24+500',
  };

  // Test Case A: Single Portrait Form (AGG_PSD_DRY)
  console.log('--- Test Case A: Portrait Form (AGG_PSD_DRY) ---');
  const ctxA: TestFormContext = {
    sample: sampleCtx,
    request: reqCtx,
    test: {
      id: 'test-uuid-a',
      testNumber: 'TST-2026-0101',
      status: 'assigned',
      testType: {
        code: 'AGG_PSD_DRY',
        name: 'Particle Size Distribution - Aggregates (Dry Sieving)',
        standard: 'AS 1141.11.1',
        category: 'Aggregates',
      },
      technician: { firstName: 'Tom', lastName: 'Technician', designation: 'Materials Tech' },
    },
  };
  const resA = await TestFormGeneratorService.generateTestFormPdf(ctxA);
  const pathA = path.join(outDir, '01_Portrait_AGG_PSD_DRY.pdf');
  fs.writeFileSync(pathA, resA.buffer);
  console.log(`✓ Saved: ${pathA} (${resA.buffer.length} bytes, hasTemplate: ${resA.hasTemplate})`);

  // Test Case B: Landscape Form (CONCRETE_CYLINDER)
  console.log('\n--- Test Case B: Landscape Form (CONCRETE_CYLINDER) ---');
  const ctxB: TestFormContext = {
    sample: sampleCtx,
    request: reqCtx,
    test: {
      id: 'test-uuid-b',
      testNumber: 'TST-2026-0102',
      status: 'in_progress',
      testType: {
        code: 'CONCRETE_CYLINDER',
        name: 'Compressive Strength & Density of Concrete Cylinders',
        standard: 'AS 1012.9',
        category: 'Concrete',
      },
      technician: { firstName: 'Sarah', lastName: 'Engineer', designation: 'Senior Tech' },
    },
  };
  const resB = await TestFormGeneratorService.generateTestFormPdf(ctxB);
  const pathB = path.join(outDir, '02_Landscape_CONCRETE_CYLINDER.pdf');
  fs.writeFileSync(pathB, resB.buffer);
  console.log(`✓ Saved: ${pathB} (${resB.buffer.length} bytes, hasTemplate: ${resB.hasTemplate})`);

  // Test Case C: Multipage Form (CBR_TEST, Page 1 + Page 2)
  console.log('\n--- Test Case C: Multipage Form (CBR_TEST, 2 Pages) ---');
  const ctxC: TestFormContext = {
    sample: sampleCtx,
    request: reqCtx,
    test: {
      id: 'test-uuid-c',
      testNumber: 'TST-2026-0103',
      status: 'pending',
      testType: {
        code: 'CBR_TEST',
        name: 'California Bearing Ratio (CBR) - Standard 4-Day Soaked',
        standard: 'AS 1289.6.1.1',
        category: 'Soils',
      },
    },
  };
  const resC = await TestFormGeneratorService.generateTestFormPdf(ctxC);
  const pathC = path.join(outDir, '03_Multipage_CBR_TEST.pdf');
  fs.writeFileSync(pathC, resC.buffer);
  console.log(`✓ Saved: ${pathC} (${resC.buffer.length} bytes, hasTemplate: ${resC.hasTemplate})`);

  // Test Case D: Missing Template (CONC_FLEXURAL_RUPTURE -> Printable QR Label)
  console.log('\n--- Test Case D: Missing Template (CONC_FLEXURAL_RUPTURE) ---');
  const ctxD: TestFormContext = {
    sample: sampleCtx,
    request: reqCtx,
    test: {
      id: 'test-uuid-d',
      testNumber: 'TST-2026-0104',
      status: 'pending',
      testType: {
        code: 'CONC_FLEXURAL_RUPTURE',
        name: 'Modulus of Rupture (Flexural Strength of Concrete)',
        standard: 'AS 1012.11',
        category: 'Concrete',
      },
    },
  };
  const resD = await TestFormGeneratorService.generateTestFormPdf(ctxD);
  const pathD = path.join(outDir, '04_Fallback_Label_CONC_FLEXURAL_RUPTURE.pdf');
  fs.writeFileSync(pathD, resD.buffer);
  console.log(`✓ Saved: ${pathD} (${resD.buffer.length} bytes, hasTemplate: ${resD.hasTemplate})`);

  // Test Case E: Sample Test Forms Bundle (All 4 tests in 1 PDF document)
  console.log('\n--- Test Case E: Sample Bundle Packet (All 4 Tests Combined) ---');
  const bundleRes = await TestFormGeneratorService.generateSampleBundlePdf(
    sampleCtx,
    reqCtx,
    [ctxA.test, ctxB.test, ctxC.test, ctxD.test]
  );
  const pathBundle = path.join(outDir, '05_Consolidated_Sample_Bundle.pdf');
  fs.writeFileSync(pathBundle, bundleRes.buffer);
  console.log(`✓ Saved Bundle: ${pathBundle} (${bundleRes.buffer.length} bytes, totalForms: ${bundleRes.totalForms})`);

  console.log('\n✅ All test form generation tests completed successfully!');
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
