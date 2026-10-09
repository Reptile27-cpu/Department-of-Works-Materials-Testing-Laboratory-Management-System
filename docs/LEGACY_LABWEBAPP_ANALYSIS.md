# LEGACY LABWEBAPP DOMAIN ANALYSIS & SPECIFICATION
**Department of Works & Highways — Materials Testing Laboratory**
**Document Reference:** `docs/LEGACY_LABWEBAPP_ANALYSIS.md`
**Author:** Antigravity AI Engineering Assistant
**Date:** October 2026
**Status:** Comprehensive Baseline Domain Inventory

---

## 1. Executive Summary & Purpose

This document provides a forensic, domain-driven analysis of the legacy **LabWebApp** system (`C:\Users\bbono\Desktop\Projects\LabWebApp`), contrasting its historical data structures, test worksheets, calculation formulas, report templates, equipment inventories, and workflows against the active **DOW MS** application (`C:\Users\bbono\Desktop\DOW MS`).

In accordance with Master Implementation Principles:
- The legacy **LabWebApp** is treated as a **strictly READ-ONLY** repository of institutional laboratory knowledge.
- The active **DOW MS** project is the **sole target** for all architectural evolution, schema migrations, API enhancements, calculations, and modern UI components.
- Modern software design (TypeScript, Next.js, Node.js/Express, Prisma, PostgreSQL on Neon) is maintained without degrading into legacy architectural antipatterns (ad-hoc MongoDB schemas, unvalidated file overwrites, unverified constants).

---

## 2. Legacy LabWebApp Directory Structure & Inventory

```text
C:\Users\bbono\Desktop\Projects\LabWebApp
├── backend/
│   ├── server.js               (Express monolithic server, MongoDB models, Puppeteer/LibreOffice triggers)
│   ├── server-fixed.js         (Hotfix branch for Excel generation)
│   ├── excel-service.js        (ExcelJS template filling with cell mapping)
│   ├── pdf-service.js          (LibreOffice conversion & Puppeteer HTML fallback)
│   ├── invoice-service.js      (HTML invoice generation with 10% tax)
│   ├── email.js                (Nodemailer SMTP integration)
│   ├── barcode-helper.js       (bwip-js barcode generation)
│   └── qr-utils.js             (qrcode library helpers)
├── models/
│   ├── Request.js              (Mongoose models: Request, Sample, Personnel, Equipment)
│   └── FinalReport.js          (Mongoose schema for consolidated report attributes)
├── data/
│   ├── test-methods.json       (17 initial test rates & keys)
│   ├── testMethods.json        (Chemical/Microbiological mock data)
│   ├── equipment.json          (16 active equipment records)
│   ├── personnel.json          (Staff roster with current assignments)
│   ├── requests.json           (Flat JSON request records)
│   ├── samples.json            (Flat JSON sample register records)
│   └── reviews.json            (Request review evaluations)
├── templates/
│   ├── sample/
│   │   └── Sample_registration.xlsx (THE MASTER DOMAIN SOURCE: 10 sheets containing test catalogue, prices, equipment master, personnel competency, worksheet master, test types)
│   ├── request/
│   │   ├── request.xlsx        (Form RQ-LT: Client testing request form)
│   │   └── request.html        (HTML template fallback)
│   ├── review/
│   │   └── Review_of_request.xlsx (Form: Technical evaluation of request, methods & resources)
│   ├── quotation/
│   │   ├── Quotation.xlsx      (Form 04P/24: Service Quote with 3% administration surcharge)
│   │   └── quotation_template.pdf
│   ├── invoice/
│   │   ├── invoice.xlsx        (Invoice sheets: PUBLIC, PRIVATE, ITEMS rate master)
│   │   └── invoice_template.xlsx
│   ├── reports/
│   │   ├── Form No. STR 1_ Soils Test Report 10_02_23.xlsx (Soil Test Report)
│   │   ├── Form No. ATR 1_ Aggregate Test Report 10_02_2023 .xlsx (Aggregates Test Report)
│   │   ├── Form No. CCTR 1 _Concrete Cylinder Test Report.xlsx (Concrete Cylinder Report)
│   │   ├── Form No. CMTR 2 _ Concrete Masonry Test Report.xlsx (Concrete Masonry Report)
│   │   ├── Form No. CPTR 3 _ Concrete Paver Test Report.xls (Concrete Paver Report)
│   │   ├── Form No. FDCP 1_ Dynamic Cone Penetro Test Report.xlsx (Dynamic Cone Penetrometer Report)
│   │   ├── Form No. FSTR 1 _ Field Density Test Report.xlsx (Field Density Compaction Report)
│   │   └── Form No. PLTR 1 _ Point Load Test Report.xls (Point Load Rock Strength Report)
│   └── test_forms/
│       ├── SOILS/ (S_2.1.1 MC, S_3.1.1 AL, S_3.5.1 SPD, S_3.6.1 PSD, S_3.9 CL, S_5.1.1 MC_DD, S_6.1.1 CBR p1, p2)
│       ├── AGGREGATE/ (A_11 PSD, A_12 MF, A_14 PS, A_15 FI, A_18 CP, A_20.1 ALD10, A_20.2 ALD5_7, A_21 ACV, A_22 WD, A_23 LA, A_24 SS-FA, A_24 SS_CA, A_32 WP, A_4 BD, A_5 PDWA, A_G6.2 FF)
│       ├── CONCRETE/ (C_1 CS_CL, C_9 CSC, CP_5 BLCP, M_4 CSM, slump_test.xlsx)
│       ├── FIELD/ (S_5.3.1 SRT, GI_6.3.2E DCP)
│       └── ROCK/ (GI_PTLoad)
└── public/
    └── testforms/ (Mirror of laboratory worksheet PDFs)
```

