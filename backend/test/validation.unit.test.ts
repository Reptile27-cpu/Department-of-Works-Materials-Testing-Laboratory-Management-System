import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailOtpSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../src/modules/auth/auth.validation';
import { parseDate, pagination } from '../src/utils/route-helpers';
import { AppError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '../src/utils/errors';

describe('Validation Schemas', () => {
  test('loginSchema validates valid and invalid emails', () => {
    const valid = loginSchema.safeParse({ email: 'admin@dow.gov.pg', password: 'Password123!' });
    assert.equal(valid.success, true);

    const invalidEmail = loginSchema.safeParse({ email: 'invalid-email', password: 'Password123!' });
    assert.equal(invalidEmail.success, false);

    const missingPassword = loginSchema.safeParse({ email: 'admin@dow.gov.pg', password: '' });
    assert.equal(missingPassword.success, false);
  });

  test('registerSchema enforces password complexity', () => {
    const valid = registerSchema.safeParse({
      email: 'student@example.com',
      password: 'StrongPassword123!',
      firstName: 'John',
      lastName: 'Doe',
    });
    assert.equal(valid.success, true);

    // Weak password without uppercase
    const weak1 = registerSchema.safeParse({
      email: 'student@example.com',
      password: 'password123!',
      firstName: 'John',
      lastName: 'Doe',
    });
    assert.equal(weak1.success, false);

    // Short password
    const shortPass = registerSchema.safeParse({
      email: 'student@example.com',
      password: 'Ab1',
      firstName: 'John',
      lastName: 'Doe',
    });
    assert.equal(shortPass.success, false);
  });

  test('resetPasswordSchema enforces 6-digit OTP', () => {
    const valid = resetPasswordSchema.safeParse({
      email: 'user@example.com',
      otp: '123456',
      password: 'NewPassword123!',
    });
    assert.equal(valid.success, true);

    const invalidOtp = resetPasswordSchema.safeParse({
      email: 'user@example.com',
      otp: '12345',
      password: 'NewPassword123!',
    });
    assert.equal(invalidOtp.success, false);

    const alphaOtp = resetPasswordSchema.safeParse({
      email: 'user@example.com',
      otp: '12345a',
      password: 'NewPassword123!',
    });
    assert.equal(alphaOtp.success, false);
  });

  test('verifyEmailOtpSchema validates otp format', () => {
    assert.equal(verifyEmailOtpSchema.safeParse({ email: 'test@example.com', otp: '987654' }).success, true);
    assert.equal(verifyEmailOtpSchema.safeParse({ email: 'test@example.com', otp: 'abc' }).success, false);
  });

  test('updateProfileSchema accepts partial updates', () => {
    const valid = updateProfileSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+675 7000 0000',
    });
    assert.equal(valid.success, true);
  });

  test('changePasswordSchema requires current and complex new password', () => {
    const valid = changePasswordSchema.safeParse({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!',
    });
    assert.equal(valid.success, true);

    const weak = changePasswordSchema.safeParse({
      currentPassword: 'OldPassword123!',
      newPassword: 'simple',
    });
    assert.equal(weak.success, false);
  });
});

describe('Route Helpers & Utilities', () => {
  test('parseDate parses ISO strings correctly and rejects invalid dates', () => {
    const parsed = parseDate('2026-05-15', 'date');
    assert.ok(parsed instanceof Date);
    assert.equal(parsed.getUTCFullYear(), 2026);

    assert.equal(parseDate(undefined, 'date'), undefined);
    assert.equal(parseDate('', 'date'), undefined);

    assert.throws(() => parseDate('not-a-date', 'date'), (err: unknown) => {
      return err instanceof ValidationError;
    });
  });

  test('pagination sanitizes page and pageSize bounds', () => {
    const req1 = { query: { page: '2', pageSize: '10' } } as any;
    const res1 = pagination(req1);
    assert.equal(res1.page, 2);
    assert.equal(res1.pageSize, 10);
    assert.equal(res1.skip, 10);
    assert.equal(res1.take, 10);

    const reqNegative = { query: { page: '-5', pageSize: '-10' } } as any;
    const resNegative = pagination(reqNegative);
    assert.equal(resNegative.page, 1);
    assert.equal(resNegative.pageSize, 1);

    const reqHuge = { query: { pageSize: '9999' } } as any;
    const resHuge = pagination(reqHuge);
    assert.equal(resHuge.pageSize, 100);
  });
});

describe('Error Hierarchy', () => {
  test('custom errors have correct HTTP status codes and codes', () => {
    const appErr = new AppError('General error', 500, 'GENERAL_ERROR');
    assert.equal(appErr.statusCode, 500);
    assert.equal(appErr.code, 'GENERAL_ERROR');

    const notFound = new NotFoundError('Student not found');
    assert.equal(notFound.statusCode, 404);
    assert.equal(notFound.code, 'NOT_FOUND');

    const unauth = new UnauthorizedError('Invalid token');
    assert.equal(unauth.statusCode, 401);
    assert.equal(unauth.code, 'UNAUTHORIZED');

    const forbidden = new ForbiddenError('Access denied');
    assert.equal(forbidden.statusCode, 403);
    assert.equal(forbidden.code, 'FORBIDDEN');

    const validation = new ValidationError('Invalid input', [{ field: 'email', message: 'invalid' }]);
    assert.equal(validation.statusCode, 400);
    assert.equal(validation.code, 'VALIDATION_ERROR');
    assert.equal(validation.details?.length, 1);
  });
});

describe('Authentication Cryptography', () => {
  test('bcrypt hashes and verifies passwords correctly', async () => {
    const password = 'SecurePassword123!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    assert.notEqual(hash, password);
    assert.equal(await bcrypt.compare(password, hash), true);
    assert.equal(await bcrypt.compare('WrongPassword', hash), false);
  });

  test('JWT generates and verifies claims correctly', () => {
    const secret = 'test-secret-key-12345';
    const payload = {
      userId: '11111111-1111-1111-1111-111111111111',
      email: 'admin@png-sms.com',
      role: 'school_admin',
      schoolId: '22222222-2222-2222-2222-222222222222',
    };

    const token = jwt.sign(payload, secret, { expiresIn: '15m' });
    const decoded = jwt.verify(token, secret) as typeof payload;

    assert.equal(decoded.userId, payload.userId);
    assert.equal(decoded.email, payload.email);
    assert.equal(decoded.role, payload.role);
    assert.equal(decoded.schoolId, payload.schoolId);

    // Rejects invalid signature
    assert.throws(() => jwt.verify(token, 'wrong-secret'));
  });
});
