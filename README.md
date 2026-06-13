# HabitLoop 🔥

> A full-stack habit-tracking application built with React, Node.js, PostgreSQL, Redis, and real-time Socket.IO.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + React Router v6 |
| Backend | Node.js 20 + Express + Prisma ORM |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 + BullMQ |
| Real-time | Socket.IO |
| Auth | JWT (jsonwebtoken) |
| Containers | Docker + Docker Compose |

## Project Structure

```
HabitLoop/
├── frontend/          # React + Vite SPA
├── backend/           # Express REST API + Socket.IO
├── docker-compose.yml # Full-stack orchestration
└── README.md
```

## Getting Started

### Prerequisites
- Node.js >= 20
- Docker Desktop

### 1. Clone & Install

```bash
# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Edit the `.env` files with your secrets before running.

### 3. Run with Docker (Recommended)

```bash
docker compose up --build
```

Services will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### 4. Run without Docker (Development)

Start PostgreSQL and Redis separately, then:

```bash
# Terminal 1 — Backend
cd backend
npx prisma db push
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

## API Health Check

```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

## Scripts

### Backend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npx prisma studio` | Open Prisma Studio GUI |

### Frontend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |

## Architecture Decisions

- **Prisma ORM** — type-safe DB access with migrations and studio GUI
- **BullMQ + Redis** — reliable job queue for async tasks (streak calculation, notifications)
- **Socket.IO** — real-time streak updates and live leaderboard
- **JWT** — stateless auth; refresh tokens stored in Redis for revocation
- **Zod** — runtime schema validation on all incoming requests
- **Vite** — fast HMR dev experience with optimized production builds
