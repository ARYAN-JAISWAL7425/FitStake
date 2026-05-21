# FitStake

> Put your money where your habit is.

FitStake is a B2C fitness habit-accountability app. You lock real money behind a
30-day fitness commitment — finish the cycle and your stake comes back; fall short
and it goes to charity in your name. The money is purely a *commitment device*:
FitStake takes ₹0 from consumers either way.

Built as a college capstone project.

---

## How it works

1. **Stake** — lock ₹100–₹10,000 at the start of a 30-day cycle.
2. **Show up** — complete your daily goals. A day counts only when **every** goal
   for that day is genuinely verified (see [Verification](#verification)).
3. **Resolve** — complete **25 of 30 days** → your full stake returns to your
   wallet. Miss the bar → the stake is donated to your chosen charity (GiveIndia)
   in your name.
4. **Earn** — every verified goal awards Fitness Points (FP). FP buy rewards
   (coupons, merch, a bicycle) and climb you through tiers (Bronze → Platinum).

## Verification

Goals aren't completed by tapping a button — each goal type is checked for real,
and most of the AI runs **in your browser** (nothing is uploaded for the check):

| Goal | How it's verified |
|------|-------------------|
| Steps | Live pull from **Google Fit** (capped at 50,000/day) |
| Water, diet, sleep | Photo + **object detection** (TensorFlow.js COCO-SSD) |
| Strength, cardio | Photo + **pose detection** (TensorFlow.js MoveNet — checks active posture) |

Once a photo passes, it's stored as proof and fingerprinted (SHA-256) so the same
image can't be reused on another day or goal.

## Features

- Variable stake (₹100–₹10,000) with atomic wallet locking
- Wallet top-ups via **Razorpay** and **Stripe** (test mode), plus a demo-credit path
- Manual **freeze days** to protect a streak
- **Fitness Points** + tier system with reward catalog (coupons, store items)
- **Squads** — group accountability with live progress
- Charity selection + donation tagging on missed cycles
- Transactional email (password reset, support) via SMTP, with a console fallback
- Self-healing tiers and idempotent completions

---

## Tech stack

**Frontend** — React 18, Vite 5, TypeScript, Tailwind CSS, React Router 6,
lucide-react, TensorFlow.js (COCO-SSD + pose-detection)

**Backend** — Node, Express 4, TypeScript, Mongoose 8 (MongoDB Atlas), JWT auth
(bcrypt), Zod validation, Razorpay + Stripe, Nodemailer, Multer

**Tooling** — Vitest + Supertest + mongodb-memory-server (backend), Playwright (frontend E2E)

## Project structure

```
Fitness/
├── Backend/                 Express + TypeScript API
│   ├── src/
│   │   ├── app.ts           Express app (no .listen — used by tests)
│   │   ├── server.ts        DB connect + listen
│   │   ├── routes/          auth, me, cycles, completions, wallet,
│   │   │                    payments, rewards, squads, integrations, support
│   │   ├── models/          Mongoose schemas + DTO mappers
│   │   ├── lib/             env, mailer, googleFit, tier helpers
│   │   └── middleware/      auth, error handling
│   └── test/                Vitest + Supertest (in-memory MongoDB)
├── Frontend/                React + Vite SPA
│   └── src/
│       ├── screens/         Home, Goals, Wallet, Rewards, Profile, Support, …
│       ├── hooks/           data hooks (the swap point: mock → API)
│       ├── lib/             api client, auth, photoVerify, charity, events
│       └── data/            mock data (used pre-auth only)
└── pencil-new.pen           Pencil design file
```

---

## Getting started

### Prerequisites

- Node.js 18+
- A MongoDB connection string (MongoDB Atlas free tier works)

### 1. Backend

```bash
cd Backend
npm install
cp .env.example .env        # then fill in MONGODB_URI and JWT_SECRET
npm run dev                 # starts on http://localhost:4000
```

### 2. Frontend

```bash
cd Frontend
npm install
cp .env.example .env        # VITE_API_BASE_URL defaults to localhost:4000
npm run dev                 # starts on http://localhost:5173
```

Open http://localhost:5173 and create an account.

> The app runs without payment/Google/SMTP keys — payments fall back to the demo
> credit, and email logs to the console. Add those keys only when you want the
> real integrations.

---

## Environment variables

### Backend (`Backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string (db name is set in code) |
| `JWT_SECRET` | ✅ | Long random string used to sign JWTs |
| `PORT` | — | API port (default `4000`) |
| `CORS_ORIGIN` | — | Comma-separated allowed origins (default localhost dev ports) |
| `JWT_EXPIRES_IN` | — | Token lifetime (default `7d`) |
| `STRIPE_SECRET_KEY` | — | Enables Stripe checkout |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook verification |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | — | Enables Razorpay orders |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Google Fit OAuth |
| `GOOGLE_REDIRECT_URI` | — | OAuth callback (default localhost) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | — | SMTP email; without these, email logs to console |
| `SMTP_FROM` | — | From-address for outgoing mail |
| `SUPPORT_INBOX` | — | Where the support form delivers (falls back to `SMTP_USER`) |

### Frontend (`Frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend base URL (default `http://localhost:4000`) |

---

## Scripts

### Backend

| Command | Description |
|---------|-------------|
| `npm run dev` | Run with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run the test suite (Vitest + Supertest) |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build |
| `npm run test:e2e` | Playwright end-to-end tests |

## Testing

Backend tests run fully offline against an in-memory MongoDB (`mongodb-memory-server`),
so no live database is needed:

```bash
cd Backend && npm test
```

---

## Deployment

The app is deploy-ready and host config is env-driven (`Backend/render.yaml`,
`Frontend/vercel.json` are included). Typical flow:

1. Push to GitHub.
2. **Backend → Render**: set the env vars above, deploy.
3. **Frontend → Vercel**: set `VITE_API_BASE_URL` to the Render URL, deploy.
4. After URLs exist: add the Render callback to Google OAuth authorized redirect
   URIs, set `CORS_ORIGIN` to the Vercel domain, and open the MongoDB Atlas IP
   allowlist.

> On free tiers, the backend sleeps after idle (first request is slow to wake) and
> uploaded proof photos sit on ephemeral disk (wiped on redeploy). Fine for a demo.

---

## Status

College capstone project — functional end-to-end (auth, cycles, real goal
verification, payments in test mode, rewards, squads, email). Not hardened for a
real-money production launch.
