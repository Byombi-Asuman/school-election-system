# Fixing the Railway 502 / "Network Error" issue

## What was actually wrong

Your repo had **no `backend/prisma/migrations` folder** — only `schema.prisma`.

Your `backend/Dockerfile` starts the container with:

```
npx prisma migrate deploy && node dist/index.js
```

`prisma migrate deploy` **only applies migration files that already exist** — it does
not generate your tables from `schema.prisma` on its own. With zero migrations
committed to the repo, your Railway Postgres database never got its tables
created (no `User`, `Election`, `Vote`, etc.). Depending on your exact Postgres
plugin state, that step can also fail outright, which makes the container exit
immediately after boot.

That's why:
- Visiting the backend's Railway URL directly showed **Railway's own 502 page**
  — the container wasn't staying up / listening at all.
- The frontend showed **"Network Error"** on login — the browser never got a
  response back from the backend, which is a different failure mode than a
  401/CORS error.

## What I fixed in this zip

1. **Added `backend/prisma/migrations/20250115000000_init/migration.sql`** — a
   complete initial migration with every table, enum, index, and foreign key
   from your `schema.prisma`. I applied it against a real local Postgres 16
   instance to confirm it runs cleanly end-to-end before including it here.
2. **Added `backend/prisma/migrations/migration_lock.toml`** (required by
   Prisma to track the provider).
3. **Added `app.set('trust proxy', 1)`** in `backend/src/index.ts` — Railway
   sits behind a reverse proxy, and without this, request IPs (used by rate
   limiting and audit logs) are read incorrectly.
4. **Added `backend/railway.json`** to make the build/start behavior explicit
   (Dockerfile builder, `/health` healthcheck, restart policy) so Railway
   can't mis-detect how to build or start the service.

With the migration in place, `prisma migrate deploy` will now actually create
your schema in the Railway Postgres database the first time the container
boots, and every deploy after that will just report "no pending migrations."

## Steps to redeploy on Railway

1. **Push this updated code** to the GitHub repo your Railway backend service
   is connected to (or redeploy from this zip).
2. On the **backend service** in Railway, confirm:
   - **Settings → Root Directory** is set to `backend`.
   - A **PostgreSQL** database is attached to the project.
   - **Variables** include:
     | Variable | Value |
     |---|---|
     | `DATABASE_URL` | Reference to `${{Postgres.DATABASE_URL}}` (click "Add Reference" and pick your Postgres plugin — don't hardcode it) |
     | `JWT_SECRET` | any random 32+ char string |
     | `JWT_REFRESH_SECRET` | a different random 32+ char string |
     | `JWT_EXPIRES_IN` | `15m` |
     | `JWT_REFRESH_EXPIRES_IN` | `7d` |
     | `CORS_ORIGIN` | your **exact** frontend Railway URL, e.g. `https://your-frontend.up.railway.app` (no trailing slash) |
     | `FRONTEND_URL` | same as `CORS_ORIGIN` |
     | `NODE_ENV` | `production` |
   - Do **not** set `PORT` manually — Railway injects it automatically and the
     app already reads `process.env.PORT`.
3. **Redeploy** the backend service and watch the **Deploy Logs** tab. You
   should see:
   ```
   Applying migration `20250115000000_init`
   ...
   🚀 Server running on port XXXX in production mode
   ```
4. On the **frontend service**, confirm its build args/variables point at the
   backend's public URL:
   - `REACT_APP_API_URL=https://your-backend.up.railway.app/api`
   - `REACT_APP_UPLOADS_URL=https://your-backend.up.railway.app`
   (these are baked in at build time for this CRA app, so you must **rebuild**
   the frontend after changing them — just changing the variable isn't enough.)
5. Visit `https://your-backend.up.railway.app/health` directly — it should
   return `{"status":"ok", ...}` instead of Railway's 502 page.
6. Try logging in again from the frontend.

## One more thing: you need a super admin account

The migration creates empty tables — no users exist yet, so login will fail
with "Invalid credentials" (a normal 401, not a network error) until you seed
one. Easiest way, using the [Railway CLI](https://docs.railway.app/guides/cli):

```bash
railway login
railway link            # select this project
railway service         # select the backend service
railway run npm run prisma:seed
```

This creates a default super admin: `superadmin@school.edu` / `Admin@123`
(and a demo election admin / student — see `backend/prisma/seed.ts`).
**Change these passwords immediately after first login.**

## If it still shows 502 after this

Open the backend service's **Deploy Logs** on Railway and check for:
- `Can't reach database server` → `DATABASE_URL` isn't set/linked correctly.
- Any error before `🚀 Server running on port...` → the process is crashing on
  boot; the exact error message will tell us what's missing (usually a missing
  env var).
- If the log never even starts (no build output) → the Root Directory or
  Dockerfile path setting on the Railway service is wrong.

Feel free to paste the deploy log output back and I can pinpoint it exactly.
