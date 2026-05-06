# CaloryTracker

A production-ready calorie tracker with food logging, weight, workouts, and a 30-day analytics dashboard. Built with **Next.js 14 (App Router) + TypeScript + Supabase + Tailwind**.

## Features

- Email/password auth + Google OAuth (server actions, secure cookies)
- Daily dashboard: calorie ring, macro bars, today's meals, quick stats
- Food logging by **search** (shared catalog with seed) or **custom entry** (saves to your private foods)
- Weight tracking with trend chart and editable history
- Workout logging (strength, cardio, HIIT, yoga, sports, other) with notes
- 30-day analytics: calories vs target, calories burned, stacked daily macros, weight delta
- Profile & goals with **auto-suggest targets** from Mifflin-St Jeor BMR + activity factor
- **Conversational logging** — a floating Claude-powered chat widget. Type "2 eggs and toast for breakfast" or "ran 5k in 28 min" and the bot logs it for you (with one-tap undo)
- Mobile-first responsive layout (bottom tab bar on mobile, sidebar on desktop)
- Row-Level Security on every user-owned table — users can only see their own data
- Loading skeletons, empty states, toasts, accessible forms

## Project structure

```
calorytracker/
├── README.md
├── .env.example
├── package.json
├── tailwind.config.ts
├── next.config.mjs
├── postcss.config.mjs
├── tsconfig.json
├── supabase/
│   └── schema.sql                 # full schema + RLS + seed
└── src/
    ├── middleware.ts              # auth gate
    ├── actions/                   # server actions (auth, food, weight, workouts, profile)
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── page.tsx               # public landing
    │   ├── auth/callback/route.ts # OAuth code exchange
    │   ├── (auth)/                # /login, /register
    │   └── (app)/                 # /dashboard, /food, /weight, /workouts, /analytics, /settings
    ├── components/
    │   ├── ui/                    # button, input, card, dialog, toast
    │   ├── nav/                   # sidebar, mobile-nav
    │   └── widgets/               # calorie-ring, macro-bar, empty-state, skeleton
    ├── lib/
    │   ├── supabase/              # browser/server/middleware clients
    │   ├── utils.ts               # cn, todayISO, BMR/TDEE
    │   └── validations.ts         # zod schemas
    └── types/database.ts
```

## Setup

### 1. Install
```bash
npm install
```

### 2. Create a Supabase project
1. Go to <https://supabase.com> → New project. Pick the closest region.
2. **Settings → API**: copy `Project URL` and `anon public` key.
3. **Authentication → Providers**: enable Email; enable Google if you want OAuth.
   - Set the **Site URL** to `http://localhost:3000` for dev.
   - Add `http://localhost:3000/auth/callback` as a redirect URL.
4. **SQL editor → New query**: paste the contents of [supabase/schema.sql](supabase/schema.sql) and run.
   This creates all tables, RLS policies, the auto-profile trigger, and seeds ~15 foods.

### 3. Configure env
```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# fill in GEMINI_API_KEY if you want the chat assistant (otherwise leave blank)
```

For the chatbot, grab a key from <https://aistudio.google.com/apikey>. Without it the chat widget still renders but `/api/chat` will return a 500 with a clear error message.

### 4. Run
```bash
npm run dev
# → http://localhost:3000
```
Sign up with email + password. A row in `public.profiles` is created automatically by the `on_auth_user_created` trigger.

If you want users to skip email confirmation in development, **Authentication → Providers → Email** → uncheck "Confirm email".

## Database schema (overview)

| Table | Purpose | RLS |
|---|---|---|
| `profiles` | 1:1 with `auth.users`, holds goals & targets | self read/write |
| `foods` | Shared catalog + private custom foods | read public-or-own; insert/update own |
| `food_logs` | Daily meal entries with macro snapshot | self only |
| `weight_logs` | One weigh-in per user per day (unique) | self only |
| `workouts` | Sessions with type, duration, calories burned | self only |
| `workout_sets` | Optional per-exercise rows (table created, UI not yet exposed) | self only via parent |
| `daily_totals` view | Sum of food_logs per day | inherits RLS |

The `food_logs` table stores **denormalized macros** (`food_name`, `calories`, etc.) so historical entries are stable even if the parent food row is later edited or deleted.

