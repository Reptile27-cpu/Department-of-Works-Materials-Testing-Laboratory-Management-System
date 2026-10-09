# Department of Works laboratory template integration

Inspection date: 5 October 2026. The files under `reference-templates/` were inspected as supplied. The original files remain unchanged.

## Inventory

| Template | Format | Intended use identified from its contents | Current application relationship |
| --- | --- | --- | --- |
| `sample/Sample_registration.xlsx` | Excel, five material registers plus equipment, personnel, master-form/standard and price/reference sheets | Soils, aggregate, concrete, rock and field sample registers; sample number, date received, receiver, client, project, description, assigned personnel, selected test forms/equipment, notes | Sample records and assignments exist in the app. The spreadsheet's per-material test columns and sample numbering are not yet mapped cell-by-cell. |
| `request/request.xlsx` (Form RQ-LT) | Excel | Request for laboratory testing; client, project, sample, requested tests, and request details | Project and sample records exist. Request-specific fields and review lifecycle are not represented as a complete mapped workflow. |
| `review/Review_of_request.xlsx` | Excel | Evaluation of review of requests, tenders and contracts; methods, resource availability, uncertainty, turnaround, subcontracting, legal, confidentiality, remarks and proceed approval | No complete matching review record exists. Criteria and decision fields need mapping before digitization. |
| `reports/Form No. STR 1_ Soils Test Report 10_02_23.xlsx` | Excel | Soils test report (STR 1) | Sample and test records/results exist, but this report's exact result cells and selection logic have not been mapped. |
| `reports/Form No. ATR 1_ Aggregate Test Report 10_02_2023 .xlsx` | Excel | Aggregate test report (ATR 1) | Sample and test records/results exist, but exact result cells and selection logic have not been mapped. |
| `reports/Form No. FSTR 1 _ Field Density Test Report.xlsx` | Excel | Field density test report (FSTR 1) | Requires field-density-specific data mapping. |
| `reports/Form No. FDCP 1_ Dynamic Cone Penetro Test Report.xlsx` | Excel | Dynamic cone penetrometer report (FDCP 1) | Requires DCP-specific data mapping. |
| `reports/Form No. PLTR 1 _ Point Load Test Report.xls` | Excel 97–2003 | Point load test report (PLTR 1) | Requires point-load data mapping. |
| `reports/Form No. CCTR 1 _Concrete Cylinder Test Report.xlsx` | Excel | Concrete cylinder test report (CCTR 1) | Requires cylinder-specific data mapping. |
| `reports/Form No. CMTR 2 _ Concrete Masonry Test Report.xlsx` | Excel | Concrete masonry test report (CMTR 2) | Requires masonry-specific data mapping. |
| `reports/Form No. CPTR 3 _ Concrete Paver Test Report.xls` | Excel 97–2003 | Concrete paver test report (CPTR 3) | Requires paver-specific data mapping. |
| `PAVEMENT MATERIAL TEST REPORT (2).docx` | Word | Pavement material test report, AS1289 & AS1141; soils and aggregate results with approved-signatory/date area | It is a summary report across multiple test types. Its fields have not been mapped to a stable report snapshot. |
| `test_forms/AGGREGATE/*.pdf` (16 files) | PDF worksheets | A-4, A-5, A-11, A-12, A-14, A-15, A-18, A-20.1, A-20.2, A-21, A-22, A-23, A-24 fine/coarse, A-32, A-G6.2.4 worksheets | They define distinct aggregate input/measurement sheets. No one-to-one entry schemas or output-field maps exist yet. |
| `test_forms/SOILS/*.pdf` (9 files, one unreadable) | PDF worksheets | S-2.1.1 moisture content; S-3.1.1 Atterberg/linear shrinkage; S-3.5.1 particle density; S-3.6.1 PSD; S-3.9 cone liquid limit; S-5.1.1 compaction; S-6.1.1 CBR pages 1 and 2; `MC.pdf` is an invalid/truncated PDF | Existing generic test records and some calculation engines do not establish equivalence to all fields/formulas on these worksheets. |
| `test_forms/FIELD/*.pdf` (4 files) | PDF worksheets | C-1 concrete sampling/labels (two files), GI-6.3.2E DCP, S-5.3.1 sand replacement field density | Requires field-worksheet-specific inputs and outputs. |
| `test_forms/CONCRETE/*.pdf` (3 files) | PDF worksheets | C-9 cylinder compressive strength, M-4 masonry compressive strength, CP-5 paver breaking load | Requires concrete/masonry/paver-specific inputs and outputs. |
| `test_forms/ROCK/*.pdf` (1 file) | PDF worksheet | GI-PTLoad point load strength index | Requires point-load inputs and output mapping. |
| `invoice/invoice.xlsx` | Excel | Public and private invoice sheets plus historical price list | Client/project records could supply some identity fields. The application has no invoice record/model or approved fee/rate configuration. |
| `quotation/Quotation.xlsx` | Excel | Service quote with mobilisation, field work, laboratory testing, reporting, subtotals and 3% admin line | The application has no quotation record/model. Rates, quantities, approval and final totals must not be inferred from sample/test records. |

There are also three files that are not usable report templates in their current form: `invoice/invoice_template.xlsx` (24 bytes; not a valid Excel workbook), `test_forms/CONCRETE/slump_test.xlsx` (32 bytes; not a valid workbook), and `quotation/quotation_template.pdf` (26 bytes; invalid/truncated PDF). `test_forms/SOILS/MC.pdf` is also an invalid/truncated PDF. These require replacement source files. Temporary Excel lock files (`~$...`) were excluded.

## Confirmed field mapping

