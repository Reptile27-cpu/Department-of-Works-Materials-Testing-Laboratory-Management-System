import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';

import { errorHandler } from './middleware/error.middleware';
import { authRoutes } from './modules/auth/auth.routes';
import { systemAdminRoutes } from './modules/system-admin/system-admin.routes';
import { userRoutes } from './modules/users/user.routes';
import { laboratoryRoutes } from './modules/laboratory/laboratory.routes';
import { projectRoutes } from './modules/projects/project.routes';
import { sampleRoutes } from './modules/samples/sample.routes';
import { testRoutes } from './modules/tests/test.routes';
import { equipmentRoutes } from './modules/equipment/equipment.routes';
import { reportRoutes } from './modules/reports/report.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { notificationRoutes } from './modules/notifications/notification.routes';
import { clientRoutes } from './modules/clients/client.routes';
import { requestRoutes } from './modules/requests/request.routes';
import { quotationRoutes } from './modules/quotations/quotation.routes';
import { testFormRoutes } from './modules/test-forms/test-form.routes';
import { healthRouter } from './routes/health';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// ==================== Global Middleware ====================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // If wildcard or matches configured origins or any vercel.app preview
    if (
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-acting-worker-id', 'x-acting-worker-name', 'x-acting-worker-code', 'x-worker-session-token', 'x-acting-worker-token'],
}));

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 50000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 30 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'AUTH_RATE_LIMITED', message: 'Too many authentication attempts. Please try again later.' },
  },
});

app.use('/api/', limiter);

// ==================== Health Check ====================

app.use('/api/v1/health', healthRouter);

// ==================== DoW Laboratory API Routes ====================

const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes);
app.use(`${API_PREFIX}/system-admin`, systemAdminRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/laboratories`, laboratoryRoutes);
app.use(`${API_PREFIX}/laboratory`, laboratoryRoutes);
app.use(`${API_PREFIX}/projects`, projectRoutes);
app.use(`${API_PREFIX}/samples`, sampleRoutes);
app.use(`${API_PREFIX}/tests`, testRoutes);
app.use(`${API_PREFIX}/equipment`, equipmentRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/clients`, clientRoutes);
app.use(`${API_PREFIX}/requests`, requestRoutes);
app.use(`${API_PREFIX}/quotations`, quotationRoutes);
app.use(`${API_PREFIX}/test-forms`, testFormRoutes);

// ==================== 404 Handler ====================

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found on this server.',
    },
  });
});

// ==================== Error Handler ====================

app.use(errorHandler);

export default app;
