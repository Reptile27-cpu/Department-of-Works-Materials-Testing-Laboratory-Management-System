import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { prisma } from '../config/database';

export interface JwtPayload {
  userId: string;
  laboratoryId: string | null;
  schoolId?: string | null; // Compatibility alias
  role: string;
  email: string;
}

const getJwtSecret = (name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET', fallback: string): string => {
  const secret = process.env[name];
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is not configured`);
  }
  return fallback;
};

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      laboratoryId?: string | null;
      schoolId?: string | null;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const secret = getJwtSecret('JWT_SECRET', 'your-secret-key');

    const decoded = jwt.verify(token, secret) as any;

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        isActive: true,
        role: true,
        laboratoryId: true,
        email: true,
        laboratory: { select: { isActive: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User no longer exists');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account has been deactivated');
    }

    if (user.role !== 'system_admin' && user.role !== 'super_admin' && user.laboratoryId && !user.laboratory?.isActive) {
      throw new ForbiddenError('This laboratory organization is inactive');
    }

    const payload: JwtPayload = {
      userId: user.id,
      role: user.role,
      laboratoryId: user.laboratoryId,
      schoolId: user.laboratoryId, // Compatibility
      email: user.email,
    };

    req.user = payload;
    req.laboratoryId = user.laboratoryId;
    req.schoolId = user.laboratoryId;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid or expired token'));
    } else {
      next(new UnauthorizedError('Authentication failed'));
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    // System administrator has universal system override
    if (req.user.role === 'system_admin' || req.user.role === 'super_admin') {
      next();
      return;
    }

    const userRole = req.user.role;
    const isAuthorized =
      roles.includes(userRole) ||
      (userRole === 'lab_worker' && roles.includes('lab_technician')) ||
      (userRole === 'lab_technician' && roles.includes('lab_worker'));

    if (!isAuthorized) {
      next(
        new ForbiddenError(
          `Role '${req.user.role}' is not authorized to access this resource`
        )
      );
      return;
    }

    next();
  };
};

export const requireAuth = authenticate;
export const requireRole = authorize;
export const requireSystemAdmin = authorize('system_admin', 'super_admin');
export const requireManager = authorize('lab_manager', 'system_admin', 'super_admin');
export const requireLabManager = requireManager;
export const requireReviewer = authorize('lab_engineer', 'lab_manager', 'system_admin', 'super_admin');
export const requireTechnician = authorize('lab_technician', 'lab_worker', 'lab_engineer', 'lab_manager', 'system_admin', 'super_admin');

export const requireLaboratoryAccess = (paramName = 'laboratoryId') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (req.user.role === 'system_admin' || req.user.role === 'super_admin') {
      next();
      return;
    }

    const requestedLabId = req.params[paramName] || req.body?.[paramName] || req.query[paramName];
    if (!req.user.laboratoryId || (requestedLabId && requestedLabId !== req.user.laboratoryId)) {
      next(new ForbiddenError('You are not authorized to access this laboratory organization'));
      return;
    }

    req.laboratoryId = req.user.laboratoryId;
    next();
  };
};

export const requireSchoolAccess = requireLaboratoryAccess;

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = getJwtSecret('JWT_SECRET', 'your-secret-key');
    const decoded = jwt.verify(token, secret) as any;
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      laboratoryId: decoded.laboratoryId || decoded.schoolId || null,
      schoolId: decoded.laboratoryId || decoded.schoolId || null,
      email: decoded.email,
    };
    req.laboratoryId = req.user.laboratoryId;
    req.schoolId = req.user.laboratoryId;
    next();
  } catch {
    next();
  }
};