---

## 3. Two Layers of Legacy Domain Knowledge

A critical finding during code inspection is that **LabWebApp consists of two distinct layers**:
1. **Layer 1 (The Surface/App Layer):** A simplistic JSON-backed mock (`test-methods.json`) with only 17 tests and simple flat properties.
2. **Layer 2 (The Real Laboratory Operating Layer):** Found in `Sample_registration.xlsx`, `Quotation.xlsx`, `invoice.xlsx`, and the Excel report templates in `templates/reports/`. This contains over 40 distinct civil engineering laboratory tests across Soils, Aggregates, Concrete, Rock, and Field testing, complete with official PNG Department of Works test form identifiers, dual Public/Private fee schedules, equipment calibration intervals, and rigorous calculation formulas.

**DOW MS must implement Layer 2.**

---

## 4. Master Laboratory Test Catalogue (Verified from Legacy Masters)

Extracted from `Sample_registration.xlsx` (sheets: `TEST FORMS`, `TEST TYPE`, `PRICES`) and `invoice.xlsx` (`ITEMS`):

### 4.1 SOILS (Category Code: `SOILS`)
| Test Code | Official Form No. | Test Method / Standard | Test Description | Public Rate (PGK) | Private Rate (PGK) |
|---|---|---|---|---|---|
| `SOIL_MOISTURE` | `S-2.1.1` | AS 1289.2.1.1 & 2.1.4 | Moisture Content determination (Oven drying) | K 25.00 | K 35.00 |
| `ATTERBERG_LIMITS` | `S-3.1.1` | AS 1289.3.1.1, 3.2.1, 3.3.1, 3.4.1 | Atterberg Limits (LL, PL, PI) & Linear Shrinkage | K 160.00 | K 225.00 |
| `CONE_LIQUID_LIMIT` | `S-3.9` | AS 1289.3.9, 3.3.1, 3.3.2 | Cone Liquid Limit & Linear Shrinkage | K 120.00 | K 170.00 |
| `SOIL_PARTICLE_DENSITY`| `S-3.5.1` | AS 1289.3.5.1 | Soil Particle Density (Pycnometer) | K 100.00 | K 145.00 |
| `PSD_WET_SIEVE` | `S-3.6.1` | AS 1289.3.6.1 & 3.6.3 | Particle Size Distribution (Wet Sieving + Hydrometer) | K 115.00 | K 165.00 |
| `PSD_HYDROMETER` | `S-3.6.3` | AS 1289.3.6.3 | Particle Size Distribution - Hydrometer Analysis | K 210.00 | K 280.00 |
| `STD_COMPACTION` | `S-5.1.1` | AS 1289.5.1.1 | Standard Compaction Test (Dry Density / Moisture Content) | K 120.00 | K 175.00 |
| `MOD_COMPACTION` | `S-5.1.1` | AS 1289.5.2.1 | Modified Compaction Test (Dry Density / Moisture Content) | K 150.00 | K 220.00 |
| `CBR_SOAKED_4D` | `S-6.1.1` | AS 1289.6.1.1 | California Bearing Ratio - Remoulded Specimen (4-Day Soak) | K 180.00 | K 260.00 |
| `CBR_UNSOAKED` | `S-6.1.1` | AS 1289.6.1.1 | California Bearing Ratio - Remoulded Specimen (Unsoaked) | K 180.00 | K 260.00 |
| `CBR_UNDISTURBED` | `S-6.1.1` | AS 1289.6.1.1 | California Bearing Ratio - Undisturbed Specimen (4-Day Soak) | K 150.00 | K 220.00 |
| `SHRINK_SWELL_INDEX` | `S-7.1.1` | AS 1289.7.1.1 | Shrink-Swell Index | K 140.00 | K 190.00 |
| `SOIL_PH_ELEC` | `S-PH-1` | AS 1289.4.3.1 | Soil pH Value (Electrometric) | K 75.00 | K 95.00 |
| `SOIL_PERMEABILITY_FH`| `S-PERM-1` | AS 1289.6.7.2 | Soil Permeability (Falling Head) | K 450.00 | K 640.00 |
| `SOIL_PERMEABILITY_CH`| `S-PERM-2` | AS 1289.6.7.1 | Soil Permeability (Constant Head) | K 275.00 | K 390.00 |
| `CONSOLIDATION_TEST` | `S-CONS` | AS 1289.6.6.1 | One-Dimensional Consolidation Properties | K 600.00 | K 850.00 |
| `TRIAXIAL_MULTISTAGE` | `S-TRX-1` | AS 1289.6.4.2 | Triaxial Compression Test - Multistage | K 175.00 | K 250.00 |
| `TRIAXIAL_SET3` | `S-TRX-3` | AS 1289.6.4.1 | Triaxial Compression Test - Set of 3 Specimens | K 350.00 | K 500.00 |
| `UNCONFINED_COMP` | `S-UCS` | AS 1289.6.2.1 | Unconfined Compressive Strength of Cohesive Soil | K 100.00 | K 145.00 |

