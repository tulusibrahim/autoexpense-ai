# AutoExpense AI

Automatically extract and track expenses from your Gmail using Gemini AI.

## Features

- 📧 Automatic expense extraction from Gmail
- 🤖 Powered by Google Gemini AI
- 💰 Track expenses and income
- 📊 Visual spending analytics
- 🏷️ Category management
- 🔍 Email filtering
- 👤 Multi-user support

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Ant Design
- **Backend**: Node.js + Elysia + TypeScript
- **Database**: SQLite (better-sqlite3)

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Google OAuth credentials
- Gemini API key

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd autoexpense-ai
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Create .env file
   echo "GEMINI_API_KEY=your_gemini_api_key" > .env
   echo "PORT=4000" >> .env
   
   # Run development server
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Create .env file
   echo "VITE_API_URL=http://localhost:4000" > .env
   
   # Run development server
   npm run dev
   ```

4. **Access the app**
   - Frontend: http://localhost:3001
   - Backend: http://localhost:4000

### Docker Development

```bash
# Build and run with Docker Compose
docker-compose up --build

# Access the app
# Frontend: http://localhost
# Backend: http://localhost:4000
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Options

**Recommended: Railway (Backend) + Vercel (Frontend)**

1. **Backend to Railway:**
   ```bash
   cd backend
   railway login
   railway init
   railway volume create data
   railway variables set GEMINI_API_KEY=your_key
   railway up
   ```

2. **Frontend to Vercel:**
   ```bash
   cd frontend
   vercel
   vercel env add VITE_API_URL production
   # Enter your Railway backend URL
   ```

## Environment Variables

### Backend
- `GEMINI_API_KEY` - Your Google Gemini API key (required)
- `PORT` - Server port (default: 4000)
- `DB_PATH` - SQLite database path (default: ./data/expenses.db)
- `NODE_ENV` - Environment (production/development)

### Frontend
- `VITE_API_URL` - Backend API URL (default: http://localhost:4000)

## Project Structure

```
autoexpense-ai/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Main server file
│   │   ├── types.ts          # TypeScript types
│   │   └── services/
│   │       ├── geminiService.ts
│   │       └── googleService.ts
│   ├── data/                 # SQLite database (created automatically)
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API services
│   │   └── utils/           # Utility functions
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## API Endpoints

- `GET /` - Health check
- `POST /user/profile` - Get/create user profile
- `GET /expenses` - Get all expenses (requires userId query param)
- `GET /expenses/:id` - Get expense by ID
- `PUT /expenses/:id` - Create/update expense
- `DELETE /expenses/:id` - Delete expense
- `POST /expenses/scan` - Scan inbox for expenses
- `GET /settings/email-filters` - Get email filter settings
- `PUT /settings/email-filters` - Save email filter settings

## License

MIT

## Support

For deployment issues, see [DEPLOYMENT.md](./DEPLOYMENT.md)

