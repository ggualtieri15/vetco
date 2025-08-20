import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import authRoutes from './routes/auth';
import petRoutes from './routes/pets';
import medicationRoutes from './routes/medications';
import breathingRoutes from './routes/breathing';
import messageRoutes from './routes/messages';
import vetRoutes from './routes/veterinarians';

// Import middleware
import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'VetCo API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pets', authenticateToken, petRoutes);
app.use('/api/medications', authenticateToken, medicationRoutes);
app.use('/api/breathing', authenticateToken, breathingRoutes);
app.use('/api/messages', authenticateToken, messageRoutes);
app.use('/api/veterinarians', vetRoutes);

// Socket.IO for real-time messaging
io.use((socket, next) => {
  // Add authentication middleware for socket connections
  const token = socket.handshake.auth.token;
  if (token) {
    // Verify JWT token here
    next();
  } else {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('send_message', (data) => {
    socket.to(data.roomId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 VetCo API server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
});

export default app;
