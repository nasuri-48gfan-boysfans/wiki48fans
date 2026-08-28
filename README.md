# 48FansWiki

The Phase 1 foundation for 48FansWiki: a bright fan community product with mandatory authentication, a protected application shell, role and permission contracts, and reusable UI primitives.

## Run locally

```bash
npm install
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`. In a second terminal, run the backend:

```bash
cd backend
npm install
npm run dev
```

The API runs on `http://localhost:8787`.

Authentication uses Supabase Auth. The API has a separate server-only Supabase client for trusted operations and a MongoDB connection reserved for live tracking data.

## Environment

Copy `.env.example` to `.env.local` when backend integration begins. Browser-safe Supabase values use the `VITE_` prefix. Service-role, database, tracker, and payment credentials are server-only and must never be prefixed with `VITE_` or committed.

## Project structure

- `frontend/`: Vite React application for Vercel
- `backend/`: Express API for Railway
- `supabase/`: database migrations run in Supabase SQL Editor
- `.env.local`: local environment values at the repository root

Vercel Root Directory must be `frontend`. Railway Root Directory must be `backend`. Do not choose `src` or `server` as a deployment root.

## Foundation structure

- `src/components`: reusable Button, Badge, Avatar, Window, Navigation, and Mascot components
- `src/lib/auth.ts`: replaceable auth adapter boundary used by the route guard
- `src/lib/permissions.ts`: role-to-permission foundation for backend authorization
- `src/lib/groupTheme.ts`: centralized 48 Group accent tokens
- `src/types/auth.ts`: profile, session, and role contracts

## Database direction

The first Supabase migration is in `supabase/migrations/0001_foundation.sql`. Run it from **Supabase Dashboard -> SQL Editor** before using database-backed pages. It creates roles, profiles, groups, members, RLS policies, and the registration trigger. Supabase/PostgreSQL will own profiles, roles, memberships, wiki data, community data, and notifications. MongoDB is configured through `server/mongodb.ts` for live sessions, viewer snapshots, statistics, and tracker logs.

After starting the API, check `http://localhost:8787/api/health` and `http://localhost:8787/api/health/supabase`.

## Deployment configuration

### Vercel frontend

Import this repository into Vercel and set **Root Directory** to `frontend`. The included `frontend/vercel.json` uses the Vite build and rewrites SPA routes to `index.html`. Add these Vercel environment variables for **Production, Preview, and Development**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` with the Railway public URL

Do not add server-only secrets to Vercel frontend variables.

### Railway backend

Create a Railway service from this repository and set **Root Directory** to `backend`. The included `backend/railway.toml` builds and starts the API and monitors `/api/health`. Add these variables in Railway:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MONGODB_URI`
- `CLIENT_ORIGIN` with the Vercel URL
- `PORT` is supplied by Railway automatically; the server supports it

Railway uses `npm run build` and `npm start` from `backend/`.

### Supabase database and Auth

Run `supabase/migrations/0001_foundation.sql` in the Supabase SQL Editor. Configure the Auth email provider and add the Vercel URL plus local URL to **Authentication -> URL Configuration -> Redirect URLs**.

### MongoDB live tracker

Create a MongoDB Atlas database user, restrict Network Access to the Railway service as appropriate, and place the Atlas connection string in Railway as `MONGODB_URI`. The backend reserves the `wiki48fans_live` database for `live_sessions`, `live_events`, `viewer_snapshots`, `live_statistics`, and `tracking_logs`.

### UptimeRobot

Create an HTTPS monitor pointing to the Railway URL plus `/api/health`, for example `https://your-service.up.railway.app/api/health`. Use a 5-minute interval. Expect HTTP `200` and the JSON response field `ok: true`. Keep the monitor on the backend health endpoint, not the Vercel frontend.

The browser uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never put `SUPABASE_SERVICE_ROLE_KEY`, database passwords, MongoDB credentials, or payment secrets in client code.

## Known limitations

Email delivery, email verification, password reset, Supabase persistence, backend authorization, and real live data are placeholders for the next implementation phases. The `/verify-email` screen is a development flow only and does not verify a token.

Next step: connect Supabase Auth and replace the local adapter while preserving the existing route and profile contracts.
