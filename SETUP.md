# VetCo Setup Guide

This guide will walk you through setting up the VetCo pet health management platform on your local development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **Git** - [Download here](https://git-scm.com/)
- **Docker & Docker Compose** (recommended) - [Download here](https://www.docker.com/)

### For Mobile Development
- **Expo CLI** - Install with `npm install -g @expo/cli`
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)

## Step-by-Step Setup

### 1. Clone and Navigate to Project
```bash
git clone <your-repo-url>
cd VetCo
```

### 2. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
# At minimum, you need to set:
# - DATABASE_URL
# - JWT_SECRET
```

### 3. Database Setup (Choose One)

#### Option A: Using Docker (Recommended)
```bash
# Start PostgreSQL and Redis containers
docker-compose up -d

# Verify containers are running
docker-compose ps
```

#### Option B: Manual PostgreSQL Installation
1. Install PostgreSQL 15+
2. Create a database named `vetco_db`
3. Create a user `vetco_user` with password `vetco_password`
4. Update `DATABASE_URL` in `.env` file

### 4. Install Dependencies
```bash
# Install all project dependencies
npm run install:all
```

### 5. Database Schema Setup
```bash
cd backend

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed

cd ..
```

### 6. Start Development Servers

Open 3 terminal windows and run:

**Terminal 1 - Backend API:**
```bash
npm run dev:backend
```
✅ Backend will be available at http://localhost:8000

**Terminal 2 - Web Application:**
```bash
npm run dev:web
```
✅ Web app will be available at http://localhost:3000

**Terminal 3 - Mobile Application:**
```bash
npm run dev:mobile
```
✅ Follow Expo instructions to run on device/simulator

## Firebase Setup (Optional - for Push Notifications)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Go to Project Settings > Service Accounts
4. Generate a new private key (downloads JSON file)
5. Add these values to your `.env` file:
```bash
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@your-project.iam.gserviceaccount.com"
```

## Testing Your Setup

### 1. Test Backend API
```bash
curl http://localhost:8000/health
# Should return: {"status":"OK","message":"VetCo API is running"}
```

### 2. Test Web Application
1. Open http://localhost:3000
2. Click "Sign In"
3. Use sample credentials:
   - Email: `john.doe@example.com`
   - Password: `password123`

### 3. Test Mobile Application
1. Install Expo Go app on your phone
2. Scan the QR code from Terminal 3
3. Login with the same sample credentials

## Common Issues & Solutions

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process (replace PID)
kill -9 <PID>
```

### Prisma Issues
```bash
cd backend

# Reset database (WARNING: This deletes all data)
npx prisma db push --force-reset

# Regenerate client
npm run db:generate

# Re-seed data
npm run db:seed
```

### Mobile App Not Loading
```bash
# Clear Expo cache
npx expo start --clear

# Ensure your phone and computer are on the same network
# Check firewall settings
```

## Development Workflow

### Making Database Changes
1. Edit `backend/prisma/schema.prisma`
2. Run `npm run db:push` (development) or `npm run db:migrate` (production)
3. Run `npm run db:generate` to update Prisma client

### Adding New API Routes
1. Create route file in `backend/src/routes/`
2. Add route to `backend/src/index.ts`
3. Update shared types in `shared/types/index.ts`

### Adding New Screens
- **Web:** Create page in `web/app/` directory
- **Mobile:** Create screen in `mobile/app/` directory

## Production Deployment

### Backend
1. Set up PostgreSQL database
2. Configure environment variables
3. Run `npm run build`
4. Deploy to your hosting platform

### Web App
1. Configure `NEXT_PUBLIC_API_URL` for production
2. Run `npm run build`
3. Deploy to Vercel, Netlify, or your hosting platform

### Mobile App
1. Configure production API URL
2. Build with `expo build` or EAS Build
3. Submit to App Store/Google Play

## Support

If you encounter issues:
1. Check this setup guide
2. Review error logs in terminal
3. Verify all prerequisites are installed
4. Check environment variables are set correctly

## Next Steps

After setup is complete:
1. Explore the web dashboard at http://localhost:3000
2. Test QR code scanning with the mobile app
3. Try the breathing rate monitoring feature
4. Test veterinarian messaging system
5. Customize the UI and add your branding


