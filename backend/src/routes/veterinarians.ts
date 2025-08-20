import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const searchVetsSchema = z.object({
  query: z.string().optional(),
  clinic: z.string().optional(),
  limit: z.number().int().positive().max(50).default(20)
});

// Get list of veterinarians (for users to find and message)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { query, clinic, limit } = searchVetsSchema.parse(req.query);

    let whereClause: any = {};

    if (query) {
      whereClause.OR = [
        {
          firstName: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          lastName: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          clinic: {
            contains: query,
            mode: 'insensitive'
          }
        }
      ];
    }

    if (clinic) {
      whereClause.clinic = {
        contains: clinic,
        mode: 'insensitive'
      };
    }

    const veterinarians = await prisma.veterinarian.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        clinic: true,
        email: true
      },
      take: limit,
      orderBy: [
        { clinic: 'asc' },
        { lastName: 'asc' }
      ]
    });

    res.json({ veterinarians });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    console.error('Error fetching veterinarians:', error);
    res.status(500).json({ error: 'Failed to fetch veterinarians' });
  }
});

// Get veterinarian profile
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const veterinarian = await prisma.veterinarian.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        clinic: true,
        email: true,
        licenseNumber: true
      }
    });

    if (!veterinarian) {
      return res.status(404).json({ error: 'Veterinarian not found' });
    }

    res.json({ veterinarian });
  } catch (error) {
    console.error('Error fetching veterinarian:', error);
    res.status(500).json({ error: 'Failed to fetch veterinarian' });
  }
});

// Get veterinarian's patients (for veterinarians only)
router.get('/patients/list', async (req: AuthRequest, res) => {
  try {
    if (req.user?.type !== 'veterinarian') {
      return res.status(403).json({ error: 'Only veterinarians can access patient lists' });
    }

    // Get pets that have medication schedules created by this veterinarian
    const schedules = await prisma.medicationSchedule.findMany({
      where: {
        veterinarianId: req.user.id
      },
      include: {
        pet: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          }
        }
      },
      distinct: ['petId'],
      orderBy: {
        createdAt: 'desc'
      }
    });

    const patients = schedules.map(schedule => ({
      pet: schedule.pet,
      owner: schedule.pet.owner,
      lastScheduleDate: schedule.createdAt
    }));

    res.json({ patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get medication schedules created by veterinarian
router.get('/schedules/created', async (req: AuthRequest, res) => {
  try {
    if (req.user?.type !== 'veterinarian') {
      return res.status(403).json({ error: 'Only veterinarians can access this endpoint' });
    }

    const schedules = await prisma.medicationSchedule.findMany({
      where: {
        veterinarianId: req.user.id
      },
      include: {
        pet: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        administrations: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 5
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ schedules });
  } catch (error) {
    console.error('Error fetching veterinarian schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

export default router;
