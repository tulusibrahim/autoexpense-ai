# Railway Deployment Guide

This guide covers deploying AutoExpense AI to Railway.

## Quick Deploy Steps

### Option 1: Deploy Backend Only (Recommended for Start)

1. **Go to Railway Dashboard**
   - Visit https://railway.app
   - Sign up/Login with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Backend Service**
   - Railway will auto-detect the backend folder
   - If not, set Root Directory to `backend`
   - Railway will automatically:
     - Install dependencies (`npm ci`)
     - Build the project (`npm run build`)
     - Start the server (`npm start`)

4. **Add Environment Variables**
   - Go to Variables tab
   - Add:
     ```
     GEMINI_API_KEY=your_gemini_api_key
     PORT=4000
     DB_PATH=/app/data/expenses.db
     NODE_ENV=production
     ```

5. **Add Persistent Volume**
   - Go to Volumes tab
   - Click "Add Volume"
   - Mount Path: `/app/data`
   - This will persist your SQLite database

6. **Get Backend URL**
   - Railway will provide a URL like: `https://your-app.railway.app`
   - Copy this URL

### Option 2: Deploy Frontend + Backend (Monorepo)

Railway supports monorepos! You can deploy both services:

1. **Deploy Backend** (follow steps above)

2. **Add Frontend Service**
   - In the same project, click "New Service"
   - Select "GitHub Repo" → same repository
   - Set Root Directory to `frontend`
   - Add Environment Variable:
     ```
     VITE_API_URL=https://your-backend.railway.app
     ```
   - Railway will build and deploy the frontend

## Environment Variables

### Backend Service
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=4000
DB_PATH=/app/data/expenses.db
NODE_ENV=production
```

### Frontend Service
```env
VITE_API_URL=https://your-backend-service.railway.app
```

## Important Notes

1. **Database Persistence**: Make sure to add a volume at `/app/data` for the backend service to persist SQLite database

2. **Port**: Railway automatically assigns a PORT, but our code defaults to 4000. Railway will set PORT automatically, so you don't need to set it manually.

3. **CORS**: The backend CORS is configured to allow all origins. For production, you may want to restrict it to your frontend URL.

4. **Build Process**: 
   - Backend: `npm ci` → `npm run build` → `npm start`
   - Frontend: `npm ci` → `npm run build` → serves static files

## Troubleshooting

### Build Fails
- Check Railway logs for specific errors
- Ensure Node.js version is 20+
- Verify all dependencies are in package.json

### Database Not Persisting
- Ensure volume is mounted at `/app/data`
- Check volume size (should be at least 100MB)

### CORS Errors
- Verify `VITE_API_URL` in frontend matches backend URL
- Check backend CORS configuration

### Port Issues
- Railway sets PORT automatically
- Don't hardcode port in code (already handled)

## Railway CLI (Alternative)

You can also use Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Add volume
railway volume create data

# Set variables
railway variables set GEMINI_API_KEY=your_key

# Deploy
railway up
```

## Cost

Railway offers:
- **Free Tier**: $5 credit/month
- Backend service: ~$5/month (512MB RAM)
- Frontend: Free (static site)
- Volume: Included in service cost

**Total: Free** (within $5/month credit)

## Next Steps

1. Deploy backend first
2. Test backend API endpoints
3. Deploy frontend with backend URL
4. Test full application
5. Set up custom domain (optional)

