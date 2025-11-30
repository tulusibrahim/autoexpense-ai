# AutoExpense AI Backend

Backend API server for AutoExpense AI built with Elysia.

## Setup

1. Install dependencies:

```bash
bun install
# or
npm install
```

2. Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

3. Add your Gemini API key to `.env`:

```
API_KEY=your_gemini_api_key_here
```

4. Run the server:

```bash
bun run dev
# or
npm run dev
```

The server will start on `http://localhost:4000` by default.

## API Endpoints

- `GET /` - Health check
- `POST /user/profile` - Get Google user profile
- `GET /expenses` - Get all expenses
- `GET /expenses/:id` - Get expense by ID
- `PUT /expenses/:id` - Create/Update expense
- `DELETE /expenses/:id` - Delete expense
- `POST /expenses/scan` - Scan inbox for expenses
- `POST /emails/demo` - Generate demo emails (for testing)

## Environment Variables

- `API_KEY` or `GEMINI_API_KEY` - Google Gemini API key (required)
- `PORT` - Server port (default: 4000)
- `DB_PATH` - SQLite database file path (default: `./data/expenses.db`)

## Notes

- Uses SQLite for persistent storage. Database file is created automatically in the `data/` directory.
- CORS is enabled for all origins in development. Restrict in production.
- Environment variables are loaded from `.env` file automatically using `dotenv`.