### 4.2 AGGREGATES (Category Code: `AGGREGATES`)
| Test Code | Official Form No. | Test Method / Standard | Test Description | Public Rate (PGK) | Private Rate (PGK) |
|---|---|---|---|---|---|
| `AGG_BULK_DENSITY` | `A-4` | AS 1141.4 | Bulk Density of Aggregate (Compacted / Uncompacted) | K 55.00 | K 80.00 |
| `AGG_PDWA_FINE` | `A-5` | AS 1141.5 | Particle Density & Water Absorption (Fine Aggregate) | K 95.00 | K 135.00 |
| `AGG_PDWA_COARSE` | `A-5` | AS 1141.6.1 | Particle Density & Water Absorption (Coarse Aggregate) | K 75.00 | K 110.00 |
| `AGG_PSD_DRY` | `A-11` | AS 1141.11.1 | Particle Size Distribution by Dry Sieving | K 130.00 | K 185.00 |
| `AGG_MINUS_75UM` | `A-12` | AS 1141.12 | Materials Finer than 75 µm by Washing | K 145.00 | K 210.00 |
| `AGG_PARTICLE_SHAPE` | `A-14` | AS 1141.14 | Particle Shape by Proportional Calliper | K 130.00 | K 185.00 |
| `AGG_FLAKINESS` | `A-15` | AS 1141.15 | Flakiness Index | K 75.00 | K 110.00 |
| `AGG_CRUSHED_PART` | `A-18` | AS 1141.18 | Crushed Particles in Coarse Aggregate | K 50.00 | K 70.00 |
| `AGG_ALD_GT10` | `A-20.1` | AS 1141.20.1 | Average Least Dimension (> 10mm) | K 110.00 | K 160.00 |
| `AGG_ALD_5_7` | `A-20.2` | AS 1141.20.2 | Average Least Dimension (5mm - 7mm) | K 110.00 | K 160.00 |
| `AGG_ACV` | `A-21` | AS 1141.21 | Aggregate Crushing Value (ACV - Two Tests) | K 245.00 | K 350.00 |
| `AGG_WET_DRY` | `A-22` | AS 1141.22 | Wet/Dry Strength Variation / 10% Fines Value | K 325.00 | K 465.00 |
| `AGG_LOS_ANGELES` | `A-23` | AS 1141.23 | Los Angeles Abrasion Loss | K 245.00 | K 350.00 |
| `AGG_SULPHATE_FINE` | `A-24-F` | AS 1141.24 | Sodium Sulphate Soundness (Fine Aggregate) | K 245.00 | K 350.00 |
| `AGG_SULPHATE_COARSE`| `A-24-C` | AS 1141.24 | Sodium Sulphate Soundness (Coarse Aggregate) | K 245.00 | K 350.00 |
| `AGG_WEAK_PARTICLES` | `A-32` | AS 1141.32 | Weak Particles (Clay lumps, soft and friable particles) | K 40.00 | K 55.00 |
| `AGG_FRACTURE_FACES` | `A-G6.2.4`| DoW Specs 6.2.4(e) | Fractured Faces in Crushed Gravel | K 50.00 | K 70.00 |

