
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';

import { prisma } from '../../config/database';

import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  AppError,
} from '../../utils/errors';

import {
  LoginInput,
  RegisterInput,
  SendEmailOtpInput,
  VerifyEmailOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.validation';

import logger from '../../utils/logger';

// ==================== Email OTP Configuration ====================

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const EMAIL_VERIFICATION = 'email_verification';
const PASSWORD_RESET = 'password_reset';

const getJwtSecret = (name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET', fallback: string): string => {
  const secret = process.env[name];
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') throw new Error(`${name} is not configured`);
  return fallback;
};

const createOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashOtp = (otp: string): string => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

const getResend = (): Resend => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  return new Resend(apiKey);
};

// ==================== Token Generation ====================

const generateAccessToken = (payload: {
  userId: string;
  laboratoryId: string | null;
  schoolId?: string | null;
  role: string;
  email: string;
}): string => {
  const secret: jwt.Secret = getJwtSecret('JWT_SECRET', 'your-secret-key');
  const expiresIn = (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];

  return jwt.sign(payload, secret, { expiresIn });
};

const generateRefreshToken = (payload: {
  userId: string;
  laboratoryId: string | null;
  schoolId?: string | null;
  role: string;
  email: string;
}): string => {
  const secret: jwt.Secret = getJwtSecret('JWT_REFRESH_SECRET', 'your-refresh-secret-key');

  const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

  return jwt.sign(payload, secret, { expiresIn });
};

