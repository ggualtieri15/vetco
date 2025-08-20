// Shared types between web and mobile applications

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Veterinarian {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  licenseNumber: string;
  clinic: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  weight?: number;
  imageUrl?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationSchedule {
  id: string;
  qrCode: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  petId: string;
  veterinarianId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  time: string;
  message: string;
  isActive: boolean;
  scheduleId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationAdministration {
  id: string;
  timestamp: string;
  notes?: string;
  administered: boolean;
  scheduleId: string;
}

export interface BreathingRate {
  id: string;
  rate: number;
  timestamp: string;
  notes?: string;
  petId: string;
}

export interface Message {
  id: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  senderId?: string;
  recipientId?: string;
  vetSenderId?: string;
  vetRecipientId?: string;
}

export interface PushToken {
  id: string;
  token: string;
  platform: string;
  userId: string;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form types
export interface LoginRequest {
  email: string;
  password: string;
  type: 'user' | 'veterinarian';
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  type: 'user' | 'veterinarian';
  licenseNumber?: string;
  clinic?: string;
}

export interface CreatePetRequest {
  name: string;
  species: string;
  breed?: string;
  age?: number;
  weight?: number;
  imageUrl?: string;
}

export interface RecordBreathingRateRequest {
  petId: string;
  rate: number;
  notes?: string;
}

export interface SendMessageRequest {
  recipientId: string;
  content: string;
  recipientType: 'user' | 'veterinarian';
}

// Breathing rate analytics
export interface BreathingRateAnalytics {
  totalMeasurements: number;
  averageRate: number;
  minRate: number;
  maxRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  normalRange: {
    min: number;
    max: number;
  };
  lastMeasurement?: BreathingRate;
}

// Notification types
export interface NotificationData {
  type: 'medication_reminder' | 'message' | 'breathing_alert';
  scheduleId?: string;
  reminderId?: string;
  conversationId?: string;
  petId?: string;
}
