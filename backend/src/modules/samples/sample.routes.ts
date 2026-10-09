import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { authenticate, requireReviewer, requireTechnician } from '../../middleware/auth.middleware';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

export const sampleRoutes = Router();

export function getMaterialCode(materialType: string = ''): string {
  const m = materialType.toLowerCase();
  if (m.includes('soil')) return 'S';
  if (m.includes('aggregate')) return 'A';
  if (m.includes('concrete')) return 'C';
  if (m.includes('rock') || m.includes('core')) return 'R';
  if (m.includes('bitumen') || m.includes('asphalt') || m.includes('field')) return 'F';
  return 'S';
}

// Helper to generate the next unique sample number e.g. 26P-S-001, 26P-A-001
export async function generateSampleNumber(materialType = 'Soil'): Promise<string> {
  const currentYear = new Date().getFullYear();
  const year2 = String(currentYear).slice(-2); // "26"
  const matCode = getMaterialCode(materialType);
  const prefix = `${year2}P-${matCode}`;

  const lastSample = await prisma.sample.findFirst({
    where: {
      sampleNumber: { startsWith: `${prefix}-` },
    },
    orderBy: { sampleNumber: 'desc' },
    select: { sampleNumber: true },
  });

  let nextSequence = 1;
  if (lastSample && lastSample.sampleNumber) {
    const parts = lastSample.sampleNumber.split('-');
    const seqStr = parts[parts.length - 1];
    const parsed = parseInt(seqStr, 10);
    if (!isNaN(parsed)) {
      nextSequence = parsed + 1;
    }
  }

  // Ensure collision safety
  let candidate = `${prefix}-${String(nextSequence).padStart(3, '0')}`;
  let collision = await prisma.sample.findUnique({ where: { sampleNumber: candidate } });
  while (collision) {
    nextSequence++;
    candidate = `${prefix}-${String(nextSequence).padStart(3, '0')}`;
    collision = await prisma.sample.findUnique({ where: { sampleNumber: candidate } });
  }

  return candidate;
}