## Generating typed client (optional)

The hand-written types in `src/types/database.ts` are minimal. For full coverage:
```bash
npx supabase gen types typescript --project-id YOUR_ID > src/types/database.ts
```

## Chat assistant

Mounted as a floating button in the app shell ([src/components/chat/chat-widget.tsx](src/components/chat/chat-widget.tsx)) and backed by [src/app/api/chat/route.ts](src/app/api/chat/route.ts).

**How it works.** The route uses the Google Gen AI SDK with **Gemini 2.5 Flash** and function calling. It exposes 5 tools to the model:

| Tool | What it does |
|---|---|
| `search_foods` | Looks up the shared catalog before estimating |
| `log_food` | Inserts into `food_logs` |
| `log_workout` | Inserts into `workouts` |
| `log_weight` | Upserts `weight_logs` (one per day) |
| `get_today_summary` | Returns the user's targets + today's running totals |

Each turn streams text parts to the client; tool calls execute server-side against Supabase under the **same RLS context as the logged-in user** (so the bot can only ever read or write that user's data). Confirmed entries render as cards in the chat with a one-tap **Undo** button. Conversation history is kept client-side (last 20 messages); a system instruction + a per-request context block (today's date, user targets, current totals) keep the model grounded.

**Costs.** Roughly $0.0001–$0.001 per typical logging exchange on Gemini 2.5 Flash. To switch models, change the `MODEL` constant at the top of [src/app/api/chat/route.ts](src/app/api/chat/route.ts) — `gemini-2.5-pro` for higher accuracy at ~10× cost, `gemini-2.5-flash-lite` for the cheapest option.

**Safety.** The model never sees the user's API keys, password, or cross-user data. RLS on the Supabase tables is the actual security boundary; the LLM is just a typing assistant. If a tool call fails validation (zod), an `error` field is returned in the function response so the model can retry or apologize gracefully.

## Notes & assumptions

- **No Stitch screenshots were attached to the build prompt**, so the visual language was inferred from common calorie-tracker conventions: dark theme, rounded cards, green primary accent, calorie ring + horizontal macro bars, bottom tab bar on mobile. All colors live in [tailwind.config.ts](tailwind.config.ts) — swap them to match your real Stitch tokens with no code changes.
- Calories/macros for catalog foods are **per gram of `serving_size_g`**, multiplied by `servings` at log time. The UI quantizes servings to 0.25 increments.
- Target suggestions in Settings use **Mifflin-St Jeor** with the user's latest weight when present (falling back to 70 kg). Weight is intentionally not editable in Settings — it lives on the Weight page where the trend matters.
- Google OAuth assumes the redirect URL `${NEXT_PUBLIC_SITE_URL}/auth/callback` is whitelisted in Supabase. If it isn't, the user lands on `/login?error=oauth`.

## Suggested next features (for retention & usability)

These were intentionally left out to keep the MVP shippable, but slot cleanly into the schema:

1. **Streaks & gentle nudges** — show a "you've logged 4 days in a row" chip; quietly remind at the user's usual log time.
2. **Voice input for the chat** — wire `MediaRecorder` + Anthropic's audio support (or Whisper) so users can speak meals while cooking instead of typing.
3. **Recipes** — a `recipes` table that bundles foods with a yield; logging a recipe inserts a single `food_logs` row with summed macros.
4. **Quick-add favorites** — top 5 most-used foods pinned to the food log, server-side aggregated.
5. **Weekly summary email** — Supabase scheduled edge function reading `daily_totals` and sending a digest.
6. **Progressive Web App** — `manifest.json` + service worker; the layout is already mobile-friendly.
7. **Data export** — one-click CSV/JSON of all logs for the user, served from a route handler.
8. **Goal pacing** — given current `weight_logs` slope, project ETA to target weight; warn if eating below 1.0 g/kg protein on a deficit.
9. **Workout sets UI** — the `workout_sets` table already exists; a guided "log set → log set → finish" flow for strength training.
10. **Apple Health / Google Fit** sync for steps and resting calories.

## Scripts

```bash
npm run dev         # local dev
npm run build       # production build
npm start           # serve build
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
```

## License

MIT — adapt freely.
