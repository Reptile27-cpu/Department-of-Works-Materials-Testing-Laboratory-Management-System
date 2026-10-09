import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export interface ReportPdfData {
  id: string;
  reportNumber: string;
  title: string;
  summary?: string | null;
  status: string;
  issuedAt?: string | Date | null;
  createdAt: string | Date;
  revisionNumber?: number;
  laboratory?: {
    name?: string;
    department?: string;
    division?: string;
    address?: string;
    phone?: string;
    email?: string;
  } | null;
  sample: {
    id: string;
    sampleNumber: string;
    materialType: string;
    description?: string | null;
    sourceLocation?: string | null;
    samplingDepth?: string | null;
    dateSampled?: string | Date | null;
    dateReceived: string | Date;
    condition?: string | null;
    sampledBy?: string | null;
    clientReference?: string | null;
    project?: {
      projectCode?: string | null;
      name?: string | null;
      client?: string | null;
      location?: string | null;
    } | null;
    tests?: Array<{
      testNumber: string;
      status: string;
      testDate?: string | Date | null;
      calculatedResults?: any;
      measurements?: any;
      testType: {
        name: string;
        standard: string;
        category: string;
        unit?: string | null;
        reportTemplate?: string | null;
      };
      technician?: {
        firstName: string;
        lastName: string;
        designation?: string | null;
      } | null;
      reviewer?: {
        firstName: string;
        lastName: string;
        designation?: string | null;
      } | null;
    }>;
  };
  generatedBy?: {
    firstName: string;
    lastName: string;
    designation?: string | null;
  } | null;
  approvedBy?: {
    firstName: string;
    lastName: string;
    designation?: string | null;
  } | null;
  reportData?: any;
}

function findLogoPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'assets/image/favicon.png'),
    path.resolve(process.cwd(), '../assets/image/favicon.png'),
    path.resolve(process.cwd(), 'apps/web/public/logo.png'),
    path.resolve(process.cwd(), '../apps/web/public/logo.png'),
    path.resolve(__dirname, '../../../../assets/image/favicon.png'),
    path.resolve(__dirname, '../../../../apps/web/public/logo.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function generateReportPdf(data: ReportPdfData): Promise<Buffer> {
  // Generate QR code for verification
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reports/${data.id}`;
  const qrBuffer = await QRCode.toBuffer(
    JSON.stringify({
      reportNumber: data.reportNumber,
      sampleNumber: data.sample.sampleNumber,
      status: data.status,
      verify: verificationUrl,
    }),
    {
      width: 120,
      margin: 1,
      errorCorrectionLevel: 'M',
    }
  );

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 36, // 0.5 inch margins
      info: {
        Title: data.title || `Test Report ${data.reportNumber}`,
        Author: 'PNG Department of Works Laboratory Services',
        Subject: `Materials Testing Certificate for ${data.sample.sampleNumber}`,
        Keywords: 'DoW, Materials Testing, Quality Assurance, Papua New Guinea',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 72; // 36 margin each side

    // 1. PILOT WARNING BANNER (Required by specification)
    doc.rect(36, 12, contentWidth, 18).fill('#fee2e2');
    doc
      .fillColor('#991b1b')
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .text(
        'PILOT / TESTING ENVIRONMENT — Do not enter confidential or official government data.',
        36,
        17,
        { align: 'center', width: contentWidth }
      );

    // 2. OFFICIAL LETTERHEAD
    let headerY = 38;
    const logoPath = findLogoPath();
    if (logoPath) {
      try {
        doc.image(logoPath, 40, headerY, { width: 50, height: 50 });
      } catch {
        // Fallback gracefully if image parsing fails
      }
    }

    doc
      .fillColor('#0f172a')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('INDEPENDENT STATE OF PAPUA NEW GUINEA', 96, headerY, { width: contentWidth - 60, align: 'center' });

    doc
      .fillColor('#1e3a8a')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('DEPARTMENT OF WORKS AND HIGHWAYS', 96, headerY + 15, { width: contentWidth - 60, align: 'center' });

    doc
      .fillColor('#334155')
      .fontSize(9.5)
      .font('Helvetica')
      .text('CENTRAL MATERIALS TESTING LABORATORY', 96, headerY + 32, { width: contentWidth - 60, align: 'center' });

    doc
      .fillColor('#64748b')
      .fontSize(7.5)
      .text('P.O. Box 1108, Boroko, NCD, Papua New Guinea | Phone: +675 324 1100 | materials.lab@dow.gov.pg', 96, headerY + 44, {
        width: contentWidth - 60,
        align: 'center',
      });

    // Horizontal separator line
    doc
      .moveTo(36, headerY + 58)
      .lineTo(pageWidth - 36, headerY + 58)
      .lineWidth(1.5)
      .strokeColor('#1e3a8a')
      .stroke();

    // 3. DOCUMENT TITLE BLOCK
    const titleY = headerY + 66;
    doc
      .rect(36, titleY, contentWidth, 24)
      .fill('#f1f5f9');

    const FORM_TITLES: Record<string, string> = {
      REPORT_STR: 'SOIL TEST REPORT (FORM STR 1)',
      REPORT_ATR: 'AGGREGATE TEST REPORT (FORM ATR 1)',
      REPORT_CCTR: 'CONCRETE CYLINDER TEST REPORT (FORM CCTR 1)',
      REPORT_CMTR: 'CONCRETE MASONRY TEST REPORT (FORM CMTR 2)',
      REPORT_CPTR: 'CONCRETE PAVER TEST REPORT (FORM CPTR 3)',
      REPORT_FDCP: 'DYNAMIC CONE PENETROMETER REPORT (FORM FDCP 1)',
      REPORT_FSTR: 'FIELD DENSITY & COMPACTION REPORT (FORM FSTR 1)',
      REPORT_PLTR: 'POINT LOAD TEST REPORT (FORM PLTR 1)',
    };

    const primaryTemplate = data.sample.tests?.[0]?.testType?.reportTemplate;
    const formBanner = (primaryTemplate && FORM_TITLES[primaryTemplate])
      ? `${FORM_TITLES[primaryTemplate]} & CERTIFICATE OF CONFORMANCE`
      : 'OFFICIAL MATERIALS TEST REPORT & CERTIFICATE OF CONFORMANCE';

    doc
      .fillColor('#0f172a')
      .fontSize(10.5)
      .font('Helvetica-Bold')
      .text(formBanner, 36, titleY + 6, {
        align: 'center',
        width: contentWidth,
      });

    // 4. REPORT METADATA & QR CODE
    const metaY = titleY + 30;
    const halfWidth = (contentWidth - 90) / 2;

    // Left metadata column
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e293b');
    doc.text('Report Number:', 40, metaY);
    doc.font('Helvetica').text(data.reportNumber, 120, metaY);

    doc.font('Helvetica-Bold').text('Date Generated:', 40, metaY + 14);
    doc.font('Helvetica').text(new Date(data.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), 120, metaY + 14);

    doc.font('Helvetica-Bold').text('Date Issued:', 40, metaY + 28);
    doc.font('Helvetica').text(
      data.issuedAt
        ? new Date(data.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Pending Final Authorization',
      120,
      metaY + 28
    );

    doc.font('Helvetica-Bold').text('Report Status:', 40, metaY + 42);
    const statusColor = data.status === 'issued' ? '#166534' : data.status === 'approved' ? '#0369a1' : '#b45309';
    doc.font('Helvetica-Bold').fillColor(statusColor).text(data.status.toUpperCase(), 120, metaY + 42);

    // Right metadata column
    const col2X = 40 + halfWidth + 10;
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e293b');
    doc.text('Revision:', col2X, metaY);
    doc.font('Helvetica').text(`Rev ${data.revisionNumber ?? 0}`, col2X + 80, metaY);

    doc.font('Helvetica-Bold').text('Lab Facility:', col2X, metaY + 14);
    doc.font('Helvetica').text(data.laboratory?.name || 'DoW Central Materials Lab', col2X + 80, metaY + 14, { width: halfWidth - 85 });

    doc.font('Helvetica-Bold').text('Testing Standards:', col2X, metaY + 28);
    doc.font('Helvetica').text('AS 1289 / AS 1141 / AS 1012', col2X + 80, metaY + 28);

    doc.font('Helvetica-Bold').text('Verification:', col2X, metaY + 42);
    doc.font('Helvetica').text('Encrypted QR Validation', col2X + 80, metaY + 42);

    // Embedded QR Code (top right)
    const qrX = pageWidth - 36 - 65;
    doc.image(qrBuffer, qrX, metaY - 2, { width: 62, height: 62 });
    doc.fontSize(6).font('Helvetica').fillColor('#64748b').text('Scan to Verify', qrX, metaY + 62, { width: 62, align: 'center' });

    // 5. SAMPLE & CLIENT INFORMATION BOX
    const infoY = metaY + 76;
    doc.rect(36, infoY, contentWidth, 80).fill('#f8fafc').strokeColor('#cbd5e1').lineWidth(0.8).stroke();

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text('SAMPLE & CLIENT INFORMATION', 44, infoY + 6);
    doc.moveTo(44, infoY + 17).lineTo(pageWidth - 44, infoY + 17).lineWidth(0.5).strokeColor('#e2e8f0').stroke();

    const infoCol1 = 44;
    const infoCol2 = 44 + (contentWidth / 2);
    const rowH = 13;

    // Row 1
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155').text('Sample ID:', infoCol1, infoY + 22);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(data.sample.sampleNumber, infoCol1 + 75, infoY + 22);

    doc.font('Helvetica-Bold').fillColor('#334155').text('Client Organization:', infoCol2, infoY + 22);
    doc.font('Helvetica').fillColor('#0f172a').text(data.sample.project?.client || 'DoW Civil Works', infoCol2 + 90, infoY + 22, { width: (contentWidth / 2) - 100 });

    // Row 2
    doc.font('Helvetica-Bold').fillColor('#334155').text('Material Type:', infoCol1, infoY + 22 + rowH);
    doc.font('Helvetica').fillColor('#0f172a').text(data.sample.materialType, infoCol1 + 75, infoY + 22 + rowH);

    doc.font('Helvetica-Bold').fillColor('#334155').text('Project Code & Name:', infoCol2, infoY + 22 + rowH);
    const projDesc = `${data.sample.project?.projectCode || 'N/A'} - ${data.sample.project?.name || 'Provincial Road Infrastructure'}`;
    doc.font('Helvetica').fillColor('#0f172a').text(projDesc, infoCol2 + 90, infoY + 22 + rowH, { width: (contentWidth / 2) - 100 });

    // Row 3
    doc.font('Helvetica-Bold').fillColor('#334155').text('Source / Quarry:', infoCol1, infoY + 22 + (rowH * 2));
    doc.font('Helvetica').fillColor('#0f172a').text(data.sample.sourceLocation || 'N/A', infoCol1 + 75, infoY + 22 + (rowH * 2), { width: 180 });

    doc.font('Helvetica-Bold').fillColor('#334155').text('Client Reference:', infoCol2, infoY + 22 + (rowH * 2));
    doc.font('Helvetica').fillColor('#0f172a').text(data.sample.clientReference || 'N/A', infoCol2 + 90, infoY + 22 + (rowH * 2));

    // Row 4
    doc.font('Helvetica-Bold').fillColor('#334155').text('Date Sampled:', infoCol1, infoY + 22 + (rowH * 3));
    doc.font('Helvetica').fillColor('#0f172a').text(
      data.sample.dateSampled ? new Date(data.sample.dateSampled).toLocaleDateString('en-GB') : 'N/A',
      infoCol1 + 75,
      infoY + 22 + (rowH * 3)
    );

    doc.font('Helvetica-Bold').fillColor('#334155').text('Date Received in Lab:', infoCol2, infoY + 22 + (rowH * 3));
    doc.font('Helvetica').fillColor('#0f172a').text(
      new Date(data.sample.dateReceived).toLocaleDateString('en-GB'),
      infoCol2 + 90,
      infoY + 22 + (rowH * 3)
    );

    // 6. TEST RESULTS TABLE
    let tableY = infoY + 90;
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5).text('LABORATORY TEST RESULTS & ENGINEERING MEASUREMENTS', 36, tableY);

    tableY += 15;
    // Table header
    doc.rect(36, tableY, contentWidth, 20).fill('#1e3a8a');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
    doc.text('Test Method / Standard', 42, tableY + 6, { width: 160 });
    doc.text('Property / Parameter', 205, tableY + 6, { width: 140 });
    doc.text('Result', 350, tableY + 6, { width: 85, align: 'center' });
    doc.text('Unit', 440, tableY + 6, { width: 45, align: 'center' });
    doc.text('Status', 490, tableY + 6, { width: 65, align: 'center' });

    let currentY = tableY + 20;
    const tests = data.sample.tests || [];

    if (tests.length === 0) {
      doc.rect(36, currentY, contentWidth, 25).fill('#f8fafc').strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      doc.fillColor('#64748b').font('Helvetica-Oblique').fontSize(8.5).text('No test records attached to this report.', 44, currentY + 7);
      currentY += 25;
    } else {
      for (const test of tests) {
        // Extract results from calculatedResults or measurements
        const calc = test.calculatedResults || {};
        const entries = Object.entries(calc);

        if (entries.length === 0) {
          // Single row with general status
          doc.rect(36, currentY, contentWidth, 20).fill('#ffffff').strokeColor('#e2e8f0').lineWidth(0.5).stroke();
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text(test.testType.name, 42, currentY + 5, { width: 160 });
          doc.font('Helvetica').text(test.testType.standard, 205, currentY + 5, { width: 140 });
          doc.text('Completed', 350, currentY + 5, { width: 85, align: 'center' });
          doc.text(test.testType.unit || '-', 440, currentY + 5, { width: 45, align: 'center' });
          doc.font('Helvetica-Bold').fillColor('#166534').text(test.status.toUpperCase(), 490, currentY + 5, { width: 65, align: 'center' });
          currentY += 20;
        } else {
          // Multiple rows for each calculated parameter
          let isFirst = true;
          for (const [key, value] of entries) {
            if (typeof value === 'object' && value !== null) continue; // skip nested structures
            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
            const displayValue = typeof value === 'number' ? value.toFixed(2) : String(value);

            doc.rect(36, currentY, contentWidth, 18).fill('#ffffff').strokeColor('#f1f5f9').lineWidth(0.5).stroke();

            if (isFirst) {
              doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text(test.testType.name, 42, currentY + 4, { width: 160 });
              doc.font('Helvetica').fontSize(7).fillColor('#475569').text(test.testType.standard, 42, currentY + 11, { width: 160 });
            }

            doc.fillColor('#1e293b').font('Helvetica').fontSize(8).text(formattedKey, 205, currentY + 5, { width: 140 });
            doc.font('Helvetica-Bold').fillColor('#0f172a').text(displayValue, 350, currentY + 5, { width: 85, align: 'center' });
            doc.font('Helvetica').fillColor('#64748b').text(test.testType.unit || '-', 440, currentY + 5, { width: 45, align: 'center' });

            if (isFirst) {
              doc.font('Helvetica-Bold').fillColor('#166534').text(test.status.toUpperCase(), 490, currentY + 5, { width: 65, align: 'center' });
              isFirst = false;
            }

            currentY += 18;
          }
        }
      }
    }

    // 7. REMARKS / SUMMARY NOTE
    if (data.summary) {
      currentY += 8;
      doc.rect(36, currentY, contentWidth, 32).fill('#f8fafc').strokeColor('#cbd5e1').lineWidth(0.5).stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#334155').text('ENGINEERING NOTES & OBSERVATIONS:', 42, currentY + 4);
      doc.font('Helvetica').fontSize(7.5).fillColor('#0f172a').text(data.summary, 42, currentY + 14, { width: contentWidth - 12 });
      currentY += 36;
    } else {
      currentY += 10;
    }

    // 8. SIGNATURE / AUTHORIZATION BLOCK
    // Ensure we don't overflow the page
    const signY = Math.max(currentY + 10, 670);

    doc.rect(36, signY, contentWidth, 75).strokeColor('#cbd5e1').lineWidth(0.8).stroke();

    const signColWidth = contentWidth / 2;

    // Left signature: Tested by
    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8).text('TESTED & COMPILED BY:', 46, signY + 6);
    doc.moveTo(46, signY + 42).lineTo(46 + signColWidth - 40, signY + 42).lineWidth(0.8).strokeColor('#94a3b8').stroke();
    const techName = data.generatedBy ? `${data.generatedBy.firstName} ${data.generatedBy.lastName}` : 'Authorized Materials Technician';
    const techDesig = data.generatedBy?.designation || 'Laboratory Technician';
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text(techName, 46, signY + 46);
    doc.font('Helvetica').fontSize(7).fillColor('#64748b').text(techDesig, 46, signY + 56);

    // Right signature: Approved by
    const signCol2X = 36 + signColWidth + 10;
    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8).text('REVIEWED & APPROVED BY:', signCol2X, signY + 6);
    doc.moveTo(signCol2X, signY + 42).lineTo(pageWidth - 46, signY + 42).lineWidth(0.8).strokeColor('#94a3b8').stroke();
    const apprName = data.approvedBy ? `${data.approvedBy.firstName} ${data.approvedBy.lastName}` : 'Chief Materials Engineer / Lab Manager';
    const apprDesig = data.approvedBy?.designation || 'Principal Materials Quality Engineer';
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text(apprName, signCol2X, signY + 46);
    doc.font('Helvetica').fontSize(7).fillColor('#64748b').text(apprDesig, signCol2X, signY + 56);

    // 9. FOOTER / LEGAL DISCLAIMER
    const footerY = 760;
    doc
      .fillColor('#64748b')
      .fontSize(6.5)
      .font('Helvetica')
      .text(
        'LEGAL NOTICE: Test results relate only to the sample items physically tested. This certificate shall not be reproduced except in full without the written permission of the Central Materials Testing Laboratory, Department of Works and Highways, Papua New Guinea.',
        36,
        footerY,
        { width: contentWidth, align: 'center' }
      );

    doc
      .fontSize(6.5)
      .font('Helvetica-Bold')
      .text(`Document Ref: ${data.reportNumber} | Verifiable at: ${verificationUrl}`, 36, footerY + 16, {
        width: contentWidth,
        align: 'center',
      });

    doc.end();
  });
}

