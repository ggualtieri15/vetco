import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create sample veterinarian
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const vet = await prisma.veterinarian.upsert({
    where: { email: 'dr.smith@example.com' },
    update: {},
    create: {
      email: 'dr.smith@example.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Smith',
      phone: '+1234567890',
      licenseNumber: 'VET123456',
      clinic: 'Happy Paws Veterinary Clinic'
    }
  });

  // Create sample user
  const user = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567891'
    }
  });

  // Create sample pet
  const pet = await prisma.pet.upsert({
    where: { id: 'sample-pet-id' },
    update: {},
    create: {
      id: 'sample-pet-id',
      name: 'Buddy',
      species: 'Dog',
      breed: 'Golden Retriever',
      age: 5,
      weight: 30.5,
      ownerId: user.id
    }
  });

  // Create sample medication schedule
  const schedule = await prisma.medicationSchedule.create({
    data: {
      qrCode: 'VETCO_SAMPLE_QR_123',
      medication: 'Amoxicillin',
      dosage: '250mg',
      frequency: 'Twice daily',
      duration: '10 days',
      instructions: 'Give with food. Complete the full course even if symptoms improve.',
      startDate: new Date(),
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      petId: pet.id,
      veterinarianId: vet.id
    }
  });

  // Create sample breathing rate records
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    await prisma.breathingRate.create({
      data: {
        rate: Math.floor(Math.random() * 10) + 20, // Random rate between 20-30
        timestamp: date,
        notes: i === 0 ? 'Pet seemed calm and relaxed' : undefined,
        petId: pet.id
      }
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log('📧 Sample user: john.doe@example.com / password123');
  console.log('👨‍⚕️ Sample vet: dr.smith@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



