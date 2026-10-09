import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { prisma } from '../../config/database';
import { laboratoryScope } from '../../utils/route-helpers';

export const analyticsRoutes = Router();
analyticsRoutes.use(authenticate);

const resolveLabScope = (req: Request): { laboratoryId?: string } => {
  if (req.user?.role === 'system_admin' || req.user?.role === 'super_admin') {
    const requested = req.query.laboratoryId || req.body?.laboratoryId;
    if (typeof requested === 'string' && requested) return { laboratoryId: requested };
    if (req.user?.laboratoryId) return { laboratoryId: req.user.laboratoryId };
    return {};
  }
  return { laboratoryId: laboratoryScope(req) };
};

// GET /api/v1/analytics/dashboard - Operational Laboratory Telemetry
analyticsRoutes.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scope = resolveLabScope(req);
    const now = new Date();

    const [
      totalSamples,
      samplesAwaitingTesting,
      testsInProgress,
      testsAwaitingReview,
      completedTests,
      rejectedTests,
      totalEquipment,
      overdueCalibrationEquipment,
      recentSamples,
      statusHistory,
      technicians,
      testTypes,
      sampleStatusGroup,
    ] = await Promise.all([
      prisma.sample.count({ where: scope }),
      prisma.sample.count({
        where: {
          ...scope,
          status: { in: ['received', 'registered'] },
        },
      }),
      prisma.labTest.count({
        where: {
          status: 'in_progress',
          ...(scope.laboratoryId ? { sample: { laboratoryId: scope.laboratoryId } } : {}),
        },
      }),
      prisma.labTest.count({
        where: {
          status: 'awaiting_review',
          ...(scope.laboratoryId ? { sample: { laboratoryId: scope.laboratoryId } } : {}),
        },
      }),
      prisma.labTest.count({
        where: {
          status: { in: ['approved', 'completed'] },
          ...(scope.laboratoryId ? { sample: { laboratoryId: scope.laboratoryId } } : {}),
        },
      }),
      prisma.labTest.count({
        where: {
          status: { in: ['returned_for_correction', 'rejected'] },
          ...(scope.laboratoryId ? { sample: { laboratoryId: scope.laboratoryId } } : {}),
        },
      }),
      prisma.equipment.count({ where: scope }),
      prisma.equipment.count({
        where: {
          ...scope,
          nextCalibrationDate: { lt: now },
        },
      }),
      prisma.sample.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          project: { select: { name: true, projectCode: true } },
          assignedTechnician: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.sampleStatusHistory.findMany({
        where: scope.laboratoryId ? { sample: { laboratoryId: scope.laboratoryId } } : {},
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          sample: { select: { sampleNumber: true } },
          changedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.user.findMany({
        where: {
          role: { in: ['lab_technician', 'lab_engineer'] },
          ...(scope.laboratoryId ? { laboratoryId: scope.laboratoryId } : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          assignedTests: {
            where: { status: { in: ['pending', 'in_progress', 'awaiting_review'] } },
            select: { id: true },
          },
          assignedSamples: {
            where: { status: { in: ['registered', 'received', 'in_progress'] } },
            select: { id: true },
          },
        },
      }),
      prisma.testType.findMany({
        select: {
          code: true,
          name: true,
          _count: {
            select: {
              tests: true,
            },
          },
        },
      }),
      prisma.sample.groupBy({
        by: ['status'],
        where: scope,
        _count: { _all: true },
      }),
    ]);

    const sampleStatusCounts: Record<string, number> = {};
    for (const g of (sampleStatusGroup as any[])) {
      sampleStatusCounts[g.status] = g._count._all;
    }

    const metrics = {
      totalSamples,
      samplesAwaitingTesting,
      testsInProgress,
      testsAwaitingReview,
      completedTests,
      rejectedTests,
      totalEquipment,
      overdueCalibrationEquipment,
    };

    const technicianWorkload = technicians.map((tech) => ({
      id: tech.id,
      name: `${tech.firstName} ${tech.lastName}`,
      role: tech.role,
      assignedTests: tech.assignedTests.length,
      assignedSamples: tech.assignedSamples.length,
    }));

    const recentActivity = statusHistory.map((h) => ({
      id: h.id,
      sampleNumber: h.sample.sampleNumber,
      fromStatus: h.fromStatus || 'registered',
      toStatus: h.toStatus,
      reason: h.reason || undefined,
      timestamp: h.createdAt.toISOString(),
      changedBy: `${h.changedBy.firstName} ${h.changedBy.lastName}`,
    }));

    res.json({
      success: true,
      data: {
        metrics,
        ...metrics,
        sampleStatusCounts,
        recentSamples,
        technicianWorkload,
        workloadByTechnician: technicianWorkload,
        recentActivity,
        testDistribution: testTypes.map((t) => ({
          code: t.code,
          name: t.name,
          count: t._count.tests,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/analytics/trends (and /attendance-trends compatibility)
const trendsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scope = resolveLabScope(req);
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const samples = await prisma.sample.findMany({
      where: {
        ...scope,
        createdAt: { gte: sinceDate },
      },
      select: {
        createdAt: true,
        status: true,
      },
    });

    // Group by YYYY-MM-DD
    const dateMap = new Map<string, { total: number; completed: number }>();
    for (let d = new Date(sinceDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      dateMap.set(key, { total: 0, completed: 0 });
    }

    for (const sample of samples) {
      const key = sample.createdAt.toISOString().slice(0, 10);
      const entry = dateMap.get(key) || { total: 0, completed: 0 };
      entry.total += 1;
      if (sample.status === 'completed' || sample.status === 'approved') {
        entry.completed += 1;
      }
      dateMap.set(key, entry);
    }

    const trends = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      total: data.total,
      present: data.completed,
      completed: data.completed,
      rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 100,
    }));

    res.json({ success: true, data: trends });
  } catch (error) {
    next(error);
  }
};

analyticsRoutes.get('/trends', trendsHandler);
analyticsRoutes.get('/attendance-trends', trendsHandler);
