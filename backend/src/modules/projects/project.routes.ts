import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { authenticate, requireReviewer } from '../../middleware/auth.middleware';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export const projectRoutes = Router();

// GET /api/v1/projects - List all projects
projectRoutes.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { samples: true },
        },
      },
    });

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/projects/:id - Get project details
projectRoutes.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        samples: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            sampleNumber: true,
            materialType: true,
            description: true,
            status: true,
            priority: true,
            dateReceived: true,
          },
        },
      },
    });

    if (!project) throw new NotFoundError('Project not found');

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/projects - Create project
projectRoutes.post('/', authenticate, requireReviewer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectCode, name, client, location, description, startDate, endDate } = req.body;

    const existing = await prisma.project.findUnique({
      where: { projectCode },
    });
    if (existing) {
      throw new ConflictError(`Project with code '${projectCode}' already exists`);
    }

    const lab = await prisma.laboratory.findFirst({ where: { isActive: true } });
    if (!lab) throw new NotFoundError('Active laboratory not configured');

    const project = await prisma.project.create({
      data: {
        id: uuidv4(),
        laboratoryId: lab.id,
        projectCode,
        name,
        client,
        location,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/projects/:id - Update project
projectRoutes.patch('/:id', authenticate, requireReviewer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, client, location, description, status, startDate, endDate } = req.body;

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        name,
        client,
        location,
        description,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
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
