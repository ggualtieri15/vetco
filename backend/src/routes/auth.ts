import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  type: z.enum(['user', 'veterinarian']).default('user'),
  // Veterinarian specific fields
  licenseNumber: z.string().optional(),
  clinic: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  type: z.enum(['user', 'veterinarian']).default('user')
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { email, password, firstName, lastName, phone, type, licenseNumber, clinic } = validatedData;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    let user;
    if (type === 'veterinarian') {
      if (!licenseNumber || !clinic) {
        return res.status(400).json({ error: 'License number and clinic are required for veterinarians' });
      }

      user = await prisma.veterinarian.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          licenseNumber,
          clinic
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          licenseNumber: true,
          clinic: true
        }
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, type },
      process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { ...user, type }
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password, type } = validatedData;

    let user;
    if (type === 'veterinarian') {
      user = await prisma.veterinarian.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          licenseNumber: true,
          clinic: true
        }
      });
    } else {
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true
        }
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, type },
      process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      token,
      user: { ...userWithoutPassword, type }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', async (req: any, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production') as any;
    
    let user;
    if (decoded.type === 'veterinarian') {
      user = await prisma.veterinarian.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          licenseNumber: true,
          clinic: true
        }
      });
    } else {
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: { ...user, type: decoded.type } });
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
});

export default router;
