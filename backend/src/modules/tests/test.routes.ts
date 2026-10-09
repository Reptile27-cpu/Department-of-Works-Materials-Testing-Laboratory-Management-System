import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { authenticate, requireReviewer, requireTechnician } from '../../middleware/auth.middleware';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { LaboratoryCalculationEngine } from './calculation-engine';
import { v4 as uuidv4 } from 'uuid';

export const testRoutes = Router();

const isUuid = (val: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

const findTestByIdOrNumber = async (identifier: string, include?: any): Promise<any> => {
  const actualInclude = include && include.include ? include.include : include;
  return prisma.labTest.findFirst({
    where: isUuid(identifier) ? { id: identifier } : { testNumber: identifier },
    ...(actualInclude ? { include: actualInclude } : {}),
  });
};

// GET /api/v1/tests/types - List standard test catalogue
testRoutes.get('/types', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testTypes = await prisma.testType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: testTypes,
    });
  } catch (error) {
    next(error);
  }
});

const getAuditChanges = (req: Request, baseChanges: Record<string, any>) => {
  const actingWorkerName = req.headers['x-acting-worker-name'] as string | undefined;
  const actingWorkerId = req.headers['x-acting-worker-id'] as string | undefined;
  const actingWorkerCode = req.headers['x-acting-worker-code'] as string | undefined;
  return {
    ...baseChanges,
    authenticatedAccount: req.user?.email,
    ...(actingWorkerName ? { actingWorker: actingWorkerName, actingWorkerId, actingWorkerCode } : {}),
  };
};

