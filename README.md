# VetCo - Pet Health Management Platform

A comprehensive platform for managing pet medication schedules, monitoring health metrics, and communicating with veterinarians.

## Features

- 📱 **Medication Management**: Scan QR codes to import medication schedules and receive push notifications
- 🫁 **Breathing Rate Monitoring**: Track and monitor your pet's breathing patterns
- 💬 **Veterinarian Communication**: Direct messaging with veterinary professionals
- 🌐 **Cross-Platform**: Available as both web and mobile applications

## Project Structure

```
VetCo/
├── web/          # React web application
├── mobile/       # React Native mobile application
├── backend/      # Node.js/Express API server
└── shared/       # Shared types and utilities
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- For mobile development: React Native CLI, Android Studio/Xcode

### Installation

1. Install all dependencies:
```bash
npm run install:all
```

2. Start the backend server:
```bash
npm run dev:backend
```

3. Start the web application:
```bash
npm run dev:web
```

4. Start the mobile application:
```bash
npm run dev:mobile
```

## Development

Each application can be developed independently:
- Web app runs on http://localhost:3000
- Mobile app uses Metro bundler
- Backend API runs on http://localhost:8000

## Tech Stack

- **Frontend**: React, React Native, TypeScript
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens
- **Push Notifications**: Firebase Cloud Messaging
- **QR Code**: React Native Camera & QR scanner libraries