const generateTokens = (user: {
  id: string;
  laboratoryId?: string | null;
  schoolId?: string | null;
  role: string;
  email: string;
}) => {
  const labId = user.laboratoryId || user.schoolId || null;
  const payload = {
    userId: user.id,
    laboratoryId: labId,
    schoolId: labId,
    role: user.role,
    email: user.email,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

// ==================== Auth Service ====================

export class AuthService {
  // ==================== Login ====================

  async login(input: LoginInput) {
    const { email, password } = input;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        laboratoryId: true,
        isActive: true,
        emailVerified: true,
        avatarUrl: true,
        preferences: true,
        laboratory: { select: { isActive: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if ((user.preferences as any)?.isWorkerIdentity) {
      throw new UnauthorizedError(
        'Individual personnel identities do not have separate logins. Please sign in using the shared laboratory workstation account: labworker@dow.gov.pg'
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account has been deactivated');
    }

    if (user.role !== 'system_admin' && user.role !== 'super_admin' && user.laboratoryId && !user.laboratory?.isActive) {
      throw new UnauthorizedError('This laboratory organization is inactive');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedError(
        'Please verify your email address before signing in'
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Update last login and refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        refreshToken: tokens.refreshToken,
      },
    });

    // Log the login
    logger.info(`User ${user.email} logged in successfully`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        laboratoryId: user.laboratoryId,
        schoolId: user.laboratoryId,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  // ==================== Registration ====================

  async register(input: RegisterInput) {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
    } = input;

    const role = 'lab_technician';
    const publicLab = await prisma.laboratory.findFirst({ select: { id: true } });
    const publicLaboratoryId = publicLab?.id || null;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError(
        'A user with this email already exists'
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const emailVerificationRequired = true;

    // Create user
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        role,
        laboratoryId: publicLaboratoryId,
        emailVerified: !emailVerificationRequired,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        laboratoryId: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (emailVerificationRequired) {
      try {
        await this.sendEmailOtp({ email }, EMAIL_VERIFICATION);
      } catch (error) {
        logger.error(`Email verification for ${email} failed during registration.`, {
          error: error instanceof Error ? error.message : error,
        });

        await prisma.user.delete({ where: { id: user.id } });
        throw new AppError(
          'Unable to send the verification code. Please try again.',
          503,
          'EMAIL_DELIVERY_FAILED'
        );
      }
    }

    logger.info(`Laboratory staff account created for ${email}`);

    logger.info(
      `User ${email} registered successfully as ${role}`
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        laboratoryId: user.laboratoryId,
        schoolId: user.laboratoryId,
      },
      emailVerificationRequired,
      message: emailVerificationRequired
        ? 'Account created. Check your email for the verification code.'
        : 'Account created successfully. You can now sign in.',
    };
  }

  // ==================== Send Email OTP ====================

  async sendEmailOtp(
    input: SendEmailOtpInput,
    purpose = EMAIL_VERIFICATION
  ) {
    const { email } = input;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        role: true,
        laboratoryId: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Don't send another OTP if the email is already verified
    if (purpose === EMAIL_VERIFICATION && user.emailVerified) {
      throw new ConflictError('Email is already verified');
    }

    // Invalidate previous unused OTPs
    await prisma.emailOtp.updateMany({
      where: {
        userId: user.id,
        purpose,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Generate a secure 6-digit OTP
    const otp = createOtp();

    // Hash the OTP before storing it
    const otpHash = hashOtp(otp);

    // Calculate expiration
    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
    );

    // Store hashed OTP
    await prisma.emailOtp.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        purpose,
        otpHash,
        expiresAt,
      },
    });

    const emailFrom = process.env.EMAIL_FROM;

    if (!emailFrom) {
      throw new Error('EMAIL_FROM is not configured');
    }

    const resend = getResend();

    // Send OTP through Resend
    const { error } = await resend.emails.send({
      from: emailFrom,
      to: [user.email],
      subject:
        purpose === PASSWORD_RESET
          ? 'Your DOW Materials Laboratory password reset code'
          : 'Your DOW Materials Laboratory verification code',
      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
            <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
              
              <h2 style="margin-top:0;color:#1f2937;">
                DOW Materials Laboratory ${purpose === PASSWORD_RESET ? 'Password Reset' : 'Email Verification'}
              </h2>

              <p style="color:#4b5563;font-size:16px;">
                ${purpose === PASSWORD_RESET ? 'Use the password reset code below to choose a new password.' : 'Use the verification code below to verify your email address.'}
              </p>

              <div style="margin:30px 0;text-align:center;">
                <div style="display:inline-block;padding:16px 28px;background:#f3f4f6;border-radius:10px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#111827;">
                  ${otp}
                </div>
              </div>

              <p style="color:#4b5563;font-size:14px;">
                This code expires in ${OTP_EXPIRY_MINUTES} minutes.
              </p>

              <p style="color:#6b7280;font-size:13px;">
                If you did not request this verification code, you can safely ignore this email.
              </p>

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;">

              <p style="color:#9ca3af;font-size:12px;margin-bottom:0;">
                Department of Works &amp; Highways — Materials Testing Laboratory Management System
              </p>

            </div>
          </body>
        </html>
      `,
      text: `${purpose === PASSWORD_RESET ? 'Your DOW Materials Laboratory password reset code is' : 'Your DOW Materials Laboratory verification code is'} ${otp}. This code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    });

    if (error) {
      logger.error(
        `Failed to send email OTP to ${user.email}: ${JSON.stringify(error)}`
      );

      throw new Error('Failed to send verification email');
    }

    logger.info(`Email ${purpose} OTP sent successfully`);

    return {
      message: 'Verification code sent successfully',
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    };
  }

  // ==================== Verify Email OTP ====================

  async verifyEmailOtp(input: VerifyEmailOtpInput) {
    const { email, otp } = input;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        role: true,
        laboratoryId: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Already verified
    if (user.emailVerified) {
      throw new ConflictError('Email verification code is no longer valid');
    }

    // Find the latest unused OTP
    const emailOtp = await prisma.emailOtp.findFirst({
      where: {
        userId: user.id,
        purpose: EMAIL_VERIFICATION,
        usedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!emailOtp) {
      throw new UnauthorizedError(
        'No active verification code found. Please request a new code.'
      );
    }

    // Check attempt limit
    if (emailOtp.attempts >= MAX_OTP_ATTEMPTS) {
      throw new UnauthorizedError(
        'Too many incorrect attempts. Please request a new verification code.'
      );
    }

    // Check expiration
    if (emailOtp.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedError(
        'Verification code has expired. Please request a new code.'
      );
    }

    // Hash submitted OTP
    const submittedOtpHash = hashOtp(otp);

    // Check OTP
    if (submittedOtpHash !== emailOtp.otpHash) {
      await prisma.emailOtp.update({
        where: {
          id: emailOtp.id,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      const remainingAttempts =
        MAX_OTP_ATTEMPTS - emailOtp.attempts - 1;

      throw new UnauthorizedError(
        remainingAttempts > 0
          ? `Invalid verification code. ${remainingAttempts} attempt${
              remainingAttempts === 1 ? '' : 's'
            } remaining.`
          : 'Invalid verification code. Please request a new code.'
      );
    }

    // Mark OTP as used
    await prisma.emailOtp.update({
      where: {
        id: emailOtp.id,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Mark user's email as verified
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerified: true,
      },
    });

    logger.info(`Email verified successfully for ${user.email}`);

    const tokens = generateTokens(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    return {
      message: 'Email verified successfully',
      emailVerified: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        laboratoryId: user.laboratoryId,
        schoolId: user.laboratoryId,
      },
      ...tokens,
    };
  }

  // ==================== Password Recovery ====================

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { email: true, emailVerified: true },
    });

    if (user?.emailVerified) {
      await this.sendEmailOtp(
        { email: user.email },
        PASSWORD_RESET
      );
    }

    return {
      message:
        'If an account exists for that email, a password reset code has been sent.',
    };
  }

  async resetPassword(input: ResetPasswordInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user || !user.emailVerified) {
      throw new UnauthorizedError('Invalid or expired password reset code');
    }

    const emailOtp = await prisma.emailOtp.findFirst({
      where: {
        userId: user.id,
        purpose: PASSWORD_RESET,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (
      !emailOtp ||
      emailOtp.attempts >= MAX_OTP_ATTEMPTS ||
      emailOtp.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedError('Invalid or expired password reset code');
    }

    if (hashOtp(input.otp) !== emailOtp.otpHash) {
      await prisma.emailOtp.update({
        where: { id: emailOtp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedError('Invalid or expired password reset code');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    await prisma.$transaction([
      prisma.emailOtp.update({
        where: { id: emailOtp.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, refreshToken: null },
      }),
    ]);

    return { message: 'Password reset successfully' };
  }

  // ==================== Refresh Token ====================

  async refreshToken(refreshToken: string) {
    try {
      const secret = getJwtSecret('JWT_REFRESH_SECRET', 'your-refresh-secret-key');

      const decoded = jwt.verify(
        refreshToken,
        secret
      ) as { userId: string };

      // Verify refresh token exists in database
      const user = await prisma.user.findUnique({
        where: {
          id: decoded.userId,
        },
        select: {
          id: true,
          email: true,
          role: true,
          laboratoryId: true,
          refreshToken: true,
          isActive: true,
        },
      });

      if (
        !user ||
        !user.isActive ||
        user.refreshToken !== refreshToken
      ) {
        throw new UnauthorizedError(
          'Invalid refresh token'
        );
      }

      // Generate new tokens
      const tokens = generateTokens(user);

      // Update refresh token in database
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          refreshToken: tokens.refreshToken,
        },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          laboratoryId: user.laboratoryId,
          schoolId: user.laboratoryId,
        },
        ...tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      throw new UnauthorizedError(
        'Invalid or expired refresh token'
      );
    }
  }

  // ==================== Logout ====================

  async logout(userId: string) {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshToken: null,
      },
    });

    logger.info(`User ${userId} logged out`);
  }

  // ==================== Get Profile ====================

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
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
            logoUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  // ==================== Update Profile ====================

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string; preferences?: Record<string, unknown> }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName?.trim() || undefined,
        lastName: data.lastName?.trim() || undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
        preferences: data.preferences as any || undefined,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        designation: true,
        laboratoryId: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return updated;
  }

  // ==================== Change Password ====================

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        refreshToken: null,
      },
    });

    return { message: 'Password changed successfully' };
  }
}

export const authService = new AuthService();


