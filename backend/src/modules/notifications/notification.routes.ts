import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { pagination, laboratoryScope } from '../../utils/route-helpers';
import { NotFoundError, ValidationError } from '../../utils/errors';

export const notificationRoutes = Router();
notificationRoutes.use(authenticate);

const notificationInput = z.object({
  recipientId: z.string().uuid().optional(),
  targetRole: z.enum(['all', 'lab_technician', 'lab_engineer', 'lab_manager', 'system_admin']).optional(),
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  message: z.string().max(10000).optional(),
  channel: z.string().max(20).optional(),
});

notificationRoutes.get('/', authorize('system_admin', 'lab_manager', 'lab_engineer', 'lab_technician', 'super_admin'), async (req, res, next) => {
  try {
    const { page, pageSize, skip, take } = pagination(req);
    const where = {
      recipientId: req.user!.userId,
      ...(req.user!.role === 'super_admin' ? {} : { laboratoryId: req.user!.laboratoryId || undefined }),
    };

    const [data, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);

    res.json({ success: true, data, meta: { page, pageSize, total, unreadCount } });
  } catch (error) { next(error); }
});

notificationRoutes.patch('/:id/read', authorize('system_admin', 'lab_manager', 'lab_engineer', 'lab_technician', 'super_admin'), async (req, res, next) => {
  try {
    const data = await prisma.notification.updateMany({
      where: { id: req.params.id, recipientId: req.user!.userId },
      data: { isRead: true, readAt: new Date() },
    });
    if (!data.count) throw new NotFoundError('Notification not found');
    res.json({ success: true, data: { id: req.params.id, isRead: true } });
  } catch (error) { next(error); }
});

notificationRoutes.post('/read-all', authorize('system_admin', 'lab_manager', 'lab_engineer', 'lab_technician', 'super_admin'), async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { recipientId: req.user!.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true, data: { count: result.count } });
  } catch (error) { next(error); }
});

notificationRoutes.post('/send', authorize('system_admin', 'lab_manager', 'super_admin'), async (req, res, next) => {
  try {
    const input = notificationInput.parse(req.body);
    const laboratoryId = laboratoryScope(req);

    if (input.recipientId) {
      const recipient = await prisma.user.findFirst({
        where: { id: input.recipientId, ...(req.user!.role === 'super_admin' ? {} : { laboratoryId }) },
        select: { id: true },
      });
      if (!recipient) throw new ValidationError('Recipient is outside your laboratory');

      const data = await prisma.notification.create({
        data: {
          id: uuidv4(),
          laboratoryId: req.user!.role === 'super_admin' ? laboratoryId : req.user!.laboratoryId,
          senderId: req.user!.userId,
          recipientId: recipient.id, type: input.type,
          title: input.title,
          message: input.message,
          channel: input.channel || 'in_app',
          isSent: true,
        },
      });
      res.status(201).json({ success: true, data });
      return;
    }

    // Broadcast announcement to target role or whole school
    const targetWhere: Record<string, unknown> = {
      isActive: true,
      ...(req.user!.role === 'super_admin' ? (laboratoryId ? { laboratoryId } : {}) : { laboratoryId }),
    };
    if (input.targetRole && input.targetRole !== 'all') {
      targetWhere.role = input.targetRole;
    }

    const recipients = await prisma.user.findMany({
      where: targetWhere,
      select: { id: true },
      take: 500,
    });

    const notifications = await prisma.$transaction(
      recipients.map((rec) =>
        prisma.notification.create({
          data: {
            id: uuidv4(),
            laboratoryId: req.user!.role === 'super_admin' ? laboratoryId : req.user!.laboratoryId,
            senderId: req.user!.userId,
            recipientId: rec.id,
            type: input.type,
            title: input.title,
            message: input.message,
            channel: input.channel || 'in_app',
            isSent: true,
          },
        })
      )
    );

    res.status(201).json({ success: true, data: { sentCount: notifications.length } });
  } catch (error) { next(error); }
});
