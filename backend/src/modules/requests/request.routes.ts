import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { prisma } from '../../config/database';
import { authenticate, requireReviewer } from '../../middleware/auth.middleware';
import { generateSampleNumber } from '../samples/sample.routes';

export const requestRoutes = Router();

// ==================== PUBLIC UNRESTRICTED ENDPOINTS (NO AUTH REQUIRED) ====================

// 1. GET /api/v1/requests/public/categories - Public test catalogue grouped by category
requestRoutes.get('/public/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const testTypes = await prisma.testType.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        standard: true,
        category: true,
        defaultTurnaroundDays: true,
        unitPricePublic: true,
        unitPricePrivate: true,
        unit: true,
        description: true,
      },
    });

    const categories: Record<string, typeof testTypes> = {};
    for (const t of testTypes) {
      if (!categories[t.category]) {
        categories[t.category] = [];
      }
      categories[t.category].push(t);
    }

    res.json({
      success: true,
      data: {
        categories,
        totalTests: testTypes.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Helper to generate sequential Request Reference ID: REQ-YYYY-XXXX
async function generateRequestNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const pattern = `REQ-${currentYear}-`;
  const countThisYear = await prisma.testingRequest.count({
    where: {
      requestNumber: { startsWith: pattern },
    },
  });

  let nextSeq = countThisYear + 1;
  let candidate = `${pattern}${String(nextSeq).padStart(4, '0')}`;
  let collision = await prisma.testingRequest.findUnique({ where: { requestNumber: candidate } });
  while (collision) {
    nextSeq++;
    candidate = `${pattern}${String(nextSeq).padStart(4, '0')}`;
    collision = await prisma.testingRequest.findUnique({ where: { requestNumber: candidate } });
  }
  return candidate;
}

// 2. POST /api/v1/requests/public - Public Client Testing Request Submission
requestRoutes.post('/public', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      clientName,
      organization,
      requestType = 'private',
      contactPerson,
      phone,
      email,
      address,
      projectName,
      projectLocation,
      poNumber,
      proposedUse,
      sampleCategory,
      sampleDescription,
      sampleQuantity,
      materialSource,
      samplingDepth,
      dateSampled,
      sampledBy,
      resultsRequiredBy,
      priority = 'normal',
      testTypeIds,
      remarks,
    } = req.body;

    const primaryClientName = (clientName || organization || '').trim();
    if (!primaryClientName) {
      return res.status(400).json({
        success: false,
        error: { message: 'Client name or organization is required' },
      });
    }

    if (!sampleDescription || !sampleDescription.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Sample description is required' },
      });
    }

    // Default to primary laboratory
    const lab = await prisma.laboratory.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!lab) {
      return res.status(500).json({
        success: false,
        error: { message: 'Central Materials Testing Laboratory facility not initialized' },
      });
    }

    // 1. Find or create Client
    let client = await prisma.client.findFirst({
      where: {
        laboratoryId: lab.id,
        OR: [
          { name: { equals: primaryClientName, mode: 'insensitive' } },
          email ? { email: { equals: email, mode: 'insensitive' } } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (!client) {
      const clientCount = await prisma.client.count();
      const clientCode = `CLI-${String(clientCount + 1).padStart(4, '0')}`;
      client = await prisma.client.create({
        data: {
          id: uuidv4(),
          laboratoryId: lab.id,
          clientCode,
          name: primaryClientName,
          clientType: requestType === 'public' ? 'government' : 'private',
          contactPerson: contactPerson || primaryClientName,
          phone: phone || null,
          email: email || null,
          address: address || null,
          updatedAt: new Date(),
        },
      });
    }

    // 2. Find or create Project (if project name provided)
    let project: any = null;
    if (projectName && projectName.trim()) {
      project = await prisma.project.findFirst({
        where: {
          laboratoryId: lab.id,
          name: { equals: projectName.trim(), mode: 'insensitive' },
        },
      });

      if (!project) {
        const projCount = await prisma.project.count();
        const projectCode = `PRJ-${String(projCount + 1).padStart(4, '0')}`;
        project = await prisma.project.create({
          data: {
            id: uuidv4(),
            laboratoryId: lab.id,
            clientId: client.id,
            projectCode,
            name: projectName.trim(),
            client: primaryClientName,
            location: projectLocation || 'National Highway Works, PNG',
            description: proposedUse || null,
            status: 'active',
          },
        });
      }
    }

    // 3. Resolve requested tests and estimate costs
    const testIds: string[] = Array.isArray(testTypeIds) ? testTypeIds : [];
    let selectedTestTypes: any[] = [];
    if (testIds.length > 0) {
      selectedTestTypes = await prisma.testType.findMany({
        where: { id: { in: testIds } },
      });
    }

    let totalEstimated = 0;
    const requestItemsData = selectedTestTypes.map((tt) => {
      const unitPrice = Number(requestType === 'public' ? tt.unitPricePublic : tt.unitPricePrivate);
      totalEstimated += unitPrice;
      return {
        id: uuidv4(),
        testTypeId: tt.id,
        quantity: 1,
        unitPrice,
        sampleIdentifier: sampleDescription.slice(0, 80),
        samplingDepth: samplingDepth || null,
      };
    });

    // 4. Generate Request Reference Number
    const requestNumber = await generateRequestNumber();
    const requestId = uuidv4();

    // 5. Create TestingRequest record in PostgreSQL
    const newRequest = await prisma.testingRequest.create({
      data: {
        id: requestId,
        laboratoryId: lab.id,
        clientId: client.id,
        projectId: project ? project.id : null,
        requestNumber,
        poNumber: poNumber || null,
        requestType: requestType === 'public' ? 'government' : 'private',
        contactPerson: contactPerson || primaryClientName,
        contactPhone: phone || null,
        contactEmail: email || null,
        location: projectLocation || null,
        materialSource: materialSource || null,
        proposedUse: proposedUse || null,
        sampleCategory: sampleCategory || 'Soils',
        sampleDescription,
        sampleQuantity: sampleQuantity ? Number(sampleQuantity) : null,
        dateSampled: dateSampled ? new Date(dateSampled) : null,
        sampledBy: sampledBy || null,
        submittedBy: contactPerson || primaryClientName,
        resultsRequiredBy: resultsRequiredBy ? new Date(resultsRequiredBy) : null,
        priority: priority || 'normal',
        status: 'submitted',
        estimatedCost: totalEstimated,
        remarks: remarks || null,
        updatedAt: new Date(),
        requestItems: {
          create: requestItemsData,
        },
      },
      include: {
        client: true,
        project: true,
        requestItems: {
          include: { testType: true },
        },
      },
    });

    // 6. In-app notification for Laboratory Managers
    try {
      const labManagers = await prisma.user.findMany({
        where: {
          laboratoryId: lab.id,
          role: { in: ['lab_manager', 'system_admin', 'super_admin'] },
          isActive: true,
        },
        select: { id: true },
      });

      for (const mgr of labManagers) {
        await prisma.notification.create({
          data: {
            id: uuidv4(),
            laboratoryId: lab.id,
            recipientId: mgr.id,
            type: 'REQUEST_SUBMITTED',
            title: `New Public Testing Request: ${requestNumber}`,
            message: `Public client ${primaryClientName} submitted request ${requestNumber} for ${sampleCategory || 'Materials'} testing. Estimated: K ${totalEstimated.toFixed(2)}.`,
            link: `/requests`,
            dedupeKey: `req_notif_${requestId}_${mgr.id}`,
          },
        });
      }
    } catch {
      // Notification failure should not block request submission
    }

    res.status(201).json({
      success: true,
      data: {
        id: newRequest.id,
        requestNumber: newRequest.requestNumber,
        clientName: newRequest.client.name,
        projectId: newRequest.projectId,
        projectName: newRequest.project?.name || null,
        sampleCategory: newRequest.sampleCategory,
        sampleDescription: newRequest.sampleDescription,
        materialSource: newRequest.materialSource,
        status: newRequest.status,
        estimatedCost: Number(newRequest.estimatedCost),
        itemCount: newRequest.requestItems.length,
        createdAt: newRequest.createdAt,
        instructions: {
          dropOffLocation: 'Central Materials Testing Laboratory, Department of Works, Boroko, Port Moresby, NCD',
          operatingHours: 'Monday - Friday: 08:00 AM - 04:00 PM',
          referenceGuidance: `Quote reference number ${requestNumber} when delivering physical samples to the intake counter.`,
          trackingNote: 'A secure DoW QR Code will be printed and attached to your sample container upon physical receipt.',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==================== AUTHENTICATED STAFF ENDPOINTS ====================

// Apply authentication to staff management routes
requestRoutes.use(authenticate);

// 3. GET /api/v1/requests - List all testing requests
requestRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search, sampleCategory } = req.query;
    const labId = req.user?.laboratoryId;

    const where: any = {
      ...(labId ? { laboratoryId: labId } : {}),
      ...(status && status !== 'all' ? { status: String(status).toLowerCase() } : {}),
      ...(sampleCategory && sampleCategory !== 'all' ? { sampleCategory: String(sampleCategory) } : {}),
    };

    // Client role isolation: clients only see their own submitted requests
    if (req.user?.role === 'client') {
      where.OR = [
        { submittedById: req.user.userId },
        { contactEmail: { equals: req.user.email, mode: 'insensitive' } },
        { client: { email: { equals: req.user.email, mode: 'insensitive' } } },
      ];
    } else if (search) {
      where.OR = [
        { requestNumber: { contains: String(search).trim(), mode: 'insensitive' } },
        { contactPerson: { contains: String(search).trim(), mode: 'insensitive' } },
        { client: { name: { contains: String(search).trim(), mode: 'insensitive' } } },
        { project: { name: { contains: String(search).trim(), mode: 'insensitive' } } },
      ];
    }

    const requests = await prisma.testingRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, clientCode: true, clientType: true } },
        project: { select: { id: true, name: true, projectCode: true } },
        requestItems: {
          include: { testType: { select: { id: true, code: true, name: true, standard: true } } },
        },
        evaluation: true,
        samples: { select: { id: true, sampleNumber: true, status: true } },
      },
      take: 100,
    });

    const mapped = requests.map((r) => ({
      ...r,
      clientName: r.client?.name || 'Client',
      projectName: r.project?.name || 'Standard Works',
      materialType: r.sampleCategory || 'Civil Materials',
      location: r.location || 'Port Moresby, PNG',
      samplingDate: r.dateSampled ? r.dateSampled.toISOString().split('T')[0] : r.createdAt.toISOString().split('T')[0],
      requestedTests: r.requestItems?.map((ri) => ri.testType?.name || ri.testType?.code) || [],
      sampleId: r.samples?.[0]?.id || null,
      sampleNumber: r.samples?.[0]?.sampleNumber || null,
    }));

    res.json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
});

