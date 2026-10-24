import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { authenticate } from '../../middleware/auth.middleware';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { assertLaboratory } from '../../utils/route-helpers';
import { TEST_FORM_REGISTRY } from './test-form-registry';
import { TestFormGeneratorService, TestFormContext } from './test-form-generator.service';

export const testFormRoutes = Router();

// Ensure all test form routes require authentication to maintain client privacy
testFormRoutes.use(authenticate);

// 1. GET /api/v1/test-forms/mapping - Inventory and catalogue mapping status
testFormRoutes.get('/mapping', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const testTypes = await prisma.testType.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    const mapping = testTypes.map((t: any) => {
      const reg = TEST_FORM_REGISTRY[t.code];
      return {
        id: t.id,
        code: t.code,
        name: t.name,
        standard: t.standard,
        category: t.category,
        hasTemplate: reg ? reg.hasTemplate : false,
        formNumber: reg?.formNumber || null,
        templateFiles: reg?.templateFiles || [],
        notes: reg?.notes || (!reg ? 'Unmapped test type' : null),
      };
    });

    const total = mapping.length;
    const available = mapping.filter((m: any) => m.hasTemplate).length;
    const fallbackOnly = total - available;

    res.json({
      success: true,
      data: {
        summary: {
          totalTests: total,
          templatesAvailable: available,
          fallbackLabelOnly: fallbackOnly,
        },
        mapping,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Helper to build context from a LabTest ID
async function buildTestContext(req: Request, labTestId: string): Promise<TestFormContext> {
  const labTest = await prisma.labTest.findUnique({
    where: { id: labTestId },
    include: {
      testType: true,
      technician: {
        select: { firstName: true, lastName: true, designation: true },
      },
      sample: {
        include: {
          request: {
            select: {
              id: true,
              requestNumber: true,
              location: true,
              client: { select: { name: true } },
              project: { select: { name: true } },
            },
          },
          project: {
            select: {
              name: true,
              client: true,
              location: true,
            },
          },
        },
      },
    },
  });

  if (!labTest) {
    throw new NotFoundError(`Laboratory test record '${labTestId}' not found`);
  }

  const s = labTest.sample;
  assertLaboratory(req, s.laboratoryId);
  const reqObj = s.request
    ? {
        id: s.request.id,
        requestNumber: s.request.requestNumber,
        clientName: s.request.client?.name || s.project?.client || 'Central Works',
        projectName: s.request.project?.name || s.project?.name || 'Department Project',
        location: s.request.location || s.project?.location || 'Site Intake',
      }
    : s.project
    ? {
        id: s.requestId || undefined,
        requestNumber: s.clientReference || 'DOW-REQ',
        clientName: s.project.client,
        projectName: s.project.name,
        location: s.project.location,
      }
    : null;

  return {
    sample: {
      id: s.id,
      sampleNumber: s.sampleNumber,
      qrToken: s.qrToken,
      materialType: s.materialType,
      description: s.description,
      sourceLocation: s.sourceLocation,
      storageLocation: s.storageLocation,
      clientReference: s.clientReference,
      dateReceived: s.dateReceived,
      dateSampled: s.dateSampled,
    },
    request: reqObj,
    test: {
      id: labTest.id,
      testNumber: labTest.testNumber,
      status: labTest.status,
      testType: {
        code: labTest.testType.code,
        name: labTest.testType.name,
        standard: labTest.testType.standard,
        category: labTest.testType.category,
      },
      technician: labTest.technician,
    },
  };
}

// 2. GET /api/v1/test-forms/test/:labTestId/pdf - Generate / preview / download test form PDF with QR
testFormRoutes.get('/test/:labTestId/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isDownload = req.query.download === 'true' || req.query.download === '1';
    const ctx = await buildTestContext(req, req.params.labTestId);

    const { buffer, filename, hasTemplate, templateFilesUsed } =
      await TestFormGeneratorService.generateTestFormPdf(ctx);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`
    );
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('X-DoW-Has-Template', String(hasTemplate));
    res.setHeader('X-DoW-Templates-Used', templateFilesUsed.join(', '));
    res.end(buffer);
  } catch (error) {
    next(error);
  }
});

// 3. GET /api/v1/test-forms/test/:labTestId/label - Generate printable QR tracking label PDF
testFormRoutes.get('/test/:labTestId/label', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isDownload = req.query.download === 'true' || req.query.download === '1';
    const ctx = await buildTestContext(req, req.params.labTestId);

    const buffer = await TestFormGeneratorService.generatePrintableLabelPdf(ctx);
    const filename = `${ctx.sample.sampleNumber}_${ctx.test.testType.code}_Label.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`
    );
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (error) {
    next(error);
  }
});

// 4. GET /api/v1/test-forms/sample/:sampleId/forms - List forms status for a sample
testFormRoutes.get('/sample/:sampleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sample = await prisma.sample.findFirst({
      where: {
        OR: [{ id: req.params.sampleId }, { sampleNumber: req.params.sampleId }],
      },
      include: {
        request: {
          select: {
            id: true,
            requestNumber: true,
            client: { select: { name: true } },
            project: { select: { name: true } },
          },
        },
        project: true,
        tests: {
          include: {
            testType: true,
            technician: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!sample) {
      throw new NotFoundError('Sample record not found');
    }

    assertLaboratory(req, sample.laboratoryId);

    const forms = sample.tests.map((test: any) => {
      const reg = TEST_FORM_REGISTRY[test.testType.code];
      return {
        testId: test.id,
        testNumber: test.testNumber,
        status: test.status,
        testType: {
          id: test.testType.id,
          code: test.testType.code,
          name: test.testType.name,
          standard: test.testType.standard,
          category: test.testType.category,
        },
        hasTemplate: reg ? reg.hasTemplate : false,
        formNumber: reg?.formNumber || null,
        templateFiles: reg?.templateFiles || [],
        notes: reg?.notes || null,
        pdfUrl: `/api/v1/test-forms/test/${test.id}/pdf`,
        labelUrl: `/api/v1/test-forms/test/${test.id}/label`,
      };
    });

    res.json({
      success: true,
      data: {
        sample: {
          id: sample.id,
          sampleNumber: sample.sampleNumber,
          qrToken: sample.qrToken,
          materialType: sample.materialType,
          description: sample.description,
        },
        request: sample.request
          ? {
              id: sample.request.id,
              requestNumber: sample.request.requestNumber,
              clientName: sample.request.client?.name || sample.project?.client,
              projectName: sample.request.project?.name || sample.project?.name,
            }
          : null,
        bundlePdfUrl: `/api/v1/test-forms/sample/${sample.id}/bundle`,
        forms,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 5. GET /api/v1/test-forms/sample/:sampleId/bundle - Generate consolidated PDF of all test forms for sample
testFormRoutes.get('/sample/:sampleId/bundle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isDownload = req.query.download === 'true' || req.query.download === '1';

    const sample = await prisma.sample.findFirst({
      where: {
        OR: [{ id: req.params.sampleId }, { sampleNumber: req.params.sampleId }],
      },
      include: {
        request: {
          select: {
            id: true,
            requestNumber: true,
            location: true,
            client: { select: { name: true } },
            project: { select: { name: true } },
          },
        },
        project: true,
        tests: {
          include: {
            testType: true,
            technician: {
              select: { firstName: true, lastName: true, designation: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!sample) {
      throw new NotFoundError('Sample record not found');
    }

    assertLaboratory(req, sample.laboratoryId);

    if (sample.tests.length === 0) {
      throw new ValidationError('Sample has no assigned laboratory tests to generate forms for.');
    }

    const sampleCtx = {
      id: sample.id,
      sampleNumber: sample.sampleNumber,
      qrToken: sample.qrToken,
      materialType: sample.materialType,
      description: sample.description,
      sourceLocation: sample.sourceLocation,
      storageLocation: sample.storageLocation,
      clientReference: sample.clientReference,
      dateReceived: sample.dateReceived,
      dateSampled: sample.dateSampled,
    };

    const requestCtx = sample.request
      ? {
          id: sample.request.id,
          requestNumber: sample.request.requestNumber,
          clientName: sample.request.client?.name || sample.project?.client || 'Central Works',
          projectName: sample.request.project?.name || sample.project?.name || 'Department Project',
          location: sample.request.location || sample.project?.location || 'Site Intake',
        }
      : sample.project
      ? {
          id: sample.requestId || undefined,
          requestNumber: sample.clientReference || 'DOW-REQ',
          clientName: sample.project.client,
          projectName: sample.project.name,
          location: sample.project.location,
        }
      : null;

    const testsCtx = sample.tests.map((t: any) => ({
      id: t.id,
      testNumber: t.testNumber,
      status: t.status,
      testType: {
        code: t.testType.code,
        name: t.testType.name,
        standard: t.testType.standard,
        category: t.testType.category,
      },
      technician: t.technician,
    }));

    const { buffer, filename, totalForms } = await TestFormGeneratorService.generateSampleBundlePdf(
      sampleCtx,
      requestCtx,
      testsCtx
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`
    );
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('X-DoW-Total-Forms', String(totalForms));
    res.end(buffer);
  } catch (error) {
    next(error);
  }
});

// 6. GET /api/v1/test-forms/request/:requestId - List forms status for a request
testFormRoutes.get('/request/:requestId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestItem = await prisma.testingRequest.findFirst({
      where: {
        OR: [{ id: req.params.requestId }, { requestNumber: req.params.requestId }],
      },
      include: {
        client: { select: { name: true } },
        project: { select: { name: true } },
        requestItems: {
          include: { testType: true },
        },
        samples: {
          include: {
            tests: {
              include: {
                testType: true,
                technician: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!requestItem) {
      throw new NotFoundError('Testing request not found');
    }

    assertLaboratory(req, requestItem.laboratoryId);

    const primarySample = requestItem.samples.length > 0 ? requestItem.samples[0] : null;

    const forms = requestItem.requestItems.map((item: any) => {
      const reg = TEST_FORM_REGISTRY[item.testType.code];
      const associatedLabTest = primarySample
        ? primarySample.tests.find((t: any) => t.testTypeId === item.testTypeId)
        : null;

      return {
        requestItemId: item.id,
        testTypeId: item.testTypeId,
        testCode: item.testType.code,
        testName: item.testType.name,
        standard: item.testType.standard,
        category: item.testType.category,
        quantity: item.quantity,
        hasTemplate: reg ? reg.hasTemplate : false,
        formNumber: reg?.formNumber || null,
        templateFiles: reg?.templateFiles || [],
        notes: reg?.notes || null,
        labTestId: associatedLabTest ? associatedLabTest.id : null,
        testNumber: associatedLabTest ? associatedLabTest.testNumber : null,
        pdfUrl: associatedLabTest ? `/api/v1/test-forms/test/${associatedLabTest.id}/pdf` : null,
        labelUrl: associatedLabTest ? `/api/v1/test-forms/test/${associatedLabTest.id}/label` : null,
      };
    });

    res.json({
      success: true,
      data: {
        request: {
          id: requestItem.id,
          requestNumber: requestItem.requestNumber,
          status: requestItem.status,
          clientName: requestItem.client?.name || 'Department Client',
          projectName: requestItem.project?.name || 'Infrastructure Project',
        },
        sample: primarySample
          ? {
              id: primarySample.id,
              sampleNumber: primarySample.sampleNumber,
              bundlePdfUrl: `/api/v1/test-forms/sample/${primarySample.id}/bundle`,
            }
          : null,
        forms,
      },
    });
  } catch (error) {
    next(error);
  }
});
