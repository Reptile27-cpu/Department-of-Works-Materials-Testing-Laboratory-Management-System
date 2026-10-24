import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import {
  TEST_FORM_REGISTRY,
  getReferenceTemplatesBaseDir,
  FormTemplateInfo,
} from './test-form-registry';

export interface TestFormContext {
  sample: {
    id: string;
    sampleNumber: string;
    qrToken?: string | null;
    materialType: string;
    description?: string | null;
    sourceLocation?: string | null;
    storageLocation?: string | null;
    clientReference?: string | null;
    dateReceived: string | Date;
    dateSampled?: string | Date | null;
  };
  request?: {
    id?: string;
    requestNumber: string;
    clientName?: string | null;
    projectName?: string | null;
    location?: string | null;
  } | null;
  test: {
    id: string;
    testNumber: string;
    status: string;
    testType: {
      code: string;
      name: string;
      standard: string;
      category: string;
    };
    technician?: {
      firstName: string;
      lastName: string;
      designation?: string | null;
    } | null;
  };
}

export class TestFormGeneratorService {
  /**
   * Generates the standard scannable QR payload identical to the existing system.
   */
  public static getQrPayload(sampleNumber: string, qrTokenOrId: string): string {
    return `DOW-MS|SAMPLE|${sampleNumber}|${qrTokenOrId}`;
  }

  /**
   * Generates a PNG Data URL for the QR code with high error correction.
   */
  public static async generateQrPngBuffer(payload: string): Promise<Buffer> {
    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      width: 280,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    return Buffer.from(base64, 'base64');
  }

  /**
   * Stamps the existing QR code and metadata on a loaded PDFDocument.
   */
  public static async stampDocumentWithQr(
    pdfDoc: PDFDocument,
    context: TestFormContext,
    qrImageBytes: Buffer
  ): Promise<void> {
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const effectiveQrToken = context.sample.qrToken || context.sample.id;
    const requestRef = context.request?.requestNumber || context.sample.clientReference || 'N/A';
    const sampleNum = context.sample.sampleNumber;
    const testCode = context.test.testType.code;
    const testStandard = context.test.testType.standard;
    const testNum = context.test.testNumber;

    const pages = pdfDoc.getPages();

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      const isLandscape = width > height;

      // Badge placement in clear top-right header area
      const badgeWidth = isLandscape ? 190 : 180;
      const badgeHeight = 54;
      const margin = 14;
      const badgeX = width - badgeWidth - margin;
      const badgeY = height - badgeHeight - margin;
      const qrSize = 48;

      // High-contrast badge container with clean outline
      page.drawRectangle({
        x: badgeX,
        y: badgeY,
        width: badgeWidth,
        height: badgeHeight,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.12, 0.15, 0.2),
        borderWidth: 0.9,
      });

      // Embed QR code on the left side of badge
      page.drawImage(qrImage, {
        x: badgeX + 3,
        y: badgeY + (badgeHeight - qrSize) / 2,
        width: qrSize,
        height: qrSize,
      });

      // Vertical divider inside badge
      page.drawLine({
        start: { x: badgeX + qrSize + 5, y: badgeY + 4 },
        end: { x: badgeX + qrSize + 5, y: badgeY + badgeHeight - 4 },
        thickness: 0.5,
        color: rgb(0.8, 0.82, 0.85),
      });

      const textX = badgeX + qrSize + 9;
      let textY = badgeY + badgeHeight - 11;

      // Line 1: Header
      page.drawText('PNG DOW LABORATORY', {
        x: textX,
        y: textY,
        size: 6.5,
        font: fontBold,
        color: rgb(0.1, 0.12, 0.18),
      });

      // Line 2: Sample Number (bold amber)
      textY -= 9;
      page.drawText(`SAMPLE: ${sampleNum}`, {
        x: textX,
        y: textY,
        size: 7.2,
        font: fontBold,
        color: rgb(0.8, 0.35, 0.0),
      });

      // Line 3: Request Ref
      textY -= 8.5;
      page.drawText(`REQ REF: ${requestRef}`, {
        x: textX,
        y: textY,
        size: 6.2,
        font: font,
        color: rgb(0.2, 0.25, 0.3),
      });

      // Line 4: Test & Standard
      textY -= 8;
      const testLine = `${testCode} • ${testNum}`;
      page.drawText(testLine.length > 25 ? testLine.slice(0, 24) + '…' : testLine, {
        x: textX,
        y: textY,
        size: 5.8,
        font: fontBold,
        color: rgb(0.15, 0.45, 0.4),
      });

      // Line 5: Standard
      textY -= 7.5;
      page.drawText(testStandard.length > 27 ? testStandard.slice(0, 26) + '…' : testStandard, {
        x: textX,
        y: textY,
        size: 5.2,
        font: font,
        color: rgb(0.4, 0.45, 0.5),
      });

