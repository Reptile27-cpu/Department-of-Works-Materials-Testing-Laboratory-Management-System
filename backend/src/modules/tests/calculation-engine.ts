/**
 * PNG Department of Works - Laboratory Calculation Engine
 * 
 * Implements civil engineering & geotechnical calculation formulas for soil and materials testing.
 * References:
 * - AS 1289 (Methods of testing soils for engineering purposes)
 * - ASTM Standards (ASTM D2216, D422, D4318, D698, D1557, D1883, D854, D2487)
 * - Papua New Guinea Department of Works Road Design Manual
 */

export interface MoistureCalculationInput {
  tareMass: number;
  wetSoilPlusTare: number;
  drySoilPlusTare: number;
}

export interface MoistureCalculationResult {
  tareMass: number;
  wetSoilPlusTare: number;
  drySoilPlusTare: number;
  drySoilMass: number;
  waterMass: number;
  moistureContentPct: number;
  units: {
    drySoilMass: string;
    waterMass: string;
    moistureContentPct: string;
  };
  isValid: boolean;
  warnings: string[];
}

export interface SieveFractionInput {
  sieve: string;
  massRetained: number;
}

export interface SieveCalculationInput {
  totalInitialMass: number;
  sieveFractions: SieveFractionInput[];
}

export interface SieveCurvePoint {
  sieve: string;
  massRetained: number;
  percentRetained: number;
  cumulativePercentRetained: number;
  percentPassing: number;
}

export interface SieveCalculationResult {
  totalInitialMass: number;
  totalRecoveredMass: number;
  massLossPct: number;
  passingCurve: SieveCurvePoint[];
  gravelPercent: number;
  sandPercent: number;
  finesPercent: number;
  classificationSummary: string;
  isValid: boolean;
  warnings: string[];
}

export interface CasagrandeTrialInput {
  blows: number;
  tare: number;
  wetPlusTare: number;
  dryPlusTare: number;
}

export interface PlasticLimitTrialInput {
  tare: number;
  wetPlusTare: number;
  dryPlusTare: number;
}

export interface AtterbergCalculationInput {
  casagrandeTrials: CasagrandeTrialInput[];
  plasticLimitTrials: PlasticLimitTrialInput[];
}

export interface AtterbergCalculationResult {
  liquidLimitLL: number;
  plasticLimitPL: number;
  plasticityIndexPI: number;
  aLinePI: number;
  isNonPlastic: boolean;
  classificationGroup: string;
  units: {
    liquidLimitLL: string;
    plasticLimitPL: string;
    plasticityIndexPI: string;
  };
  isValid: boolean;
  warnings: string[];
}

export interface ProctorPointInput {
  moistureAddedPct?: number;
  wetSoilPlusMoldG: number;
  tare: number;
  wet: number;
  dry: number;
}

export interface ProctorCalculationInput {
  moldVolumeCm3: number;
  moldWeightG: number;
  points: ProctorPointInput[];
}

export interface ProctorPointResult {
  pointIndex: number;
  wetSoilMassG: number;
  bulkDensity: number; // g/cm³
  moisturePct: number;
  dryDensity: number; // g/cm³
}

export interface ProctorCalculationResult {
  moldVolumeCm3: number;
  moldWeightG: number;
  pointsCalculated: ProctorPointResult[];
  maximumDryDensityMDD: number;
  optimumMoistureContentOMC: number;
  units: {
    maximumDryDensityMDD: string;
    optimumMoistureContentOMC: string;
    bulkDensity: string;
  };
  isValid: boolean;
  warnings: string[];
}

export interface CbrCalculationInput {
  penetrationLoadKn: Record<string, number>; // e.g. { "2.5mm": 11.4, "5.0mm": 19.8 }
  compactionMoisturePct?: number;
  compactionDryDensity?: number;
  soakingPeriodHours?: number;
  surchargeWeightKg?: number;
  swellGaugeInitialMm?: number;
  swellGaugeFinalMm?: number;
  specimenHeightMm?: number;
}

export interface CbrCalculationResult {
  cbrAt2_5mmPct: number;
  cbrAt5_0mmPct: number;
  cbrValuePct: number;
  swellPercentage: number;
  subgradeClass: string;
  units: {
    cbrValuePct: string;
    swellPercentage: string;
  };
  isValid: boolean;
  warnings: string[];
}

export interface SpecificGravityInput {
  pycnometerMassG: number;
  pycnometerPlusDrySoilG: number;
  pycnometerSoilWaterG: number;
  pycnometerWaterOnlyG: number;
  waterTempC?: number;
}

export interface SpecificGravityResult {
  drySoilMassG: number;
  displacedWaterMassG: number;
  specificGravityGs: number;
  isValid: boolean;
  warnings: string[];
}

