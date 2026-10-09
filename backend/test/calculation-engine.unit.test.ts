import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { LaboratoryCalculationEngine } from '../src/modules/tests/calculation-engine';

describe('Laboratory Calculation Engine', () => {
  describe('Moisture Content Determination', () => {
    test('accurately calculates moisture percentage from tare, wet, and dry masses', () => {
      const result = LaboratoryCalculationEngine.calculateMoistureContent({
        tareMass: 21.40,
        wetSoilPlusTare: 148.50,
        drySoilPlusTare: 132.80,
      });

      assert.equal(result.isValid, true);
      assert.equal(result.drySoilMass, 111.40);
      assert.equal(result.waterMass, 15.70);
      assert.equal(result.moistureContentPct, 14.09);
      assert.equal(result.units.moistureContentPct, '%');
    });

    test('flags invalid measurements (dry mass <= tare)', () => {
      const result = LaboratoryCalculationEngine.calculateMoistureContent({
        tareMass: 30.0,
        wetSoilPlusTare: 25.0,
        drySoilPlusTare: 20.0,
      });

      assert.equal(result.isValid, false);
      assert.ok(result.warnings.length > 0);
    });
  });

  describe('Sieve Analysis', () => {
    test('computes cumulative percent passing and grain distribution', () => {
      const result = LaboratoryCalculationEngine.calculateSieveAnalysis({
        totalInitialMass: 2500,
        sieveFractions: [
          { sieve: '37.5mm', massRetained: 0 },
          { sieve: '19.0mm', massRetained: 245 },
          { sieve: '9.5mm', massRetained: 520 },
          { sieve: '4.75mm', massRetained: 610 },
          { sieve: '2.36mm', massRetained: 390 },
          { sieve: '1.18mm', massRetained: 280 },
          { sieve: '0.600mm', massRetained: 195 },
          { sieve: '0.300mm', massRetained: 110 },
          { sieve: '0.150mm', massRetained: 68 },
          { sieve: '0.075mm', massRetained: 44 },
          { sieve: 'Pan', massRetained: 38 },
        ],
      });

      assert.equal(result.isValid, true);
      assert.equal(result.totalRecoveredMass, 2500);
      assert.equal(result.massLossPct, 0);
      assert.equal(result.passingCurve[0].percentPassing, 100);
      assert.ok(result.gravelPercent > 40);
      assert.ok(result.sandPercent > 30);
    });
  });

  describe('Atterberg Limits', () => {
    test('calculates LL, PL, and Plasticity Index (PI) with Casagrande trials', () => {
      const result = LaboratoryCalculationEngine.calculateAtterbergLimits({
        casagrandeTrials: [
          { blows: 16, tare: 15.2, wetPlusTare: 42.8, dryPlusTare: 33.1 },
          { blows: 24, tare: 14.8, wetPlusTare: 41.5, dryPlusTare: 32.5 },
          { blows: 31, tare: 15.5, wetPlusTare: 43.9, dryPlusTare: 34.6 },
        ],
        plasticLimitTrials: [
          { tare: 12.1, wetPlusTare: 22.4, dryPlusTare: 20.4 },
          { tare: 12.5, wetPlusTare: 23.2, dryPlusTare: 21.1 },
        ],
      });

      assert.equal(result.isValid, true);
      assert.ok(result.liquidLimitLL > 45 && result.liquidLimitLL < 60);
      assert.ok(result.plasticLimitPL > 20 && result.plasticLimitPL < 30);
      assert.ok(result.plasticityIndexPI > 20);
      assert.equal(result.classificationGroup.includes('Clay'), true);
    });
  });

  describe('Proctor Compaction', () => {
    test('calculates bulk density, dry density, MDD, and OMC', () => {
      const result = LaboratoryCalculationEngine.calculateProctorCompaction({
        moldVolumeCm3: 944,
        moldWeightG: 4210,
        points: [
          { wetSoilPlusMoldG: 6150, tare: 20.5, wet: 128.5, dry: 120.2 },
          { wetSoilPlusMoldG: 6265, tare: 21.0, wet: 135.2, dry: 124.1 },
          { wetSoilPlusMoldG: 6340, tare: 20.8, wet: 142.0, dry: 128.0 },
          { wetSoilPlusMoldG: 6310, tare: 21.2, wet: 139.8, dry: 124.0 },
          { wetSoilPlusMoldG: 6230, tare: 20.9, wet: 145.0, dry: 126.5 },
        ],
      });

      assert.equal(result.isValid, true);
      assert.equal(result.pointsCalculated.length, 5);
      assert.ok(result.maximumDryDensityMDD > 1.9);
      assert.ok(result.optimumMoistureContentOMC > 10);
    });
  });

  describe('California Bearing Ratio (CBR)', () => {
    test('computes CBR value at 2.5mm and 5.0mm with subgrade classification', () => {
      const result = LaboratoryCalculationEngine.calculateCbr({
        penetrationLoadKn: {
          '2.5mm': 11.4,
          '5.0mm': 19.8,
        },
        swellGaugeInitialMm: 2.45,
        swellGaugeFinalMm: 2.88,
        specimenHeightMm: 116.4,
      });

      assert.equal(result.isValid, true);
      assert.ok(result.cbrAt2_5mmPct > 80);
      assert.ok(result.cbrAt5_0mmPct > 90);
      assert.ok(result.cbrValuePct > 80);
      assert.equal(result.subgradeClass.includes('S6'), true);
      assert.equal(result.swellPercentage, 0.37);
    });
  });

  describe('Specific Gravity', () => {
    test('calculates Gs within mineral soil range', () => {
      const result = LaboratoryCalculationEngine.calculateSpecificGravity({
        pycnometerMassG: 32.50,
        pycnometerPlusDrySoilG: 82.50,
        pycnometerSoilWaterG: 163.20,
        pycnometerWaterOnlyG: 132.10,
      });

      assert.equal(result.isValid, true);
      assert.equal(result.drySoilMassG, 50.0);
      assert.ok(result.specificGravityGs >= 2.60 && result.specificGravityGs <= 2.75);
    });
  });

  describe('Dynamic Cone Penetrometer (DCP)', () => {
    test('computes e-value, Kleyn CBR, and allowable bearing capacity from blow counts', () => {
      const result = LaboratoryCalculationEngine.calculateDcp({
        pitNumber: 'TP-01',
        depthRange: '0.0m - 0.3m',
        points: [
          { depthM: 0.1, blows: 4 },
          { depthM: 0.2, blows: 7 },
          { depthM: 0.3, blows: 2 },
        ],
      });

      assert.equal(result.isValid, true);
      assert.equal(result.points.length, 3);
      // Point 1: 4 blows -> 25 mm/blow -> ~8.26% CBR -> 125 kPa
      assert.equal(result.points[0].eValueMmPerBlow, 25);
      assert.ok(result.points[0].cbrPct > 8.0 && result.points[0].cbrPct < 8.5);
      assert.equal(result.points[0].soilBearingCapacityKPa, 125);

      // Point 2: 7 blows -> ~14.29 mm/blow -> ~18.5% CBR -> 185 kPa
      assert.equal(result.points[1].soilBearingCapacityKPa, 185);

      // Point 3: 2 blows -> 50 mm/blow -> ~3.04% CBR -> 70 kPa
      assert.equal(result.points[2].soilBearingCapacityKPa, 70);
    });
  });

  describe('Concrete Cylinder Compressive Strength', () => {
    test('calculates cross-sectional area, density, and strength with AS 1012 MROUND rounding', () => {
      const result = LaboratoryCalculationEngine.calculateConcreteCylinder({
        specimenDiameterMm: 100,
        specimenHeightMm: 200,
        failureLoadKn: 239.5, // 239.5 kN / (PI * 50^2 mm2) = ~30.49 MPa -> rounded to nearest 0.5 = 30.5 MPa
        massKg: 3.65,
        dateCast: '2026-03-01',
        dateTested: '2026-03-29',
      });

      assert.equal(result.isValid, true);
      assert.equal(result.specimenAgeDays, 28);
      assert.ok(result.crossSectionalAreaMm2 > 7850 && result.crossSectionalAreaMm2 < 7860);
      assert.equal(result.compressiveStrengthMpa, 30.5);
      assert.ok(result.densityKgM3 && result.densityKgM3 > 2300);
    });
  });

  describe('Concrete Masonry Compressive Strength', () => {
    test('calculates gross and net area compressive strengths', () => {
      const result = LaboratoryCalculationEngine.calculateConcreteMasonry({
        lengthMm: 400,
        heightMm: 200,
        grossAreaMm2: 80000,
        netAreaMm2: 44654,
        failureLoadKn: 450.0,
      });

      assert.equal(result.isValid, true);
      assert.equal(result.grossAreaMm2, 80000);
      assert.equal(result.netAreaMm2, 44654);
      assert.ok(result.uncorrectedStrengthMpa > 5.5 && result.uncorrectedStrengthMpa < 5.7);
      assert.ok(result.compressiveStrengthMpa > 10.0 && result.compressiveStrengthMpa < 10.2);
    });
  });

  describe('Field Density Compaction Test', () => {
    test('computes dry density, adjusted MDD ratio, and pass/fail evaluation', () => {
      const result = LaboratoryCalculationEngine.calculateFieldDensityCompaction({
        testNumber: 1,
        chainage: 'CH-1+100',
        wetDensityTM3: 2.18,
        moistureContentPct: 8.5,
        adjustedMddTM3: 2.00,
        specifiedCompactionPct: 98.0,
      });

      assert.equal(result.isValid, true);
      // dryDensity = 2.18 / 1.085 = 2.009 t/m3
      assert.ok(result.dryDensityTM3 > 2.00 && result.dryDensityTM3 < 2.02);
      // densityRatio = 2.009 / 2.00 * 100 = 100.5%
      assert.ok(result.densityRatioPct > 100.0);
      assert.equal(result.passesSpecification, true);
    });
  });

  describe('Rock Point Load Strength Index', () => {
    test('computes Is(50), size correction factor, and estimated UCS', () => {
      const result = LaboratoryCalculationEngine.calculateRockPointLoad({
        specimenWidthDOrWMm: 50,
        failureLoadKn: 12.5,
      });

      assert.equal(result.isValid, true);
      assert.equal(result.sizeCorrectionFactor, 1.0);
      // Is = 12.5 * 1000 / 2500 = 5.0 MPa
      assert.equal(result.is50Mpa, 5.0);
      assert.equal(result.estimatedUcsMpa, 110.0);
      assert.equal(result.strengthClassification, 'High Strength (Is50: 3 - 6 MPa)');
    });
  });
});
