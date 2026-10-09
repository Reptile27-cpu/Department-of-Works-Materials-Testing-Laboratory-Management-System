import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { authenticate, requireLabManager } from '../../middleware/auth.middleware';
import { NotFoundError } from '../../utils/errors';

export const laboratoryRoutes = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dow-lab-system-dev-jwt-secret-key-2026';

// GET /api/v1/laboratory - Get laboratory profile & settings
laboratoryRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lab = await prisma.laboratory.findFirst({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            samples: true,
            projects: true,
            equipment: true,
            users: true,
          },
        },
      },
    });

    if (!lab) {
      throw new NotFoundError('Laboratory organization record not found');
    }

    res.json({
      success: true,
      data: lab,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/laboratory/workers - List laboratory worker personnel identities
laboratoryRoutes.get('/workers', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const demoEmails = ['simon.wari@dow.gov.pg', 'michael.kila@dow.gov.pg', 'david.avara@dow.gov.pg'];

    const workers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { in: demoEmails } },
          { role: { in: ['lab_technician', 'lab_engineer'] }, email: { notIn: ['labworker@dow.gov.pg', 'tech@dow.gov.pg'] } },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        designation: true,
        avatarUrl: true,
        preferences: true,
        isActive: true,
      },
    });

    // Ensure the 3 core demo workers appear first in the exact required order
    workers.sort((a, b) => {
      const idxA = demoEmails.indexOf(a.email);
      const idxB = demoEmails.indexOf(b.email);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.firstName.localeCompare(b.firstName);
    });

    // Aggregate workloads for each worker
    const workerIds = workers.map((w) => w.id);
    const [activeCounts, totalCounts] = await Promise.all([
      prisma.labTest.groupBy({
        by: ['technicianId'],
        where: {
          technicianId: { in: workerIds },
          status: { in: ['assigned', 'in_progress'] },
        },
        _count: { id: true },
      }),
      prisma.labTest.groupBy({
        by: ['technicianId'],
        where: {
          technicianId: { in: workerIds },
        },
        _count: { id: true },
      }),
    ]);

    const activeMap = new Map(activeCounts.map((c) => [c.technicianId, c._count.id]));
    const totalMap = new Map(totalCounts.map((c) => [c.technicianId, c._count.id]));

    const formattedWorkers = workers.map((w) => {
      const prefs = (w.preferences as any) || {};
      const workerId =
        prefs.workerId ||
        (w.firstName === 'Simon' ? 'DOW-LT-001' : w.firstName === 'Michael' ? 'DOW-LT-002' : 'DOW-ME-001');
      const position =
        prefs.position ||
        (w.role === 'lab_engineer' ? 'Materials Engineer' : 'Laboratory Technician');
      const availability = prefs.availability || (w.isActive ? 'AVAILABLE' : 'INACTIVE');

      return {
        id: w.id,
        name: `${w.firstName} ${w.lastName}`,
        firstName: w.firstName,
        lastName: w.lastName,
        workerId,
        position,
        role: position,
        roleKey: w.role,
        designation: w.designation || position,
        email: w.email,
        avatarUrl: w.avatarUrl,
        availability,
        isActive: Boolean(w.isActive && availability !== 'INACTIVE'),
        activeTestsCount: activeMap.get(w.id) || 0,
        assignedWorkCount: totalMap.get(w.id) || 0,
      };
    });

    res.json({
      success: true,
      data: formattedWorkers,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/laboratory/workers/verify-pin - Securely unlock worker identity with private PIN
laboratoryRoutes.post('/workers/verify-pin', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workerId, pin } = req.body;
    if (!workerId || !pin) {
      return res.status(400).json({
        success: false,
        error: { message: 'Worker identifier and private PIN are required' },
      });
    }

    const worker = await prisma.user.findFirst({
      where: {
        OR: [
          { id: typeof workerId === 'string' && workerId.length === 36 ? workerId : undefined },
          { email: workerId },
        ].filter(Boolean) as any,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        designation: true,
        avatarUrl: true,
        preferences: true,
        isActive: true,
      },
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: { message: 'Worker identity not found' },
      });
    }

    const prefs = (worker.preferences as any) || {};
    const availability = prefs.availability || 'AVAILABLE';
    if (!worker.isActive || availability === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        error: { message: 'This worker identity has been deactivated and cannot be unlocked.' },
      });
    }

    const pinHash = prefs.pinHash;
    let isValidPin = false;

    if (pinHash) {
      isValidPin = await bcrypt.compare(String(pin).trim(), pinHash);
    } else {
      // Fallback default pins if not yet hashed
      const defaultPin =
        worker.firstName === 'Simon' ? '1111' :
        worker.firstName === 'Michael' ? '2222' :
        worker.firstName === 'David' ? '3333' : '1234';
      isValidPin = String(pin).trim() === defaultPin;
    }

    if (!isValidPin) {
      return res.status(401).json({
        success: false,
        error: { message: 'Incorrect private PIN. Access denied.' },
      });
    }

    const workerCode =
      prefs.workerId ||
      (worker.firstName === 'Simon' ? 'DOW-LT-001' : worker.firstName === 'Michael' ? 'DOW-LT-002' : 'DOW-ME-001');
    const position =
      prefs.position ||
      (worker.role === 'lab_engineer' ? 'Materials Engineer' : 'Laboratory Technician');

    // Issue a signed worker session token
    const workerSessionToken = jwt.sign(
      {
        actingWorkerId: worker.id,
        workerCode,
        workerName: `${worker.firstName} ${worker.lastName}`,
        sharedUserId: req.user!.userId,
        role: worker.role,
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    const safeWorker = {
      id: worker.id,
      name: `${worker.firstName} ${worker.lastName}`,
      firstName: worker.firstName,
      lastName: worker.lastName,
      workerId: workerCode,
      position,
      role: position,
      roleKey: worker.role,
      designation: worker.designation || position,
      email: worker.email,
      avatarUrl: worker.avatarUrl,
      availability,
    };

    res.json({
      success: true,
      data: {
        worker: safeWorker,
        workerSessionToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/laboratory/workers/:id/profile - Get profile telemetry for a specific worker
laboratoryRoutes.get('/workers/:id/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isSuperOrAdmin =
      req.user!.role === 'system_admin' ||
      req.user!.role === 'super_admin' ||
      req.user!.role === 'lab_manager';

    // Verify worker session authorization if not supervisor
    if (!isSuperOrAdmin) {
      const token = req.headers['x-worker-session-token'] as string;
      if (!token) {
        return res.status(401).json({
          success: false,
          error: { message: 'Active worker session required. Please unlock worker profile with PIN.' },
        });
      }
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded.actingWorkerId !== req.params.id) {
          return res.status(403).json({
            success: false,
            error: { message: 'Access denied: Active worker session cannot access another worker’s profile.' },
          });
        }
      } catch {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid or expired worker session token.' },
        });
      }
    }

    const worker = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        designation: true,
        avatarUrl: true,
        preferences: true,
        isActive: true,
      },
    });

    if (!worker) {
      throw new NotFoundError('Worker identity not found');
    }

    const prefs = (worker.preferences as any) || {};
    const workerId =
      prefs.workerId ||
      (worker.firstName === 'Simon' ? 'DOW-LT-001' : worker.firstName === 'Michael' ? 'DOW-LT-002' : 'DOW-ME-001');
    const position =
      prefs.position ||
      (worker.role === 'lab_engineer' ? 'Materials Engineer' : 'Laboratory Technician');
    const availability = prefs.availability || (worker.isActive ? 'AVAILABLE' : 'INACTIVE');

    // Aggregate assigned tests
    const [assignedWorkCount, activeTestsCount, completedTestsCount, awaitingReviewCount, recentTests] =
      await Promise.all([
        prisma.labTest.count({
          where: {
            OR: [
              { technicianId: worker.id },
              { reviewerId: worker.id },
              { sample: { assignedTechnicianId: worker.id } },
            ],
          },
        }),
        prisma.labTest.count({
          where: {
            OR: [{ technicianId: worker.id }, { sample: { assignedTechnicianId: worker.id } }],
            status: { in: ['assigned', 'in_progress'] },
          },
        }),
        prisma.labTest.count({
          where: {
            OR: [{ technicianId: worker.id }, { sample: { assignedTechnicianId: worker.id } }],
            status: { in: ['completed', 'approved', 'report_generated'] },
          },
        }),
        prisma.labTest.count({
          where: {
            OR: [{ technicianId: worker.id }, { reviewerId: worker.id }],
            status: 'awaiting_review',
          },
        }),
        prisma.labTest.findMany({
          where: {
            OR: [
              { technicianId: worker.id },
              { reviewerId: worker.id },
              { sample: { assignedTechnicianId: worker.id } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            testType: true,
            sample: { select: { sampleNumber: true, materialType: true } },
          },
        }),
      ]);

    res.json({
      success: true,
      data: {
        id: worker.id,
        name: `${worker.firstName} ${worker.lastName}`,
        firstName: worker.firstName,
        lastName: worker.lastName,
        workerId,
        position,
        role: position,
        roleKey: worker.role,
        designation: worker.designation || position,
        email: worker.email,
        availability,
        isActive: worker.isActive && availability !== 'INACTIVE',
        assignedWorkCount,
        activeTestsCount,
        completedTestsCount,
        awaitingReviewCount,
        recentTests,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/laboratory/workers - Add a worker identity (Lab Manager only)
laboratoryRoutes.post('/workers', authenticate, requireLabManager, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      firstName,
      lastName,
      workerId,
      workerCode,
      position,
      designation,
      role,
      availability = 'AVAILABLE',
      initialPin = '1234',
    } = req.body;
    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, error: { message: 'First name and last name are required' } });
    }

    const lab = (await prisma.laboratory.findFirst({ where: { isActive: true } })) || (await prisma.laboratory.findFirst());
    if (!lab) throw new NotFoundError('Laboratory not found');

    const pinHash = await bcrypt.hash(String(initialPin).trim(), 10);
    const dummyPasswordHash = await bcrypt.hash('DISABLED_LOGIN_USE_SHARED_ACCOUNT', 12);
    const slug = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const standardEmail = `${slug}@dow.gov.pg`;
    const existingUser = await prisma.user.findUnique({ where: { email: standardEmail } });
    const email = existingUser ? `${slug}-${Date.now().toString().slice(-4)}@dow.gov.pg` : standardEmail;
    const genWorkerId = (workerCode || workerId || `DOW-LT-${String(Math.floor(Math.random() * 900) + 100)}`).toUpperCase();
    const finalPosition = designation || position || 'Laboratory Technician';
    const isEngineer = role === 'lab_engineer' || finalPosition?.toLowerCase().includes('engineer');

    const created = await prisma.user.create({
      data: {
        id: uuidv4(),
        laboratoryId: lab.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email,
        role: isEngineer ? 'lab_engineer' : 'lab_technician',
        designation: finalPosition,
        passwordHash: dummyPasswordHash,
        isActive: availability !== 'INACTIVE',
        preferences: {
          isWorkerIdentity: true,
          workerId: genWorkerId,
          position: finalPosition,
          availability,
          pinHash,
        },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: created.id,
        name: `${created.firstName} ${created.lastName}`,
        workerId: genWorkerId,
        position: finalPosition,
        availability,
        isActive: created.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/laboratory/workers/:id - Edit worker information & availability (Lab Manager only)
laboratoryRoutes.patch('/workers/:id', authenticate, requireLabManager, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, position, availability, pin, isActive } = req.body;
    const worker = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!worker) throw new NotFoundError('Worker identity not found');

    const currentPrefs = (worker.preferences as any) || {};
    let pinHash = currentPrefs.pinHash;
    if (pin) {
      pinHash = await bcrypt.hash(String(pin).trim(), 10);
    }

    const newAvailability = availability !== undefined ? availability : currentPrefs.availability;
    const newIsActive = isActive !== undefined ? isActive : newAvailability !== 'INACTIVE';

    const updated = await prisma.user.update({
      where: { id: worker.id },
      data: {
        firstName: firstName ? firstName.trim() : worker.firstName,
        lastName: lastName ? lastName.trim() : worker.lastName,
        designation: position || worker.designation,
        isActive: newIsActive,
        preferences: {
          ...currentPrefs,
          position: position || currentPrefs.position,
          availability: newAvailability,
          pinHash,
        },
      },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        name: `${updated.firstName} ${updated.lastName}`,
        workerId: currentPrefs.workerId,
        position: position || currentPrefs.position,
        availability: newAvailability,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/laboratory/workers/:id - Soft-deactivate worker identity (Lab Manager only)
laboratoryRoutes.delete('/workers/:id', authenticate, requireLabManager, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const worker = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!worker) throw new NotFoundError('Worker identity not found');

    const currentPrefs = (worker.preferences as any) || {};
    await prisma.user.update({
      where: { id: worker.id },
      data: {
        isActive: false,
        preferences: {
          ...currentPrefs,
          availability: 'INACTIVE',
        },
      },
    });

    res.json({
      success: true,
      message: 'Worker identity deactivated. Historical records and test logs preserved.',
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/laboratory - Update lab settings (Manager / Admin only)
laboratoryRoutes.patch(
  '/',
  authenticate,
  requireLabManager,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lab = await prisma.laboratory.findFirst({ where: { isActive: true } });
      if (!lab) throw new NotFoundError('Laboratory not found');

      const { name, department, division, address, phone, email, settings, sampleIdPrefix, reportIdPrefix } = req.body;

      const updated = await prisma.laboratory.update({
        where: { id: lab.id },
        data: {
          name,
          department,
          division,
          address,
          phone,
          email,
          sampleIdPrefix,
          reportIdPrefix,
          settings: settings ? (settings as any) : undefined,
        },
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);
