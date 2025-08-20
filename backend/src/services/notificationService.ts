import admin from 'firebase-admin';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize Firebase Admin SDK
let firebaseInitialized = false;
if (!admin.apps.length) {
  try {
    const firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    // Only initialize if all required Firebase credentials are present
    if (firebaseConfig.projectId && firebaseConfig.privateKey && firebaseConfig.clientEmail) {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Admin SDK initialized successfully');
    } else {
      console.warn('⚠️  Firebase credentials not configured. Push notifications will be disabled.');
      console.warn('   Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL environment variables to enable notifications.');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    console.warn('   Push notifications will be disabled.');
  }
}

export interface Reminder {
  id: string;
  time: Date;
  message: string;
  scheduleId: string;
}

// Schedule a notification for a reminder
export async function scheduleNotification(userId: string, reminder: Reminder) {
  try {
    // Get user's push tokens
    const pushTokens = await prisma.pushToken.findMany({
      where: { userId }
    });

    if (pushTokens.length === 0) {
      console.log(`No push tokens found for user ${userId}`);
      return;
    }

    // Calculate when to send the notification
    const now = new Date();
    const reminderTime = new Date(reminder.time);
    
    if (reminderTime <= now) {
      console.log(`Reminder time ${reminderTime} is in the past, skipping`);
      return;
    }

    // Schedule the notification using node-cron
    const cronTime = getCronExpression(reminderTime);
    
    cron.schedule(cronTime, async () => {
      await sendPushNotification(pushTokens.map(t => t.token), {
        title: 'Medication Reminder',
        body: reminder.message,
        data: {
          type: 'medication_reminder',
          scheduleId: reminder.scheduleId,
          reminderId: reminder.id
        }
      });
    }, {
      scheduled: true,
      timezone: 'America/New_York' // You might want to make this configurable per user
    });

    console.log(`Scheduled notification for ${reminderTime} with message: ${reminder.message}`);
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
}

// Send push notification
export async function sendPushNotification(
  tokens: string[],
  notification: {
    title: string;
    body: string;
    data?: { [key: string]: string };
  }
) {
  try {
    if (tokens.length === 0) return;
    
    if (!firebaseInitialized) {
      console.warn('Firebase not initialized. Skipping push notification.');
      return;
    }

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      tokens: tokens
    };

    const response = await admin.messaging().sendMulticast(message);
    
    console.log(`Successfully sent ${response.successCount} notifications`);
    
    if (response.failureCount > 0) {
      console.log(`Failed to send ${response.failureCount} notifications`);
      
      // Remove invalid tokens
      const failedTokens = response.responses
        .map((resp, idx) => resp.success ? null : tokens[idx])
        .filter(token => token !== null);
      
      if (failedTokens.length > 0) {
        await prisma.pushToken.deleteMany({
          where: {
            token: { in: failedTokens }
          }
        });
        console.log(`Removed ${failedTokens.length} invalid push tokens`);
      }
    }

    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

// Cancel a scheduled notification
export async function cancelNotification(reminderId: string) {
  try {
    // Mark reminder as inactive
    await prisma.reminder.update({
      where: { id: reminderId },
      data: { isActive: false }
    });

    console.log(`Cancelled notification for reminder ${reminderId}`);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
}

// Register push token for a user
export async function registerPushToken(userId: string, token: string, platform: string) {
  try {
    await prisma.pushToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform }
    });

    console.log(`Registered push token for user ${userId} on ${platform}`);
  } catch (error) {
    console.error('Error registering push token:', error);
    throw error;
  }
}

// Helper function to convert Date to cron expression
function getCronExpression(date: Date): string {
  const minute = date.getMinutes();
  const hour = date.getHours();
  const day = date.getDate();
  const month = date.getMonth() + 1;
  
  return `${minute} ${hour} ${day} ${month} *`;
}

// Start daily check for pending reminders
export function startReminderScheduler() {
  // Check every minute for reminders that need to be sent
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      const pendingReminders = await prisma.reminder.findMany({
        where: {
          isActive: true,
          time: {
            gte: oneMinuteAgo,
            lte: now
          }
        },
        include: {
          schedule: {
            include: {
              pet: {
                include: {
                  owner: true
                }
              }
            }
          }
        }
      });

      for (const reminder of pendingReminders) {
        const userId = reminder.schedule.pet.owner.id;
        await scheduleNotification(userId, reminder);
        
        // Mark as sent by deactivating
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { isActive: false }
        });
      }
    } catch (error) {
      console.error('Error in reminder scheduler:', error);
    }
  });

  console.log('📅 Reminder scheduler started');
}
