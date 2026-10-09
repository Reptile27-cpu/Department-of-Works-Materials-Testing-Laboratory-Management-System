import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireReviewer } from '../../middleware/auth.middleware';
import { prisma } from '../../config/database';
import { v4 as uuidv4 } from 'uuid';

export const quotationRoutes = Router();
quotationRoutes.use(authenticate);

export interface QuotationLineItem {
  id: string;
  testCode: string;
  testName: string;
  standard: string;
  quantity: number;
  unitRate: number; // in PGK (Kina)
  total: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  requestId: string;
  requestNumber: string;
  clientName: string;
  projectName: string;
  location: string;
  lineItems: QuotationLineItem[];
  subtotal: number;
  administrativeSurchargeRate: number; // 0.03 (3%)
  administrativeSurchargeAmount: number; // Subtotal * 0.03
  grandTotal: number; // Subtotal + Surcharge
  currency: 'PGK';
  termsAndConditions: string;
  preparedBy: string;
  validUntil: string;
  status: 'DRAFT' | 'ISSUED' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

// Standard Fee Schedule (PGK)
const FEE_SCHEDULE: Record<string, { code: string; name: string; standard: string; rate: number }> = {
  'moisture': { code: 'SOIL_MOISTURE', name: 'Moisture Content Determination', standard: 'AS 1289.2.1.1', rate: 150.00 },
  'sieve': { code: 'SIEVE_ANALYSIS', name: 'Particle Size Distribution (Dry Sieving)', standard: 'AS 1289.3.6.1', rate: 350.00 },
  'atterberg': { code: 'ATTERBERG_LIMITS', name: 'Atterberg Limits & Linear Shrinkage (LL, PL, PI, LS)', standard: 'AS 1289.3.1.1', rate: 400.00 },
  'proctor': { code: 'PROCTOR_COMPACTION', name: 'Standard Proctor Compaction Test (Dry Density/OMC)', standard: 'AS 1289.5.1.1', rate: 550.00 },
  'cbr': { code: 'CBR_TEST', name: 'California Bearing Ratio (CBR) - Standard 4-Day Soaked', standard: 'AS 1289.6.1.1', rate: 850.00 },
  'concrete': { code: 'CONCRETE_CYLINDER', name: 'Compressive Strength of Concrete Cylinders', standard: 'AS 1012.9', rate: 120.00 },
  'la': { code: 'AGGREGATE_TEST', name: 'Los Angeles Abrasion Loss', standard: 'AS 1141.23', rate: 600.00 },
  'dcp': { code: 'DCP_TEST', name: 'Dynamic Cone Penetrometer (DCP) In-Situ Test', standard: 'AS 1289.6.3.2', rate: 300.00 },
};

function getLineItemForTest(testName: string, quantity = 1): QuotationLineItem {
  const tn = testName.toLowerCase();
  let fee = FEE_SCHEDULE['moisture'];

  if (tn.includes('sieve') || tn.includes('particle size')) fee = FEE_SCHEDULE['sieve'];
  else if (tn.includes('atterberg') || tn.includes('liquid') || tn.includes('plastic')) fee = FEE_SCHEDULE['atterberg'];
  else if (tn.includes('proctor') || tn.includes('compaction') || tn.includes('density')) fee = FEE_SCHEDULE['proctor'];
  else if (tn.includes('cbr') || tn.includes('california bearing')) fee = FEE_SCHEDULE['cbr'];
  else if (tn.includes('concrete')) fee = FEE_SCHEDULE['concrete'];
  else if (tn.includes('los angeles') || tn.includes('abrasion')) fee = FEE_SCHEDULE['la'];
  else if (tn.includes('dcp') || tn.includes('cone penetrometer')) fee = FEE_SCHEDULE['dcp'];

  const lineTotal = Number((fee.rate * quantity).toFixed(2));
  return {
    id: uuidv4(),
    testCode: fee.code,
    testName: fee.name,
    standard: fee.standard,
    quantity,
    unitRate: fee.rate,
    total: lineTotal,
  };
}

let quotationCounter = 2;

export const inMemoryQuotations: Quotation[] = [
  {
    id: 'quot-001',
    quotationNumber: 'QT-2026-0001',
    requestId: 'req-001',
    requestNumber: 'DW-REQ-2026-0001',
    clientName: 'PNG Road Construction Test Client',
    projectName: 'E2E Laboratory Verification Project',
    location: 'Port Moresby',
    lineItems: [
      getLineItemForTest('Moisture Content Determination'),
      getLineItemForTest('Particle Size Distribution (Dry Sieving)'),
      getLineItemForTest('Atterberg Limits & Linear Shrinkage (LL, PL, PI, LS)'),
      getLineItemForTest('Standard Proctor Compaction Test (Dry Density/OMC)'),
      getLineItemForTest('California Bearing Ratio (CBR) - Standard 4-Day Soaked'),
    ],
    subtotal: 2300.00,
    administrativeSurchargeRate: 0.03, // 3%
    administrativeSurchargeAmount: 69.00, // 2300 * 0.03
    grandTotal: 2369.00,
    currency: 'PGK',
    termsAndConditions: 'Payment due within 30 days of testing commencement. Results retained until settlement.',
    preparedBy: 'Tracey Pinje (Laboratory Manager)',
    validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    status: 'ISSUED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// GET /api/v1/quotations
quotationRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status } = req.query;
    let list = inMemoryQuotations;
    if (status && status !== 'all') {
      list = list.filter((q) => q.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(
        (item) =>
          item.quotationNumber.toLowerCase().includes(q) ||
          item.clientName.toLowerCase().includes(q) ||
          item.projectName.toLowerCase().includes(q)
      );
    }
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/quotations - Generate Form QT-01 Quotation
quotationRoutes.post('/', requireReviewer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestId, clientName, projectName, location, items } = req.body;

    let requestItem: any = null;
    if (requestId) {
      try {
        requestItem = await prisma.testingRequest.findFirst({
          where: {
            OR: [
              { id: typeof requestId === 'string' && requestId.length === 36 ? requestId : undefined },
              { requestNumber: requestId },
            ].filter(Boolean) as any,
          },
          include: { client: true, project: true, requestItems: { include: { testType: true } } },
        });
      } catch {
        // Safe fallback
      }
    }

    const resolvedClient = clientName || requestItem?.client?.name || requestItem?.contactPerson || 'Valued Client';
    const resolvedProject = projectName || requestItem?.project?.name || 'General Laboratory Testing Works';
    const resolvedLocation = location || requestItem?.location || 'Port Moresby';

    let lineItems: QuotationLineItem[] = [];

    if (Array.isArray(items) && items.length > 0) {
      lineItems = items.map((item: any) => {
        const rate = Number(item.unitRate || 150);
        const qty = Number(item.quantity || 1);
        return {
          id: uuidv4(),
          testCode: item.testCode || 'SOIL_TEST',
          testName: item.testName || 'Laboratory Test',
          standard: item.standard || 'AS 1289',
          quantity: qty,
          unitRate: rate,
          total: Number((rate * qty).toFixed(2)),
        };
      });
    } else if (requestItem && requestItem.requestItems && requestItem.requestItems.length > 0) {
      lineItems = requestItem.requestItems.map((item: any) => ({
        id: uuidv4(),
        testCode: item.testType?.code || 'TEST',
        testName: item.testType?.name || 'Laboratory Test',
        standard: item.testType?.standard || 'AS 1289',
        quantity: item.quantity || 1,
        unitRate: Number(item.unitPrice || item.testType?.unitPricePrivate || 150),
        total: Number(((item.quantity || 1) * Number(item.unitPrice || 150)).toFixed(2)),
      }));
    } else {
      lineItems = [getLineItemForTest('Moisture Content Determination')];
    }

    const subtotal = Number(lineItems.reduce((acc, curr) => acc + curr.total, 0).toFixed(2));
    const administrativeSurchargeRate = 0.03; // Exactly 3.0%
    const administrativeSurchargeAmount = Number((subtotal * administrativeSurchargeRate).toFixed(2));
    const grandTotal = Number((subtotal + administrativeSurchargeAmount).toFixed(2));

    const year = new Date().getFullYear();
    const quotationNumber = `QT-${year}-${String(quotationCounter++).padStart(4, '0')}`;

    const newQuotation: Quotation = {
      id: uuidv4(),
      quotationNumber,
      requestId: requestItem?.id || requestId || '',
      requestNumber: requestItem?.requestNumber || '',
      clientName: resolvedClient,
      projectName: resolvedProject,
      location: resolvedLocation,
      lineItems,
      subtotal,
      administrativeSurchargeRate,
      administrativeSurchargeAmount,
      grandTotal,
      currency: 'PGK',
      termsAndConditions: 'All tests performed under ISO/IEC 17025 accredited procedures. 3% administrative surcharge applies to all public authority services.',
      preparedBy: req.user?.email ? `Staff (${req.user.email})` : 'Laboratory Manager',
      validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: 'ISSUED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryQuotations.unshift(newQuotation);

    if (requestItem) {
      requestItem.quotationId = newQuotation.id;
      requestItem.status = 'QUOTED';
      requestItem.updatedAt = new Date().toISOString();
    }

    res.status(201).json({ success: true, data: newQuotation });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/quotations/:id
quotationRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = inMemoryQuotations.find(
      (item) => item.id === req.params.id || item.quotationNumber === req.params.id
    );
    if (!q) {
      return res.status(404).json({ success: false, error: { message: 'Quotation not found' } });
    }
    res.json({ success: true, data: q });
  } catch (error) {
    next(error);
  }
});