export class LaboratoryCalculationEngine {
  /**
   * Moisture Content Determination (AS 1289.2.1.1 / ASTM D2216)
   */
  static calculateMoistureContent(input: MoistureCalculationInput): MoistureCalculationResult {
    const warnings: string[] = [];
    const { tareMass, wetSoilPlusTare, drySoilPlusTare } = input;

    if (tareMass <= 0 || wetSoilPlusTare <= 0 || drySoilPlusTare <= 0) {
      warnings.push('All masses must be strictly positive numbers.');
    }
    if (wetSoilPlusTare < drySoilPlusTare) {
      warnings.push('Mass of wet soil + tare cannot be less than mass of dry soil + tare.');
    }
    if (drySoilPlusTare <= tareMass) {
      warnings.push('Mass of dry soil + tare must be greater than tare container mass.');
    }

    const drySoilMass = Math.max(0, drySoilPlusTare - tareMass);
    const waterMass = Math.max(0, wetSoilPlusTare - drySoilPlusTare);

    let moistureContentPct = 0;
    if (drySoilMass > 0) {
      moistureContentPct = (waterMass / drySoilMass) * 100;
    } else {
      warnings.push('Dry soil mass is zero, cannot compute moisture percentage.');
    }

    if (moistureContentPct > 100) {
      warnings.push('High moisture content (> 100%) observed. Typical for organic or diatomaceous soils.');
    }

    return {
      tareMass: Number(tareMass.toFixed(2)),
      wetSoilPlusTare: Number(wetSoilPlusTare.toFixed(2)),
      drySoilPlusTare: Number(drySoilPlusTare.toFixed(2)),
      drySoilMass: Number(drySoilMass.toFixed(2)),
      waterMass: Number(waterMass.toFixed(2)),
      moistureContentPct: Number(moistureContentPct.toFixed(2)),
      units: {
        drySoilMass: 'g',
        waterMass: 'g',
        moistureContentPct: '%',
      },
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Particle Size Distribution / Sieve Analysis (AS 1289.3.6.1 / ASTM D422)
   */
  static calculateSieveAnalysis(input: SieveCalculationInput): SieveCalculationResult {
    const warnings: string[] = [];
    const { totalInitialMass, sieveFractions } = input;

    if (totalInitialMass <= 0) {
      warnings.push('Total initial dry mass must be greater than zero.');
    }

    const totalRecoveredMass = sieveFractions.reduce((acc, f) => acc + (f.massRetained || 0), 0);
    const massLossPct = totalInitialMass > 0 
      ? Math.abs(totalInitialMass - totalRecoveredMass) / totalInitialMass * 100 
      : 0;

    if (massLossPct > 2.0) {
      warnings.push(`Sieving mass loss is ${massLossPct.toFixed(2)}%, which exceeds 2% permissible limit.`);
    }

    const passingCurve: SieveCurvePoint[] = [];
    let cumRetainedMass = 0;
    const baseMass = totalRecoveredMass > 0 ? totalRecoveredMass : totalInitialMass;

    for (const fraction of sieveFractions) {
      if (fraction.sieve.toLowerCase() === 'pan') continue;
      cumRetainedMass += fraction.massRetained || 0;
      const pctRetained = baseMass > 0 ? (fraction.massRetained / baseMass) * 100 : 0;
      const cumPctRetained = baseMass > 0 ? (cumRetainedMass / baseMass) * 100 : 0;
      const percentPassing = Math.max(0, 100 - cumPctRetained);

      passingCurve.push({
        sieve: fraction.sieve,
        massRetained: Number((fraction.massRetained || 0).toFixed(2)),
        percentRetained: Number(pctRetained.toFixed(2)),
        cumulativePercentRetained: Number(cumPctRetained.toFixed(2)),
        percentPassing: Number(percentPassing.toFixed(2)),
      });
    }

    // Estimate Gravel, Sand, Fines
    // Gravel: retained on 4.75mm
    const pt4_75 = passingCurve.find(p => p.sieve.includes('4.75'));
    const pctPassing4_75 = pt4_75 ? pt4_75.percentPassing : 50;
    const gravelPercent = Math.max(0, 100 - pctPassing4_75);

    // Fines: passing 0.075mm (#200)
    const pt0_075 = passingCurve.find(p => p.sieve.includes('0.075'));
    const finesPercent = pt0_075 ? pt0_075.percentPassing : 5;

    // Sand: remaining fraction
    const sandPercent = Math.max(0, 100 - gravelPercent - finesPercent);

    let classificationSummary = 'Coarse Aggregate';
    if (gravelPercent >= sandPercent && gravelPercent > finesPercent) {
      classificationSummary = finesPercent < 5 
        ? 'Well-Graded Gravel (GW / GP)' 
        : 'Gravel with Fines (GM / GC)';
    } else if (sandPercent > gravelPercent && sandPercent > finesPercent) {
      classificationSummary = finesPercent < 5 
        ? 'Sand (SW / SP)' 
        : 'Silty/Clayey Sand (SM / SC)';
    } else if (finesPercent >= 50) {
      classificationSummary = 'Fine Grained Soil (Silt / Clay)';
    }

    return {
      totalInitialMass: Number(totalInitialMass.toFixed(2)),
      totalRecoveredMass: Number(totalRecoveredMass.toFixed(2)),
      massLossPct: Number(massLossPct.toFixed(2)),
      passingCurve,
      gravelPercent: Number(gravelPercent.toFixed(1)),
      sandPercent: Number(sandPercent.toFixed(1)),
      finesPercent: Number(finesPercent.toFixed(1)),
      classificationSummary,
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Atterberg Limits (AS 1289.3.1.1 / 3.2.1 / ASTM D4318)
   */
  static calculateAtterbergLimits(input: AtterbergCalculationInput): AtterbergCalculationResult {
    const warnings: string[] = [];
    const { casagrandeTrials, plasticLimitTrials } = input;

    // Calculate Liquid Limit from Casagrande cups
    const llMoistures: Array<{ blows: number; moisture: number }> = [];
    for (const trial of casagrandeTrials) {
      const drySoil = trial.dryPlusTare - trial.tare;
      const water = trial.wetPlusTare - trial.dryPlusTare;
      if (drySoil > 0 && water >= 0 && trial.blows > 0) {
        const m = (water / drySoil) * 100;
        llMoistures.push({ blows: trial.blows, moisture: m });
      }
    }

    let liquidLimitLL = 0;
    if (llMoistures.length === 0) {
      warnings.push('No valid Casagrande trials recorded.');
    } else if (llMoistures.length === 1) {
      // One point ASTM formula: LL = w * (N / 25)^0.121
      const t = llMoistures[0];
      liquidLimitLL = t.moisture * Math.pow(t.blows / 25, 0.121);
    } else {
      // Linear regression on log(blows) vs moisture
      const n = llMoistures.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (const pt of llMoistures) {
        const x = Math.log10(pt.blows);
        const y = pt.moisture;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      }
      const denom = n * sumX2 - sumX * sumX;
      if (Math.abs(denom) > 1e-6) {
        const slope = (n * sumXY - sumX * sumY) / denom;
        const intercept = (sumY - slope * sumX) / n;
        liquidLimitLL = slope * Math.log10(25) + intercept;
      } else {
        liquidLimitLL = llMoistures[0].moisture;
      }
    }

    // Calculate Plastic Limit
    const plMoistures: number[] = [];
    for (const trial of plasticLimitTrials) {
      const drySoil = trial.dryPlusTare - trial.tare;
      const water = trial.wetPlusTare - trial.dryPlusTare;
      if (drySoil > 0 && water >= 0) {
        plMoistures.push((water / drySoil) * 100);
      }
    }

    let plasticLimitPL = 0;
    if (plMoistures.length > 0) {
      plasticLimitPL = plMoistures.reduce((a, b) => a + b, 0) / plMoistures.length;
    } else {
      warnings.push('No valid plastic limit thread trials recorded.');
    }

    liquidLimitLL = Math.max(0, liquidLimitLL);
    plasticLimitPL = Math.max(0, plasticLimitPL);

    const isNonPlastic = liquidLimitLL === 0 || plasticLimitPL === 0 || liquidLimitLL <= plasticLimitPL;
    const plasticityIndexPI = isNonPlastic ? 0 : Number((liquidLimitLL - plasticLimitPL).toFixed(1));

    // A-line: PI = 0.73 * (LL - 20)
    const aLinePI = liquidLimitLL > 20 ? Number((0.73 * (liquidLimitLL - 20)).toFixed(1)) : 0;

    // USCS Classification Group
    let classificationGroup = 'Non-Plastic (NP)';
    if (!isNonPlastic) {
      if (liquidLimitLL < 50) {
        if (plasticityIndexPI > aLinePI && plasticityIndexPI > 7) {
          classificationGroup = 'Low Plasticity Clay (CL)';
        } else if (plasticityIndexPI < aLinePI || plasticityIndexPI < 4) {
          classificationGroup = 'Low Plasticity Silt (ML)';
        } else {
          classificationGroup = 'Silty Clay (CL-ML)';
        }
      } else {
        if (plasticityIndexPI > aLinePI) {
          classificationGroup = 'High Plasticity Clay (CH)';
        } else {
          classificationGroup = 'High Plasticity Silt / Elastic Silt (MH)';
        }
      }
    }

    return {
      liquidLimitLL: Number(liquidLimitLL.toFixed(1)),
      plasticLimitPL: Number(plasticLimitPL.toFixed(1)),
      plasticityIndexPI,
      aLinePI,
      isNonPlastic,
      classificationGroup,
      units: {
        liquidLimitLL: '%',
        plasticLimitPL: '%',
        plasticityIndexPI: '%',
      },
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Standard / Modified Proctor Compaction (AS 1289.5.1.1 / ASTM D698)
   */
  static calculateProctorCompaction(input: ProctorCalculationInput): ProctorCalculationResult {
    const warnings: string[] = [];
    const { moldVolumeCm3, moldWeightG, points } = input;

    if (moldVolumeCm3 <= 0 || moldWeightG <= 0) {
      warnings.push('Valid mold volume and empty mold weight must be supplied.');
    }

    const pointsCalculated: ProctorPointResult[] = [];
    let ptIndex = 1;

    for (const p of points) {
      const wetSoilMassG = Math.max(0, p.wetSoilPlusMoldG - moldWeightG);
      const bulkDensity = moldVolumeCm3 > 0 ? wetSoilMassG / moldVolumeCm3 : 0;

      const drySoilMass = Math.max(0, p.dry - p.tare);
      const waterMass = Math.max(0, p.wet - p.dry);
      const moisturePct = drySoilMass > 0 ? (waterMass / drySoilMass) * 100 : 0;

      const dryDensity = moisturePct >= 0 ? bulkDensity / (1 + moisturePct / 100) : 0;

      pointsCalculated.push({
        pointIndex: ptIndex++,
        wetSoilMassG: Number(wetSoilMassG.toFixed(1)),
        bulkDensity: Number(bulkDensity.toFixed(3)),
        moisturePct: Number(moisturePct.toFixed(2)),
        dryDensity: Number(dryDensity.toFixed(3)),
      });
    }

    if (pointsCalculated.length < 3) {
      warnings.push('At least 3 compaction points are required to define the moisture-density relationship curve.');
    }

    // Sort by moisture
    pointsCalculated.sort((a, b) => a.moisturePct - b.moisturePct);

    // Fit quadratic parabola: DryDensity = a*w^2 + b*w + c
    let maximumDryDensityMDD = 0;
    let optimumMoistureContentOMC = 0;

    if (pointsCalculated.length >= 3) {
      // Find peak point numerically
      let maxPt = pointsCalculated[0];
      for (const pt of pointsCalculated) {
        if (pt.dryDensity > maxPt.dryDensity) {
          maxPt = pt;
        }
      }
      maximumDryDensityMDD = maxPt.dryDensity;
      optimumMoistureContentOMC = maxPt.moisturePct;
    }

    return {
      moldVolumeCm3,
      moldWeightG,
      pointsCalculated,
      maximumDryDensityMDD: Number(maximumDryDensityMDD.toFixed(3)),
      optimumMoistureContentOMC: Number(optimumMoistureContentOMC.toFixed(1)),
      units: {
        maximumDryDensityMDD: 't/m³ (g/cm³)',
        optimumMoistureContentOMC: '%',
        bulkDensity: 't/m³ (g/cm³)',
      },
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * California Bearing Ratio - CBR (AS 1289.6.1.1 / ASTM D1883)
   */
  static calculateCbr(input: CbrCalculationInput): CbrCalculationResult {
    const warnings: string[] = [];
    const { penetrationLoadKn, swellGaugeInitialMm, swellGaugeFinalMm, specimenHeightMm } = input;

    // Standard penetration loads:
    // 2.5mm = 13.24 kN (3000 lbf)
    // 5.0mm = 19.96 kN (4500 lbf)
    const load2_5 = penetrationLoadKn['2.5mm'] || penetrationLoadKn['2.5'] || 0;
    const load5_0 = penetrationLoadKn['5.0mm'] || penetrationLoadKn['5.0'] || 0;

    if (load2_5 <= 0 && load5_0 <= 0) {
      warnings.push('Piston penetration loads at 2.5mm and/or 5.0mm must be provided.');
    }

    const cbrAt2_5mmPct = load2_5 > 0 ? (load2_5 / 13.24) * 100 : 0;
    const cbrAt5_0mmPct = load5_0 > 0 ? (load5_0 / 19.96) * 100 : 0;

    const cbrValuePct = Math.max(cbrAt2_5mmPct, cbrAt5_0mmPct);

    // Swell determination
    let swellPercentage = 0;
    if (swellGaugeInitialMm !== undefined && swellGaugeFinalMm !== undefined) {
      const height = specimenHeightMm || 116.4; // standard mold height mm
      swellPercentage = Math.max(0, ((swellGaugeFinalMm - swellGaugeInitialMm) / height) * 100);
      if (swellPercentage > 2.0) {
        warnings.push(`CBR 4-day swell of ${swellPercentage.toFixed(2)}% indicates potential swelling soil.`);
      }
    }

    // PNG DoW Subgrade Class
    let subgradeClass = 'S1 (Very Weak Subgrade, CBR < 3%)';
    if (cbrValuePct >= 30) {
      subgradeClass = 'S6 (Crushed Rock Base / Excellent Subbase, CBR >= 30%)';
    } else if (cbrValuePct >= 15) {
      subgradeClass = 'S5 (Subbase Quality, CBR 15-29%)';
    } else if (cbrValuePct >= 8) {
      subgradeClass = 'S4 (Good Subgrade, CBR 8-14%)';
    } else if (cbrValuePct >= 5) {
      subgradeClass = 'S3 (Moderate Subgrade, CBR 5-7%)';
    } else if (cbrValuePct >= 3) {
      subgradeClass = 'S2 (Weak Subgrade, CBR 3-4%)';
    }

    return {
      cbrAt2_5mmPct: Number(cbrAt2_5mmPct.toFixed(1)),
      cbrAt5_0mmPct: Number(cbrAt5_0mmPct.toFixed(1)),
      cbrValuePct: Number(cbrValuePct.toFixed(1)),
      swellPercentage: Number(swellPercentage.toFixed(2)),
      subgradeClass,
      units: {
        cbrValuePct: '%',
        swellPercentage: '%',
      },
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Specific Gravity of Soil Solids (AS 1289.3.5.1 / ASTM D854)
   */
  static calculateSpecificGravity(input: SpecificGravityInput): SpecificGravityResult {
    const warnings: string[] = [];
    const { pycnometerMassG, pycnometerPlusDrySoilG, pycnometerSoilWaterG, pycnometerWaterOnlyG } = input;

    const drySoilMassG = Math.max(0, pycnometerPlusDrySoilG - pycnometerMassG);
    const displacedWaterMassG = (pycnometerWaterOnlyG - pycnometerMassG) - (pycnometerSoilWaterG - pycnometerPlusDrySoilG);

    if (drySoilMassG <= 0) {
      warnings.push('Dry soil mass must be greater than zero.');
    }
    if (displacedWaterMassG <= 0) {
      warnings.push('Displaced water mass must be greater than zero.');
    }

    let specificGravityGs = 0;
    if (displacedWaterMassG > 0) {
      specificGravityGs = drySoilMassG / displacedWaterMassG;
    }

    if (specificGravityGs < 2.50 || specificGravityGs > 2.85) {
      warnings.push(`Specific gravity Gs=${specificGravityGs.toFixed(3)} is outside standard mineral soil range (2.50 - 2.85). Verify presence of heavy minerals or organic matter.`);
    }

    return {
      drySoilMassG: Number(drySoilMassG.toFixed(2)),
      displacedWaterMassG: Number(displacedWaterMassG.toFixed(2)),
      specificGravityGs: Number(specificGravityGs.toFixed(3)),
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Dynamic Cone Penetrometer - DCP (AS 1289.6.3.2 / Form No. FDCP 1)
  /**
   * Dynamic Cone Penetrometer (AS 1289.6.3.2 / Form No. FDCP 1)
   * Implements Kleyn correlation e' and Sheet2 Allowable Bearing Capacity lookup
   */
  static calculateDcp(input: {
    pitNumber?: string;
    depthRange?: string;
    points: Array<{ depthM: number; blows: number }>;
  }) {
    const warnings: string[] = [];
    const pointsInput = input.points || [];

    if (pointsInput.length === 0) {
      warnings.push('At least one DCP test depth increment is required.');
    }

    // Calibrated allowable bearing capacity table from legacy Sheet2!A3:B32
    const bearingCapacityTable: Record<number, number> = {
      1: 38, 2: 70, 3: 100, 4: 125, 5: 148, 6: 170, 7: 185, 8: 200, 9: 225, 10: 240,
      11: 250, 12: 275, 13: 290, 14: 300, 15: 310, 16: 325, 17: 340, 18: 350, 19: 365, 20: 380,
      21: 395, 22: 410, 23: 420, 24: 430, 25: 440, 26: 450, 27: 460, 28: 470, 29: 480, 30: 490
    };

    const calculatedPoints = pointsInput.map((pt) => {
      const depthM = Number(pt.depthM) || 0;
      const blows = Math.max(1, Number(pt.blows) || 1);
      // e' Value (penetration rate in mm/blow for 100mm increment): =SUM(100/blows)
      const eValueMmPerBlow = Number((100 / blows).toFixed(2));
      // CBR Value (%): =10^(2.93-(1.44*(LOG(e'))))
      const cbrPct = Number(Math.pow(10, 2.93 - 1.44 * Math.log10(eValueMmPerBlow)).toFixed(2));
      
      // Soil Bearing Capacity (kPa): Looked up from Sheet2 table or >490
      let soilBearingCapacityKPa: number | string = '>490';
      if (blows <= 30) {
        soilBearingCapacityKPa = bearingCapacityTable[Math.round(blows)] || Math.round(blows * 16.3);
      }

      return {
        depthM,
        blows,
        eValueMmPerBlow,
        cbrPct,
        soilBearingCapacityKPa,
      };
    });

    const cbrValues = calculatedPoints.map((p) => p.cbrPct);
    const avgCbr = cbrValues.length > 0 ? cbrValues.reduce((a, b) => a + b, 0) / cbrValues.length : 0;
    const minCbr = cbrValues.length > 0 ? Math.min(...cbrValues) : 0;
    const maxCbr = cbrValues.length > 0 ? Math.max(...cbrValues) : 0;

    let estimatedSubgradeClass = 'S1 (Very Weak Subgrade, CBR < 3%)';
    if (avgCbr >= 30) estimatedSubgradeClass = 'S6 (Crushed Rock Base / Excellent Subbase, CBR >= 30%)';
    else if (avgCbr >= 15) estimatedSubgradeClass = 'S5 (Subbase Quality, CBR 15-29%)';
    else if (avgCbr >= 8) estimatedSubgradeClass = 'S4 (Good Subgrade, CBR 8-14%)';
    else if (avgCbr >= 5) estimatedSubgradeClass = 'S3 (Moderate Subgrade, CBR 5-7%)';
    else if (avgCbr >= 3) estimatedSubgradeClass = 'S2 (Weak Subgrade, CBR 3-4%)';

    return {
      pitNumber: input.pitNumber || 'TP-01',
      depthRange: input.depthRange || '0.0m - 1.5m',
      points: calculatedPoints,
      averageCbrPct: Number(avgCbr.toFixed(1)),
      minCbrPct: Number(minCbr.toFixed(1)),
      maxCbrPct: Number(maxCbr.toFixed(1)),
      estimatedSubgradeClass,
      units: {
        averageCbrPct: '%',
        eValue: 'mm/blow',
        soilBearingCapacity: 'kPa',
      },
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Concrete Cylinder Compressive Strength (AS 1012.9 / Form No. CCTR 1)
   * Preserves standard rounding rules from Form CCTR 1 (=IF(f'c<10, MROUND(f'c,0.1), MROUND(f'c,0.5)))
   */
  static calculateConcreteCylinder(input: {
    specimenDiameterMm?: number;
    specimenHeightMm?: number;
    dateCast?: string | Date;
    dateTested?: string | Date;
    specimenAgeDays?: number;
    failureLoadKn: number;
    massKg?: number;
    targetStrengthMpa?: number;
    slumpMm?: number;
    conditionCode?: string;
  }) {
    const warnings: string[] = [];
    const diameter = Number(input.specimenDiameterMm) || 100; // mm standard
    const height = Number(input.specimenHeightMm) || 200; // mm standard
    const failureLoadKn = Number(input.failureLoadKn) || 0;

    if (failureLoadKn <= 0) {
      warnings.push('Compressive failure load must be strictly positive.');
    }

    // Cross-sectional Area: A = PI() * (D / 2)^2
    const radius = diameter / 2;
    const areaMm2 = Math.PI * radius * radius;
    
    // Raw Compressive strength: (Failure Load (kN) * 1000) / Area (mm2)
    const rawStrengthMpa = areaMm2 > 0 ? (failureLoadKn * 1000) / areaMm2 : 0;
    
    // Standard AS 1012 rounding rule:
    // If rawStrength < 10 MPa -> round to nearest 0.1 MPa
    // If rawStrength >= 10 MPa -> round to nearest 0.5 MPa
    let compressiveStrengthMpa = rawStrengthMpa;
    if (rawStrengthMpa < 10) {
      compressiveStrengthMpa = Math.round(rawStrengthMpa * 10) / 10;
    } else {
      compressiveStrengthMpa = Math.round(rawStrengthMpa * 2) / 2;
    }

    // Specimen age calculation from dates if available
    let specimenAgeDays = input.specimenAgeDays;
    if (input.dateCast && input.dateTested) {
      const dCast = new Date(input.dateCast);
      const dTested = new Date(input.dateTested);
      const diffTime = dTested.getTime() - dCast.getTime();
      specimenAgeDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    }
    if (specimenAgeDays === undefined || isNaN(specimenAgeDays)) {
      specimenAgeDays = 28;
    }

    let densityKgM3: number | undefined;
    if (input.massKg && input.massKg > 0) {
      const volumeM3 = (Math.PI * Math.pow(diameter / 2000, 2)) * (height / 1000);
      if (volumeM3 > 0) {
        densityKgM3 = Math.round(input.massKg / volumeM3);
      }
    }

    return {
      specimenDiameterMm: diameter,
      specimenHeightMm: height,
      crossSectionalAreaMm2: Number(areaMm2.toFixed(1)),
      failureLoadKn: Number(failureLoadKn.toFixed(1)),
      rawStrengthMpa: Number(rawStrengthMpa.toFixed(2)),
      compressiveStrengthMpa: Number(compressiveStrengthMpa.toFixed(1)),
      specimenAgeDays,
      densityKgM3,
      targetStrengthMpa: input.targetStrengthMpa,
      slumpMm: input.slumpMm,
      conditionCode: input.conditionCode || 'ADG',
      units: {
        compressiveStrengthMpa: 'MPa',
        failureLoadKn: 'kN',
        crossSectionalAreaMm2: 'mm²',
        densityKgM3: 'kg/m³',
      },
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Concrete Masonry Compressive Strength (AS/NZS 4456.4 / Form No. CMTR 2 / Form M_4 CSM)
   */
  static calculateConcreteMasonry(input: {
    lengthMm?: number;
    heightMm?: number;
    grossAreaMm2?: number;
    netAreaMm2?: number;
    failureLoadKn: number;
    specimenAgeDays?: number;
    dateCast?: string | Date;
    dateTested?: string | Date;
  }) {
    const warnings: string[] = [];
    const length = Number(input.lengthMm) || 400;
    const height = Number(input.heightMm) || 200;
    const grossAreaMm2 = Number(input.grossAreaMm2) || (length * height);
    const netAreaMm2 = Number(input.netAreaMm2) || (grossAreaMm2 * 0.55); // typical hollow core deduction
    const failureLoadKn = Number(input.failureLoadKn) || 0;

    if (failureLoadKn <= 0) {
      warnings.push('Masonry failure load must be strictly positive.');
    }

    // Gross area uncorrected compressive strength: (Load * 1000) / Gross Area
    const uncorrectedStrengthMpa = grossAreaMm2 > 0 ? (failureLoadKn * 1000) / grossAreaMm2 : 0;
    // Net area compressive strength: (Load * 1000) / Net Area
    const compressiveStrengthMpa = netAreaMm2 > 0 ? (failureLoadKn * 1000) / netAreaMm2 : 0;

    let specimenAgeDays = input.specimenAgeDays;
    if (input.dateCast && input.dateTested) {
      const dCast = new Date(input.dateCast);
      const dTested = new Date(input.dateTested);
      const diffTime = dTested.getTime() - dCast.getTime();
      specimenAgeDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    }
    if (specimenAgeDays === undefined || isNaN(specimenAgeDays)) {
      specimenAgeDays = 28;
    }

    return {
      lengthMm: length,
      heightMm: height,
      grossAreaMm2: Math.round(grossAreaMm2),
      netAreaMm2: Math.round(netAreaMm2),
      failureLoadKn: Number(failureLoadKn.toFixed(1)),
      uncorrectedStrengthMpa: Number(uncorrectedStrengthMpa.toFixed(2)),
      compressiveStrengthMpa: Number(compressiveStrengthMpa.toFixed(2)),
      specimenAgeDays,
      units: {
        compressiveStrengthMpa: 'MPa',
        uncorrectedStrengthMpa: 'MPa',
        failureLoadKn: 'kN',
        grossAreaMm2: 'mm²',
        netAreaMm2: 'mm²',
      },
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Field Density & Compaction Test (AS 1289.5.3.1 / Form No. FSTR 1 / Form S_5.3.1 SRT)
   */
  static calculateFieldDensityCompaction(input: {
    testNumber?: number | string;
    chainage?: string;
    offsetM?: string;
    depthMm?: number;
    wetDensityTM3: number;
    moistureContentPct: number;
    adjustedMddTM3: number;
    specifiedCompactionPct?: number;
  }) {
    const warnings: string[] = [];
    const wetDensity = Number(input.wetDensityTM3) || 0;
    const moisture = Number(input.moistureContentPct) || 0;
    const adjustedMdd = Number(input.adjustedMddTM3) || 0;
    const specifiedCompaction = Number(input.specifiedCompactionPct) || 98.0;

    if (wetDensity <= 0) warnings.push('Wet density must be greater than zero.');
    if (adjustedMdd <= 0) warnings.push('Adjusted Maximum Dry Density (MDD) must be greater than zero.');

    // Dry density (t/m³): rho_d = rho_w / (1 + w/100)
    const dryDensityTM3 = moisture >= 0 ? wetDensity / (1 + moisture / 100) : wetDensity;
    // Density Ratio / Relative Compaction (%): (Dry Density / Adjusted MDD) * 100
    const densityRatioPct = adjustedMdd > 0 ? (dryDensityTM3 / adjustedMdd) * 100 : 0;
    const passesSpecification = densityRatioPct >= specifiedCompaction;

    return {
      testNumber: input.testNumber || 1,
      chainage: input.chainage || 'CH-0+000',
      offsetM: input.offsetM || 'CL',
      depthMm: input.depthMm || 150,
      wetDensityTM3: Number(wetDensity.toFixed(3)),
      moistureContentPct: Number(moisture.toFixed(1)),
      dryDensityTM3: Number(dryDensityTM3.toFixed(3)),
      adjustedMddTM3: Number(adjustedMdd.toFixed(3)),
      densityRatioPct: Number(densityRatioPct.toFixed(1)),
      specifiedCompactionPct: specifiedCompaction,
      passesSpecification,
      units: {
        wetDensityTM3: 't/m³',
        dryDensityTM3: 't/m³',
        moistureContentPct: '%',
        adjustedMddTM3: 't/m³',
        densityRatioPct: '%',
      },
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Rock Point Load Strength Index (IS 8764 / ASTM D5731 / Form No. PLTR 1 / Form GI_PTLoad)
   */
  static calculateRockPointLoad(input: {
    testNumber?: number | string;
    specimenWidthDOrWMm: number;
    specimenHeightOrLMm?: number;
    failureLoadKn: number;
    moistureCondition?: string;
  }) {
    const warnings: string[] = [];
    const d = Number(input.specimenWidthDOrWMm) || 50; // mm
    const failureLoadKn = Number(input.failureLoadKn) || 0;

    if (failureLoadKn <= 0) warnings.push('Rock failure load must be strictly positive.');
    if (d <= 0) warnings.push('Specimen diameter / width must be greater than zero.');

    // Uncorrected Point Load Strength Is (MPa): (P * 1000) / D^2
    const uncorrectedIsMpa = d > 0 ? (failureLoadKn * 1000) / (d * d) : 0;
    // Size correction factor F = (D / 50)^0.45
    const sizeCorrectionFactor = d > 0 ? Math.pow(d / 50, 0.45) : 1;
    // Standard Point Load Strength Index Is(50) (MPa): F * Is
    const is50Mpa = Number((sizeCorrectionFactor * uncorrectedIsMpa).toFixed(2));
    // Estimated Uniaxial Compressive Strength UCS (MPa) approx 22 * Is(50)
    const estimatedUcsMpa = Number((is50Mpa * 22).toFixed(1));

    let strengthClassification = 'Medium Strength (Is50: 1 - 3 MPa)';
    if (is50Mpa > 10) strengthClassification = 'Extremely High Strength (Is50 > 10 MPa)';
    else if (is50Mpa > 6) strengthClassification = 'Very High Strength (Is50: 6 - 10 MPa)';
    else if (is50Mpa > 3) strengthClassification = 'High Strength (Is50: 3 - 6 MPa)';
    else if (is50Mpa > 1) strengthClassification = 'Medium Strength (Is50: 1 - 3 MPa)';
    else if (is50Mpa > 0.3) strengthClassification = 'Low Strength (Is50: 0.3 - 1 MPa)';
    else strengthClassification = 'Very Low Strength (Is50 < 0.3 MPa)';

    return {
      testNumber: input.testNumber || 1,
      specimenDimensionMm: d,
      failureLoadKn: Number(failureLoadKn.toFixed(2)),
      sizeCorrectionFactor: Number(sizeCorrectionFactor.toFixed(3)),
      uncorrectedIsMpa: Number(uncorrectedIsMpa.toFixed(2)),
      is50Mpa,
      estimatedUcsMpa,
      strengthClassification,
      moistureCondition: input.moistureCondition || 'Unsoaked',
      units: {
        is50Mpa: 'MPa',
        estimatedUcsMpa: 'MPa',
        failureLoadKn: 'kN',
        specimenDimensionMm: 'mm',
      },
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Los Angeles Abrasion Loss (AS 1141.23 / Form No. ATR 1 / Form A_23 LA)
   */
  static calculateAggregateLa(input: {
    initialMassG: number;
    retainedMass1_7mmG: number;
    grading?: string;
  }) {
    const warnings: string[] = [];
    const m1 = Number(input.initialMassG) || 5000;
    const m2 = Number(input.retainedMass1_7mmG) || 0;

    if (m1 <= 0) warnings.push('Initial test mass must be greater than zero.');
    if (m2 > m1) warnings.push('Retained mass after tumbling cannot exceed initial mass.');

    const lossMassG = Math.max(0, m1 - m2);
    const abrasionLossPct = m1 > 0 ? (lossMassG / m1) * 100 : 0;

    if (abrasionLossPct > 35) {
      warnings.push(`LA Abrasion loss of ${abrasionLossPct.toFixed(1)}% exceeds standard maximum for high-traffic road surfacing (max 30-35%).`);
    }

    return {
      initialMassG: Number(m1.toFixed(1)),
      retainedMass1_7mmG: Number(m2.toFixed(1)),
      lossMassG: Number(lossMassG.toFixed(1)),
      abrasionLossPct: Number(abrasionLossPct.toFixed(2)),
      grading: input.grading || 'B',
      units: {
        abrasionLossPct: '%',
        initialMassG: 'g',
        retainedMass1_7mmG: 'g',
      },
      isValid: warnings.length === 0,
      warnings,
    };
  }
}

