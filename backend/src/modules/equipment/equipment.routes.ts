import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { authenticate, requireReviewer } from '../../middleware/auth.middleware';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export const equipmentRoutes = Router();

// GET /api/v1/equipment - List equipment with status filtering
equipmentRoutes.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, category, search } = req.query;

    const where: any = {};

    if (status && status !== 'all') {
      where.status = String(status);
    }

    if (category && category !== 'all') {
      where.category = String(category);
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { assetNumber: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { manufacturer: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
      ];
    }

    const equipment = await prisma.equipment.findMany({
      where,
      orderBy: { assetNumber: 'asc' },
      include: {
        assignedStaff: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        calibrationRecords: {
          orderBy: { calibrationDate: 'desc' },
          take: 1,
        },
      },
    });

    // Check overdue calibration status dynamically
    const now = new Date();
    const equipmentWithCalculatedStatus = equipment.map(eq => {
      let dynamicStatus = eq.status;
      if (eq.status === 'operational' && eq.nextCalibrationDate && new Date(eq.nextCalibrationDate) < now) {
        dynamicStatus = 'calibration_due';
      }
      return {
        ...eq,
        status: dynamicStatus,
      };
    });

    res.json({
      success: true,
      data: equipmentWithCalculatedStatus,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/equipment/:id - Equipment details and full calibration history
equipmentRoutes.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eq = await prisma.equipment.findFirst({
      where: {
        OR: [{ id: req.params.id }, { assetNumber: req.params.id }],
      },
      include: {
        assignedStaff: {
          select: { id: true, firstName: true, lastName: true, email: true, designation: true },
        },
        calibrationRecords: {
          orderBy: { calibrationDate: 'desc' },
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!eq) throw new NotFoundError('Equipment not found');

    res.json({
      success: true,
      data: eq,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/equipment - Register new equipment
equipmentRoutes.post('/', authenticate, requireReviewer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      assetNumber,
      name,
      category,
      manufacturer,
      model,
      serialNumber,
      location,
      status,
      lastCalibrationDate,
      nextCalibrationDate,
      calibrationCertificate,
      maintenanceNotes,
      assignedStaffId,
    } = req.body;

    if (!assetNumber || !name || !category || !location) {
      throw new ValidationError('Asset number, name, category, and location are required');
    }

    const existing = await prisma.equipment.findUnique({ where: { assetNumber } });
    if (existing) {
      throw new ConflictError(`Equipment with asset number '${assetNumber}' already exists`);
    }

    const lab = await prisma.laboratory.findFirst({ where: { isActive: true } });
    if (!lab) throw new NotFoundError('Laboratory not configured');

    const created = await prisma.equipment.create({
      data: {
        id: uuidv4(),
        laboratoryId: lab.id,
        assetNumber,
        name,
        category,
        manufacturer,
        model,
        serialNumber,
        location,
        status: status || 'operational',
        lastCalibrationDate: lastCalibrationDate ? new Date(lastCalibrationDate) : null,
        nextCalibrationDate: nextCalibrationDate ? new Date(nextCalibrationDate) : null,
        calibrationCertificate,
        maintenanceNotes,
        assignedStaffId,
      },
    });

    res.status(201).json({
      success: true,
      data: created,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/equipment/:id - Update equipment details
equipmentRoutes.patch('/:id', authenticate, requireReviewer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      category,
      manufacturer,
      model,
      serialNumber,
      location,
      status,
      maintenanceNotes,
      assignedStaffId,
    } = req.body;

    const updated = await prisma.equipment.update({
      where: { id: req.params.id },
      data: {
        name,
        category,
        manufacturer,
        model,
        serialNumber,
        location,
        status,
        maintenanceNotes,
        assignedStaffId,
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

// POST /api/v1/equipment/:id/calibrations - Record calibration event
equipmentRoutes.post('/:id/calibrations', authenticate, requireReviewer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { calibrationDate, nextDueDate, calibratedBy, certificateNumber, result, notes } = req.body;

    if (!calibrationDate || !nextDueDate || !calibratedBy) {
      throw new ValidationError('Calibration date, next due date, and calibrating agency/person are required');
    }

    const eq = await prisma.equipment.findUnique({ where: { id: req.params.id } });
    if (!eq) throw new NotFoundError('Equipment not found');

    const calDate = new Date(calibrationDate);
    const dueDate = new Date(nextDueDate);

    const record = await prisma.calibrationRecord.create({
      data: {
        id: uuidv4(),
        equipmentId: eq.id,
        calibrationDate: calDate,
        nextDueDate: dueDate,
        calibratedBy,
        certificateNumber,
        result: result || 'passed',
        notes,
        createdById: req.user!.userId,
      },
    });

    // Update equipment calibration dates and status
    const newStatus = result === 'failed' ? 'out_of_service' : 'operational';
    await prisma.equipment.update({
      where: { id: eq.id },
      data: {
        lastCalibrationDate: calDate,
        nextCalibrationDate: dueDate,
        calibrationCertificate: certificateNumber || eq.calibrationCertificate,
        status: newStatus,
      },
    });

    res.status(201).json({
      success: true,
      data: record,
      message: 'Calibration record logged and equipment status updated.',
    });
  } catch (error) {
    next(error);
  }
});
