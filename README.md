# 🗳️ School Election Management System

A complete, production-ready full-stack web application for running secure, transparent student government elections — from candidate registration to live results.

Built with **React + TypeScript + Tailwind CSS** (frontend) and **Node.js + Express + Prisma + PostgreSQL** (backend).

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Quick Start (Docker — Recommended)](#quick-start-docker--recommended)
6. [Upgrading an Existing Installation](#upgrading-an-existing-installation)
7. [Manual Setup (Without Docker)](#manual-setup-without-docker)
8. [Default Login Credentials](#default-login-credentials)
9. [Environment Variables](#environment-variables)
10. [Database Schema Overview](#database-schema-overview)
11. [How OTP Voting Works](#how-otp-voting-works)
12. [API Overview](#api-overview)
13. [Security Features](#security-features)
14. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
15. [Running Tests](#running-tests)
16. [Production Deployment Notes](#production-deployment-notes)
17. [Deploying to Railway](#deploying-to-railway)

---

## Features

- **Role-based access control** — Super Administrator, Election Administrator, Student/Voter
- **Secure authentication** — JWT access + refresh tokens, bcrypt hashing, password reset, rate limiting
- **OTP-gated voting** — admins generate a 15-minute, single-use one-time password per student; a student cannot access the ballot without a valid OTP entered at vote time
- **Dashboards** — live stats, voter turnout charts, recent activity feed
- **Election management** — multiple elections, Draft → Open → Paused/Closed → Archived lifecycle
- **Position management** — pick from a preset list of 12 standard positions (Prime Minister, Minister of Justice, Deputy Minister, Minister of Education, Minister of Defence, Minister of Health, Minister of Co-curricular Activities, Residential Minister, Minister of Sports and Entertainment, Minister of Time Management, Minister of Religious Affairs (Muslim/Christian)) or add custom ones — each position has a configurable **contestant slot limit** (enforced automatically when registering candidates) and a max-winners count
- **Candidate management** — registration, photo upload, manifesto, approval/rejection workflow, withdrawal
- **Voter management** — manual registration, CSV/Excel bulk import, eligibility toggle
- **Secure voting** — OTP required, one vote per voter per position, confirmation screen, duplicate-vote prevention, secret ballot (choices are never logged in cleartext audit trails)
- **Results** — automatic tallying, optional live results toggle, winner declaration, working print/PDF export (via browser print — sidebar/nav automatically hidden), CSV/Excel export, charts
- **Audit logs** — every administrative action, login, and OTP generation/verification is recorded; vote counts are logged without revealing individual choices
- **Announcements** — post election-wide or general announcements
- **Settings** — school profile, logo upload, election rules
- **Security** — Helmet, CORS, rate limiting, input validation, parameterized queries via Prisma (SQL-injection safe), password hashing, HTTPS-ready
- **Accessibility** — responsive design, keyboard-navigable forms, ARIA attributes on interactive elements

---

## Tech Stack

| Layer      | Technology                                  |
|------------|----------------------------------------------|
| Frontend   | React 18, TypeScript, Tailwind CSS, Zustand, Chart.js, React Router |
| Backend    | Node.js, Express, TypeScript                |
| Database   | PostgreSQL                                  |
| ORM        | Prisma                                      |
| Auth       | JWT (access + refresh tokens), bcrypt       |
| File Upload| Multer                                      |
| Containers | Docker, Docker Compose, Nginx (frontend serving) |

---

## Project Structure

```
school-election-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (all models)
│   │   └── seed.ts             # Sample seed data
│   ├── src/
│   │   ├── controllers/        # Route handlers / business logic
│   │   ├── middleware/         # Auth, validation, upload, error handling
│   │   ├── routes/             # Express route definitions
│   │   ├── utils/              # jwt, logger, prisma client, audit logging
│   │   └── index.ts            # App entry point
│   ├── uploads/                # Candidate photos, school logos (runtime)
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # Reusable Button, Modal, Input, Icons, etc.
│   │   │   ├── layout/         # Sidebar, Header, DashboardLayout, ProtectedRoute
│   │   │   └── charts/         # Chart.js wrapper components
│   │   ├── pages/
│   │   │   ├── auth/           # Login, Forgot/Reset Password
│   │   │   ├── admin/          # Dashboard, Elections, Candidates, Students, Results, Reports, Audit, Settings
│   │   │   └── student/        # Dashboard, Voting, Results, Candidacy, Profile
│   │   ├── services/           # Axios API service modules
│   │   ├── store/               # Zustand auth store
│   │   ├── types/               # Shared TypeScript types
│   │   └── App.tsx              # Routing
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .env.example
│   └── package.json
├── docker-compose.yml
├── .env.example                 # Used by docker-compose
└── README.md
```

---

## Prerequisites

**If using Docker (recommended):**
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (v2+)

**If running manually:**
- Node.js **v18+** (v20 recommended)
- PostgreSQL **v14+**
- npm v9+

---

## Quick Start (Docker — Recommended)

This spins up PostgreSQL, the backend API, and the frontend together.

```bash
# 1. Clone / unzip the project and move into it
cd school-election-system

# 2. Copy the root environment file and edit secrets
cp .env.example .env
# Edit .env and set strong values for JWT_SECRET and JWT_REFRESH_SECRET

# 3. Build and start everything
docker compose up --build -d

# 4. Run database migrations + seed sample data (first time only)
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

Once running:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Health check:** http://localhost:5000/health

To stop everything:
```bash
docker compose down
```

To stop and wipe the database:
```bash
docker compose down -v
```

---

## Upgrading an Existing Installation

If you already had this project running before the OTP voting and position-slot features were added, your database is missing the new `VotingOtp` table and the `maxContestants` column. Sync your database to the current schema:

```bash
docker compose exec backend npx prisma db push
```

That's it — no data is lost, and no reseed is required. Existing positions get `maxContestants` defaulted to `10`; adjust it per-position from **Elections → [election] → Positions** afterward if you'd like tighter limits.

*(Not using Docker? Run `cd backend && npx prisma db push` locally instead.)*

---

## Manual Setup (Without Docker)

### 1. Set up PostgreSQL

Create a database:
```sql
CREATE DATABASE school_election_db;
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/school_election_db"
JWT_SECRET="generate-a-long-random-string-here-min-32-chars"
JWT_REFRESH_SECRET="generate-another-long-random-string-here-min-32-chars"
```

Install dependencies and set up the database:
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

Start the backend in development mode:
```bash
npm run dev
```
The API will be running at `http://localhost:5000`.

### 3. Frontend Setup

Open a new terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm start
```
The app opens at `http://localhost:3000`.

### 4. Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the build/ folder with any static file server or Nginx
```

---

## Default Login Credentials

After running the seed script (`npm run prisma:seed`), the following accounts are available:

| Role              | Email                          | Password      |
|-------------------|----------------------------------|--------------|
| Super Admin       | `superadmin@school.edu`         | `Admin@123`  |
| Election Admin    | `electionadmin@school.edu`      | `Admin@123`  |
| Student (Voter)   | `james.wilson@school.edu`       | `Student@123`|
| Student (Voter)   | `sarah.johnson@school.edu`      | `Student@123`|

*(9 more student accounts are seeded — see `backend/prisma/seed.ts` for the full list. All students use password `Student@123`.)*

> ⚠️ **Change these credentials immediately in any real deployment.**

> 🔐 **Note:** Logging in is not enough to vote. A Super Admin or Election Admin must first generate a one-time password (OTP) for the student from **Admin → Voter OTP** (enter the student's email). The OTP is valid for 15 minutes and single-use — the student enters it on the voting page before their ballot unlocks. See [How OTP Voting Works](#how-otp-voting-works) below.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Secret for signing access tokens (32+ chars) | random string |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (32+ chars) | random string |
| `JWT_EXPIRES_IN` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (days) | `7` |
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Environment | `development` / `production` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |
| `FRONTEND_URL` | Used for password reset links | `http://localhost:3000` |
| `SMTP_HOST/PORT/USER/PASS` | Optional email config for real password-reset emails | — |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | API rate limiting | `900000` / `100` |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Backend API base URL, e.g. `http://localhost:5000/api` |
| `REACT_APP_UPLOADS_URL` | Base URL for uploaded files, e.g. `http://localhost:5000` |

---

## Database Schema Overview

Key Prisma models (see `backend/prisma/schema.prisma` for full detail):

- **User** — all accounts (admins & students), with `role` (`SUPER_ADMIN`, `ELECTION_ADMIN`, `STUDENT`)
- **Student** — voter-specific profile linked 1:1 to a `User` (admission number, class, stream, house, eligibility)
- **Election** — title, dates, `status` (`DRAFT`, `OPEN`, `PAUSED`, `CLOSED`, `ARCHIVED`), live-results toggle
- **Position** — belongs to an election, has `maxWinners` (candidates elected) and `maxContestants` (candidate slots available — enforced at registration time)
- **Candidate** — links a `Student` to a `Position` within an `Election`, with `status` (`PENDING`, `APPROVED`, `REJECTED`, `WITHDRAWN`)
- **Vote** — one row per (election, position, voter) — enforced via a unique constraint to prevent duplicate voting
- **VotingOtp** — one-time password issued by an admin to a specific student; has `code`, `expiresAt` (15 min from creation), `used` flag — consumed atomically when the student's vote is recorded
- **AuditLog** — records every admin action, login, and OTP generation/verification (never records *which candidate* a user voted for)
- **Announcement**, **Notification**, **School**, **RefreshToken** — supporting models

Run `npx prisma studio` (from `backend/`) to browse the database visually.

---

## How OTP Voting Works

1. An admin goes to **Voter OTP** in the sidebar, enters a student's email, and clicks **Generate OTP**.
2. The system creates a 6-digit code valid for **15 minutes**, tied to that specific student. It's shown once on the admin's screen — the admin then relays it to the student (verbally, in person, etc.).
3. Generating a new OTP for the same student automatically invalidates any earlier unused code for them, so only one is ever active at a time.
4. When the student opens **Vote**, they're first prompted to enter the OTP before the ballot appears.
5. On successful ballot submission, the OTP is marked **used** — it cannot be reused, even if time remains before it would have expired.
6. If the code expires or is entered incorrectly, the student is told to request a new one from an admin.

This adds a manual, in-person verification step on top of normal login — useful for schools that want an extra layer of control over exactly when and by whom votes are cast.

---

## API Overview

All endpoints are prefixed with `/api`. Authenticated routes require `Authorization: Bearer <accessToken>`.

| Resource | Base path | Notes |
|----------|-----------|-------|
| Auth | `/api/auth` | login, logout, refresh, me, forgot/reset/change password |
| Dashboard | `/api/dashboard` | `/admin` and `/student` variants |
| Elections | `/api/elections` | CRUD + `/status` transition endpoint |
| Positions | `/api/positions` | CRUD, scoped by `electionId`, supports `maxContestants` |
| Candidates | `/api/candidates` | register (multipart), approve/reject/withdraw — enforces position's `maxContestants` |
| Students | `/api/students` | CRUD, `/import` (CSV/Excel), `/eligibility` toggle |
| Votes | `/api/votes` | cast ballot (transactional, requires `otpCode`), voting status |
| OTP | `/api/otp` | `/generate` (admin), `/verify` (student), `/active` (admin list) |
| Results | `/api/results/:id` | tallies + winners, `/live-results` toggle |
| Audit | `/api/audit` | filterable log listing (admin only) |
| Settings | `/api/settings` | school profile + logo upload |
| Announcements | `/api/announcements` | CRUD |
| Notifications | `/api/notifications` | list, mark read |

A `GET /health` endpoint is available for uptime checks / container health probes.

---

## Security Features

- **Password hashing** with bcrypt (12 salt rounds)
- **JWT access + refresh tokens**, refresh token rotation on use, revocation on password reset
- **CSRF-safe pattern** — stateless bearer tokens (no cookies for auth), CORS locked to configured origin
- **XSS prevention** — React's default escaping, Helmet security headers
- **SQL injection protection** — all queries go through Prisma's parameterized query builder
- **Input validation** — `express-validator` on all mutating endpoints
- **Rate limiting** — global API limiter + stricter limiter on `/auth/login`
- **Duplicate vote prevention** — unique DB constraint on `(electionId, positionId, voterId)` plus application-level checks inside a transaction
- **Secret ballot** — audit logs record *that* a user voted, never *for whom*
- **HTTPS-ready** — deploy behind any TLS-terminating reverse proxy (Nginx, Caddy, a cloud load balancer)

---

## Common Issues & Troubleshooting

**"Can't reach database server" on backend start**
Make sure PostgreSQL is running and `DATABASE_URL` in `backend/.env` is correct. If using Docker, ensure the `postgres` service is healthy before the backend starts (docker-compose already waits for this).

**Prisma Client errors after pulling changes to `schema.prisma`**
Run:
```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

**CORS errors in the browser**
Confirm `CORS_ORIGIN` in `backend/.env` exactly matches the frontend origin (including port), and that `REACT_APP_API_URL` in `frontend/.env` points to the running backend.

**File uploads not showing (photos/logos broken images)**
Confirm `REACT_APP_UPLOADS_URL` points to the backend's base URL (not `/api`) and that the backend's `uploads/` directory is writable (Docker: check the `backend_uploads` volume is mounted).

**"Too many login attempts" while testing**
The `/auth/login` endpoint is rate-limited to 10 attempts / 15 minutes per IP. Wait, or adjust `RATE_LIMIT_MAX` / restart the backend in development.

**Port already in use**
Change `PORT` (backend) or the `ports:` mapping in `docker-compose.yml`, and update the corresponding frontend env var.

---

## Running Tests

```bash
cd backend
npm test
```

Jest is configured and ready for unit/integration tests (`*.test.ts` files are auto-excluded from the TypeScript build). Add tests under `backend/src/**/__tests__` or alongside modules as `*.test.ts`.

---

## Production Deployment Notes

1. **Always change** `JWT_SECRET`, `JWT_REFRESH_SECRET`, and all seeded default passwords before going live.
2. Put the backend and frontend behind HTTPS (e.g., via Nginx/Caddy/your cloud provider's load balancer with a TLS certificate).
3. Set `NODE_ENV=production` for the backend.
4. Point `DATABASE_URL` at a managed/production PostgreSQL instance with backups enabled.
5. Configure real SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) so password-reset emails actually send — in development mode the reset link is returned directly in the API response for convenience.
6. Mount persistent storage for the `uploads/` directory (already handled via the `backend_uploads` Docker volume) or move to an object storage service (S3, etc.) for multi-instance deployments.
7. Review and tighten `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` for your expected traffic.

---

## Deploying to Railway

Want to host this on the internet without managing your own server? See the dedicated step-by-step guide:

**[→ RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)**

It covers creating the Postgres/backend/frontend services, environment variables, connecting them together, seeding data, and troubleshooting — written for someone deploying for the first time.

---

## License

This project is provided as-is for educational and institutional use. Adapt freely for your school's needs.
