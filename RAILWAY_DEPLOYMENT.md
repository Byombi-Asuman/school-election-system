# 🚂 Deploying to Railway — Step by Step

This guide walks you through hosting the School Election Management System on [Railway](https://railway.app), a platform that can run your PostgreSQL database, backend API, and frontend all in one project.

You do **not** need Docker for this — Railway builds each service directly from your code.

---

## What you'll end up with

Three Railway services inside one project:
1. **PostgreSQL** — managed database (Railway provisions this for you)
2. **backend** — your Node/Express API
3. **frontend** — your React app, served as a static site

---

## Prerequisites

- A [Railway account](https://railway.app) (free to sign up; you may need to add a payment method for usage beyond the free trial credits)
- Your project pushed to a **GitHub repository** (Railway deploys from GitHub — this is the easiest path)
- The [Railway CLI](https://docs.railway.app/guides/cli) is optional but handy — install with `npm install -g @railway/cli` if you want it

### Push the project to GitHub first (if you haven't already)

```bash
cd school-election-system
git init
git add .
git commit -m "Initial commit"
```

Create a new empty repository on GitHub (via github.com → New repository — don't initialize with a README), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/school-election-system.git
git branch -M main
git push -u origin main
```

---

## Step 1: Create a new Railway project

1. Go to **https://railway.app/new**
2. Click **"Deploy from GitHub repo"**
3. Authorize Railway to access your GitHub account if prompted
4. Select your `school-election-system` repository

Railway will try to auto-detect a service from the repo root — since this repo has both `backend/` and `frontend/` folders, **delete that auto-created service** for now (click it → Settings → Delete Service). We'll add each service manually with the correct root directory below.

---

## Step 2: Add PostgreSQL

1. Inside your Railway project, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway provisions a Postgres instance automatically and gives it a `DATABASE_URL` variable — you'll reference this in the backend service next.

---

## Step 3: Add the backend service

1. Click **"+ New"** → **"GitHub Repo"** → select your repo again
2. Once created, click into the new service → **Settings** tab
3. Under **"Root Directory"**, set it to:
   ```
   backend
   ```
4. That's it for build/start configuration — this project already includes a `backend/railway.json` file that tells Railway exactly how to build and run the service (see below for what it contains). Railway automatically detects and uses it.

**`backend/railway.json`** *(already included in this project — no need to create it yourself)*
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npx prisma generate && npm run build"
  },
  "deploy": {
    "startCommand": "npx prisma db push --skip-generate && node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

This means the database schema is automatically synced on every deploy — you generally won't need to run `prisma db push` manually. The only manual step left is **seeding sample data**, which only makes sense to run once (see Step 6).

### Set backend environment variables

In the backend service → **Variables** tab, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Click "Add Reference" → select your Postgres service's `DATABASE_URL` (this links them automatically) |
| `JWT_SECRET` | A long random string — generate one with `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Another long random string, different from above |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `CORS_ORIGIN` | *(fill in after Step 4, once you have your frontend URL)* |
| `FRONTEND_URL` | *(same as CORS_ORIGIN, fill in after Step 4)* |
| `RATE_LIMIT_WINDOW_MS` | `900000` |
| `RATE_LIMIT_MAX` | `200` |

Click **Deploy** (or it will auto-deploy after you save variables).

### Get your backend's public URL

Go to the backend service → **Settings** → **Networking** → click **"Generate Domain"**. Railway gives you a URL like:
```
https://backend-production-xxxx.up.railway.app
```
Copy this — you'll need it for the frontend.

---

## Step 4: Add the frontend service

1. Click **"+ New"** → **"GitHub Repo"** → select your repo again
2. Click into the new service → **Settings**
3. Set **Root Directory** to:
   ```
   frontend
   ```
4. Set **Build Command**:
   ```
   npm install && npm run build
   ```
5. Set **Start Command** — the simplest reliable option is to serve the build with a static server:
   ```
   npx serve -s build -l $PORT
   ```
   Railway automatically provides a `$PORT` variable at runtime — no need to set it yourself.

   > `serve` isn't in `package.json` yet — Railway will install it on the fly via `npx`, so no code changes are needed. If you'd rather pin it, add `"serve": "^14.2.1"` to `frontend/package.json` dependencies.

### Set frontend environment variables

In the frontend service → **Variables** tab, add:

| Variable | Value |
|---|---|
| `REACT_APP_API_URL` | `https://backend-production-xxxx.up.railway.app/api` (your backend URL from Step 3 + `/api`) |
| `REACT_APP_UPLOADS_URL` | `https://backend-production-xxxx.up.railway.app` (same backend URL, no `/api`) |

> ⚠️ **Important:** React environment variables are baked in at **build time**, not runtime. If you change these later, you must trigger a new deploy (Railway does this automatically if you edit variables and redeploy).

### Get your frontend's public URL

Same as before: **Settings** → **Networking** → **"Generate Domain"**. You'll get something like:
```
https://frontend-production-xxxx.up.railway.app
```

---

## Step 5: Connect the two — update CORS

Now go back to the **backend** service → **Variables**, and set:

| Variable | Value |
|---|---|
| `CORS_ORIGIN` | `https://frontend-production-xxxx.up.railway.app` (your frontend URL from Step 4) |
| `FRONTEND_URL` | same value as above |

Save — this triggers a backend redeploy automatically.

---

## Step 6: Seed sample data (optional, first deploy only)

Since `railway.json` already runs `prisma db push` automatically on every backend deploy, your database tables will exist as soon as the first deploy succeeds — no manual schema step needed.

If you'd like the sample elections, candidates, and demo accounts from `prisma/seed.ts`, install the Railway CLI and run the seed once:

```bash
npm install -g @railway/cli
railway login
railway link
```
Select your project and the **backend** service when prompted, then:
```bash
railway run --service backend npm run prisma:seed
```

You should see `✅ Seeding completed!` printed with the default login credentials.

> Skip this step entirely if you'd rather start with a completely empty database and register your real school's admins/students from scratch via the UI.

---

## Step 7: Open your live site

Visit your frontend URL:
```
https://frontend-production-xxxx.up.railway.app
```

Log in with the seeded credentials (same as local dev):

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@school.edu` | `Admin@123` |
| Election Admin | `electionadmin@school.edu` | `Admin@123` |
| Student | `james.wilson@school.edu` | `Student@123` |

> ⚠️ Change these before letting real students use the system — see [Production Deployment Notes](#post-launch-checklist) below.

---

## Redeploying after code changes

Just `git push` to your connected branch — Railway rebuilds and redeploys both services automatically, including syncing any Prisma schema changes (since `db push` runs on every backend startup). No manual steps needed for normal changes.

---

## Post-launch checklist

- [ ] Change `JWT_SECRET` and `JWT_REFRESH_SECRET` to freshly generated values (don't reuse local dev secrets)
- [ ] Change or remove the seeded default admin/student passwords
- [ ] Set up a **custom domain** if desired: Service → Settings → Networking → "Custom Domain"
- [ ] Configure real SMTP variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) on the backend so password-reset emails actually send
- [ ] Consider Railway's **volumes** feature if you need persistent storage for uploaded candidate photos/logos beyond the container's ephemeral filesystem — attach a volume mounted at `/app/uploads` on the backend service (Settings → Volumes)

---

## Troubleshooting

**Backend crashes on deploy with a Prisma error**
Check the deploy logs (Service → Deployments → click the failed deploy → View Logs). Most often this means `DATABASE_URL` isn't linked correctly — go to backend → Variables and confirm it's referencing the Postgres service, not typed in manually.

**Frontend loads but API calls fail (network error in browser console)**
Double-check `REACT_APP_API_URL` was set **before** the last build (these are baked in at build time). If you changed it after building, trigger a fresh deploy: Service → Deployments → "Redeploy".

**CORS errors in the browser console**
Confirm `CORS_ORIGIN` on the backend exactly matches your frontend's Railway domain, including `https://` and no trailing slash.

**Uploaded photos/logos disappear after a redeploy**
Railway's default filesystem is ephemeral — files written to disk (like `backend/uploads/`) don't survive a new deploy. Add a persistent **Volume** on the backend service mounted at `/app/uploads` (Settings → Volumes → New Volume) to fix this.

**"relation does not exist" errors after deploy**
This shouldn't normally happen since `railway.json` runs `prisma db push` on every startup, but if it does, run it manually:
```bash
railway run --service backend npx prisma db push
```
