import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
// Notification service will be imported dynamically to avoid Firebase initialization issues
import { generateMedicationQR } from '../utils/qrGenerator';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createScheduleSchema = z.object({
  petId: z.string(),
  medication: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  instructions: z.string(),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  veterinarianId: z.string()
});

const scanQRSchema = z.object({
  qrCode: z.string()
});

const administrationSchema = z.object({
  scheduleId: z.string(),
  notes: z.string().optional(),
  administered: z.boolean().default(true)
});

// Get all medication schedules for user's pets
router.get('/', async (req: AuthRequest, res) => {
  try {
    if (req.user?.type !== 'user') {
      return res.status(403).json({ error: 'Only pet owners can access this endpoint' });
    }

    const schedules = await prisma.medicationSchedule.findMany({
      where: {
        pet: {
          ownerId: req.user.id
        }
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true
          }
        },
        veterinarian: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            clinic: true
          }
        },
        reminders: {
          where: {
            isActive: true
          },
          orderBy: {
            time: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ schedules });
  } catch (error) {
    console.error('Error fetching medication schedules:', error);
    res.status(500).json({ error: 'Failed to fetch medication schedules' });
  }
});

// Scan QR code to get medication schedule
router.post('/scan', async (req: AuthRequest, res) => {
  try {
    if (req.user?.type !== 'user') {
      return res.status(403).json({ error: 'Only pet owners can scan QR codes' });
    }

    const { qrCode } = scanQRSchema.parse(req.body);

    const schedule = await prisma.medicationSchedule.findUnique({
      where: { qrCode },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
            ownerId: true
          }
        },
        veterinarian: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            clinic: true
          }
        },
        reminders: {
          where: {
            isActive: true
          },
          orderBy: {
            time: 'asc'
          }
        }
      }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Invalid QR code' });
    }

    // Check if the user owns the pet
    if (schedule.pet.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only access schedules for your own pets' });
    }

    res.json({ schedule });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    console.error('Error scanning QR code:', error);
    res.status(500).json({ error: 'Failed to scan QR code' });
  }
});

// Create medication schedule (veterinarian only)
router.post('/', async (req: AuthRequest, res) => {
  try {
    if (req.user?.type !== 'veterinarian') {
      return res.status(403).json({ error: 'Only veterinarians can create medication schedules' });
    }

    const validatedData = createScheduleSchema.parse(req.body);
    
    // Generate unique QR code
    const qrCode = `VETCO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const schedule = await prisma.medicationSchedule.create({
      data: {
        ...validatedData,
        qrCode,
        veterinarianId: req.user.id
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true
          }
        },
        veterinarian: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            clinic: true
          }
        }
      }
    });

    // Generate QR code image
    const qrCodeImage = await generateMedicationQR({
      scheduleId: schedule.id,
      medication: schedule.medication,
      petName: schedule.pet.name,
      veterinarian: `${schedule.veterinarian.firstName} ${schedule.veterinarian.lastName}`,
      clinic: schedule.veterinarian.clinic,
      instructions: schedule.instructions,
      frequency: schedule.frequency,
      dosage: schedule.dosage,
      startDate: schedule.startDate.toISOString(),
      endDate: schedule.endDate?.toISOString()
    });

    res.status(201).json({ 
      message: 'Medication schedule created successfully',
      schedule,
      qrCodeImage
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    console.error('Error creating medication schedule:', error);
    res.status(500).json({ error: 'Failed to create medication schedule' });
  }
});

// Record medication administration
router.post('/administration', async (req: AuthRequest, res) => {
  try {
    if (req.user?.type !== 'user') {
      return res.status(403).json({ error: 'Only pet owners can record administrations' });
    }

    const { scheduleId, notes, administered } = administrationSchema.parse(req.body);

    // Verify the schedule belongs to user's pet
    const schedule = await prisma.medicationSchedule.findFirst({
      where: {
        id: scheduleId,
        pet: {
          ownerId: req.user.id
        }
      }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Medication schedule not found' });
    }

    const administration = await prisma.medicationAdministration.create({
      data: {
        scheduleId,
        notes,
        administered
      }
    });

    res.status(201).json({
      message: 'Administration recorded successfully',
      administration
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    console.error('Error recording administration:', error);
    res.status(500).json({ error: 'Failed to record administration' });
  }
});

// Get administration history for a schedule
router.get('/:scheduleId/administrations', async (req: AuthRequest, res) => {
  try {
    const { scheduleId } = req.params;

    // Verify access to the schedule
    const schedule = await prisma.medicationSchedule.findFirst({
      where: {
        id: scheduleId,
        OR: [
          {
            pet: {
              ownerId: req.user?.id
            }
          },
          {
            veterinarianId: req.user?.id
          }
        ]
      }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Medication schedule not found' });
    }

    const administrations = await prisma.medicationAdministration.findMany({
      where: { scheduleId },
      orderBy: { timestamp: 'desc' }
    });

    res.json({ administrations });
  } catch (error) {
    console.error('Error fetching administrations:', error);
    res.status(500).json({ error: 'Failed to fetch administrations' });
  }
});

// Set up reminders for a medication schedule
router.post('/:scheduleId/reminders', async (req: AuthRequest, res) => {
  try {
    if (req.user?.type !== 'user') {
      return res.status(403).json({ error: 'Only pet owners can set reminders' });
    }

    const { scheduleId } = req.params;
    const { times } = z.object({
      times: z.array(z.string().transform(str => new Date(str)))
    }).parse(req.body);

    // Verify the schedule belongs to user's pet
    const schedule = await prisma.medicationSchedule.findFirst({
      where: {
        id: scheduleId,
        pet: {
          ownerId: req.user.id
        }
      },
      include: {
        pet: true
      }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Medication schedule not found' });
    }

    // Create reminders
    const reminders = await Promise.all(
      times.map(time => 
        prisma.reminder.create({
          data: {
            scheduleId,
            time,
            message: `Time to give ${schedule.pet.name} their ${schedule.medication} medication`
          }
        })
      )
    );

    // Schedule push notifications
    for (const reminder of reminders) {
      try {
        const { scheduleNotification } = await import('../services/notificationService');
        await scheduleNotification(req.user.id, reminder);
      } catch (error: any) {
        console.warn('Failed to schedule notification (Firebase may not be configured):', error?.message || error);
      }
    }

    res.status(201).json({
      message: 'Reminders set successfully',
      reminders
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    console.error('Error setting reminders:', error);
    res.status(500).json({ error: 'Failed to set reminders' });
  }
});

export default router;
