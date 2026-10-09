import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';

export const userRoutes = Router();

userRoutes.use(authenticate, authorize('system_admin', 'lab_manager', 'super_admin', 'school_admin'));

userRoutes.get('/', async (req, res, next) => {
	try {
		const isSuper = req.user!.role === 'system_admin' || req.user!.role === 'super_admin';
		const laboratoryId = isSuper
			? (typeof req.query.laboratoryId === 'string' ? req.query.laboratoryId : undefined)
			: req.user!.laboratoryId;

		const where = laboratoryId ? { laboratoryId } : {};

		const users = await prisma.user.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				phone: true,
				role: true,
				designation: true,
				laboratoryId: true,
				isActive: true,
				emailVerified: true,
				lastLogin: true,
				createdAt: true,
				preferences: true,
				laboratory: {
					select: {
						id: true,
						name: true,
						code: true,
					},
				},
			},
		});

		res.json({ success: true, data: users });
	} catch (error) {
		next(error);
	}
});

userRoutes.patch('/:id', async (req, res, next) => {
	try {
		if (typeof req.body.isActive !== 'boolean') {
			throw new ValidationError('isActive must be a boolean');
		}

		const existing = await prisma.user.findUnique({
			where: { id: req.params.id },
			select: { id: true, role: true, laboratoryId: true },
		});

		if (!existing) {
			throw new NotFoundError('User not found');
		}

		// Non-system admins cannot modify system admins or users from another laboratory
		const isSuper = req.user!.role === 'system_admin' || req.user!.role === 'super_admin';
		if (!isSuper) {
			if (existing.role === 'system_admin' || existing.role === 'super_admin' || (existing.laboratoryId && existing.laboratoryId !== req.user!.laboratoryId)) {
				throw new ForbiddenError('You are not authorized to update this user');
			}
		}

		const user = await prisma.user.update({
			where: { id: req.params.id },
			data: {
				isActive: req.body.isActive,
				...(req.body.isActive ? {} : { refreshToken: null }),
			},
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				role: true,
				designation: true,
				laboratoryId: true,
				isActive: true,
				emailVerified: true,
				lastLogin: true,
			},
		});

		res.json({ success: true, data: user });
	} catch (error) {
		next(error);
	}
});
