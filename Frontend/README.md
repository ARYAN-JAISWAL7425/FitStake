# FitStake — Frontend

Capstone-quality React frontend for FitStake, the B2C habit-accountability app. Mobile-first, mirrors the v4 design in `pencil-new.pen`.

## Run

```bash
npm install      # only the first time
npm run dev      # starts at http://localhost:5173
```

`npm run build` compiles for production into `dist/`.

## Stack

- **Vite 5** + **React 18** + **TypeScript 5**
- **Tailwind CSS 3** (Forest Sage palette wired into `tailwind.config.js`)
- **React Router 6**
- **lucide-react** for icons (same set as the .pen file)
- **Inter** + **Geist Mono** via Google Fonts

## Structure

```
src/
├── main.tsx                  React entry
├── App.tsx                   Router + PhoneFrame wrapper
├── index.css                 Tailwind directives + base
├── lib/
│   ├── tokens.ts             Forest Sage palette + radii (TS constants)
│   └── routes.ts             Route map
├── data/
│   └── mock.ts               Sample user, cycle, goals, transactions, squad
├── hooks/                    ← swap-point for real backend (see below)
│   ├── useUser.ts
│   ├── useCycle.ts
│   └── useRewards.ts
├── components/               Reusable UI (no data dependencies)
│   ├── PhoneFrame.tsx        390x844 wrapper, full-bleed on mobile
│   ├── StatusBar.tsx         9:41 + signal/wifi/battery
│   ├── TabBar.tsx            Home / Goals / Rewards / Profile
│   ├── CycleRing.tsx         SVG donut ring used by Home + CycleComplete + Missed
│   ├── Button.tsx            Primary lime / dark / ghost / outline
│   └── IconButton.tsx        Round icon-only button
└── screens/                  One file per .pen frame
    ├── Onboarding.tsx
    ├── Home.tsx
    ├── Goals.tsx
    ├── Wallet.tsx
    ├── Rewards.tsx
    ├── Profile.tsx
    ├── PlanReview.tsx          ← happy path
    ├── PlanReviewWarning.tsx   ← "plan too easy" variant
    ├── CycleComplete.tsx       ← success state
    ├── Missed.tsx              ← failure state
    └── Group.tsx               ← squad leaderboard
```

## Routes

| Path | Screen |
|---|---|
| `/` | Onboarding |
| `/home` | Home |
| `/goals` | Goals |
| `/wallet` | Wallet |
| `/rewards` | Rewards |
| `/profile` | Profile |
| `/plan-review` | PlanReview (happy path) |
| `/plan-review/too-easy` | PlanReviewWarning |
| `/cycle-complete` | CycleComplete |
| `/missed` | Missed |
| `/group` | Group |

The tab bar (visible on Home / Goals / Rewards / Profile) navigates between the 4 primary destinations.

## Adding a backend later — the swap-point

All data flows through `src/hooks/`. Screens never import from `src/data/mock.ts` directly. When you add a real backend:

1. **Keep** the hook files. Their public API (function names + return shapes) is the contract every screen depends on.
2. **Replace** the body of each hook with real `fetch`. Example:

```ts
// hooks/useUser.ts — BEFORE (mock)
import { mockUser } from '../data/mock';
export function useUser() {
  return mockUser;
}

// hooks/useUser.ts — AFTER (real backend)
import { useState, useEffect } from 'react';
export function useUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch('/api/user', {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(setUser);
  }, []);
  return user;
}
```

3. **Delete** `src/data/mock.ts` once no hook imports from it.

Screens stay untouched. The folder is the architectural seam.

## Design tokens

Forest Sage palette (matches the .pen variables exactly):

| Token | Hex |
|---|---|
| `surface-primary` | `#F5F3EE` (cream backgrounds) |
| `surface-secondary` | `#C8DBBC` (sage accent cards) |
| `surface-inverse` | `#1B3A28` (dark hero surfaces) |
| `surface-card` | `#FFFFFF` (standard card) |
| `fg-primary` | `#1B3A28` |
| `fg-secondary` | `#4A6B52` |
| `fg-muted` | `#7A9A80` |
| `fg-inverse` | `#FFFFFF` |
| `accent-primary` | `#2D5E3A` |
| `accent-lime` | `#C8FF6B` (primary CTA) |
| `accent-money` | `#3FA85C` (positive deltas) |
| `warning` | `#E07B3C` (misses / at-risk) |
| `border-soft` | `#E5E0D6` |

Use them via Tailwind classes like `bg-surface-primary`, `text-accent-lime`, `border-border-soft`.

## What this prototype does NOT do

- No authentication (every screen renders the same sample user)
- No real payment / escrow integration
- No real verification (Apple Health / Google Fit / GPS) — goal progress is static
- No persistence (refresh resets state)
- No animations beyond Tailwind defaults

These are intentional — they're the items that get added when you wire the backend layer.

## Notes

- Mobile-first: looks like a phone on a phone. On desktop, the app renders inside a 390×844 phone frame centered on the page.
- Tab bar at the bottom appears only on the 4 main screens (Home / Goals / Rewards / Profile). Resolution screens (CycleComplete, Missed, PlanReview) and modals don't show it.
- Cycle ring is rendered as SVG (cleaner than CSS `conic-gradient` and matches the .pen visual most closely).

## Capstone story this enables

1. **Onboarding** — pitch ("stake on yourself; we never take a cent from your stake")
2. **PlanReview happy path** — commitment moment ("here's exactly what happens win/lose")
3. **PlanReview warning** — anti-exploit gate ("plan too easy" check)
4. **Home** — daily-use loop with cycle ring + freeze counter
5. **CycleComplete** — happy ending (stake returned + FP earned, no platform-paid reward)
6. **Missed** — sad-but-fair ending (full stake to GiveIndia, still earned FP for showing up)
7. **Rewards** — where FitStake actually makes money (brand commission on redemption)
8. **Group** — social motivation, no prizes

Walk these in order and you've told the whole product story.