// 3b. POST /api/v1/requests - Authenticated testing request submission (for Clients and Staff)
requestRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      clientName,
      organization,
      requestType = 'private',
      contactPerson,
      phone,
      email,
      address,
      projectName,
      projectLocation,
      location,
      sourceLocation,
      materialSource,
      proposedUse,
      sampleCategory,
      materialType,
      sampleDescription,
      sampleQuantity,
      samplingDepth,
      samplingDate,
      dateSampled,
      sampledBy,
      resultsRequiredBy,
      priority = 'normal',
      testTypeIds,
      requestedTests,
      poNumber,
      remarks,
    } = req.body;

    const primaryClientName = (
      clientName ||
      organization ||
      (req.user ? `${req.user.email}` : '') ||
      'Client Proponent'
    ).trim();

    const effectiveDescription = (
      sampleDescription ||
      `${materialType || sampleCategory || 'Materials'} sample submitted for laboratory testing`
    ).trim();
    const effectiveLocation = location || projectLocation || 'Project Site';
    const effectiveMaterialSource = sourceLocation || materialSource || 'Site Quarry / Borrow Pit';
    const effectiveCategory = sampleCategory || materialType || 'Soils';
    const effectiveSamplingDate = samplingDate || dateSampled || new Date().toISOString().split('T')[0];
    const effectiveEmail = email || req.user?.email || null;
    const effectivePhone = phone || null;

    const lab = await prisma.laboratory.findFirst({
      where: req.user?.laboratoryId ? { id: req.user.laboratoryId } : { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!lab) {
      return res.status(500).json({
        success: false,
        error: { message: 'Central Materials Testing Laboratory facility not initialized' },
      });
    }

    // 1. Find or create Client
    let client = await prisma.client.findFirst({
      where: {
        laboratoryId: lab.id,
        OR: [
          { name: { equals: primaryClientName, mode: 'insensitive' } },
          effectiveEmail ? { email: { equals: effectiveEmail, mode: 'insensitive' } } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (!client) {
      const clientCount = await prisma.client.count();
      const clientCode = `CLI-${String(clientCount + 1).padStart(4, '0')}`;
      client = await prisma.client.create({
        data: {
          id: uuidv4(),
          laboratoryId: lab.id,
          clientCode,
          name: primaryClientName,
          clientType: requestType === 'public' ? 'government' : 'private',
          contactPerson: contactPerson || primaryClientName,
          phone: effectivePhone,
          email: effectiveEmail,
          address: address || 'Port Moresby, PNG',
          updatedAt: new Date(),
        },
      });
    }

    // 2. Find or create Project
    let project = null;
    if (projectName && projectName.trim()) {
      const pName = projectName.trim();
      project = await prisma.project.findFirst({
        where: {
          clientId: client.id,
          name: { equals: pName, mode: 'insensitive' },
        },
      });

      if (!project) {
        const projCount = await prisma.project.count();
        const pCode = `PRJ-${new Date().getFullYear()}-${String(projCount + 1).padStart(4, '0')}`;
        project = await prisma.project.create({
          data: {
            id: uuidv4(),
            laboratoryId: lab.id,
            clientId: client.id,
            client: client.name,
            projectCode: pCode,
            name: pName,
            location: effectiveLocation,
            updatedAt: new Date(),
          },
        });
      }
    }

    // 3. Resolve requested tests
    let requestedTestTypes: any[] = [];
    if (Array.isArray(testTypeIds) && testTypeIds.length > 0) {
      requestedTestTypes = await prisma.testType.findMany({
        where: { id: { in: testTypeIds } },
      });
    } else if (Array.isArray(requestedTests) && requestedTests.length > 0) {
      requestedTestTypes = await prisma.testType.findMany({
        where: {
          isActive: true,
          OR: requestedTests.map((tName: string) => ({
            name: { contains: String(tName).trim(), mode: 'insensitive' },
          })),
        },
      });
    }

    if (requestedTestTypes.length === 0) {
      requestedTestTypes = await prisma.testType.findMany({
        where: { category: effectiveCategory, isActive: true },
        take: 2,
      });
    }

    // 4. Calculate item pricing and totals
    const isGov = requestType === 'public';
    let subtotal = 0;
    const requestItemsData = requestedTestTypes.map((t) => {
      const unitPrice = Number(isGov ? t.unitPricePublic : t.unitPricePrivate);
      subtotal += unitPrice;
      return {
        id: uuidv4(),
        testTypeId: t.id,
        quantity: 1,
        unitPrice,
        sampleIdentifier: effectiveDescription.slice(0, 80),
        samplingDepth: samplingDepth || null,
      };
    });

    const adminSurcharge = Number((subtotal * 0.03).toFixed(2));
    const totalEstimated = Number((subtotal + adminSurcharge).toFixed(2));

    // 5. Generate Request Reference Number
    const requestNumber = await generateRequestNumber();
    const requestId = uuidv4();

    // 6. Create TestingRequest record
    const newRequest = await prisma.testingRequest.create({
      data: {
        id: requestId,
        laboratoryId: lab.id,
        clientId: client.id,
        projectId: project ? project.id : null,
        requestNumber,
        poNumber: poNumber || null,
        requestType: requestType === 'public' ? 'government' : 'private',
        contactPerson: contactPerson || primaryClientName,
        contactPhone: effectivePhone,
        contactEmail: effectiveEmail,
        location: effectiveLocation,
        materialSource: effectiveMaterialSource,
        proposedUse: proposedUse || null,
        sampleCategory: effectiveCategory,
        sampleDescription: effectiveDescription,
        sampleQuantity: sampleQuantity ? Number(sampleQuantity) : 1,
        dateSampled: effectiveSamplingDate ? new Date(effectiveSamplingDate) : null,
        sampledBy: sampledBy || null,
        submittedBy: contactPerson || primaryClientName,
        submittedById: req.user?.userId || null,
        resultsRequiredBy: resultsRequiredBy ? new Date(resultsRequiredBy) : null,
        priority: priority ? String(priority).toLowerCase() : 'normal',
        status: 'submitted',
        estimatedCost: totalEstimated,
        remarks: remarks || null,
        updatedAt: new Date(),
        requestItems: {
          create: requestItemsData,
        },
      },
      include: {
        client: true,
        project: true,
        requestItems: {
          include: { testType: true },
        },
      },
    });

    // 7. Notify Lab Managers
    try {
      const labManagers = await prisma.user.findMany({
        where: {
          laboratoryId: lab.id,
          role: { in: ['lab_manager', 'system_admin', 'super_admin'] },
          isActive: true,
        },
        select: { id: true },
      });
      for (const mgr of labManagers) {
        await prisma.notification.create({
          data: {
            id: uuidv4(),
            laboratoryId: lab.id,
            recipientId: mgr.id,
            type: 'REQUEST_SUBMITTED',
            title: `New Testing Request: ${requestNumber}`,
            message: `Client ${primaryClientName} submitted request ${requestNumber} for ${effectiveCategory} testing (PGK K${totalEstimated.toFixed(2)}).`,
            link: `/requests/${newRequest.id}`,
            dedupeKey: `req_notif_${requestId}_${mgr.id}`,
          },
        });
      }
    } catch {
      // Non-blocking notification
    }

    res.status(201).json({
      success: true,
      data: newRequest,
    });
  } catch (error) {
    next(error);
  }
});

// 4. GET /api/v1/requests/:id - View single testing request
requestRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestItem = await prisma.testingRequest.findFirst({
      where: {
        OR: [
          { id: typeof req.params.id === 'string' && req.params.id.length === 36 ? req.params.id : undefined },
          { requestNumber: req.params.id },
        ].filter(Boolean) as any,
      },
      include: {
        client: true,
        project: true,
        requestItems: {
          include: { testType: true },
        },
        evaluation: {
          include: {
            evaluatedBy: { select: { firstName: true, lastName: true, designation: true } },
          },
        },
        samples: {
          include: {
            tests: { include: { testType: true } },
          },
        },
      },
    });

    if (!requestItem) {
      return res.status(404).json({ success: false, error: { message: 'Testing request not found' } });
    }

    const mapped = {
      ...requestItem,
      clientName: requestItem.client?.name || 'Client',
      projectName: requestItem.project?.name || 'Civil Engineering Works',
      materialType: requestItem.sampleCategory || 'Civil Materials',
      sourceLocation: requestItem.materialSource || requestItem.location || 'Site Intake',
      samplingDate: requestItem.dateSampled ? requestItem.dateSampled.toISOString().split('T')[0] : requestItem.createdAt.toISOString().split('T')[0],
      requestedTests: requestItem.requestItems?.map((ri) => ri.testType?.name || ri.testType?.code) || [],
      sampleId: requestItem.samples?.[0]?.id || null,
      sampleNumber: requestItem.samples?.[0]?.sampleNumber || null,
      evaluatedBy: requestItem.evaluation?.evaluatedBy ? `${requestItem.evaluation.evaluatedBy.firstName} ${requestItem.evaluation.evaluatedBy.lastName}` : null,
      evaluationNotes: requestItem.evaluation?.comments || null,
      evaluatedAt: requestItem.evaluation?.createdAt ? requestItem.evaluation.createdAt.toISOString() : null,
    };

    res.json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
});

// 5. POST /api/v1/requests/:id/evaluate - Technical Form Review of Request
requestRoutes.post('/:id/evaluate', requireReviewer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestItem = await prisma.testingRequest.findFirst({
      where: {
        OR: [
          { id: typeof req.params.id === 'string' && req.params.id.length === 36 ? req.params.id : undefined },
          { requestNumber: req.params.id },
        ].filter(Boolean) as any,
      },
    });

    if (!requestItem) {
      return res.status(404).json({ success: false, error: { message: 'Testing request not found' } });
    }

    const {
      methodAvailable = true,
      methodSuitable = true,
      equipmentAvailable = true,
      equipmentCalibrated = true,
      personnelCompetent = true,
      sampleQuantityOk = true,
      sampleConditionOk = true,
      subcontractRequired = false,
      subcontractorName,
      turnaroundFeasible = true,
      agreedDeliveryDate,
      rateScheduleApplied = 'private',
      decision = 'approved',
      comments,
    } = req.body;

    const evalId = uuidv4();

    // Upsert technical evaluation
    const evaluation = await prisma.requestEvaluation.upsert({
      where: { requestId: requestItem.id },
      create: {
        id: evalId,
        requestId: requestItem.id,
        evaluatedById: req.user!.userId,
        methodAvailable,
        methodSuitable,
        equipmentAvailable,
        equipmentCalibrated,
        personnelCompetent,
        sampleQuantityOk,
        sampleConditionOk,
        subcontractRequired,
        subcontractorName: subcontractRequired ? subcontractorName : null,
        turnaroundFeasible,
        agreedDeliveryDate: agreedDeliveryDate ? new Date(agreedDeliveryDate) : null,
        rateScheduleApplied,
        decision,
        comments: comments || 'Technical evaluation completed according to DoW laboratory standards.',
        updatedAt: new Date(),
      },
      update: {
        evaluatedById: req.user!.userId,
        methodAvailable,
        methodSuitable,
        equipmentAvailable,
        equipmentCalibrated,
        personnelCompetent,
        sampleQuantityOk,
        sampleConditionOk,
        subcontractRequired,
        subcontractorName: subcontractRequired ? subcontractorName : null,
        turnaroundFeasible,
        agreedDeliveryDate: agreedDeliveryDate ? new Date(agreedDeliveryDate) : null,
        rateScheduleApplied,
        decision,
        comments: comments || 'Technical evaluation updated.',
        updatedAt: new Date(),
      },
    });

    // Update request status based on decision
    let newStatus = 'evaluated';
    if (decision === 'rejected') newStatus = 'rejected';
    else if (decision === 'approved') newStatus = 'approved';
    else if (decision === 'clarification') newStatus = 'clarification_needed';

    await prisma.testingRequest.update({
      where: { id: requestItem.id },
      data: {
        status: newStatus,
        approvedById: req.user!.userId,
        approvedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        requestId: requestItem.id,
        status: newStatus,
        evaluation,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 6. POST /api/v1/requests/:id/convert-to-sample - Intake physical specimen & assign technician
requestRoutes.post('/:id/convert-to-sample', requireReviewer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestItem = await prisma.testingRequest.findFirst({
      where: {
        OR: [
          { id: typeof req.params.id === 'string' && req.params.id.length === 36 ? req.params.id : undefined },
          { requestNumber: req.params.id },
        ].filter(Boolean) as any,
      },
      include: {
        client: true,
        project: true,
        requestItems: { include: { testType: true } },
      },
    });

    if (!requestItem) {
      return res.status(404).json({ success: false, error: { message: 'Testing request not found' } });
    }

    const {
      technicianId,
      storageLocation = 'Intake Rack A-01',
      remarks,
      dueDate,
      condition = 'intact',
    } = req.body;

    const lab = await prisma.laboratory.findFirst({
      where: { id: requestItem.laboratoryId },
    });
    if (!lab) {
      return res.status(404).json({ success: false, error: { message: 'Laboratory not found' } });
    }

    // Generate collision-proof DoW sample number (e.g. 26P-S-015)
    const materialType = requestItem.sampleCategory || 'Soils';
    const sampleNumber = await generateSampleNumber(materialType);
    const sampleId = uuidv4();
    const qrToken = uuidv4();

    // Create Sample
    const sample = await prisma.sample.create({
      data: {
        id: sampleId,
        laboratoryId: lab.id,
        projectId: requestItem.projectId,
        requestId: requestItem.id,
        sampleNumber,
        qrToken,
        materialType,
        description: requestItem.sampleDescription || `Sample for ${requestItem.requestNumber}`,
        sourceLocation: requestItem.materialSource || requestItem.location || 'Site Intake',
        clientReference: requestItem.requestNumber,
        dateSampled: requestItem.dateSampled,
        dateReceived: new Date(),
        sampledBy: requestItem.sampledBy,
        receivedBy: req.user!.email,
        priority: requestItem.priority || 'normal',
        condition,
        storageLocation,
        status: technicianId ? 'in_progress' : 'registered',
        assignedTechnicianId: technicianId || null,
        createdById: req.user!.userId,
        remarks: remarks || `Intake from Request ${requestItem.requestNumber}`,
        dueDate: dueDate ? new Date(dueDate) : null,
        updatedAt: new Date(),
      },
    });

    // Record status history
    await prisma.sampleStatusHistory.create({
      data: {
        id: uuidv4(),
        sampleId,
        fromStatus: null,
        toStatus: technicianId ? 'in_progress' : 'registered',
        changedById: req.user!.userId,
        reason: `Physical specimen received for testing request ${requestItem.requestNumber}.`,
      },
    });

    // Create LabTest records for all requested tests
    const createdTests: any[] = [];
    const currentYear = new Date().getFullYear();

    for (const item of requestItem.requestItems) {
      const testCount = await prisma.labTest.count();
      const testNumber = `TST-${currentYear}-${String(testCount + 1).padStart(4, '0')}`;
      const labTest = await prisma.labTest.create({
        data: {
          id: uuidv4(),
          sampleId,
          testTypeId: item.testTypeId,
          testNumber,
          technicianId: technicianId || null,
          reviewerId: req.user!.userId,
          status: technicianId ? 'assigned' : 'pending',
          remarks: `Assigned via Form RQ-LT conversion`,
        },
        include: { testType: true },
      });
      createdTests.push(labTest);

      // Notify technician if assigned
      if (technicianId) {
        try {
          await prisma.notification.create({
            data: {
              id: uuidv4(),
              laboratoryId: lab.id,
              recipientId: technicianId,
              type: 'TEST_ASSIGNED',
              title: `New Test Assigned: ${testNumber}`,
              message: `You have been assigned ${labTest.testType.name} for sample ${sampleNumber}.`,
              link: `/work-queue`,
              dedupeKey: `assign_${labTest.id}_${technicianId}`,
            },
          });
        } catch {
          // Non-blocking notification
        }
      }
    }

    // Update request status to 'converted_to_sample'
    await prisma.testingRequest.update({
      where: { id: requestItem.id },
      data: {
        status: 'converted_to_sample',
        updatedAt: new Date(),
      },
    });

    const effectiveQrToken = sample.qrToken || sampleId;
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

    res.json({
      success: true,
      data: {
        sample: {
          ...sample,
          qrToken: effectiveQrToken,
          qrPayload,
          qrCodeDataUrl,
        },
        tests: createdTests,
        requestStatus: 'converted_to_sample',
      },
    });
  } catch (error) {
    next(error);
  }
});