### 4.3 CONCRETE, MASONRY & PAVER UNITS (Category Code: `CONCRETE`)
| Test Code | Official Form No. | Test Method / Standard | Test Description | Public Rate (PGK) | Private Rate (PGK) |
|---|---|---|---|---|---|
| `CONC_SLUMP` | `C-1` | AS 1012.3.1 | Slump Test of Fresh Concrete | K 45.00 | K 65.00 |
| `CONC_SAMPLING` | `C-1` | AS 1012.1 | Sampling of Fresh Concrete | K 40.00 | K 55.00 |
| `CONC_UNIT_MASS` | `C-4` | AS 1012.5 | Mass per Unit Volume of Fresh Concrete | K 70.00 | K 100.00 |
| `CONC_CAST_CURE` | `C-8` | AS 1012.8 | Making and Curing Concrete Test Specimens | K 40.00 | K 55.00 |
| `CONC_CYLINDER_COMP` | `C-9` | AS 1012.9 | Compressive Strength of Concrete Cylinders | K 50.00 | K 65.00 |
| `CONC_INDIRECT_TENSILE`| `C-10` | AS 1012.10 | Indirect Tensile Strength of Concrete Cylinders | K 55.00 | K 80.00 |
| `CONC_FLEXURAL_RUPTURE`| `C-11` | AS 1012.11 | Modulus of Rupture (Flexural Strength) | K 80.00 | K 115.00 |
| `CONC_MASONRY_COMP` | `M-4` | AS/NZS 4456.4 | Compressive Strength of Concrete Masonry Units (Blocks)| K 80.00 | K 115.00 |
| `CONC_PAVER_BREAK` | `CP-5` | AS/NZS 4456.5 | Breaking Load of Concrete Paver Blocks | K 70.00 | K 90.00 |

### 4.4 FIELD INVESTIGATION & IN-SITU TESTING (Category Code: `FIELD`)
| Test Code | Official Form No. | Test Method / Standard | Test Description | Public Rate (PGK) | Private Rate (PGK) |
|---|---|---|---|---|---|
| `FIELD_DENSITY_SRT` | `S-5.3.1` | AS 1289.5.3.1 | Field Density Test (Sand Replacement Method) | K 75.00 | K 110.00 |
| `FIELD_DENSITY_NUCLEAR`| `S-5.8.1` | AS 1289.5.8.1 | Field Density Test (Nuclear Moisture-Density Gauge) | K 90.00 | K 130.00 |
| `FIELD_DCP_PAVEMENT` | `GI.6.3.2-E` | AS 1289.6.3.2 | Dynamic Cone Penetrometer (DCP) - Pavement (9kg Extendable)| K 100.00 | K 140.00 |
| `FIELD_DCP_FOUNDATION`| `GI.6.3.2-S` | AS 1289.6.3.2 | Dynamic Cone Penetrometer (DCP) - Foundation | K 140.00 | K 195.00 |
| `BENKELMAN_BEAM` | `Q701` | Q701-1978 / In-House | Benkelman Beam Deflection Test | K 140.00 | K 180.00 |
| `SCHMIDT_HAMMER` | `FIELD-SH` | AS 1012.14 / ASTM C805 | Schmidt Rebound Hammer Test on Concrete | K 45.00 | K 65.00 |
| `PLATE_BEARING` | `ASTM-D1196` | BS 1377-9 / ASTM D1196 | Plate Bearing Test (Subgrade In-Situ Modulus) | Custom Quote | Custom Quote |
| `TEST_PIT_LOGGING` | `FIELD-TP` | AS 1726 / DoW Std | Test Pit Excavation & Geotechnical Logging | N/A | K 200.00 |

### 4.5 ROCK TESTING (Category Code: `ROCK`)
| Test Code | Official Form No. | Test Method / Standard | Test Description | Public Rate (PGK) | Private Rate (PGK) |
|---|---|---|---|---|---|
| `ROCK_POINT_LOAD` | `GI-PTL` | IS 8764 / ASTM D5731 | Point Load Strength Index ($I_{s(50)}$) | K 65.00 | K 65.00 |

---

## 5. Mathematical & Engineering Calculations Discovered

Formulas directly extracted from legacy Excel templates (`templates/reports/`):

### 5.1 Dynamic Cone Penetrometer (Form `FDCP 1` / `Sheet1`)
From columns B, C, D, E rows 18-47:
1. **$e'$ Value (Penetration per blow, mm/blow):**
   $$e' = \frac{100}{\text{Blows per 100 mm}}$$
   Excel formula: `=SUM(100/B18)`
