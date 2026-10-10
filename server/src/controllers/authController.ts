import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserModel } from '../models/User.js';
import { generateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { isDbConnected } from '../config/db.js';
import { memoryStore } from '../models/memoryStore.js';
import { logger } from '../config/logger.js';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['USER', 'REVIEWER', 'ADMIN']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors[0].message });
        return;
      }

      const { name, email, password } = parsed.data;
      const normalizedEmail = email.trim().toLowerCase();
      const assignedRole = 'USER'; // Public registrations are always assigned standard USER role

      let existing: any;
      if (isDbConnected()) {
        existing = await UserModel.findOne({ email: normalizedEmail });
      } else {
        existing = Array.from(memoryStore.users.values()).find((u) => u.email === normalizedEmail);
      }

      if (existing) {
        logger.warn({ email: normalizedEmail }, 'Registration rejected: Account already exists');
        res.status(409).json({ error: 'An account with this email already exists.' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      let user: any;
      if (isDbConnected()) {
        user = await UserModel.create({
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: assignedRole,
        });
      } else {
        user = {
          _id: 'user_' + Date.now(),
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: assignedRole,
          accountStatus: 'ACTIVE' as const,
          notificationPreferences: {
            emailOnComplete: true,
            emailOnReviewNeeded: true,
            emailOnFailure: true,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memoryStore.users.set(user._id, user);
        memoryStore.save();
      }

      logger.info({ email: normalizedEmail, userId: user._id }, 'New user account created successfully');

      const token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        message: 'Account registered successfully.',
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err: any) {
      logger.error({ err: err.message }, 'Unexpected error during user registration');
      res.status(500).json({ error: err.message || 'Registration failed.' });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors[0].message });
        return;
      }

      const { email, password } = parsed.data;
      const normalizedEmail = email.trim().toLowerCase();

      let user: any;
      if (isDbConnected()) {
        user = await UserModel.findOne({ email: normalizedEmail });
      } else {
        user = Array.from(memoryStore.users.values()).find((u) => u.email === normalizedEmail);
      }

      if (!user) {
        logger.warn({ email: normalizedEmail }, 'Authentication failed: User account not found');
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        logger.warn({ email: normalizedEmail }, 'Authentication failed: Password mismatch');
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      if (user.accountStatus !== 'ACTIVE') {
        logger.warn({ email: normalizedEmail }, 'Authentication rejected: Account suspended');
        res.status(403).json({ error: 'Account is suspended. Please contact administrator.' });
        return;
      }

      const token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      logger.info({ email: normalizedEmail, userId: user._id }, 'User authenticated successfully');

      res.json({
        message: 'Logged in successfully.',
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err: any) {
      logger.error({ err: err.message }, 'Unexpected error during user login');
      res.status(500).json({ error: err.message || 'Login failed.' });
    }
  }

  public static async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('token');
    logger.info('User session logged out successfully');
    res.json({ message: 'Logged out successfully.' });
  }

  public static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      let user: any;

      if (isDbConnected()) {
        user = await UserModel.findById(req.user.userId).select('-passwordHash');
      } else {
        const mUser = memoryStore.users.get(req.user.userId);
        if (mUser) {
          const { passwordHash: _, ...rest } = mUser;
          user = rest;
        }
      }
      if (!user) {
        logger.warn({ userId: req.user.userId }, 'Profile lookup failed: User not found');
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      res.json({
        user: {
          id: user._id ? user._id.toString() : user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          accountStatus: user.accountStatus,
        },
      });
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed fetching user profile');
      res.status(500).json({ error: err.message || 'Failed fetching user profile.' });
    }
  }
}
