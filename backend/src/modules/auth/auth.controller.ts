
import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import {
  LoginInput,
  RegisterInput,
} from './auth.validation';

export const getRefreshTokenCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const configuredSameSite = process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none' | undefined;
  const sameSite: 'lax' | 'strict' | 'none' = configuredSameSite || (isProd ? 'none' : 'lax');
  const secure = isProd || sameSite === 'none';

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  };
};

export const getClearRefreshTokenCookieOptions = () => {
  const { maxAge, ...clearOptions } = getRefreshTokenCookieOptions();
  return clearOptions;
};

export class AuthController {
  // ==================== Login ====================

  async login(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const input: LoginInput = req.body;
      const result = await authService.login(input);

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, getRefreshTokenCookieOptions());

      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Register ====================

  async register(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const input: RegisterInput = req.body;
      const result = await authService.register(input);

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          emailVerificationRequired: result.emailVerificationRequired,
          message: result.message,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Send Email OTP ====================

  async sendEmailOtp(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await authService.sendEmailOtp(req.body);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Verify Email OTP ====================

  async verifyEmailOtp(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await authService.verifyEmailOtp(req.body);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Password Recovery ====================

  async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await authService.forgotPassword(req.body);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await authService.resetPassword(req.body);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Refresh Token ====================

  async refreshToken(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const refreshToken =
        req.body.refreshToken ||
        req.cookies?.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          error: {
            code: 'NO_REFRESH_TOKEN',
            message: 'Refresh token is required',
          },
        });
        return;
      }

      const result =
        await authService.refreshToken(refreshToken);

      // Rotate the refresh token cookie
      res.cookie('refreshToken', result.refreshToken, getRefreshTokenCookieOptions());

      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Logout ====================

  async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.userId;
      const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;

      if (userId) {
        await authService.logout(userId);
      } else if (refreshToken) {
        await authService.logoutByRefreshToken(refreshToken);
      }

      // Clear refresh token cookie with matching options
      res.clearCookie('refreshToken', getClearRefreshTokenCookieOptions());

      res.json({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Get Profile ====================

  async getProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.userId;
      const profile =
        await authService.getProfile(userId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Update Profile ====================

  async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.userId;
      const updated = await authService.updateProfile(userId, req.body);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Change Password ====================

  async changePassword(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();