// GET /api/v1/tests - List tests with filters and pagination
testRoutes.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const { status, sampleId, testTypeCode, technicianId, reviewerId, search } = req.query;

    const where: any = {};

    if (status && status !== 'all') {
      where.status = String(status);
    }

    if (sampleId) {
      where.sampleId = String(sampleId);
    }

    if (technicianId && technicianId !== 'all') {
      where.technicianId = String(technicianId);
    }

    if (reviewerId && reviewerId !== 'all') {
      where.reviewerId = String(reviewerId);
    }

    if (testTypeCode) {
      where.testType = { code: String(testTypeCode) };
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { testNumber: { contains: q, mode: 'insensitive' } },
        { sample: { sampleNumber: { contains: q, mode: 'insensitive' } } },
        { sample: { project: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [total, tests] = await Promise.all([
      prisma.labTest.count({ where }),
      prisma.labTest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          testType: true,
          sample: {
            select: {
              id: true,
              sampleNumber: true,
              materialType: true,
              sourceLocation: true,
              priority: true,
              clientReference: true,
              requestId: true,
              request: { select: { id: true, requestNumber: true } },
              project: { select: { id: true, name: true, projectCode: true } },
            },
          },
          technician: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          reviewer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: tests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/tests/my-assignments - Assigned tests for current technician work queue
testRoutes.get('/my-assignments', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isSuperOrAdmin =
      req.user!.role === 'system_admin' ||
      req.user!.role === 'super_admin' ||
      req.user!.role === 'lab_manager';

    let resolvedWorkerId: string | undefined;

    if (!isSuperOrAdmin) {
      const workerToken = (req.headers['x-worker-session-token'] as string) || (req.headers['x-acting-worker-token'] as string);
      const requestedWorkerId = (req.query.workerId as string) || (req.headers['x-acting-worker-id'] as string);

      if (workerToken) {
        try {
          const JWT_SECRET = process.env.JWT_SECRET || 'dow-lab-system-dev-jwt-secret-key-2026';
          const decoded = jwt.verify(workerToken, JWT_SECRET) as any;
          resolvedWorkerId = decoded.actingWorkerId;

          if (requestedWorkerId && requestedWorkerId !== resolvedWorkerId) {
            return res.status(403).json({
              success: false,
              error: { message: 'Access denied: Active worker session does not authorize access to another worker’s assignments.' },
            });
          }
        } catch {
          return res.status(401).json({
            success: false,
            error: { message: 'Invalid or expired worker session token. Please enter your private PIN.' },
          });
        }
      } else if (requestedWorkerId) {
        resolvedWorkerId = requestedWorkerId;
      } else {
        resolvedWorkerId = req.user!.userId;
      }
    } else {
      resolvedWorkerId = (req.query.workerId as string) || undefined;
    }

    const where: any = isSuperOrAdmin && !resolvedWorkerId
      ? {}
      : {
          OR: [
            { technicianId: resolvedWorkerId },
            { reviewerId: resolvedWorkerId },
            { sample: { assignedTechnicianId: resolvedWorkerId } },
          ],
        };

    const tests = await prisma.labTest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        testType: true,
        sample: {
          select: {
            id: true,
            sampleNumber: true,
            materialType: true,
            description: true,
            sourceLocation: true,
            priority: true,
            dueDate: true,
            status: true,
            project: { select: { id: true, name: true, projectCode: true } },
          },
        },
        technician: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        reviewer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    res.json({
      success: true,
      data: tests,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/tests/:id - Get test details with equipment calibration check
testRoutes.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const test = await prisma.labTest.findFirst({
      where: {
        OR: [{ id: req.params.id }, { testNumber: req.params.id }],
      },
      include: {
        testType: true,
        sample: {
          include: {
            project: {
              include: { clientRecord: true },
            },
            request: {
              include: { client: true },
            },
            assignedTechnician: {
              select: { id: true, firstName: true, lastName: true, email: true, designation: true },
            },
          },
        },
        technician: {
          select: { id: true, firstName: true, lastName: true, email: true, designation: true },
        },
        reviewer: {
          select: { id: true, firstName: true, lastName: true, email: true, designation: true },
        },
        revisions: {
          include: {
            changedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
          orderBy: { revisionNumber: 'desc' },
        },
      },
    });

    if (!test) throw new NotFoundError('Test record not found');

    // Check equipment calibration warnings
    const equipmentWarnings: string[] = [];
    let equipmentList: any[] = [];
    const eqIds = Array.isArray(test.equipmentIds) ? (test.equipmentIds as string[]) : [];

    if (eqIds.length > 0) {
      equipmentList = await prisma.equipment.findMany({
        where: { id: { in: eqIds } },
      });

      const now = new Date();
      for (const eq of equipmentList) {
        if (eq.status === 'out_of_service' || eq.status === 'maintenance') {
          equipmentWarnings.push(`Equipment ${eq.assetNumber} (${eq.name}) is currently ${eq.status.replace('_', ' ')}.`);
        } else if (eq.nextCalibrationDate && new Date(eq.nextCalibrationDate) < now) {
          equipmentWarnings.push(`Equipment ${eq.assetNumber} (${eq.name}) calibration is overdue (due: ${new Date(eq.nextCalibrationDate).toLocaleDateString()}).`);
        }
      }
    }

    res.json({
      success: true,
      data: {
        ...test,
        equipment: equipmentList,
        equipmentWarnings,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/tests/:id/start - Technician starts test with worker ownership verification
testRoutes.post('/:id/start', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isSuperOrAdmin =
      req.user!.role === 'system_admin' ||
      req.user!.role === 'super_admin' ||
      req.user!.role === 'lab_manager';

    const JWT_SECRET = process.env.JWT_SECRET || 'dow-lab-system-dev-jwt-secret-key-2026';
    let actingWorkerId: string | undefined;
    let actingWorkerName: string | undefined;

    // Check worker token from header
    const workerToken = (req.headers['x-worker-session-token'] as string) || (req.headers['x-acting-worker-token'] as string);
    if (workerToken) {
      try {
        const decoded = jwt.verify(workerToken, JWT_SECRET) as any;
        actingWorkerId = decoded.actingWorkerId;
        actingWorkerName = decoded.actingWorkerName;
      } catch {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid or expired worker session token. Please enter your private PIN.' },
        });
      }
    } else {
      actingWorkerId = (req.headers['x-acting-worker-id'] as string) || (req.body.actingWorkerId as string);
      actingWorkerName = (req.headers['x-acting-worker-name'] as string);
    }

    if (!actingWorkerId && !isSuperOrAdmin) {
      actingWorkerId = req.user!.userId;
    }

    const test = await findTestByIdOrNumber(req.params.id, {
      testType: true,
      sample: {
        include: {
          project: { include: { clientRecord: true } },
          request: { include: { client: true } },
          assignedTechnician: true,
        },
      },
      technician: true,
    });

    if (!test) throw new NotFoundError('Test record not found');

    // Strict worker ownership verification
    if (!isSuperOrAdmin) {
      const assignedId = test.technicianId || test.sample.assignedTechnicianId;
      if (assignedId && actingWorkerId && assignedId !== actingWorkerId) {
        return res.status(403).json({
          success: false,
          error: {
            message: `Access denied: This test is assigned to another worker (${test.technician?.firstName || 'Assigned Technician'}). You cannot start it.`,
          },
        });
      }
    }

    // Verify test state
    if (test.status === 'awaiting_review') {
      return res.status(400).json({
        success: false,
        error: { message: 'This test has already been submitted for engineering review and cannot be restarted.' },
      });
    }
    if (test.status === 'approved' || test.status === 'report_generated') {
      return res.status(400).json({
        success: false,
        error: { message: 'This test has already been approved and locked.' },
      });
    }

    // Update test to in_progress
    const effectiveTechnicianId = actingWorkerId || test.technicianId || req.user!.userId;
    const updated = await prisma.labTest.update({
      where: { id: test.id },
      data: {
        status: 'in_progress',
        startedAt: test.startedAt || new Date(),
        technicianId: test.technicianId || effectiveTechnicianId,
      },
      include: {
        testType: true,
        sample: {
          include: {
            project: { include: { clientRecord: true } },
            request: { include: { client: true } },
          },
        },
        technician: true,
      },
    });

    // Update sample status to in_progress if currently registered or received
    if (test.sample.status === 'registered' || test.sample.status === 'received') {
      await prisma.sample.update({
        where: { id: test.sampleId },
        data: { status: 'in_progress' },
      });
      await prisma.sampleStatusHistory.create({
        data: {
          id: uuidv4(),
          sampleId: test.sampleId,
          fromStatus: test.sample.status,
          toStatus: 'in_progress',
          changedById: req.user!.userId,
          reason: `Test ${test.testNumber} commenced by technician ${actingWorkerName || ''}.`,
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        laboratoryId: test.sample.laboratoryId,
        userId: req.user!.userId,
        action: 'START_TEST',
        entityType: 'LabTest',
        entityId: test.id,
        changes: getAuditChanges(req, {
          testNumber: test.testNumber,
          status: 'in_progress',
          startedAt: updated.startedAt,
          technicianId: effectiveTechnicianId,
          actingWorker: actingWorkerName,
        }),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: `Test ${test.testNumber} started successfully. Worksheet is now open.`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/tests - Assign a test to a sample
testRoutes.post('/', authenticate, requireReviewer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sampleId, testTypeId, technicianId, reviewerId, equipmentIds, remarks } = req.body;

    if (!sampleId || !testTypeId) {
      throw new ValidationError('Sample ID and Test Type ID are required');
    }

    const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
    if (!sample) throw new NotFoundError('Sample not found');

    const testType = await prisma.testType.findUnique({ where: { id: testTypeId } });
    if (!testType) throw new NotFoundError('Test Type not found');

    const year = new Date().getFullYear();
    const count = await prisma.labTest.count();
    const testNumber = `TST-${year}-${String(count + 1).padStart(4, '0')}`;

    const labTest = await prisma.labTest.create({
      data: {
        id: uuidv4(),
        sampleId,
        testTypeId,
        testNumber,
        technicianId: technicianId || sample.assignedTechnicianId || null,
        reviewerId: reviewerId || req.user!.userId,
        equipmentIds: equipmentIds || [],
        status: 'pending',
        remarks,
      },
      include: { testType: true, sample: true },
    });

    // Update sample status to 'in_progress' if currently 'registered'
    if (sample.status === 'registered' || sample.status === 'received') {
      await prisma.sample.update({
        where: { id: sample.id },
        data: { status: 'in_progress' },
      });
      await prisma.sampleStatusHistory.create({
        data: {
          id: uuidv4(),
          sampleId: sample.id,
          fromStatus: sample.status,
          toStatus: 'in_progress',
          changedById: req.user!.userId,
          reason: `Test ${testNumber} assigned to technician.`,
        },
      });
    }

    // In-app notification for technician
    if (labTest.technicianId) {
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          laboratoryId: sample.laboratoryId,
          senderId: req.user!.userId,
          recipientId: labTest.technicianId,
          type: 'test_assigned',
          title: `New Test Assigned: ${testNumber}`,
          message: `You have been assigned to conduct ${testType.name} for sample ${sample.sampleNumber}.`,
          link: `/tests/${labTest.id}`,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: labTest,
    });
  } catch (error) {
    next(error);
  }
});

const runCalculationsForType = (code: string, raw: any) => {
  const norm = (code || '').toUpperCase().trim();
  switch (norm) {
    case 'SOIL_MOISTURE':
    case 'MOISTURE_CONTENT':
      return LaboratoryCalculationEngine.calculateMoistureContent(raw);
    case 'SIEVE_ANALYSIS':
      return LaboratoryCalculationEngine.calculateSieveAnalysis(raw);
    case 'ATTERBERG_LIMITS':
      return LaboratoryCalculationEngine.calculateAtterbergLimits(raw);
    case 'PROCTOR_COMPACTION':
    case 'COMPACTION_PROCTOR':
    case 'STD_COMPACTION':
    case 'MOD_COMPACTION':
      return LaboratoryCalculationEngine.calculateProctorCompaction(raw);
    case 'CBR_TEST':
    case 'CBR':
    case 'CBR_SOAKED_4D':
    case 'CBR_UNSOAKED':
      return LaboratoryCalculationEngine.calculateCbr(raw);
    case 'SPECIFIC_GRAVITY':
    case 'SOIL_PARTICLE_DENSITY':
      return LaboratoryCalculationEngine.calculateSpecificGravity(raw);
    case 'DCP_TEST':
    case 'DCP':
    case 'DCP_FOUNDATION':
    case 'FIELD_DCP_PAVEMENT':
      return LaboratoryCalculationEngine.calculateDcp(raw);
    case 'CONCRETE_CYLINDER':
    case 'CONC_CYLINDER_COMP':
      return LaboratoryCalculationEngine.calculateConcreteCylinder(raw);
    case 'CONCRETE_MASONRY':
    case 'CONC_MASONRY_COMP':
      return LaboratoryCalculationEngine.calculateConcreteMasonry(raw);
    case 'SAND_REPLACEMENT':
    case 'FIELD_DENSITY':
    case 'FIELD_DENSITY_SRT':
      return LaboratoryCalculationEngine.calculateFieldDensityCompaction(raw);
    case 'POINT_LOAD':
    case 'ROCK_POINT_LOAD':
      return LaboratoryCalculationEngine.calculateRockPointLoad(raw);
    case 'AGGREGATE_TEST':
    case 'LA_ABRASION':
      return LaboratoryCalculationEngine.calculateAggregateLa(raw);
    default:
      return null;
  }
};

// POST /api/v1/tests/calculate - Calculation Engine live preview
testRoutes.post('/calculate', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { testTypeCode, rawMeasurements } = req.body;

    if (!testTypeCode || !rawMeasurements) {
      throw new ValidationError('testTypeCode and rawMeasurements are required');
    }

    const calculatedResults = runCalculationsForType(testTypeCode, rawMeasurements);
    if (!calculatedResults) {
      throw new ValidationError(`No calculation engine found for test type code '${testTypeCode}'`);
    }

    res.json({
      success: true,
      data: calculatedResults,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/tests/:id/measurements & PUT /api/v1/tests/:id - Save test measurements and execute calculations
const updateMeasurementsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const test = await findTestByIdOrNumber(req.params.id, {
      testType: true,
      sample: true,
    });

    if (!test) throw new NotFoundError('Test not found');

    // Prevent direct modifications if test is already approved
    if (test.status === 'approved' || test.status === 'report_generated') {
      throw new ForbiddenError('Approved test results are locked against silent modification. Please use the controlled amendment process.');
    }

    const { rawMeasurements, calculatedResults: providedCalculatedResults, calculationVersion, equipmentIds, remarks, testDate } = req.body;

    // Run Calculation Engine
    let calculatedResults: any = {};
    try {
      const computed = runCalculationsForType(test.testType.code, rawMeasurements);
      calculatedResults = computed || { raw: rawMeasurements };
    } catch (e: any) {
      calculatedResults = { raw: rawMeasurements, calculationError: e.message };
    }

    if (providedCalculatedResults && typeof providedCalculatedResults === 'object' && Object.keys(providedCalculatedResults).length > 0) {
      calculatedResults = { ...calculatedResults, ...providedCalculatedResults };
    }

    // Check equipment warnings
    const eqList = Array.isArray(equipmentIds) ? equipmentIds : test.equipmentIds as string[];
    const equipmentWarnings: string[] = [];
    if (eqList && eqList.length > 0) {
      const eqRecords = await prisma.equipment.findMany({ where: { id: { in: eqList } } });
      const now = new Date();
      for (const eq of eqRecords) {
        if (eq.status === 'out_of_service' || eq.status === 'maintenance') {
          equipmentWarnings.push(`Warning: Equipment ${eq.assetNumber} is currently ${eq.status.replace('_', ' ')}.`);
        } else if (eq.nextCalibrationDate && new Date(eq.nextCalibrationDate) < now) {
          equipmentWarnings.push(`Warning: Equipment ${eq.assetNumber} calibration is overdue.`);
        }
      }
    }

    const updated = await prisma.labTest.update({
      where: { id: test.id },
      data: {
        rawMeasurements: (rawMeasurements || test.rawMeasurements) as any,
        calculatedResults,
        equipmentIds: eqList,
        remarks: remarks !== undefined ? remarks : test.remarks,
        testDate: testDate ? new Date(testDate) : test.testDate || new Date(),
        status: test.status === 'pending' ? 'in_progress' : test.status,
        startedAt: test.startedAt || new Date(),
      },
      include: { testType: true, sample: true },
    });

    res.json({
      success: true,
      data: updated,
      equipmentWarnings,
    });
  } catch (error) {
    next(error);
  }
};

testRoutes.put('/:id/measurements', authenticate, updateMeasurementsHandler);
testRoutes.patch('/:id/measurements', authenticate, updateMeasurementsHandler);
testRoutes.put('/:id', authenticate, updateMeasurementsHandler);
testRoutes.patch('/:id', authenticate, updateMeasurementsHandler);

// PATCH /api/v1/tests/:id/status - Update test status or submit for review
testRoutes.patch('/:id/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (status === 'awaiting_review') {
      return submitTestHandler(req, res, next);
    }

    const test = await findTestByIdOrNumber(req.params.id, {
      testType: true,
      sample: true,
    });

    if (!test) throw new NotFoundError('Test not found');

    const updated = await prisma.labTest.update({
      where: { id: test.id },
      data: { status },
      include: { testType: true, sample: true },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/tests/:id/submit & /submit-for-review - Submit test for review
const submitTestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const test = await findTestByIdOrNumber(req.params.id, {
      testType: true,
      sample: true,
    });

    if (!test) throw new NotFoundError('Test not found');

    if (test.status === 'approved') {
      throw new ForbiddenError('Test is already approved.');
    }

    const updated = await prisma.labTest.update({
      where: { id: test.id },
      data: {
        status: 'awaiting_review',
        completedAt: new Date(),
      },
      include: {
        testType: true,
        sample: {
          include: {
            project: { include: { clientRecord: true } },
            request: { include: { client: true } },
            assignedTechnician: true,
          },
        },
        technician: true,
        reviewer: true,
      },
    });

    // Notify reviewer or managers
    const reviewerId = test.reviewerId;
    if (reviewerId) {
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          laboratoryId: test.sample.laboratoryId,
          senderId: req.user!.userId,
          recipientId: reviewerId,
          type: 'test_review_requested',
          title: `Test Awaiting Review: ${test.testNumber}`,
          message: `${test.testType.name} for sample ${test.sample.sampleNumber} has been submitted for your review.`,
          link: `/tests/${test.id}`,
        },
      });
    }

    // Check if sample should transition to awaiting_review
    await prisma.sample.update({
      where: { id: test.sampleId },
      data: { status: 'awaiting_review' },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        laboratoryId: test.sample.laboratoryId,
        userId: req.user!.userId,
        action: 'SUBMIT_TEST',
        entityType: 'LabTest',
        entityId: test.id,
        changes: getAuditChanges(req, { testNumber: test.testNumber, status: 'awaiting_review' }),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: 'Test submitted for engineering review.',
    });
  } catch (error) {
    next(error);
  }
};

testRoutes.post('/:id/submit', authenticate, submitTestHandler);
testRoutes.post('/:id/submit-for-review', authenticate, submitTestHandler);

// Review test handler (Approve or Return with reason)
const reviewTestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawAction = req.body.action || req.body.decision;
    const action =
      rawAction === 'approved' || rawAction === 'approve'
        ? 'approve'
        : rawAction === 'return_for_correction' || rawAction === 'returned' || rawAction === 'rejected'
        ? 'return_for_correction'
        : rawAction;
    const rejectionReason = req.body.rejectionReason || req.body.comments || req.body.reason;
    const remarks = req.body.remarks || req.body.notes;

    if (!['approve', 'return_for_correction'].includes(action)) {
      throw new ValidationError("Action must be either 'approve' or 'return_for_correction'");
    }

    const test = await findTestByIdOrNumber(req.params.id, {
      sample: { include: { tests: true } },
      testType: true,
    });

    if (!test) throw new NotFoundError('Test not found');

    // Independent review check: technician cannot approve their own work unless system admin
    if (action === 'approve' && test.technicianId === req.user!.userId && req.user!.role !== 'system_admin') {
      throw new ForbiddenError('Independent review policy: You cannot approve a test for which you were the technician.');
    }

    if (action === 'return_for_correction' && (!rejectionReason || String(rejectionReason).trim().length < 5)) {
      throw new ValidationError('A detailed reason is required when returning a test for correction.');
    }

    const newStatus = action === 'approve' ? 'approved' : 'returned_for_correction';

    const updated = await prisma.labTest.update({
      where: { id: test.id },
      data: {
        status: newStatus,
        reviewerId: req.user!.userId,
        reviewedAt: new Date(),
        approvedAt: action === 'approve' ? new Date() : null,
        rejectionReason: action === 'return_for_correction' ? rejectionReason : null,
        remarks: remarks !== undefined ? remarks : test.remarks,
      },
      include: {
        testType: true,
        sample: {
          include: {
            project: { include: { clientRecord: true } },
            request: { include: { client: true } },
            assignedTechnician: true,
          },
        },
        technician: true,
        reviewer: true,
      },
    });

    // Notify technician
    if (test.technicianId) {
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          laboratoryId: test.sample.laboratoryId,
          senderId: req.user!.userId,
          recipientId: test.technicianId,
          type: action === 'approve' ? 'test_approved' : 'test_returned',
          title: action === 'approve' ? `Test Approved: ${test.testNumber}` : `Test Returned: ${test.testNumber}`,
          message: action === 'approve'
            ? `Your test ${test.testNumber} has been approved.`
            : `Your test ${test.testNumber} was returned for correction: ${rejectionReason}`,
          link: `/tests/${test.id}`,
        },
      });
    }

    // If approved, check if all tests for sample are approved
    if (action === 'approve') {
      const allTests = await prisma.labTest.findMany({ where: { sampleId: test.sampleId } });
      const allApproved = allTests.every(t => t.id === test.id || t.status === 'approved' || t.status === 'report_generated');
      if (allApproved && allTests.length > 0) {
        await prisma.sample.update({
          where: { id: test.sampleId },
          data: { status: 'approved' },
        });
        await prisma.sampleStatusHistory.create({
          data: {
            id: uuidv4(),
            sampleId: test.sampleId,
            fromStatus: test.sample.status,
            toStatus: 'approved',
            changedById: req.user!.userId,
            reason: 'All requested laboratory tests have been reviewed and approved.',
          },
        });
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        laboratoryId: test.sample.laboratoryId,
        userId: req.user!.userId,
        action: action === 'approve' ? 'APPROVE_TEST' : 'RETURN_TEST',
        entityType: 'LabTest',
        entityId: test.id,
        changes: getAuditChanges(req, { testNumber: test.testNumber, action, rejectionReason }),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: action === 'approve' ? 'Test results successfully approved and locked.' : 'Test returned to technician for corrections.',
    });
  } catch (error) {
    next(error);
  }
};

testRoutes.post('/:id/review', authenticate, requireReviewer, reviewTestHandler);
testRoutes.post('/:id/approve', authenticate, requireReviewer, (req: Request, res: Response, next: NextFunction) => {
  req.body = { ...req.body, action: 'approve' };
  return reviewTestHandler(req, res, next);
});
testRoutes.post('/:id/return', authenticate, requireReviewer, (req: Request, res: Response, next: NextFunction) => {
  req.body = { ...req.body, action: 'return_for_correction' };
  return reviewTestHandler(req, res, next);
});

// POST /api/v1/tests/:id/amend - Controlled post-approval amendment
testRoutes.post('/:id/amend', authenticate, requireReviewer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const amendmentReason = req.body.amendmentReason || req.body.reason;
    const { rawMeasurements } = req.body;

    if (!amendmentReason || String(amendmentReason).trim().length < 5) {
      throw new ValidationError('A comprehensive engineering rationale is required to amend an approved test.');
    }

    const test = await findTestByIdOrNumber(req.params.id, {
      testType: true,
      sample: true,
    });

    if (!test) throw new NotFoundError('Test not found');

    // Archive current version into TestRevision
    await prisma.testRevision.create({
      data: {
        id: uuidv4(),
        testId: test.id,
        revisionNumber: test.revisionNumber,
        rawMeasurements: test.rawMeasurements || {},
        calculatedResults: test.calculatedResults || {},
        changedById: req.user!.userId,
        reason: amendmentReason,
      },
    });

    // Re-run calculations if new raw measurements provided
    let calculatedResults: any = test.calculatedResults;
    if (rawMeasurements) {
      const computed = runCalculationsForType(test.testType.code, rawMeasurements);
      if (computed) {
        calculatedResults = computed;
      }
    }

    const newRevisionNumber = test.revisionNumber + 1;
    const updated = await prisma.labTest.update({
      where: { id: test.id },
      data: {
        revisionNumber: newRevisionNumber,
        rawMeasurements: rawMeasurements || test.rawMeasurements,
        calculatedResults: calculatedResults as any,
        status: 'awaiting_review', // Requires re-review after amendment
        reviewedAt: null,
        approvedAt: null,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        laboratoryId: test.sample.laboratoryId,
        userId: req.user!.userId,
        action: 'AMEND_TEST',
        entityType: 'LabTest',
        entityId: test.id,
        changes: getAuditChanges(req, {
          testNumber: test.testNumber,
          oldRevision: test.revisionNumber,
          newRevision: newRevisionNumber,
          reason: amendmentReason,
        }),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: `Test amended to Revision ${newRevisionNumber} and queued for re-verification.`,
    });
  } catch (error) {
    next(error);
  }
});