      // Line 6: Scan prompt
      textY -= 6.5;
      page.drawText('Scan QR for Chain of Custody', {
        x: textX,
        y: textY,
        size: 4.8,
        font: font,
        color: rgb(0.45, 0.5, 0.55),
      });
    }
  }

  /**
   * Generates a printable official QR tracking label PDF (for tests without a reference template or as fallback).
   */
  public static async generatePrintableLabelPdf(context: TestFormContext): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();

    // Standard Label size: Landscape A5 (595.28 x 419.53 pt) or Half-Letter
    // Clean, readable dimensions on any standard office printer
    const page = pdfDoc.addPage([595.28, 419.53]);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const effectiveQrToken = context.sample.qrToken || context.sample.id;
    const qrPayload = this.getQrPayload(context.sample.sampleNumber, effectiveQrToken);
    const qrBytes = await this.generateQrPngBuffer(qrPayload);
    const qrImage = await pdfDoc.embedPng(qrBytes);

    // Outer border
    page.drawRectangle({
      x: 18,
      y: 18,
      width: width - 36,
      height: height - 36,
      borderColor: rgb(0.08, 0.12, 0.18),
      borderWidth: 1.5,
    });

    // Top banner header
    page.drawRectangle({
      x: 18,
      y: height - 64,
      width: width - 36,
      height: 46,
      color: rgb(0.06, 0.12, 0.22),
    });

    page.drawText('INDEPENDENT STATE OF PAPUA NEW GUINEA', {
      x: 32,
      y: height - 34,
      size: 9,
      font: fontBold,
      color: rgb(0.9, 0.75, 0.3),
    });

    page.drawText('DEPARTMENT OF WORKS & HIGHWAYS • CENTRAL MATERIALS TESTING LABORATORY', {
      x: 32,
      y: height - 47,
      size: 7.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText('OFFICIAL TEST WORKSHEET TRACKING LABEL', {
      x: 32,
      y: height - 58,
      size: 7,
      font: font,
      color: rgb(0.8, 0.85, 0.9),
    });

    // Large QR Code on left
    const qrBoxSize = 150;
    const qrBoxX = 32;
    const qrBoxY = height - 76 - qrBoxSize;

    page.drawRectangle({
      x: qrBoxX,
      y: qrBoxY,
      width: qrBoxSize,
      height: qrBoxSize,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.2, 0.25, 0.3),
      borderWidth: 1,
    });

    page.drawImage(qrImage, {
      x: qrBoxX + 6,
      y: qrBoxY + 6,
      width: qrBoxSize - 12,
      height: qrBoxSize - 12,
    });

    // Scannable payload text below QR
    page.drawText('SCANNABLE QR IDENTITY PAYLOAD:', {
      x: qrBoxX,
      y: qrBoxY - 14,
      size: 6.5,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.4),
    });

    page.drawText(qrPayload, {
      x: qrBoxX,
      y: qrBoxY - 26,
      size: 6,
      font: font,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText('Scan with DoW terminal or phone camera to open active worksheet', {
      x: qrBoxX,
      y: qrBoxY - 37,
      size: 5.5,
      font: font,
      color: rgb(0.4, 0.45, 0.5),
    });

    // Right side information fields
    const infoX = qrBoxX + qrBoxSize + 22;
    let currY = height - 85;

    const drawField = (label: string, value: string, isHighlight = false) => {
      page.drawText(label.toUpperCase(), {
        x: infoX,
        y: currY,
        size: 7,
        font: fontBold,
        color: rgb(0.4, 0.45, 0.5),
      });
      currY -= 13;
      page.drawText(value || 'N/A', {
        x: infoX,
        y: currY,
        size: isHighlight ? 12 : 9,
        font: fontBold,
        color: isHighlight ? rgb(0.85, 0.35, 0.0) : rgb(0.08, 0.12, 0.18),
      });
      currY -= 14;
    };

    drawField('Sample Number (Specimen ID)', context.sample.sampleNumber, true);
    drawField('Testing Request Reference', context.request?.requestNumber || context.sample.clientReference || 'N/A');
    drawField('Test Name & Method', `${context.test.testType.name} (${context.test.testType.standard})`);
    drawField('Test Tracking Number', `${context.test.testNumber} [${context.test.testType.code}]`);
    drawField('Material Type & Description', `${context.sample.materialType} • ${context.sample.description || 'General Specimen'}`);
    drawField('Client / Project', `${context.request?.clientName || 'Central Works'} — ${context.request?.projectName || 'Public Infrastructure'}`);

    const techName = context.test.technician
      ? `${context.test.technician.firstName} ${context.test.technician.lastName}`
      : 'Pending Assignment';
    drawField('Assigned Worker / Date', `${techName} • Intake: ${new Date(context.sample.dateReceived).toLocaleDateString()}`);

    // Footer notice
    page.drawLine({
      start: { x: 30, y: 38 },
      end: { x: width - 30, y: 38 },
      thickness: 0.5,
      color: rgb(0.7, 0.75, 0.8),
    });

    page.drawText('INSTRUCTION: Affix this printable QR tracking label to physical specimen bag, container, or manual bench worksheet.', {
      x: 32,
      y: 26,
      size: 6.5,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.3),
    });

    const outputBytes = await pdfDoc.save();
    return Buffer.from(outputBytes);
  }

  /**
   * Generates a stamped test form PDF for a specific test in the context.
   * If template is available, stamps the read-only original.
   * If template is missing, generates the printable label fallback.
   */
  public static async generateTestFormPdf(context: TestFormContext): Promise<{
    buffer: Buffer;
    filename: string;
    hasTemplate: boolean;
    templateFilesUsed: string[];
  }> {
    const testCode = context.test.testType.code;
    const templateInfo = TEST_FORM_REGISTRY[testCode];

    // If no template in registry or explicitly flagged without template
    if (!templateInfo || !templateInfo.hasTemplate || templateInfo.templateFiles.length === 0) {
      const buffer = await this.generatePrintableLabelPdf(context);
      return {
        buffer,
        filename: `${context.sample.sampleNumber}_${testCode}_Label.pdf`,
        hasTemplate: false,
        templateFilesUsed: [],
      };
    }

    const baseDir = getReferenceTemplatesBaseDir();
    const loadedDocs: PDFDocument[] = [];
    const validTemplateFilesUsed: string[] = [];

    for (const relFile of templateInfo.templateFiles) {
      const fullPath = path.resolve(baseDir, relFile);
      if (fs.existsSync(fullPath)) {
        try {
          const fileBytes = fs.readFileSync(fullPath);
          const doc = await PDFDocument.load(fileBytes);
          loadedDocs.push(doc);
          validTemplateFilesUsed.push(relFile);
        } catch (err) {
          console.error(`Failed to load template ${fullPath}:`, err);
        }
      } else {
        console.warn(`Template file missing on disk: ${fullPath}`);
      }
    }

    if (loadedDocs.length === 0) {
      // Fallback if physical file missing or corrupt
      const buffer = await this.generatePrintableLabelPdf(context);
      return {
        buffer,
        filename: `${context.sample.sampleNumber}_${testCode}_Label.pdf`,
        hasTemplate: false,
        templateFilesUsed: [],
      };
    }

    // Merge pages from all template files for this test (e.g. 2-page CBR test or coarse+fine)
    const combinedDoc = await PDFDocument.create();
    for (const doc of loadedDocs) {
      const copiedPages = await combinedDoc.copyPages(doc, doc.getPageIndices());
      copiedPages.forEach((p) => combinedDoc.addPage(p));
    }

    // Generate QR PNG bytes once
    const effectiveQrToken = context.sample.qrToken || context.sample.id;
    const qrPayload = this.getQrPayload(context.sample.sampleNumber, effectiveQrToken);
    const qrPngBytes = await this.generateQrPngBuffer(qrPayload);

    // Stamp badge on all pages
    await this.stampDocumentWithQr(combinedDoc, context, qrPngBytes);

    const outputBytes = await combinedDoc.save();
    return {
      buffer: Buffer.from(outputBytes),
      filename: `${context.sample.sampleNumber}_${testCode}_Form.pdf`,
      hasTemplate: true,
      templateFilesUsed: validTemplateFilesUsed,
    };
  }

  /**
   * Bundles all test forms for a sample or request into a single consolidated PDF document.
   */
  public static async generateSampleBundlePdf(
    sample: TestFormContext['sample'],
    request: TestFormContext['request'],
    tests: TestFormContext['test'][]
  ): Promise<{ buffer: Buffer; filename: string; totalForms: number }> {
    const bundleDoc = await PDFDocument.create();
    let totalForms = 0;

    for (const test of tests) {
      const ctx: TestFormContext = {
        sample,
        request,
        test,
      };

      const result = await this.generateTestFormPdf(ctx);
      const singleDoc = await PDFDocument.load(result.buffer);
      const copiedPages = await bundleDoc.copyPages(singleDoc, singleDoc.getPageIndices());
      copiedPages.forEach((p) => bundleDoc.addPage(p));
      totalForms++;
    }

    const outputBytes = await bundleDoc.save();
    return {
      buffer: Buffer.from(outputBytes),
      filename: `${sample.sampleNumber}_All_Test_Forms_Bundle.pdf`,
      totalForms,
    };
  }
}
