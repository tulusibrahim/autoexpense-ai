# Deployment Guide

This guide covers deploying AutoExpense AI to free platforms.

## Architecture Overview

- **Frontend**: React + Vite (Static site)
- **Backend**: Node.js + Elysia (API server)
- **Database**: SQLite (file-based, requires persistent storage)

## Recommended Free Platforms

### Option 1: Railway (Recommended) ⭐

**Why Railway?**
- ✅ Free tier with $5 credit/month
- ✅ Persistent volumes for SQLite
- ✅ Easy deployment from GitHub
- ✅ Supports both frontend and backend
- ✅ Automatic HTTPS

**Deployment Steps:**

1. **Backend Deployment:**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Initialize project
   cd backend
   railway init
   
   # Add persistent volume for database
   railway volume create data
   
   # Set environment variables
   railway variables set GEMINI_API_KEY=your_key_here
   railway variables set PORT=4000
   railway variables set DB_PATH=/app/data/expenses.db
   
   # Deploy
   railway up
   ```

2. **Frontend Deployment:**
   - Option A: Deploy to Vercel (recommended for frontend)
   - Option B: Deploy to Railway as static site
   
   **Vercel Deployment:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   cd frontend
   vercel
   
   # Set environment variable
   vercel env add VITE_API_URL production
   # Enter your Railway backend URL: https://your-app.railway.app
   ```

### Option 2: Render

**Why Render?**
- ✅ Free tier available
- ✅ Persistent disks for SQLite
- ✅ Automatic HTTPS
- ⚠️ Spins down after 15 minutes of inactivity (free tier)

**Deployment Steps:**

1. **Backend:**
   - Go to https://render.com
   - Create new "Web Service"
   - Connect GitHub repository
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Add Environment Variables:
     - `GEMINI_API_KEY=your_key`
     - `PORT=4000`
     - `DB_PATH=/opt/render/project/src/data/expenses.db`
   - Add Persistent Disk: `/opt/render/project/src/data` (1GB)

2. **Frontend:**
   - Create new "Static Site"
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Add Environment Variable:
     - `VITE_API_URL=https://your-backend.onrender.com`

### Option 3: Fly.io

**Why Fly.io?**
- ✅ Free tier with persistent volumes
- ✅ Global edge deployment
- ⚠️ More complex setup

**Deployment Steps:**

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Backend:**
   ```bash
   cd backend
   fly launch
   # Follow prompts, then:
   fly volumes create data --size 1
   fly secrets set GEMINI_API_KEY=your_key
   fly deploy
   ```

3. **Frontend:**
   - Deploy to Vercel/Netlify (recommended)
   - Or use Fly.io static site configuration

### Option 4: Separate Deployments (Best for Production)

**Frontend → Vercel** (Free, excellent for React)
**Backend → Railway** (Free tier, persistent storage)

This is the recommended approach for production.

## Environment Variables

### Backend (.env)
```env
PORT=4000
DB_PATH=/app/data/expenses.db
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=production
```

### Frontend (.env.production)
```env
VITE_API_URL=https://your-backend-url.com
```

## Database Migration

SQLite database will be created automatically on first run. The database file will persist in the volume/mount you configure.

## CORS Configuration

The backend already has CORS enabled. Make sure your frontend URL is allowed:

```typescript
// backend/src/index.ts
.use(
  cors({
    origin: process.env.FRONTEND_URL || true, // Allow all in dev
    credentials: true,
  })
)
```

For production, set:
```env
FRONTEND_URL=https://your-frontend.vercel.app
```

## Health Checks

The backend includes a health check endpoint at `/` that returns:
```json
{
  "success": true,
  "message": "AutoExpense AI Backend API",
  "version": "1.0.0"
}
```

## Monitoring

### Railway
- Built-in metrics and logs
- View logs: `railway logs`

### Render
- Built-in logs dashboard
- Email alerts on errors

### Vercel
- Analytics included
- Function logs available

## Troubleshooting

### SQLite Database Issues

If you see database errors:
1. Ensure persistent volume is mounted correctly
2. Check file permissions (should be writable)
3. Verify DB_PATH environment variable

### CORS Errors

1. Check backend CORS configuration
2. Verify FRONTEND_URL environment variable
3. Ensure frontend VITE_API_URL points to correct backend

### Build Failures

1. Check Node.js version (should be 20+)
2. Verify all dependencies are in package.json
3. Check build logs for specific errors

## Cost Estimation

### Railway
- Free tier: $5 credit/month
- Backend: ~$5/month (512MB RAM)
- Frontend: Free (static site)
- **Total: Free** (within free tier)

### Render
- Backend: Free (spins down after inactivity)
- Frontend: Free
- **Total: Free**

### Vercel + Railway
- Vercel: Free (frontend)
- Railway: Free tier
- **Total: Free**

## Quick Start Commands

### Local Development with Docker
```bash
docker-compose up --build
```

### Deploy to Railway
```bash
# Backend
cd backend && railway up

# Frontend (Vercel)
cd frontend && vercel
```

## Support

For issues:
1. Check platform-specific documentation
2. Review logs: `railway logs` or platform dashboard
3. Verify environment variables are set correctly

