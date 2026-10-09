import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { pagination, laboratoryScope, assertLaboratory } from '../../utils/route-helpers';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { generateReportPdf } from './report-generator.service';

export const reportRoutes = Router();
reportRoutes.use(authenticate);

// Generate report input validation
const generateReportInput = z.object({
  sampleId: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  summary: z.string().optional(),
});

// GET /api/v1/reports - List all test reports
reportRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, pageSize, skip, take } = pagination(req);
    const labId = req.user!.role === 'system_admin' || req.user!.role === 'super_admin'
      ? (typeof req.query.laboratoryId === 'string' ? req.query.laboratoryId : undefined)
      : req.user!.laboratoryId;

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const where: any = {
      ...(labId ? { laboratoryId: labId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { reportNumber: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } },
              { sample: { sampleNumber: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [reports, total] = await Promise.all([
      prisma.testReport.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          sample: {
            select: {
              id: true,
              sampleNumber: true,
              materialType: true,
              sourceLocation: true,
              project: {
                select: {
                  projectCode: true,
                  name: true,
                  client: true,
                },
              },
            },
          },
          generatedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              designation: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              designation: true,
            },
          },
        },
      }),
      prisma.testReport.count({ where }),
    ]);

    res.json({
      success: true,
      data: reports,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/reports/export/samples - Export sample register to Excel (.xlsx)
reportRoutes.get('/export/samples', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const labId = req.user!.role === 'system_admin' || req.user!.role === 'super_admin'
      ? (typeof req.query.laboratoryId === 'string' ? req.query.laboratoryId : undefined)
      : req.user!.laboratoryId;

    const samples = await prisma.sample.findMany({
      where: labId ? { laboratoryId: labId } : {},
      orderBy: { sampleNumber: 'desc' },
      include: {
        project: { select: { projectCode: true, name: true, client: true } },
        tests: { select: { testNumber: true, status: true, testType: { select: { name: true } } } },
      },
      take: 1000,
    });

    const rows = samples.map((s) => ({
      'Sample Number': s.sampleNumber,
      'Material Type': s.materialType,
      'Description': s.description || '',
      'Project Code': s.project?.projectCode || 'N/A',
      'Project Name': s.project?.name || 'N/A',
      'Client Reference': s.clientReference || 'N/A',
      'Source Location': s.sourceLocation || '',
      'Sampling Depth': s.samplingDepth || '',
      'Date Sampled': s.dateSampled ? new Date(s.dateSampled).toLocaleDateString() : '',
      'Date Received': new Date(s.dateReceived).toLocaleDateString(),
      'Priority': s.priority.toUpperCase(),
      'Status': s.status.toUpperCase(),
      'Total Tests': s.tests.length,
      'Completed Tests': s.tests.filter((t: any) => t.status === 'approved' || t.status === 'completed').length,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Register');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="DoW_Lab_Sample_Register_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/reports/sample/:id/receipt - Sample receipt / Chain of Custody sheet
reportRoutes.get('/sample/:id/receipt', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sample = await prisma.sample.findUnique({
      where: { id: req.params.id },
      include: {
        laboratory: true,
        project: true,
        tests: {
          include: {
            testType: true,
            technician: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!sample) {
      throw new NotFoundError('Sample record not found');
    }
    assertLaboratory(req, sample.laboratoryId);

    res.json({
      success: true,
      data: {
        receiptNumber: `REC-${sample.sampleNumber}`,
        generatedAt: new Date().toISOString(),
        organization: {
          name: sample.laboratory?.name || 'PNG Department of Works Central Materials Testing Laboratory',
          department: sample.laboratory?.department || 'Department of Works and Highways',
          division: sample.laboratory?.division || 'Materials Testing & Quality Assurance Division',
          phone: sample.laboratory?.phone || '+675 324 1100',
          email: sample.laboratory?.email || 'materials.lab@dow.gov.pg',
        },
        sample: {
          id: sample.id,
          sampleNumber: sample.sampleNumber,
          materialType: sample.materialType,
          description: sample.description,
          sourceLocation: sample.sourceLocation,
          samplingDepth: sample.samplingDepth,
          dateSampled: sample.dateSampled,
          dateReceived: sample.dateReceived,
          condition: sample.condition,
          storageLocation: sample.storageLocation,
          priority: sample.priority,
          status: sample.status,
          sampledBy: sample.sampledBy,
          clientReference: sample.clientReference,
          project: sample.project,
        },
        tests: sample.tests.map((t) => ({
          testNumber: t.testNumber,
          testName: t.testType.name,
          standard: t.testType.standard,
          status: t.status,
          technician: t.technician ? `${t.technician.firstName} ${t.technician.lastName}` : 'Unassigned',
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/reports/generate or POST /api/v1/reports - Generate test certificate
const generateReportHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = generateReportInput.parse(req.body);
    laboratoryScope(req);

    const sample = await prisma.sample.findUnique({
      where: { id: input.sampleId },
      include: {
        project: true,
        laboratory: true,
        tests: {
          include: {
            testType: true,
            technician: { select: { firstName: true, lastName: true, designation: true } },
            reviewer: { select: { firstName: true, lastName: true, designation: true } },
          },
        },
      },
    });

    if (!sample) {
      throw new NotFoundError('Sample not found');
    }
    assertLaboratory(req, sample.laboratoryId);

    // Generate unique report number: REP-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countThisYear = await prisma.testReport.count({
      where: {
        reportNumber: { startsWith: `REP-${currentYear}-` },
      },
    });
    const seq = (countThisYear + 1).toString().padStart(4, '0');
    const reportNumber = `REP-${currentYear}-${seq}`;

    // Build comprehensive certificate snapshot
    const reportSnapshot = {
      reportNumber,
      generatedAt: new Date().toISOString(),
      organization: {
        department: sample.laboratory?.department || 'Department of Works and Highways',
        division: sample.laboratory?.division || 'Materials Testing & Quality Assurance Division',
        laboratoryName: sample.laboratory?.name || 'Central Materials Laboratory',
      },
      client: {
        reference: sample.clientReference || 'N/A',
        projectCode: sample.project?.projectCode || 'N/A',
        projectName: sample.project?.name || 'N/A',
        clientName: sample.project?.client || 'Department of Works',
        location: sample.project?.location || sample.sourceLocation || 'N/A',
      },
      sample: {
        sampleNumber: sample.sampleNumber,
        materialType: sample.materialType,
        description: sample.description,
        sourceLocation: sample.sourceLocation,
        samplingDepth: sample.samplingDepth,
        dateReceived: sample.dateReceived,
        dateSampled: sample.dateSampled,
      },
      testResults: sample.tests.map((t: any) => ({
        testNumber: t.testNumber,
        name: t.testType.name,
        standard: t.testType.standard,
        status: t.status,
        calculatedResults: t.calculatedResults,
        testDate: t.testDate,
        technician: t.technician ? `${t.technician.firstName} ${t.technician.lastName}` : null,
        reviewer: t.reviewer ? `${t.reviewer.firstName} ${t.reviewer.lastName}` : null,
      })),
      disclaimer: 'Test results relate only to the items tested. This certificate shall not be reproduced except in full without written approval of the laboratory.',
    };

    const report = await prisma.testReport.create({
      data: {
        id: uuidv4(),
        laboratoryId: sample.laboratoryId,
        sampleId: sample.id,
        reportNumber,
        title: input.title || `Materials Test Certificate - ${sample.sampleNumber}`,
        summary: input.summary || `Laboratory test results for sample ${sample.sampleNumber} (${sample.materialType})`,
        generatedById: req.user!.userId,
        // Creating a stored report snapshot does not constitute a review or approval.
        status: 'draft',
        reportData: reportSnapshot as any,
      },
      include: {
        sample: true,
        generatedBy: { select: { firstName: true, lastName: true, designation: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        laboratoryId: sample.laboratoryId,
        userId: req.user!.userId,
        action: 'report_snapshot_created',
        entityType: 'test_report',
        entityId: report.id,
        changes: { reportNumber: report.reportNumber, sampleId: sample.id, status: 'draft' } as any,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

reportRoutes.post('/generate', authorize('system_admin', 'lab_manager', 'lab_engineer', 'super_admin'), generateReportHandler);
reportRoutes.post('/', authorize('system_admin', 'lab_manager', 'lab_engineer', 'super_admin'), generateReportHandler);

// GET /api/v1/reports/:id - View single test report
reportRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await prisma.testReport.findUnique({
      where: { id: req.params.id },
      include: {
        laboratory: true,
        sample: {
          include: {
            project: true,
            tests: {
              include: {
                testType: true,
                technician: { select: { firstName: true, lastName: true, designation: true } },
                reviewer: { select: { firstName: true, lastName: true, designation: true } },
              },
            },
          },
        },
        generatedBy: { select: { id: true, firstName: true, lastName: true, designation: true, role: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true, designation: true, role: true } },
      },
    });

    if (!report) {
      throw new NotFoundError('Test report not found');
    }
    assertLaboratory(req, report.laboratoryId);

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/reports/:id/issue - Approve and issue report
reportRoutes.patch('/:id/issue', authorize('system_admin', 'lab_manager', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.testReport.findUnique({
      where: { id: req.params.id },
      include: {
        sample: {
          include: {
            tests: { select: { status: true } },
          },
        },
      },
    });
    if (!existing) throw new NotFoundError('Report not found');
    assertLaboratory(req, existing.laboratoryId);
    if (existing.status === 'issued') {
      throw new ValidationError('This report has already been issued. Create an amendment revision instead of replacing it.');
    }
    const allTestsApproved = existing.sample.tests.length > 0 && existing.sample.tests.every((test) => test.status === 'approved' || test.status === 'report_generated');
    if (!allTestsApproved) {
      throw new ValidationError('A report can be issued only after all associated tests have been verified and approved.');
    }

    const updated = await prisma.testReport.update({
      where: { id: req.params.id },
      data: {
        status: 'issued',
        approvedById: req.user!.userId,
        issuedAt: new Date(),
      },
      include: {
        sample: true,
        approvedBy: { select: { firstName: true, lastName: true, designation: true } },
      },
    });

    // Update sample status to completed
    await prisma.sample.update({
      where: { id: existing.sample.id },
      data: { status: 'completed' },
    });

    // If associated with a testing request, transition to RESULTS_READY
    if (existing.sample.requestId) {
      await prisma.testingRequest.update({
        where: { id: existing.sample.requestId },
        data: {
          status: 'RESULTS_READY',
          resultsReadyAt: new Date(),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        laboratoryId: existing.laboratoryId,
        userId: req.user!.userId,
        action: 'report_issued',
        entityType: 'test_report',
        entityId: existing.id,
        changes: {
          reportNumber: existing.reportNumber,
          revisionNumber: existing.revisionNumber,
          sampleId: existing.sample.id,
          requestId: existing.sample.requestId,
          status: 'issued',
        } as any,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/reports/:id/pdf - Stream compiled binary PDF report with DoW letterhead & QR stamp
reportRoutes.get('/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await prisma.testReport.findUnique({
      where: { id: req.params.id },
      include: {
        laboratory: true,
        sample: {
          include: {
            project: true,
            tests: {
              include: {
                testType: true,
                technician: true,
                reviewer: true,
              },
              orderBy: { testNumber: 'asc' },
            },
          },
        },
        generatedBy: { select: { firstName: true, lastName: true, designation: true } },
        approvedBy: { select: { firstName: true, lastName: true, designation: true } },
      },
    });

    if (!report) throw new NotFoundError('Report not found');

    const pdfBuffer = await generateReportPdf(report as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${report.reportNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
});
