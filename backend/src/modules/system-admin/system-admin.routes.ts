import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { requireAuth, requireSystemAdmin } from '../../middleware/auth.middleware';
import { NotFoundError, ValidationError } from '../../utils/errors';

export const systemAdminRoutes = Router();
systemAdminRoutes.use(requireAuth, requireSystemAdmin);

const color = z.string().regex(/^#[0-9a-f]{6}$/i, 'Color must be a 6-digit hexadecimal value');
const brandingInput = z.object({
  primaryColor: color.optional(),
  secondaryColor: color.optional(),
  sampleIdPrefix: z.string().max(20).optional(),
  reportIdPrefix: z.string().max(20).optional(),
  department: z.string().max(255).optional(),
  division: z.string().max(255).optional(),
});

const writeAudit = async (userId: string, action: string, entityType: string, entityId: string, changes?: unknown, laboratoryId?: string | null) => {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      laboratoryId: laboratoryId || undefined,
      changes: changes as object | undefined,
    },
  });
};

systemAdminRoutes.get('/dashboard', async (_req, res, next) => {
  try {
    const [
      totalLaboratories,
      activeLaboratories,
      totalUsers,
      totalSamples,
      totalTests,
      totalEquipment,
      recentLaboratories,
      recentActivity,
    ] = await Promise.all([
      prisma.laboratory.count(),
      prisma.laboratory.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.sample.count(),
      prisma.labTest.count(),
      prisma.equipment.count(),
      prisma.laboratory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, code: true, department: true, division: true, isActive: true, createdAt: true },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalLaboratories,
        activeLaboratories,
        totalUsers,
        totalSamples,
        totalTests,
        totalEquipment,
        recentLaboratories,
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
});

systemAdminRoutes.get('/overview', async (_req, res, next) => {
  try {
    const [
      totalLaboratories,
      activeLaboratories,
      totalUsers,
      totalSamples,
      totalTests,
      totalEquipment,
      recentLaboratories,
      recentActivity,
    ] = await Promise.all([
      prisma.laboratory.count(),
      prisma.laboratory.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.sample.count(),
      prisma.labTest.count(),
      prisma.equipment.count(),
      prisma.laboratory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, code: true, department: true, division: true, isActive: true, createdAt: true },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalLaboratories,
        activeLaboratories,
        totalUsers,
        totalSamples,
        totalTests,
        totalEquipment,
        recentLaboratories,
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
});

systemAdminRoutes.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        designation: true,
        laboratoryId: true,
        isActive: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true,
        laboratory: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

systemAdminRoutes.post('/users', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, designation, laboratoryId } = req.body;
    if (!email || !password || !firstName || !lastName || !role) {
      throw new ValidationError('Email, password, firstName, lastName, and role are required');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ValidationError('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        designation,
        laboratoryId: laboratoryId || undefined,
        isActive: true,
        emailVerified: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        designation: true,
        laboratoryId: true,
        isActive: true,
        createdAt: true,
      },
    });

    await writeAudit(req.user!.userId, 'CREATE', 'User', user.id, { email, role, laboratoryId }, laboratoryId);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

systemAdminRoutes.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ['system_admin', 'lab_manager', 'lab_engineer', 'lab_technician'];
    if (!validRoles.includes(role)) {
      throw new ValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    await writeAudit(req.user!.userId, 'UPDATE_ROLE', 'User', user.id, { newRole: role });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

systemAdminRoutes.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      throw new ValidationError('isActive must be a boolean');
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });

    await writeAudit(req.user!.userId, 'UPDATE_STATUS', 'User', user.id, { isActive });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

systemAdminRoutes.get('/audit-logs', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
          },
        },
      }),
      prisma.auditLog.count(),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

systemAdminRoutes.get('/settings', async (_req, res, next) => {
  try {
    const lab = await prisma.laboratory.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: lab || {
        name: 'PNG Department of Works Central Materials Testing Laboratory',
        code: 'DOW-HQ-01',
        department: 'Department of Works and Highways',
        division: 'Materials Testing & Quality Assurance Division',
        primaryColor: '#1E3A8A',
        secondaryColor: '#0D9488',
        sampleIdPrefix: 'DOW',
        reportIdPrefix: 'REP',
      },
    });
  } catch (error) {
    next(error);
  }
});

systemAdminRoutes.patch('/settings', async (req, res, next) => {
  try {
    const parsed = brandingInput.parse(req.body);
    const lab = await prisma.laboratory.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!lab) {
      throw new NotFoundError('No laboratory organization configured');
    }

    const updated = await prisma.laboratory.update({
      where: { id: lab.id },
      data: {
        primaryColor: parsed.primaryColor,
        secondaryColor: parsed.secondaryColor,
        sampleIdPrefix: parsed.sampleIdPrefix,
        reportIdPrefix: parsed.reportIdPrefix,
        department: parsed.department,
        division: parsed.division,
      },
    });

    await writeAudit(req.user!.userId, 'UPDATE_SETTINGS', 'Laboratory', lab.id, parsed, lab.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});