// GET /api/v1/samples - List samples with pagination and filters
sampleRoutes.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const {
      search,
      status,
      materialType,
      projectId,
      assignedTechnicianId,
      priority,
      startDate,
      endDate,
    } = req.query;

    const where: any = { isArchived: false };

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { sampleNumber: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { sourceLocation: { contains: q, mode: 'insensitive' } },
        { clientReference: { contains: q, mode: 'insensitive' } },
        { project: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (status && status !== 'all') {
      where.status = String(status);
    }

    if (materialType && materialType !== 'all') {
      where.materialType = String(materialType);
    }

    if (projectId && projectId !== 'all') {
      where.projectId = String(projectId);
    }

    if (assignedTechnicianId && assignedTechnicianId !== 'all') {
      where.assignedTechnicianId = String(assignedTechnicianId);
    }

    if (priority && priority !== 'all') {
      where.priority = String(priority);
    }

    if (startDate || endDate) {
      where.dateReceived = {};
      if (startDate) where.dateReceived.gte = new Date(String(startDate));
      if (endDate) where.dateReceived.lte = new Date(String(endDate));
    }

    const [total, samples] = await Promise.all([
      prisma.sample.count({ where }),
      prisma.sample.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: { id: true, name: true, projectCode: true, client: true },
          },
          assignedTechnician: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { tests: true },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: samples,
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

// GET /api/v1/samples/scan/:token - Mobile QR scan verification & custody audit logging
sampleRoutes.get('/scan/:token', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawToken = decodeURIComponent(req.params.token).trim();
    let extractedSampleNumber: string | undefined;
    let extractedQrToken: string | undefined;

    if (rawToken.startsWith('DOW-MS|SAMPLE|')) {
      const parts = rawToken.split('|');
      extractedSampleNumber = parts[2];
      extractedQrToken = parts[3];
    }

    const isUuidVal = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawToken);

    const orConditions: any[] = [
      { qrToken: rawToken },
      { sampleNumber: rawToken },
    ];
    if (extractedQrToken) orConditions.push({ qrToken: extractedQrToken });
    if (extractedSampleNumber) orConditions.push({ sampleNumber: extractedSampleNumber });
    if (isUuidVal) {
      orConditions.push({ id: rawToken });
    }

    const sample = await prisma.sample.findFirst({
      where: { OR: orConditions },
      include: {
        project: {
          select: { id: true, name: true, projectCode: true, client: true, location: true },
        },
        assignedTechnician: {
          select: { id: true, firstName: true, lastName: true, email: true, designation: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        tests: {
          include: {
            testType: true,
            technician: {
              select: { id: true, firstName: true, lastName: true },
            },
            reviewer: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        reports: {
          select: {
            id: true,
            reportNumber: true,
            title: true,
            status: true,
            pdfUrl: true,
            issuedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!sample) {
      throw new NotFoundError(`Sample record not found for scan token or ID: '${rawToken}'`);
    }

    // Record custody QR scan in audit trail
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        laboratoryId: sample.laboratoryId,
        userId: req.user!.userId,
        action: 'QR_SCANNED',
        entityType: 'Sample',
        entityId: sample.id,
        changes: {
          scannedToken: rawToken,
          sampleNumber: sample.sampleNumber,
          scannedBy: req.user!.email,
          scannedAt: new Date().toISOString(),
        },
      },
    });

    // Technician ownership validation
    const currentUserId = req.user!.userId;
    const isTech = req.user!.role === 'lab_technician';
    const sampleTechId = sample.assignedTechnicianId;
    const userAssignedTests = sample.tests.filter((t: any) => t.technicianId === currentUserId);
    const otherAssignedTests = sample.tests.filter((t: any) => t.technicianId && t.technicianId !== currentUserId);

    const isAssignedToOther = isTech && sampleTechId && sampleTechId !== currentUserId && userAssignedTests.length === 0;
    const assignedWorkerName = sample.assignedTechnician
      ? `${sample.assignedTechnician.firstName} ${sample.assignedTechnician.lastName}`
      : otherAssignedTests.length > 0 && (otherAssignedTests[0] as any).technician
      ? `${(otherAssignedTests[0] as any).technician.firstName} ${(otherAssignedTests[0] as any).technician.lastName}`
      : null;

    res.json({
      success: true,
      data: {
        sample,
        action: 'QR_SCANNED',
        scannedAt: new Date(),
        scanSecurity: {
          isAssignedToOther: Boolean(isAssignedToOther),
          assignedWorkerName,
          canOpenWorksheet: !isAssignedToOther || !isTech,
          userAssignedTestIds: userAssignedTests.map((t: any) => t.id),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/samples/:id/qr - Get QR code for sample label / tag
sampleRoutes.get('/:id/qr', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isUuidVal = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(req.params.id);
    const orConditions: any[] = [{ sampleNumber: req.params.id }, { qrToken: req.params.id }];
    if (isUuidVal) orConditions.push({ id: req.params.id });

    const sample = await prisma.sample.findFirst({
      where: { OR: orConditions },
      select: {
        id: true,
        sampleNumber: true,
        qrToken: true,
        materialType: true,
        description: true,
        dateReceived: true,
      },
    });

    if (!sample) {
      throw new NotFoundError('Sample record not found');
    }

    const effectiveQrToken = sample.qrToken || sample.id;
    const qrPayload = `DOW-MS|SAMPLE|${sample.sampleNumber}|${effectiveQrToken}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      width: 320,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    res.json({
      success: true,
      data: {
        sampleId: sample.id,
        sampleNumber: sample.sampleNumber,
        qrToken: effectiveQrToken,
        qrPayload,
        qrCodeDataUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/samples/:id - Get sample details with tests and status history
sampleRoutes.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sample = await prisma.sample.findFirst({
      where: {
        OR: [{ id: req.params.id }, { sampleNumber: req.params.id }],
      },
      include: {
        project: true,
        assignedTechnician: {
          select: { id: true, firstName: true, lastName: true, email: true, designation: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        tests: {
          include: {
            testType: true,
            technician: {
              select: { id: true, firstName: true, lastName: true },
            },
            reviewer: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        reports: {
          select: {
            id: true,
            reportNumber: true,
            title: true,
            status: true,
            revisionNumber: true,
            pdfUrl: true,
            reportData: true,
            issuedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!sample) {
      throw new NotFoundError('Sample record not found');
    }

    const effectiveQrToken = sample.qrToken || sample.id;
    const qrPayload = `DOW-MS|SAMPLE|${sample.sampleNumber}|${effectiveQrToken}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      width: 320,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    res.json({
      success: true,
      data: {
        ...sample,
        qrToken: effectiveQrToken,
        qrPayload,
        qrCodeDataUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/samples - Register a new sample
sampleRoutes.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      requestId,
      projectId,
      materialType,
      description,
      sourceLocation,
      samplingDepth,
      clientReference,
      dateSampled,
      dateReceived,
      sampledBy,
      receivedBy,
      priority,
      condition,
      storageLocation,
      assignedTechnicianId,
      remarks,
      dueDate,
      requestedTestTypeIds,
      tests,
    } = req.body;

    const effectiveDateReceived = dateReceived ? new Date(dateReceived) : new Date();
    const effectiveReceivedBy = receivedBy || req.user?.email || 'Lab Staff';

    if (!materialType || !description || !sourceLocation) {
      throw new ValidationError('Material type, description, and source location are required');
    }

    const lab = await prisma.laboratory.findFirst({ where: { isActive: true } });
    if (!lab) throw new NotFoundError('Active laboratory not configured');

    let finalProjectId = projectId || null;
    if (requestId && !finalProjectId) {
      const reqRecord = await prisma.testingRequest.findUnique({
        where: { id: requestId },
        select: { projectId: true },
      });
      if (reqRecord?.projectId) {
        finalProjectId = reqRecord.projectId;
      }
    }

    const sampleNumber = await generateSampleNumber(materialType);
    const sampleId = uuidv4();

    const sample = await prisma.sample.create({
      data: {
        id: sampleId,
        laboratoryId: lab.id,
        projectId: finalProjectId,
        requestId: requestId || null,
        sampleNumber,
        materialType,
        description,
        sourceLocation,
        samplingDepth,
        clientReference: clientReference || null,
        dateSampled: dateSampled ? new Date(dateSampled) : null,
        dateReceived: effectiveDateReceived,
        sampledBy: sampledBy || null,
        receivedBy: effectiveReceivedBy,
        priority: priority || 'normal',
        condition: condition || 'intact',
        storageLocation,
        status: 'registered',
        assignedTechnicianId: assignedTechnicianId || null,
        createdById: req.user!.userId,
        remarks,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    // Record initial status history
    await prisma.sampleStatusHistory.create({
      data: {
        id: uuidv4(),
        sampleId,
        fromStatus: null,
        toStatus: 'registered',
        changedById: req.user!.userId,
        reason: 'Sample registered in Central Materials Laboratory system.',
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        laboratoryId: lab.id,
        userId: req.user!.userId,
        action: 'CREATE_SAMPLE',
        entityType: 'Sample',
        entityId: sampleId,
        changes: { sampleNumber, materialType, priority },
      },
    });

    // If tests array or requested test IDs were provided, create test assignments
    const testsToCreate: Array<{ testTypeId: string; assignedTechnicianId?: string }> = [];
    if (Array.isArray(tests) && tests.length > 0) {
      for (const t of tests) {
        if (t.testTypeId) {
          testsToCreate.push({
            testTypeId: t.testTypeId,
            assignedTechnicianId: t.assignedTechnicianId || assignedTechnicianId,
          });
        }
      }
    } else if (Array.isArray(requestedTestTypeIds) && requestedTestTypeIds.length > 0) {
      for (const ttId of requestedTestTypeIds) {
        testsToCreate.push({
          testTypeId: ttId,
          assignedTechnicianId,
        });
      }
    }

    let tstSeq = 1;
    for (const item of testsToCreate) {
      const testNumber = `TST-${new Date().getFullYear()}-${String(Date.now() % 10000 + tstSeq++).padStart(4, '0')}`;
      await prisma.labTest.create({
        data: {
          id: uuidv4(),
          sampleId,
          testTypeId: item.testTypeId,
          testNumber,
          technicianId: item.assignedTechnicianId || null,
          status: 'pending',
        },
      });
    }

    // Retrieve complete created sample record with relations
    const fullCreatedSample = await prisma.sample.findUnique({
      where: { id: sampleId },
      include: {
        project: true,
        assignedTechnician: true,
        tests: {
          include: { testType: true, technician: true },
        },
      },
    });

    const effectiveQrToken = fullCreatedSample?.qrToken || sampleId;
    const qrPayload = `DOW-MS|SAMPLE|${sampleNumber}|${effectiveQrToken}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      width: 320,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...fullCreatedSample,
        qrToken: effectiveQrToken,
        qrPayload,
        qrCodeDataUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/samples/:id - Update sample metadata
sampleRoutes.patch('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sample = await prisma.sample.findUnique({ where: { id: req.params.id } });
    if (!sample) throw new NotFoundError('Sample not found');

    const {
      projectId,
      materialType,
      description,
      sourceLocation,
      samplingDepth,
      dateSampled,
      dateReceived,
      sampledBy,
      receivedBy,
      priority,
      condition,
      storageLocation,
      assignedTechnicianId,
      remarks,
      dueDate,
    } = req.body;

    const updated = await prisma.sample.update({
      where: { id: req.params.id },
      data: {
        projectId: projectId !== undefined ? projectId : sample.projectId,
        materialType: materialType || sample.materialType,
        description: description || sample.description,
        sourceLocation: sourceLocation || sample.sourceLocation,
        samplingDepth: samplingDepth !== undefined ? samplingDepth : sample.samplingDepth,
        dateSampled: dateSampled ? new Date(dateSampled) : sample.dateSampled,
        dateReceived: dateReceived ? new Date(dateReceived) : sample.dateReceived,
        sampledBy: sampledBy !== undefined ? sampledBy : sample.sampledBy,
        receivedBy: receivedBy || sample.receivedBy,
        priority: priority || sample.priority,
        condition: condition || sample.condition,
        storageLocation: storageLocation !== undefined ? storageLocation : sample.storageLocation,
        assignedTechnicianId: assignedTechnicianId !== undefined ? assignedTechnicianId : sample.assignedTechnicianId,
        remarks: remarks !== undefined ? remarks : sample.remarks,
        dueDate: dueDate ? new Date(dueDate) : sample.dueDate,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        laboratoryId: sample.laboratoryId,
        userId: req.user!.userId,
        action: 'UPDATE_SAMPLE',
        entityType: 'Sample',
        entityId: sample.id,
        changes: { sampleNumber: sample.sampleNumber, updatedFields: Object.keys(req.body) },
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/samples/:id/status - Update sample status with validated transitions
sampleRoutes.post('/:id/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, reason } = req.body;

    const validStatuses = [
      'received',
      'registered',
      'in_progress',
      'awaiting_review',
      'approved',
      'completed',
      'rejected',
      'cancelled',
      'on_hold',
    ];

    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid sample status: '${status}'. Permitted: ${validStatuses.join(', ')}`);
    }

    const sample = await prisma.sample.findUnique({
      where: { id: req.params.id },
      include: { tests: true },
    });

    if (!sample) throw new NotFoundError('Sample not found');

    const fromStatus = sample.status;

    // Check transition validity
    if (fromStatus === 'completed' && req.user!.role !== 'lab_manager' && req.user!.role !== 'system_admin') {
      throw new ValidationError('Only a Laboratory Manager or System Admin can reopen a completed sample.');
    }

    const updated = await prisma.sample.update({
      where: { id: sample.id },
      data: { status },
    });

    // Record timeline history
    await prisma.sampleStatusHistory.create({
      data: {
        id: uuidv4(),
        sampleId: sample.id,
        fromStatus,
        toStatus: status,
        changedById: req.user!.userId,
        reason: reason || `Status changed from ${fromStatus} to ${status}`,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        laboratoryId: sample.laboratoryId,
        userId: req.user!.userId,
        action: 'CHANGE_SAMPLE_STATUS',
        entityType: 'Sample',
        entityId: sample.id,
        changes: { fromStatus, toStatus: status, reason },
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/samples/:id/cancel - Controlled sample cancellation
sampleRoutes.post('/:id/cancel', authenticate, requireReviewer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    if (!reason || String(reason).trim().length < 5) {
      throw new ValidationError('A detailed reason is required for controlled sample cancellation.');
    }

    const sample = await prisma.sample.findUnique({ where: { id: req.params.id } });
    if (!sample) throw new NotFoundError('Sample not found');

    const updated = await prisma.sample.update({
      where: { id: sample.id },
      data: { status: 'cancelled' },
    });

    await prisma.sampleStatusHistory.create({
      data: {
        id: uuidv4(),
        sampleId: sample.id,
        fromStatus: sample.status,
        toStatus: 'cancelled',
        changedById: req.user!.userId,
        reason: `Cancelled by ${req.user!.email}: ${reason}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        laboratoryId: sample.laboratoryId,
        userId: req.user!.userId,
        action: 'CANCEL_SAMPLE',
        entityType: 'Sample',
        entityId: sample.id,
        changes: { reason, sampleNumber: sample.sampleNumber },
      },
    });

    res.json({
      success: true,
      data: updated,
      message: 'Sample has been cancelled with audit trail recorded.',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/samples/:id/sheet - Printable Sample Registration / Tracking Sheet data
sampleRoutes.get('/:id/sheet', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sample = await prisma.sample.findFirst({
      where: {
        OR: [{ id: req.params.id }, { sampleNumber: req.params.id }],
      },
      include: {
        laboratory: true,
        project: true,
        assignedTechnician: true,
        createdBy: true,
        tests: {
          include: { testType: true, technician: true },
        },
      },
    });

    if (!sample) throw new NotFoundError('Sample not found');

    res.json({
      success: true,
      data: {
        laboratory: sample.laboratory,
        sample: {
          id: sample.id,
          sampleNumber: sample.sampleNumber,
          materialType: sample.materialType,
          description: sample.description,
          sourceLocation: sample.sourceLocation,
          samplingDepth: sample.samplingDepth,
          dateSampled: sample.dateSampled,
          dateReceived: sample.dateReceived,
          sampledBy: sample.sampledBy,
          receivedBy: sample.receivedBy,
          priority: sample.priority,
          condition: sample.condition,
          storageLocation: sample.storageLocation,
          status: sample.status,
          remarks: sample.remarks,
        },
        project: sample.project,
        assignedTechnician: sample.assignedTechnician,
        tests: sample.tests,
        printedAt: new Date(),
        printedBy: req.user!.email,
      },
    });
  } catch (error) {
    next(error);
  }
});
