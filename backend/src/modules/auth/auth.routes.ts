
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { authController } from './auth.controller';

import { validate } from '../../middleware/validate.middleware';

import { authenticate, optionalAuth } from '../../middleware/auth.middleware';

import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from './auth.validation';

export const authRoutes = Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== Login ====================

// POST /api/v1/auth/login
authRoutes.post(
  '/login',
  validate(loginSchema),
  (req, res, next) =>
    authController.login(req, res, next)
);

// ==================== Registration ====================

// POST /api/v1/auth/register
authRoutes.post(
  '/register',
  validate(registerSchema),
  (req, res, next) =>
    authController.register(req, res, next)
);

// ==================== Email OTP ====================

// POST /api/v1/auth/email-otp/send
authRoutes.post(
  '/email-otp/send',
  otpLimiter,
  validate(sendEmailOtpSchema),
  (req, res, next) =>
    authController.sendEmailOtp(req, res, next)
);

// POST /api/v1/auth/email-otp/verify
authRoutes.post(
  '/email-otp/verify',
  otpLimiter,
  validate(verifyEmailOtpSchema),
  (req, res, next) =>
    authController.verifyEmailOtp(req, res, next)
);

// POST /api/v1/auth/forgot-password
authRoutes.post(
  '/forgot-password',
  otpLimiter,
  validate(forgotPasswordSchema),
  (req, res, next) =>
    authController.forgotPassword(req, res, next)
);

// POST /api/v1/auth/reset-password
authRoutes.post(
  '/reset-password',
  otpLimiter,
  validate(resetPasswordSchema),
  (req, res, next) =>
    authController.resetPassword(req, res, next)
);

// ==================== Refresh Token ====================

// POST /api/v1/auth/refresh
authRoutes.post(
  '/refresh',
  validate(refreshTokenSchema),
  (req, res, next) =>
    authController.refreshToken(req, res, next)
);

// ==================== Logout ====================

// POST /api/v1/auth/logout
authRoutes.post(
  '/logout',
  optionalAuth,
  (req, res, next) =>
    authController.logout(req, res, next)
);

// ==================== Profile ====================

// GET /api/v1/auth/profile
authRoutes.get(
  '/profile',
  authenticate,
  (req, res, next) =>
    authController.getProfile(req, res, next)
);

// PATCH /api/v1/auth/profile
authRoutes.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  (req, res, next) =>
    authController.updateProfile(req, res, next)
);

// POST /api/v1/auth/change-password
authRoutes.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  (req, res, next) =>
    authController.changePassword(req, res, next)
);