2. **In-Situ CBR Value (%):**
   $$\text{CBR} = 10^{\left(2.93 - 1.44 \times \log_{10}(e')\right)}$$
   Excel formula: `=10^(2.93-(1.44*(LOG(C18))))`
3. **Allowable Soil Bearing Capacity ($q_a$, kPa):**
   Looked up from calibrated reference table (`Sheet2!A3:B32`):
   - Blows = 1 $\to$ 38 kPa
   - Blows = 2 $\to$ 70 kPa
   - Blows = 3 $\to$ 100 kPa
   - Blows = 4 $\to$ 125 kPa
   - Blows = 5 $\to$ 148 kPa
   - Blows = 6 $\to$ 170 kPa
   - Blows = 7 $\to$ 185 kPa
   - Blows = 8 $\to$ 200 kPa
   - Blows = 10 $\to$ 240 kPa
   - Blows = 12 $\to$ 275 kPa
   - Blows = 15 $\to$ 310 kPa
   - Blows = 20 $\to$ 380 kPa
   - Blows = 30 $\to$ 490 kPa
   - Blows > 30 $\to$ `>490 kPa`

### 5.2 Concrete Cylinder Compressive Strength (Form `CCTR 1` / `Sheet2`)
From row 16:
1. **Specimen Age (days):**
   $$\text{Age} = \text{Date Tested} - \text{Date Cast}$$
   Excel formula: `=E16-C16`
2. **Cross-Sectional Area ($A$, $\text{mm}^2$):**
   $$A = \pi \times \left(\frac{D}{2}\right)^2$$
   Excel formula: `=PI()*(J16/2)^2`
3. **Compressive Strength ($f_c$, MPa):**
   $$f_c = \frac{\text{Maximum Load } (P, \text{kN}) \times 1000}{A}$$
   Rounded to nearest 0.1 MPa if $<10$ MPa, else rounded to nearest 0.5 MPa:
   Excel formula: `=IF(SUM(N16/L16*1000<10,(MROUND(SUM(N16/L16*1000),0.1))),(MROUND(SUM(N16/L16*1000),0.5)))`
4. **Density ($\rho$, $\text{kg/m}^3$):**
   $$\rho = \frac{\text{Mass } (\text{kg})}{\text{Volume } (\text{m}^3)}$$

### 5.3 Concrete Masonry Compressive Strength (Form `CMTR 2` / `Sheet2`)
From row 16:
1. **Gross Area ($A_g$, $\text{mm}^2$):**
   $$A_g = \text{Length } (L) \times \text{Height } (H)$$
   Excel formula: `=J16*K16`
2. **Uncorrected Compressive Strength (MPa):**
   $$f_{\text{uncorr}} = \frac{P \times 1000}{A_g}$$
   Excel formula: `=O16/M16*1000`
3. **Corrected Compressive Strength (Net Area basis, MPa):**
   $$f_{c} = \frac{P \times 1000}{A_{\text{net}}}$$
   Excel formula: `=O16/L16*1000`

### 5.4 Field Density Compaction (Form `FSTR 1` / `Sheet1`)
From row 23:
1. **Dry Density ($\rho_d$, $\text{t/m}^3$):**
   $$\rho_d = \frac{\rho_w}{1 + \frac{w}{100}}$$
2. **Density Ratio / Relative Compaction ($RC$, %):**
   $$RC = \frac{\text{Field Dry Density}}{\text{Adjusted MDD}} \times 100$$
   Excel formula: `=I23/J23*100`

### 5.5 Soils Index & Atterberg Testing (Form `STR 1` / `Feuil1`)
1. **Moisture Content ($w$, %):**
   $$w = \frac{M_{\text{wet+tare}} - M_{\text{dry+tare}}}{M_{\text{dry+tare}} - M_{\text{tare}}} \times 100$$
2. **Plasticity Index ($PI$):**
   $$PI = LL - PL$$
3. **Linear Shrinkage ($LS$, %):**
   $$LS = \left(1 - \frac{L_{\text{dry}}}{L_{\text{mold}}}\right) \times 100$$
4. **Plastic Modulus ($PM$):**
   $$PM = \frac{PI}{\% \text{ Passing } 0.425\text{mm}}$$
5. **Particle Size Ratios:**
   - Ratio $0.075 / 0.425 = \frac{\% < 0.075\text{mm}}{\% < 0.425\text{mm}}$
   - Gravel $\% = 100 - \% < 2.36\text{mm}$
   - Sand $\% = \% < 2.36\text{mm} - \% < 0.075\text{mm}$
   - Fines $\% = \% < 0.075\text{mm}$

### 5.6 Rock Point Load Strength Index ($I_s$, Form `GI-PTL`)
1. **Uncorrected Point Load Strength ($I_s$, MPa):**
   $$I_s = \frac{P \times 1000}{D_e^2}$$
2. **Size Correction Factor ($F$ or $K$ for 50mm core):**
   $$F = \left(\frac{D_e}{50}\right)^{0.45}$$
3. **Standard Point Load Strength Index ($I_{s(50)}$, MPa):**
   $$I_{s(50)} = F \times I_s$$
4. **Approximate Uniaxial Compressive Strength ($UCS$, MPa):**
   $$UCS \approx 20 \text{ to } 24 \times I_{s(50)}$$

---

## 6. Official Reports Catalogue

| Report ID | Form Number | Legacy Template File | Description | Output Format in DOW MS |
|---|---|---|---|---|
| `REPORT_STR` | `STR 1` | `Form No. STR 1_ Soils Test Report 10_02_23.xlsx` | Soil Test Report (Moisture, Atterberg, Compaction, Wet/Dry, Flakiness, Soundness, PSD) | PDF & Live HTML View |
| `REPORT_ATR` | `ATR 1` | `Form No. ATR 1_ Aggregate Test Report 10_02_2023 .xlsx` | Aggregate Test Report (Bulk Density, PD&WA, PSD, Flakiness, ALD, ACV, LA Abrasion, Wet/Dry) | PDF & Live HTML View |
| `REPORT_CCTR`| `CCTR 1` | `Form No. CCTR 1 _Concrete Cylinder Test Report.xlsx` | Concrete Cylinder Test Report (Age, Curing, Dimensions, Density, Compressive Strength) | PDF & Live HTML View |
| `REPORT_CMTR`| `CMTR 2` | `Form No. CMTR 2 _ Concrete Masonry Test Report.xlsx` | Concrete Masonry Test Report (Dimensions, Gross Area, Net Area, Compressive Strength) | PDF & Live HTML View |
| `REPORT_CPTR`| `CPTR 3` | `Form No. CPTR 3 _ Concrete Paver Test Report.xls` | Concrete Paver Test Report (Dimensions, Density, Breaking Load) | PDF & Live HTML View |
| `REPORT_FDCP`| `FDCP 1` | `Form No. FDCP 1_ Dynamic Cone Penetro Test Report.xlsx`| Dynamic Cone Penetrometer Test Report (Blows, e-value, CBR, Soil Bearing Capacity curve) | PDF & Live HTML View |
| `REPORT_FSTR`| `FSTR 1` | `Form No. FSTR 1 _ Field Density Test Report.xlsx` | Field Density / Compaction Test Report (Chainage, Wet/Dry Density, Adjusted MDD, Density Ratio)| PDF & Live HTML View |
| `REPORT_PLTR`| `PLTR 1` | `Form No. PLTR 1 _ Point Load Test Report.xls` | Point Load Test Report (Rock specimen dimensions, failure load, $I_{s(50)}$, UCS) | PDF & Live HTML View |

---

## 7. Laboratory Equipment Master & Calibration Register

Extracted from `Sample_registration.xlsx` (`EQUIP INVENTORY` sheet — 313 master entries):
- **Aggregate Testing Equipment:**
  - `PMA01`: 25L Measure - Unit Mass (`Soilcrete`, Cal. Form `CA-21 (CM)`, Internal, 12 months)
  - `PMA02`, `PMA03`: Rubber Mallet (`ACV`, Not required)
  - `PMA04`: Conical Mould (`Soilcrete`, Cal. Form `CA-05 (CM)`, Internal, 12 months)
  - `PMA05`, `PMA06`: ACV Cylinder & Plunger (`Soilcrete`, Cal. Form `CA-21 (CP)`, Internal, 12 months)
  - `PMA07`: Los Angeles Machine (`Geolab Sys`, Cal. Form `CA-23 (M)`, Internal, 12 months)
  - `PMA08`: Steel Balls (`Geolab Sys`, Cal. Form `CA-23 (SB)`, Internal, 12 months)
  - `PMA09`-`PMA12`: Measuring Cylinders (`Soilcrete`, 12 months)
  - `PMA13`-`PMA16`: Sodium Sulphate Soundness Baskets
- **Concrete Testing Equipment:**
  - Compression Testing Machines (Calibrated in accordance with **AS 2193 Grade A**)
  - Cylinder Moulds ($100\text{mm} \times 200\text{mm}$, $150\text{mm} \times 300\text{mm}$)
  - Slump Cones & Tamping Rods (AS 1012.3.1)
  - Curing Tanks (Temperature controlled $27^\circ\text{C} \pm 2^\circ\text{C}$ per tropical laboratory provisions)
- **Soil & Field Testing Equipment:**
  - CBR Mechanical Load Frame & Proving Rings
  - Dynamic Cone Penetrometers (9kg drop hammer, 500mm fall height, 60-degree cone tip)
  - Sand Replacement Pouring Cylinders & Calibration Containers

---

## 8. Workflow & Organizational Roles

Verified from `Review_of_request.xlsx`, `Quotation.xlsx`, and `Sample_registration.xlsx` (`PERSONAL ` sheet):

### 8.1 Personnel Roster & Roles
- **Regional Laboratory Manager (RLM) / Lab Manager:**
  - Historical Personnel: *Tracey Pinje* (Diploma - Civil) / *Kila Geno*
  - Responsibilities: Initial review of client requests, resource allocation, fee quotations, sample verification, assignment authorization, final report release.
- **Materials Testing Engineer (MTE) / Lab Engineer:**
  - Historical Personnel: *George Tolipio* (Diploma - Civil) / *David Avara* / *Leka H Bonoro* (AS/MST Authorizer)
  - Responsibilities: Technical evaluation criteria (`Review_of_request.xlsx`), test method suitability, calculation QA/verification, review and approval of technician raw data, signatory for engineering reports.
- **Senior Technical Officers & Technicians (STO1, STO2, TO1, TO2, TA):**
  - Historical Personnel: *Angela Dei*, *Jack Nugints*, *Daniel Noki*, *Joachim Siune*, *Sheba Bonoro*, *Simin Gore*, *Alex Hasu*
  - Responsibilities: Specimen preparation, measurement recording into raw worksheets, equipment operation, trial recording, result submission.
- **Client:**
  - Creates testing requests, provides project/sample provenance, approves quotations, tracks testing progress, downloads authorized certificates.

### 8.2 End-to-End Core Workflow
```text
CLIENT REQUEST (Form RQ-LT)
   ↓
MANAGER & TECHNICAL REVIEW (Form: Review_of_request.xlsx)
   [Evaluates: Method available? Equipment calibrated? Personnel competent? Samples sufficient?]
   ├── REJECT (Reason returned to client)
   └── ACCEPT
          ↓
      QUOTATION GENERATION (Form 04P/24: Quotation.xlsx)
      [Subtotals: Mobilisation + Field Work + Lab Testing + Reporting + 3% Admin Surcharge]
          ↓
      CLIENT APPROVAL / PURCHASE ORDER
          ↓
      SAMPLE REGISTRATION (Sample_registration.xlsx)
      [Unique IDs: 26P-S-001 (Soils), 26P-A-001 (Aggregate), 26P-C-001 (Concrete), 26P-R-001 (Rock), 26P-F-001 (Field)]
      [Generate Secure QR Verification Tokens]
          ↓
      TEST ASSIGNMENT (Manager assigns to Technicians with Target Deadlines)
          ↓
      TEST EXECUTION & RAW DATA ENTRY
      [Tare weights, gauge readings, load in kN, blow counts per 100mm]
          ↓
      CALCULATION ENGINE PROCESSING (Live, non-destructive calculation)
          ↓
      TECHNICAL REVIEW & APPROVAL (Engineer David Avara / George Tolipio)
          ├── REQUEST REVISION (Technician corrects raw entries, revisions tracked in audit log)
          └── APPROVE TEST RESULTS
                 ↓
             OFFICIAL REPORT GENERATION (STR 1, ATR 1, CCTR 1, CMTR 2, CPTR 3, FDCP 1, FSTR 1, PLTR 1)
                 ↓
             FINAL REPORT REVIEW & AUTHORIZED SIGNATURE
                 ↓
             RELEASE TO CLIENT & CERTIFICATE AVAILABILITY
```

---

## 9. Current DOW MS Implementation vs Legacy Requirements

| Component | Status in DOW MS | Legacy Alignment & Required Action |
|---|---|---|
| **Prisma Database Schema** | Excellent foundation | Supports `Laboratory`, `User`, `Role`, `Client`, `Project`, `TestingRequest`, `RequestEvaluation`, `Quotation`, `QuotationItem`, `Sample`, `TestType`, `LabTest`, `Measurement`, `Calculation`, `Equipment`, `CalibrationRecord`, `TestReport`, `ReportVersion`, `AuditLog`. Requires expanding `TestType` seed and adding specific report template codes. |
| **Test Catalogue** | Partially Implemented (12 tests) | 12 tests seeded in DB; must expand to complete 40+ tests across Soils, Aggregates, Concrete, Rock, and Field, with authentic PNG DoW rates (Public vs Private) and standard references. |
| **Calculation Engine** | Implemented for Soils | `calculation-engine.ts` currently covers Moisture, Atterberg, Sieve, Proctor, CBR, Specific Gravity. **Missing:** Dynamic Cone Penetrometer ($e'$, CBR, bearing capacity), Concrete Cylinder ($A$, density, compressive strength with MROUND), Concrete Masonry ($A_g$, $A_{\text{net}}$, strength), Field Density ($RC$, adjusted MDD), Rock Point Load ($I_{s(50)}$, UCS). |
| **Quotation System** | Implemented | Backend supports `Quotation` and `QuotationItem` with `adminSurchargeRate` default 0.03 (3%). Aligns with `Quotation.xlsx`. |
| **Technical Review of Request** | Implemented | `RequestEvaluation` model maps directly to legacy `Review_of_request.xlsx` criteria (method, equipment, personnel, quantity, condition). |
| **Sample Registration & Numbering**| Implemented | Configurable sample prefixes (`26P-S-`, `26P-A-`, `26P-C-`, `26P-R-`, `26P-F-`). Supports QR tokens. |
| **Test Assignment & Work Queue** | Implemented | Manager assignment, technician `work-queue`, status tracking (`not_started`, `in_progress`, `completed`, `reviewed`, `approved`). |
| **Raw vs Calculated Separation**| Implemented | Schema enforces separate `rawMeasurements` (JSON) and `calculatedResults` (JSON) plus dedicated `Measurement` and `Calculation` history tables. |
| **Reports Engine** | Partially Implemented | Reports module exists, but needs dedicated structured builders matching `STR 1`, `ATR 1`, `CCTR 1`, `CMTR 2`, `CPTR 3`, `FDCP 1`, `FSTR 1`, and `PLTR 1`. |
| **Audit Trail** | Implemented | `AuditLog` records actor, action, entity, previous/new values across tests, samples, and reports. |

---

## 10. Items Requiring Qualified Laboratory Engineer Verification
1. **Cone Liquid Limit vs Casagrande Standard:** Ensure PNG DoW currently calibrates 80g / 30-degree cone penetration at 20mm vs BS 1377 / AS 1289.3.9.
2. **CBR Swell Criteria:** Confirm default surcharge weight (4.5 kg / 4 disc weights) for soaked specimens.
3. **Dynamic Cone Penetrometer Correlation:** Confirm whether the Kleyn correlation ($CBR = 10^{(2.93 - 1.44 \log e')}$) remains the mandatory standard across all provincial road divisions.
4. **Concrete Cylinder Curing Period:** Confirm whether accelerated tropical curing or standard 28-day moist room curing is mandatory for compliance reporting.

---

## 11. Proposed Phased Implementation Plan

1. **Phase 2 — Domain Model & Test Catalogue Harmonization:**
   - Enhance backend test catalogue seeder with the full verified 40+ tests from `Sample_registration.xlsx` and `invoice.xlsx`.
   - Update rates (Public/Private), units, turnaround times, and report template mapping.
2. **Phase 3 — Extended Calculation Engine:**
   - Add modules to `calculation-engine.ts` for:
     - `DCP_TEST`: Penetration rate $e'$, CBR calculation, and allowable soil bearing capacity.
     - `CONCRETE_CYLINDER`: Cylinder area, density, compressive strength with standard step rounding.
     - `CONCRETE_MASONRY`: Gross/net area compressive strength.
     - `FIELD_DENSITY`: Dry density, moisture, adjusted MDD, and relative compaction.
     - `POINT_LOAD`: Rock size correction factor, $I_{s(50)}$, and estimated UCS.
   - Add comprehensive unit tests in `test/calculation-engine.unit.test.ts`.
3. **Phase 4 — Specialized Test Entry Forms:**
   - Build/verify test-specific UI input views in the frontend (`apps/web/src/app/(dashboard)/tests/[id]`) for Soils, Concrete, Field (DCP/FSTR), Aggregates, and Rock, separating raw observations from calculated values.
4. **Phase 5 — Laboratory Report Generation:**
   - Implement report data generators and HTML/PDF rendering templates corresponding to `STR 1`, `ATR 1`, `CCTR 1`, `CMTR 2`, `CPTR 3`, `FDCP 1`, `FSTR 1`, and `PLTR 1`.
   - Ensure complete traceability from client request $\to$ sample $\to$ test assignment $\to$ raw observations $\to$ calculations $\to$ engineer approval $\to$ signed report.
5. **Phase 6 — Verification & Testing:**
   - Run unit and integration tests across security, calculations, assignments, and reporting.

