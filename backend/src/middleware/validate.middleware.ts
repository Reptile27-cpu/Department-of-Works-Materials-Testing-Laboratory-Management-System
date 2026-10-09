import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { ValidationError } from '../utils/errors';

type ValidationTarget = 'body' | 'query' | 'params';

type ParsedRequest = Request & Record<string, unknown>;

export const validate = (
  schema: ZodSchema<unknown>,
  target: ValidationTarget = 'body'
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[target]);
      const typedReq = req as ParsedRequest;
      typedReq[target] = parsed;
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e: ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }));
        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
};

