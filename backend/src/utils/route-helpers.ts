import { Request } from 'express';
import { ForbiddenError, UnauthorizedError, ValidationError } from './errors';

export const laboratoryScope = (req: Request): string => {
  if (req.user?.role === 'system_admin' || req.user?.role === 'super_admin') {
    const requested = req.query.laboratoryId || req.body?.laboratoryId;
    if (typeof requested === 'string' && requested) return requested;
    if (req.user?.laboratoryId) return req.user.laboratoryId;
  }
  if (!req.user?.laboratoryId) throw new UnauthorizedError('Laboratory context is required');
  return req.user.laboratoryId;
};

export const assertLaboratory = (req: Request, laboratoryId: string): void => {
  if (req.user?.role !== 'system_admin' && req.user?.role !== 'super_admin' && req.user?.laboratoryId !== laboratoryId) {
    throw new ForbiddenError('You are not authorized to access this laboratory');
  }
};

// Aliases for compatibility
export const schoolScope = laboratoryScope;
export const assertSchool = assertLaboratory;

export const pagination = (req: Request) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
};

export const parseDate = (value: unknown, field: string): Date | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new ValidationError(`${field} must be a valid date`);
  return date;
};
