import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../utils/prisma';
import { Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    firstName: string;
    lastName: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    perUserLimiter(req, res, next);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Rate limits per logged-in user rather than per IP. Many schools have every
// student and admin sharing one public IP address over the school's WiFi, which
// makes IP-based limiting see them all as a single client — one busy user could
// exhaust the shared quota and lock everyone else out. Keying by req.user.id
// (available here, right after the JWT is verified above) gives each person their
// own independent budget regardless of how many people share the network.
// Invoked from within authenticate() above, so every existing route using
// `authenticate` gets per-user limiting automatically with no other changes needed.
const perUserLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '500'),
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthRequest) => req.user?.id || req.ip || 'unknown',
});

export const authorize = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export const isSuperAdmin = authorize(Role.SUPER_ADMIN);
export const isAdmin = authorize(Role.SUPER_ADMIN, Role.ELECTION_ADMIN);
export const isStudent = authorize(Role.STUDENT);
