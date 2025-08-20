import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const sendMessageSchema = z.object({
  recipientId: z.string(),
  content: z.string().min(1),
  recipientType: z.enum(['user', 'veterinarian'])
});

const getMessagesSchema = z.object({
  conversationWith: z.string(),
  conversationType: z.enum(['user', 'veterinarian']),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().min(0).default(0)
});

// Send a message
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { recipientId, content, recipientType } = sendMessageSchema.parse(req.body);
    
    // Verify recipient exists
    let recipient;
    if (recipientType === 'veterinarian') {
      recipient = await prisma.veterinarian.findUnique({
        where: { id: recipientId },
        select: { id: true, firstName: true, lastName: true }
      });
    } else {
      recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { id: true, firstName: true, lastName: true }
      });
    }

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Create message based on sender and recipient types
    let messageData: any = { content };

    if (req.user?.type === 'user') {
      if (recipientType === 'veterinarian') {
        messageData.senderId = req.user.id;
        messageData.vetRecipientId = recipientId;
      } else {
        messageData.senderId = req.user.id;
        messageData.recipientId = recipientId;
      }
    } else if (req.user?.type === 'veterinarian') {
      if (recipientType === 'user') {
        messageData.vetSenderId = req.user.id;
        messageData.recipientId = recipientId;
      } else {
        messageData.vetSenderId = req.user.id;
        messageData.vetRecipientId = recipientId;
      }
    }

    const message = await prisma.message.create({
      data: messageData,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        vetSender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            clinic: true
          }
        },
        vetRecipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            clinic: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get messages in a conversation
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { conversationWith, conversationType, limit, offset } = getMessagesSchema.parse(req.query);

    // Build where clause based on user type and conversation
    let whereClause: any = {};

    if (req.user?.type === 'user') {
      if (conversationType === 'veterinarian') {
        whereClause = {
          OR: [
            {
              senderId: req.user.id,
              vetRecipientId: conversationWith
            },
            {
              vetSenderId: conversationWith,
              recipientId: req.user.id
            }
          ]
        };
      } else {
        whereClause = {
          OR: [
            {
              senderId: req.user.id,
              recipientId: conversationWith
            },
            {
              senderId: conversationWith,
              recipientId: req.user.id
            }
          ]
        };
      }
    } else if (req.user?.type === 'veterinarian') {
      if (conversationType === 'user') {
        whereClause = {
          OR: [
            {
              vetSenderId: req.user.id,
              recipientId: conversationWith
            },
            {
              senderId: conversationWith,
              vetRecipientId: req.user.id
            }
          ]
        };
      } else {
        whereClause = {
          OR: [
            {
              vetSenderId: req.user.id,
              vetRecipientId: conversationWith
            },
            {
              vetSenderId: conversationWith,
              vetRecipientId: req.user.id
            }
          ]
        };
      }
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        vetSender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            clinic: true
          }
        },
        vetRecipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            clinic: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit,
      skip: offset
    });

    // Mark messages as read for the current user
    const messageIds = messages
      .filter(msg => {
        if (req.user?.type === 'user') {
          return msg.recipientId === req.user.id || msg.vetRecipientId === req.user.id;
        } else {
          return msg.vetRecipientId === req.user?.id || msg.recipientId === req.user?.id;
        }
      })
      .map(msg => msg.id);

    if (messageIds.length > 0) {
      await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          isRead: false
        },
        data: { isRead: true }
      });
    }

    res.json({ messages: messages.reverse() }); // Reverse to show oldest first
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get all conversations for a user
router.get('/conversations', async (req: AuthRequest, res) => {
  try {
    let conversations;

    if (req.user?.type === 'user') {
      // Get conversations with veterinarians
      const userConversations = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: req.user.id },
            { recipientId: req.user.id }
          ]
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true }
          },
          recipient: {
            select: { id: true, firstName: true, lastName: true }
          },
          vetSender: {
            select: { id: true, firstName: true, lastName: true, clinic: true }
          },
          vetRecipient: {
            select: { id: true, firstName: true, lastName: true, clinic: true }
          }
        },
        orderBy: { timestamp: 'desc' }
      });

      // Group by conversation partner
      const conversationMap = new Map();
      
      userConversations.forEach(msg => {
        let partnerId, partnerInfo;
        
        if (msg.vetSender && msg.recipientId === req.user?.id) {
          partnerId = msg.vetSender.id;
          partnerInfo = { ...msg.vetSender, type: 'veterinarian' };
        } else if (msg.vetRecipient && msg.senderId === req.user?.id) {
          partnerId = msg.vetRecipient.id;
          partnerInfo = { ...msg.vetRecipient, type: 'veterinarian' };
        } else if (msg.sender && msg.recipientId === req.user?.id) {
          partnerId = msg.sender.id;
          partnerInfo = { ...msg.sender, type: 'user' };
        } else if (msg.recipient && msg.senderId === req.user?.id) {
          partnerId = msg.recipient.id;
          partnerInfo = { ...msg.recipient, type: 'user' };
        }

        if (partnerId && !conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            partner: partnerInfo,
            lastMessage: msg,
            unreadCount: 0
          });
        }
      });

      conversations = Array.from(conversationMap.values());
    } else {
      // Veterinarian conversations
      const vetConversations = await prisma.message.findMany({
        where: {
          OR: [
            { vetSenderId: req.user?.id },
            { vetRecipientId: req.user?.id }
          ]
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true }
          },
          recipient: {
            select: { id: true, firstName: true, lastName: true }
          },
          vetSender: {
            select: { id: true, firstName: true, lastName: true, clinic: true }
          },
          vetRecipient: {
            select: { id: true, firstName: true, lastName: true, clinic: true }
          }
        },
        orderBy: { timestamp: 'desc' }
      });

      const conversationMap = new Map();
      
      vetConversations.forEach(msg => {
        let partnerId, partnerInfo;
        
        if (msg.sender && msg.vetRecipientId === req.user?.id) {
          partnerId = msg.sender.id;
          partnerInfo = { ...msg.sender, type: 'user' };
        } else if (msg.recipient && msg.vetSenderId === req.user?.id) {
          partnerId = msg.recipient.id;
          partnerInfo = { ...msg.recipient, type: 'user' };
        }

        if (partnerId && !conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            partner: partnerInfo,
            lastMessage: msg,
            unreadCount: 0
          });
        }
      });

      conversations = Array.from(conversationMap.values());
    }

    res.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

export default router;
