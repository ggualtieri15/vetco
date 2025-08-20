import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    type: 'user' | 'veterinarian';
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production') as any;
    
    // Check if user exists
    let user;
    if (decoded.type === 'veterinarian') {
      user = await prisma.veterinarian.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true }
      });
    } else {
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true }
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      type: decoded.type || 'user'
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
