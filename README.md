# HabitLoop 🔥

> A full-stack habit-tracking application with real-time updates, social features, leaderboards, and background job processing.

**🌍 Live Demo:** [https://habit-loop-ten.vercel.app](https://habit-loop-ten.vercel.app)

[![CI/CD Pipeline](https://github.com/idaemrot/HabitLoop/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/idaemrot/HabitLoop/actions/workflows/ci-cd.yml)

---

## Tech Stack

| Layer | Technology | Hosting / Provider |
|-------|-----------|--------------------|
| **Frontend** | React 18 + Vite + Tailwind CSS + React Router v6 | [Vercel](https://vercel.com) |
| **Backend** | Node.js 20 + Express + Prisma ORM + Zod | [Render](https://render.com) (Free Tier) |
| **Database** | PostgreSQL 16 | [Neon Serverless](https://neon.tech) |
| **Cache / Queue** | Redis 7 + BullMQ | [Upstash](https://upstash.com) |
| **Workers** | BullMQ (streak, notifications, leaderboard, cron) | Runs in-process on Render |
| **Real-time** | Socket.IO | Render |
| **Auth** | JWT + httpOnly refresh token cookies | — |
| **CI/CD** | GitHub Actions | GitHub |

---

## Project Structure

```
HabitLoop/
├── frontend/               # React + Vite SPA
│   ├── src/
│   │   ├── pages/          # Route-level components
│   │   ├── components/     # Shared UI components
│   │   ├── store/          # Auth context
│   │   ├── hooks/          # Custom React hooks
│   │   └── api/            # Axios client
│   ├── Dockerfile          # Multi-stage: dev → build → nginx
│   └── nginx.conf          # SPA fallback + /api proxy
│
├── backend/                # Express REST API + Socket.IO
│   ├── src/
│   │   ├── routes/         # Express routers
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── middlewares/    # Auth, validation, error handling
│   │   ├── jobs/           # BullMQ queues + workers
│   │   ├── sockets/        # Socket.IO event handlers
│   │   ├── config/         # DB, Redis, env config
│   │   ├── index.ts        # API server entry point
│   │   └── worker.ts       # Standalone worker entry point
│   ├── prisma/             # Schema + migrations + seed
│   ├── Dockerfile          # Multi-stage: deps → build → production
│   └── worker.Dockerfile   # Dedicated worker image
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml       # PR checks + main branch Docker builds
│
├── docker-compose.yml      # All 5 services orchestration
├── .env.example            # Environment variable template
└── README.md
```

---

## Services

| Container | Image | Port | Description |
|-----------|-------|------|-------------|
| `postgres` | `postgres:16-alpine` | 5432 | Primary database with persistent volume |
| `redis` | `redis:7-alpine` | 6379 | BullMQ job queue + session cache |
| `backend` | `habitloop-backend` | 4000 | REST API + Socket.IO server |
| `worker` | `habitloop-worker` | — | Background job processor (no HTTP) |
| `frontend` | `habitloop-frontend` | 80 | React SPA served by Nginx |

---

## Quick Start (Docker — Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Clone & Configure

```bash
git clone https://github.com/idaemrot/HabitLoop.git
cd HabitLoop

cp .env.example .env
```

Edit `.env` — at minimum, set the two required secrets:

```bash
JWT_SECRET=<run: openssl rand -hex 32>
JWT_REFRESH_SECRET=<run: openssl rand -hex 32>
```

### 2. Start All Services

```bash
docker-compose up --build -d
```

### 3. Run Migrations & Seed

```bash
# Apply database schema
docker-compose exec backend npx prisma migrate deploy

# Seed with test users and habits
docker-compose exec backend npx prisma db seed
```

### 4. Open the App

| URL | Service |
|-----|---------|
| http://localhost | Frontend |
| http://localhost/api/health | API health check |

### Test Credentials (from seed)

| User | Email | Password |
|------|-------|----------|
| Manish | manish@habitloop.dev | Password1! |
| Veena | veena@habitloop.dev | Password1! |

> **Tip:** The login page pre-fills Manish's credentials for quick testing.

---

## Local Development

### 1. Database & Redis
Since the app uses serverless providers, you can use your production databases for local development, or spin up local instances using Docker:
```bash
docker-compose up postgres redis -d
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env and set your DATABASE_URL and REDIS_URL

npm install
npx prisma db push
npx prisma db seed
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:4000/api
# Set VITE_SOCKET_URL=http://localhost:4000

npm install
npm run dev
```

Dev URLs:
- Frontend: http://localhost:5173
- Backend: http://localhost:4000

---

## Scripts

### Backend
| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled production build |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Open Prisma Studio DB browser |
| `npx prisma migrate dev` | Create a new migration |
| `npx prisma db seed` | Seed the database |

### Frontend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## Docker Commands

```bash
# View all container status
docker-compose ps

# Stream logs
docker-compose logs -f

# Restart a single service
docker-compose restart worker

# Rebuild and redeploy one service
docker-compose up -d --build backend

# Stop everything (keeps volumes)
docker-compose down

# Stop and wipe all data (destructive)
docker-compose down -v
```

---

## CI/CD Pipeline

GitHub Actions runs automatically on every push and pull request.

| Trigger | Jobs |
|---------|------|
| **Pull Request** | Install deps → Lint frontend → Lint backend → Run tests |
| **Push to `main`** | Build frontend → Build backend → Build 3 Docker images → Push to GHCR |

Docker images are published to the GitHub Container Registry:
- `ghcr.io/<owner>/habitloop/habitloop-frontend:latest`
- `ghcr.io/<owner>/habitloop/habitloop-backend:latest`
- `ghcr.io/<owner>/habitloop/habitloop-worker:latest`

---

## Architecture Decisions

- **BullMQ + Redis** — Reliable async job queues for streak calculation, leaderboard recompute, and notifications. Worker runs as a standalone isolated container.
- **Socket.IO** — Real-time streak updates and live leaderboard pushes to connected clients.
- **Prisma ORM** — Type-safe database access with auto-generated migrations and a built-in studio GUI.
- **JWT + httpOnly cookies** — Stateless access tokens (15m TTL) with secure refresh tokens in httpOnly cookies; token rotation on every refresh.
- **Zod** — Runtime schema validation on all incoming API requests — no raw `req.body` usage.
- **Multi-stage Dockerfiles** — Build artefacts are compiled in a `builder` stage; only the compiled output and production `node_modules` are copied to the final image, keeping image sizes minimal.
- **Nginx SPA proxy** — Frontend Nginx config handles React Router fallback (`try_files`) and proxies all `/api/*` and `/socket.io/*` traffic to the backend container.
