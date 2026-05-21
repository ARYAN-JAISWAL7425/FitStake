# FitStake Backend

Express + TypeScript + Mongoose + MongoDB Atlas.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Confirm `.env`** has these keys (already set in your local copy):
   ```
   MONGODB_URI="mongodb+srv://...@.../"
   JWT_SECRET="..."
   PORT=4000                          # optional, defaults to 4000
   CORS_ORIGIN=http://localhost:5173  # optional, frontend dev URL
   JWT_EXPIRES_IN=7d                  # optional
   ```

3. **Run dev server**
   ```bash
   npm run dev
   ```
   Server starts on `http://localhost:4000`. On boot you should see:
   ```
   [db] connected to fitstake
   [server] listening on http://localhost:4000
   ```

## Available scripts

| Command            | What it does                                    |
|--------------------|-------------------------------------------------|
| `npm run dev`      | Start dev server with hot reload (tsx watch)    |
| `npm run build`    | Compile TypeScript → `dist/`                    |
| `npm start`        | Run the compiled build                          |
| `npm run typecheck`| `tsc --noEmit`                                  |

## Endpoints (turn 1)

| Method | Path                    | Auth | Body                                  | Returns                       |
|--------|-------------------------|------|---------------------------------------|-------------------------------|
| GET    | `/health`               | —    | —                                     | `{ ok, service }`             |
| POST   | `/auth/register`        | —    | `{ name, email, password }`           | `{ token, user }`             |
| POST   | `/auth/login`           | —    | `{ email, password }`                 | `{ token, user }`             |
| POST   | `/auth/forgot-password` | —    | `{ email }`                           | `{ ok, message }` (token logged to stdout for now) |
| GET    | `/me`                   | ✅    | —                                     | `{ user }`                    |

Auth header for protected routes: `Authorization: Bearer <token>`.

## Quick smoke test

```bash
# Register
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Aryan","email":"a@example.com","password":"secret123"}'

# Copy the returned token, then:
curl http://localhost:4000/me \
  -H "Authorization: Bearer <PASTE_TOKEN_HERE>"
```

## Project structure

```
src/
├── server.ts              ← Express app + DB connect + listen
├── lib/
│   ├── env.ts             ← env-var validation
│   ├── db.ts              ← Mongoose connect (dbName: fitstake)
│   └── jwt.ts             ← sign / verify helpers
├── middleware/
│   ├── auth.ts            ← requireAuth (reads Bearer token)
│   └── error.ts           ← centralized error handler + 404
├── models/
│   └── User.ts            ← Mongoose user schema + toUserDTO()
└── routes/
    ├── auth.ts            ← /auth/register | /auth/login | /auth/forgot-password
    └── me.ts              ← GET /me
```

## What's coming in later turns

- Cycles (start, current, history)
- Goals + Completions + FP ledger
- Wallet + Transactions
- Rewards + Squads
- Google Fit OAuth + scheduled sync
- Frontend wired up via `src/lib/api.ts`
