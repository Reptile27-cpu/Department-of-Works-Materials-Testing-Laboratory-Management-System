import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

async function testStamp() {
  console.log('Testing PDF stamping with pdf-lib...');

  const templateRelPath = 'AGGREGATE/Form A_11 PSD.pdf';
  const templatePath = path.resolve(__dirname, '../../reference-templates/test_forms', templateRelPath);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found at: ${templatePath}`);
  }

  const existingPdfBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const pages = pdfDoc.getPages();
  console.log(`Loaded template with ${pages.length} pages.`);

  const sampleNumber = '26P-S-015';
  const qrToken = 'c8b2a3f4-1234-5678-9abc-def012345678';
  const requestNumber = 'RQ-2026-0042';
  const testCode = 'AGG_PSD_DRY';
  const testStandard = 'AS 1141.11.1';

  // Standard existing QR payload
  const qrPayload = `DOW-MS|SAMPLE|${sampleNumber}|${qrToken}`;

  const qrPngDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'H',
    width: 200,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  const base64Data = qrPngDataUrl.replace(/^data:image\/png;base64,/, '');
  const qrImageBytes = Buffer.from(base64Data, 'base64');
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    console.log(`Page ${i + 1}: ${width} x ${height}`);

    // Badge dimensions
    const badgeWidth = 175;
    const badgeHeight = 52;
    const badgeX = width - badgeWidth - 16;
    const badgeY = height - badgeHeight - 10;
    const qrSize = 46;

    // Draw high-contrast white card background with crisp border
    page.drawRectangle({
      x: badgeX,
      y: badgeY,
      width: badgeWidth,
      height: badgeHeight,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 0.8,
    });

    // Draw QR code inside badge
    page.drawImage(qrImage, {
      x: badgeX + 3,
      y: badgeY + (badgeHeight - qrSize) / 2,
      width: qrSize,
      height: qrSize,
    });

    // Badge text
    const textX = badgeX + qrSize + 7;
    let textY = badgeY + badgeHeight - 11;

    page.drawText('PNG DOW LAB TRACKING', {
      x: textX,
      y: textY,
      size: 6.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    textY -= 9;
    page.drawText(`SAMPLE: ${sampleNumber}`, {
      x: textX,
      y: textY,
      size: 7,
      font: fontBold,
      color: rgb(0.7, 0.3, 0.0), // Amber/Rust
    });

    textY -= 8.5;
    page.drawText(`REQ REF: ${requestNumber}`, {
      x: textX,
      y: textY,
      size: 6,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });

    textY -= 8;
    page.drawText(`TEST: ${testCode} (${testStandard})`, {
      x: textX,
      y: textY,
      size: 5.5,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });

    textY -= 7.5;
    page.drawText('Scan QR to verify custody & log data', {
      x: textX,
      y: textY,
      size: 5,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  const outputBytes = await pdfDoc.save();
  const outDir = path.resolve(__dirname, '../../scratch/output_tests');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'Form_A_11_PSD_stamped.pdf');
  fs.writeFileSync(outPath, outputBytes);
  console.log(`✅ Stamped PDF saved successfully: ${outPath} (${outputBytes.length} bytes)`);
}

testStamp().catch((err) => {
  console.error('Test stamp failed:', err);
  process.exit(1);
});
