import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createPetSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  breed: z.string().optional(),
  age: z.number().int().positive().optional(),
  weight: z.number().positive().optional(),
  imageUrl: z.string().url().optional()
});

const updatePetSchema = createPetSchema.partial();

// Get all pets for the authenticated user
router.get('/', async (req: AuthRequest, res) => {
  try {
    if (req.user?.type !== 'user') {
      return res.status(403).json({ error: 'Only pet owners can access this endpoint' });
    }

    const pets = await prisma.pet.findMany({
      where: {
        ownerId: req.user.id
      },
      include: {
        medicationSchedules: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            medication: true,
            frequency: true,
            startDate: true,
            endDate: true
          }
        },
        breathingRates: {
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

    res.json({ pets });
  } catch (error) {
    console.error('Error fetching pets:', error);
    res.status(500).json({ error: 'Failed to fetch pets' });
  }
});

// Get a specific pet
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    if (req.user?.type !== 'user') {
      return res.status(403).json({ error: 'Only pet owners can access this endpoint' });
    }

    const { id } = req.params;

    const pet = await prisma.pet.findFirst({
      where: {
        id,
        ownerId: req.user.id
      },
      include: {
        medicationSchedules: {
          where: {
            isActive: true
          },
          include: {
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
        },
        breathingRates: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 20
        }
      }
    });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    res.json({ pet });
  } catch (error) {
    console.error('Error fetching pet:', error);
    res.status(500).json({ error: 'Failed to fetch pet' });
  }
});

// Create a new pet
router.post('/', async (req: AuthRequest, res) => {
  try {
    if (req.user?.type !== 'user') {
      return res.status(403).json({ error: 'Only pet owners can create pets' });
    }

    const validatedData = createPetSchema.parse(req.body);

    const pet = await prisma.pet.create({
      data: {
        ...validatedData,
        ownerId: req.user.id
      }
    });

    res.status(201).json({
      message: 'Pet created successfully',
      pet
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    console.error('Error creating pet:', error);
    res.status(500).json({ error: 'Failed to create pet' });
  }
});

// Update a pet
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    if (req.user?.type !== 'user') {
      return res.status(403).json({ error: 'Only pet owners can update pets' });
    }

    const { id } = req.params;
    const validatedData = updatePetSchema.parse(req.body);

    // Verify ownership
    const existingPet = await prisma.pet.findFirst({
      where: {
        id,
        ownerId: req.user.id
      }
    });

    if (!existingPet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    const pet = await prisma.pet.update({
      where: { id },
      data: validatedData
    });

    res.json({
      message: 'Pet updated successfully',
      pet
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    console.error('Error updating pet:', error);
    res.status(500).json({ error: 'Failed to update pet' });
  }
});

// Delete a pet
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    if (req.user?.type !== 'user') {
      return res.status(403).json({ error: 'Only pet owners can delete pets' });
    }

    const { id } = req.params;

    // Verify ownership
    const existingPet = await prisma.pet.findFirst({
      where: {
        id,
        ownerId: req.user.id
      }
    });

    if (!existingPet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    await prisma.pet.delete({
      where: { id }
    });

    res.json({ message: 'Pet deleted successfully' });
  } catch (error) {
    console.error('Error deleting pet:', error);
    res.status(500).json({ error: 'Failed to delete pet' });
  }
});

export default router;
