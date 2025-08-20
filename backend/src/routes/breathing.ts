import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const recordBreathingRateSchema = z.object({
  petId: z.string(),
  rate: z.number().int().positive(),
  notes: z.string().optional()
});

const getBreathingRatesSchema = z.object({
  petId: z.string(),
  startDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  endDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  limit: z.number().int().positive().max(100).default(50)
});

// Record a breathing rate measurement
router.post('/', async (req: AuthRequest, res) => {
  try {
    if (req.user?.type !== 'user') {
      return res.status(403).json({ error: 'Only pet owners can record breathing rates' });
    }

    const { petId, rate, notes } = recordBreathingRateSchema.parse(req.body);

    // Verify the pet belongs to the user
    const pet = await prisma.pet.findFirst({
      where: {
        id: petId,
        ownerId: req.user.id
      }
    });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    const breathingRate = await prisma.breathingRate.create({
      data: {
        petId,
        rate,
        notes
      }
    });

    // Check if the breathing rate is concerning
    const isAbnormal = await checkBreathingRateAbnormality(petId, rate, pet.species);

    res.status(201).json({
      message: 'Breathing rate recorded successfully',
      breathingRate,
      alert: isAbnormal ? {
        type: 'warning',
        message: 'This breathing rate may be outside normal range. Consider consulting your veterinarian.'
      } : null
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    console.error('Error recording breathing rate:', error);
    res.status(500).json({ error: 'Failed to record breathing rate' });
  }
});

// Get breathing rate history for a pet
router.get('/', async (req: AuthRequest, res) => {
  try {
    if (req.user?.type !== 'user') {
      return res.status(403).json({ error: 'Only pet owners can access breathing rates' });
    }

    const { petId, startDate, endDate, limit } = getBreathingRatesSchema.parse(req.query);

    // Verify the pet belongs to the user
    const pet = await prisma.pet.findFirst({
      where: {
        id: petId,
        ownerId: req.user.id
      }
    });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    const whereClause: any = { petId };
    
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = startDate;
      if (endDate) whereClause.timestamp.lte = endDate;
    }

    const breathingRates = await prisma.breathingRate.findMany({
      where: whereClause,
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });

    // Calculate statistics
    const stats = await calculateBreathingRateStats(petId, startDate, endDate);

    res.json({
      breathingRates,
      stats,
      pet: {
        id: pet.id,
        name: pet.name,
        species: pet.species
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    console.error('Error fetching breathing rates:', error);
    res.status(500).json({ error: 'Failed to fetch breathing rates' });
  }
});

// Get breathing rate trends and analytics
router.get('/:petId/analytics', async (req: AuthRequest, res) => {
  try {
    if (req.user?.type !== 'user') {
      return res.status(403).json({ error: 'Only pet owners can access analytics' });
    }

    const { petId } = req.params;

    // Verify the pet belongs to the user
    const pet = await prisma.pet.findFirst({
      where: {
        id: petId,
        ownerId: req.user.id
      }
    });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    // Get recent measurements for trend analysis
    const recentRates = await prisma.breathingRate.findMany({
      where: { petId },
      orderBy: { timestamp: 'desc' },
      take: 30
    });

    const analytics = {
      totalMeasurements: recentRates.length,
      averageRate: recentRates.length > 0 
        ? Math.round(recentRates.reduce((sum, rate) => sum + rate.rate, 0) / recentRates.length)
        : 0,
      minRate: recentRates.length > 0 ? Math.min(...recentRates.map(r => r.rate)) : 0,
      maxRate: recentRates.length > 0 ? Math.max(...recentRates.map(r => r.rate)) : 0,
      trend: calculateTrend(recentRates),
      normalRange: getNormalBreathingRange(pet.species),
      lastMeasurement: recentRates[0] || null
    };

    res.json({ analytics, pet });
  } catch (error) {
    console.error('Error fetching breathing rate analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Helper functions
async function checkBreathingRateAbnormality(petId: string, rate: number, species: string): Promise<boolean> {
  const normalRange = getNormalBreathingRange(species);
  return rate < normalRange.min || rate > normalRange.max;
}

function getNormalBreathingRange(species: string): { min: number; max: number } {
  const ranges: { [key: string]: { min: number; max: number } } = {
    'dog': { min: 10, max: 30 },
    'cat': { min: 20, max: 30 },
    'rabbit': { min: 30, max: 60 },
    'bird': { min: 15, max: 45 }
  };
  
  return ranges[species.toLowerCase()] || { min: 15, max: 40 };
}

async function calculateBreathingRateStats(petId: string, startDate?: Date, endDate?: Date) {
  const whereClause: any = { petId };
  
  if (startDate || endDate) {
    whereClause.timestamp = {};
    if (startDate) whereClause.timestamp.gte = startDate;
    if (endDate) whereClause.timestamp.lte = endDate;
  }

  const rates = await prisma.breathingRate.findMany({
    where: whereClause,
    select: { rate: true }
  });

  if (rates.length === 0) {
    return {
      count: 0,
      average: 0,
      min: 0,
      max: 0
    };
  }

  const rateValues = rates.map(r => r.rate);
  
  return {
    count: rates.length,
    average: Math.round(rateValues.reduce((sum, rate) => sum + rate, 0) / rates.length),
    min: Math.min(...rateValues),
    max: Math.max(...rateValues)
  };
}

function calculateTrend(rates: { rate: number; timestamp: Date }[]): 'increasing' | 'decreasing' | 'stable' {
  if (rates.length < 3) return 'stable';
  
  const recent = rates.slice(0, 3);
  const older = rates.slice(3, 6);
  
  if (recent.length < 3 || older.length < 3) return 'stable';
  
  const recentAvg = recent.reduce((sum, r) => sum + r.rate, 0) / recent.length;
  const olderAvg = older.reduce((sum, r) => sum + r.rate, 0) / older.length;
  
  const difference = recentAvg - olderAvg;
  
  if (Math.abs(difference) < 2) return 'stable';
  return difference > 0 ? 'increasing' : 'decreasing';
}

export default router;
