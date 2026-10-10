import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UserRole, UserTokenPayload } from '../types/index.js';
import { UserModel } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: UserTokenPayload;
}

export function generateToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserTokenPayload {
  return jwt.verify(token, config.jwtSecret) as UserTokenPayload;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    // Check header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please log in.' });
      return;
    }

    const decoded = verifyToken(token);

    let user: any;
    const { isDbConnected } = await import('../config/db.js');
    if (isDbConnected()) {
      user = await UserModel.findById(decoded.userId).select('accountStatus role email name');
    } else {
      const { memoryStore } = await import('../models/memoryStore.js');
      user = memoryStore.users.get(decoded.userId);
    }

    if (!user || user.accountStatus !== 'ACTIVE') {
      res.status(401).json({ error: 'User account is inactive or not found.' });
      return;
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied: Insufficient permissions.' });
      return;
    }

    next();
  };
}

export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret) as UserTokenPayload;
      req.user = decoded;
    }
  } catch {
    // Ignore invalid optional tokens
  }
  next();
}
