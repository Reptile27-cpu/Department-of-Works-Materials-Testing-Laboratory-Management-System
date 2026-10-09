import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { UnauthorizedError } from '../utils/errors';

/**
 * Laboratory organization tenant resolution middleware.
 * Resolves laboratory information from:
 * 1. Authenticated user's session/JWT (laboratoryId)
 * 2. Header (X-Laboratory-ID or X-Tenant-ID)
 * 3. Subdomain
 */
export const resolveTenant = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Priority 1: From authenticated user's JWT
    if (req.user?.laboratoryId || req.user?.schoolId) {
      const labId = req.user.laboratoryId || req.user.schoolId;
      req.laboratoryId = labId;
      req.schoolId = labId;
      next();
      return;
    }

    // Priority 2: From X-Laboratory-ID or X-Tenant-ID header
    const tenantHeader = (req.headers['x-laboratory-id'] || req.headers['x-tenant-id']) as string;
    if (tenantHeader) {
      const lab = await prisma.laboratory.findUnique({
        where: { id: tenantHeader },
        select: { id: true, isActive: true },
      });

      if (lab && lab.isActive) {
        req.laboratoryId = lab.id;
        req.schoolId = lab.id;
        next();
        return;
      }
    }

    // Priority 3: From subdomain
    const host = req.headers.host;
    if (host) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'localhost') {
        const lab = await prisma.laboratory.findFirst({
          where: { code: subdomain.toUpperCase(), isActive: true },
          select: { id: true },
        });

        if (lab) {
          req.laboratoryId = lab.id;
          req.schoolId = lab.id;
          next();
          return;
        }
      }
    }

    // If no lab found and user is system admin, allow without laboratory
    if (req.user?.role === 'system_admin' || req.user?.role === 'super_admin') {
      next();
      return;
    }

    // If user is authenticated but has no laboratoryId, attempt to assign default laboratory
    if (req.user) {
      const defaultLab = await prisma.laboratory.findFirst({
        where: { isActive: true },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      if (defaultLab) {
        req.laboratoryId = defaultLab.id;
        req.schoolId = defaultLab.id;
        next();
        return;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireTenant = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.laboratoryId && !req.schoolId) {
    throw new UnauthorizedError('Laboratory tenant context is required');
  }
  next();
};
