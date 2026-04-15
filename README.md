# DSA Tracker (React + Express + MongoDB)

Full-stack LeetCode DSA sheet with **register/login**, progress synced to **MongoDB Atlas**, and the same Sheet / Practice / Streak features as the static HTML version.

## Prerequisites

- Node.js 20+
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster and connection string

## Setup

### 1. Environment (repository root)

Create **`.env` in the project root** (same directory as the root `package.json`), not inside `server/`. Copy from the template:

```bash
cp .env
```

Edit `.env`:

- `MONGODB_URI` — Atlas connection string (Database → Connect → Drivers). Use a database name in the path, e.g. `...mongodb.net/dsa-tracker?retryWrites=true&w=majority`
- `JWT_SECRET` — long random string (e.g. `openssl rand -hex 32`)
- `CLIENT_URL` — `http://localhost:5173` for local dev (comma-separated for multiple origins)

The Express app loads this file via `dotenv` from `server/src/index.js` (resolved path: repo root `.env`).

### 2. Server (`server/`)

```bash
cd server
npm install
npm run dev
```

API: `http://localhost:4000` (health: `GET /api/health`)

### 3. Client (`client/`)

```bash
cd client
npm install
npm run dev
```

App: `http://localhost:5173` — Vite proxies `/api` to the Express server.

### 4. Run both (from repo root)

```bash
npm install
npm run install:all
npm run dev
```

## Production

1. Build the client: `npm run build --prefix client`
2. Set `NODE_ENV=production` and run the server; it serves `client/dist` and the SPA for non-API routes.

## API overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Body: `{ email, password, name? }` |
| POST | `/api/auth/login` | Body: `{ email, password }` |
| GET | `/api/auth/me` | Bearer JWT — user + progress |
| GET | `/api/progress` | Bearer JWT |
| PUT | `/api/progress` | Bearer JWT — `{ sheetDone, practiceDone, streak, openSections }` |

Progress keys match the old localStorage shape (`dsa_full_v1` style ids as strings).

## Legacy static site

The original single-file and modular static versions remain (`dsa-complete-sheetv02.html`, `index.html` + `js/`).