These mappings are supported by labels in the forms and existing database fields. The same underlying record must supply repeated values throughout a report.

| Template label | Application field | Source | Confidence |
| --- | --- | --- | --- |
| Sample No. / LAB Sample no / LAB SAMPLE No | `sample.sampleNumber` | Sample database record | Confirmed |
| Client / CLIENT | `sample.project.client` when a project is linked | Project database record | Confirmed when linked; otherwise review/enter the form-specific client |
| Project / PROJECT | `sample.project.name` | Project database record | Confirmed when a project is linked |
| Location / LOCATION | `sample.sourceLocation` | Sample database record | Confirmed |
| Material description / MATERIAL DESCRIPTION | `sample.description` | Sample database record | Confirmed |
| Material source / MATERIAL SOURCE | `sample.sourceLocation` | Sample database record | Candidate only: template distinguishes material source from location; confirm with lab staff before mapping |
| Depth | `sample.samplingDepth` | Sample database record | Confirmed when populated |
| Sampling date / DATE SAMPLE | `sample.dateSampled` | Sample database record | Confirmed when populated |
| Date received / C.DATE RECEIVED | `sample.dateReceived` | Sample database record | Confirmed |
| Sampled by | `sample.sampledBy` | Sample database record | Confirmed when populated |
| Received by | `sample.receivedBy` | Sample database record | Confirmed |
| Tested by / Technician | `labTest.technician` | Test assignment | Candidate: report forms use “Tested by”; confirm whether assignment is the correct source |
| Checked by / Reviewer | `labTest.reviewer` | Test review record | Candidate: reviewer association exists, but the template sign-off semantics must be confirmed |
| Measurement/result cells | `labTest.rawMeasurements` / `labTest.calculatedResults` | Test record | Not mapped cell-by-cell; do not emit a report from generic results until each form is reconciled |
| Remarks | `labTest.remarks` | Test record | Candidate: applicable form-specific remarks may have a distinct meaning |
| Approved Signatory / Signature / Date | No confirmed digital signature source | Approval workflow | Preserve as a blank/signatory placeholder; never fabricate a signature or imply approval |

## Calculation and layout findings

- The request, review and official report Excel workbooks have different sheet structures, merged areas and print layouts. The eight report workbooks are not interchangeable, and two are legacy `.xls` files.
- The pavement report groups soil and aggregate results together. Individual result fields, test selection, and display units need reconciliation with the source worksheets before mapping.
- The invoice workbook contains public/private sheets and a price list. Visible formulas include line amount as quantity × rate, subtotal sums, and an admin-cost line based on a 3% cell. A discount calculation and lookup ranges also appear. These must be reviewed with the department before any backend reproduction; the rates and sample entries in the workbook are not live configuration.
- The quotation workbook contains quantity × rate line totals, section subtotals, a 3% admin line and a grand total. It includes example names, rates, quantities and job details. No values from this example are treated as defaults.
- The field density report has four result formulas of the form `I/J*100`. The two concrete specimen workbooks calculate net values, specimen areas and strengths/ratios; the paver workbook calculates area, a volume using a `67` multiplier, load/area results and an average. The point-load workbook derives stress, a size-corrected index and a strength value. The exact meanings, units, rounding and acceptance of those workbook formulas must be reconciled with the labelled input cells and lab-approved methods before implementation.
- The DCP workbook contains 90 formulas, including a reciprocal calculation, an empirical logarithmic relationship, and lookup-table outputs from a second sheet. These are technical calculations and remain unimplemented pending laboratory verification of the method, units, lookup table and edge cases.
- The soils report workbook has five formulas for a percentage complement, a ratio with a zero check, and particle-size summary values. These cells depend on result entries in that sheet; the example workbook values are not application data.
- The sample-register equipment inventory includes formulas deriving a next calibration date from a calibration interval. This legacy interval conversion also needs confirmation before replacing the app's equipment calibration records.
- Example values and legacy formulas are present in multiple report workbooks. They are not assumed to represent current measurements, approved results, or the application calculation contract.
- The PDF worksheets were inspected page-by-page. The two CBR files are each one page and together form the two-page S-6.1.1 worksheet. The source PDF extraction is available in `scratch/pdf-template-extraction.txt` for review; two PDFs could not be parsed as noted above.
- Excel workbook properties, worksheet names, merged-cell ranges, populated cells/formulas, and print areas were inspected. No original template has been edited.

## Application status and review queue

The application already has sample, project, test, review, calculation, and report records. Its report screen currently produces a generic certificate snapshot, not any of the Department's supplied report layouts. Excel/PDF export from the official layouts, preview/print parity, template-based entry forms, and report revision history are not yet implemented. A stored report record must not be described as a generated official PDF or Excel report.

Before implementation of individual forms, obtain lab confirmation for:

1. The exact mapping and supported data source for each field and result cell in each of the eight Excel report types and the pavement summary.
2. Which tests/results are required for each report and what constitutes a complete report.
3. Technician, checker/reviewer and approved-signatory responsibility and whether distinct users are required.
4. Current report numbering, revision numbering, and the official status transition sequence.
5. Whether the report workbook examples' result units, formula cells and example figures are authoritative/current.
6. Invoice/quotation ownership, current rate tables, discount rules, admin-cost treatment, and approval policy.
7. Replacement files for the four invalid/template-placeholder files listed above.
8. Clarification of the two C-1 concrete sampling/label forms and whether both are active.

Until these items are resolved, no uncertain cell, formula, acceptance criterion, fee, test method, or approval phrase should be added to generated outputs. The uploaded references remain the source of truth and this mapping is intentionally explicit about fields still needing confirmation.
