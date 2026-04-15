# DSA Tracker

Simple full-stack DSA progress tracker built with:

- Frontend: React + Vite
- Backend: Express + MongoDB
- Auth: JWT

This project helps a learner track:

- Sheet problems completed
- Practice problems completed
- Daily streak/check-ins
- Section expand/collapse state

---

## 1) Project Purpose

This app is for students preparing DSA (LeetCode-style) topics.

It provides:

- User register/login
- Personal progress saved in MongoDB
- Tracker tabs (Sheet, Practice, Streak)
- Theme support and profile page

---

## 2) Tech Stack

- `client/`: React app (UI)
- `server/`: Express API (business logic + database access)
- MongoDB Atlas: stores users and progress

---

## 3) Folder Structure (Important Files)

```text
dsa-tracker-by-bansari/
  client/
    src/
      api/client.js
      context/AuthContext.jsx
      context/ThemeContext.jsx
      pages/Tracker.jsx
      pages/Login.jsx
      pages/Register.jsx
      pages/Profile.jsx
      components/
      data/
      utils/
  server/
    src/
      index.js
      config/db.js
      models/User.js
      middleware/auth.js
      routes/auth.js
      routes/progress.js
  package.json
  README.md
```

---

## 4) Prerequisites

Install:

- Node.js 20+
- npm
- MongoDB Atlas connection string

---

## 5) Environment Variables

Create a `.env` file in the **project root** (same level as root `package.json`):

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
CLIENT_URL=http://localhost:5173
PORT=4000
```

Notes:

- `MONGODB_URI` must include a database name.
- `JWT_SECRET` should be long and random.
- `CLIENT_URL` can be comma-separated for multiple allowed origins.
- `PORT` is optional (default is `4000`).

---

## 6) Installation & Run

### Option A: Run both client + server from root (recommended)

```bash
npm install
npm run install:all
npm run dev
```

Runs:

- API: `http://localhost:4000`
- Frontend: `http://localhost:5173`

### Option B: Run separately

Server:

```bash
cd server
npm install
npm run dev
```

Client:

```bash
cd client
npm install
npm run dev
```

---

## 7) Available Scripts

At root:

- `npm run install:all` -> installs dependencies in `server` and `client`
- `npm run dev` -> starts both server and client together
- `npm run dev:server` -> starts only backend
- `npm run dev:client` -> starts only frontend
- `npm run build` -> builds frontend app

In `server/`:

- `npm run dev` -> run API in watch mode
- `npm start` -> run API normally

In `client/`:

- `npm run dev` -> run Vite dev server
- `npm run build` -> create production build
- `npm run preview` -> preview built app

---

## 8) Authentication Flow (Beginner Friendly)

1. User registers or logs in.
2. Server validates credentials and returns JWT token.
3. Token is saved in browser `localStorage`.
4. Client sends token in API calls.
5. Protected routes verify token using backend middleware.

Main auth files:

- `client/src/context/AuthContext.jsx`
- `server/src/routes/auth.js`
- `server/src/middleware/auth.js`

---

## 9) API Endpoints

Base URL: `http://localhost:4000/api`

| Method | Endpoint | Use |
|---|---|---|
| `GET` | `/health` | API health check |
| `POST` | `/auth/register` | Register user |
| `POST` | `/auth/login` | Login user |
| `GET` | `/auth/me` | Get logged-in user + progress |
| `GET` | `/progress` | Get progress |
| `PUT` | `/progress` | Update progress |

`PUT /progress` accepted fields:

```json
{
  "sheetDone": ["id1", "id2"],
  "practiceDone": ["id3"],
  "streak": { "checkins": ["2026-04-15"] },
  "openSections": [0, 1, 2]
}
```

---

## 10) Data Model (High Level)

User document stores:

- `email`
- `passwordHash`
- `name`
- `progress` object:
  - `sheetDone` (string array)
  - `practiceDone` (string array)
  - `streak.checkins` (date string array)
  - `openSections` (number array)

---

## 11) Production Build

1. Build client:

   ```bash
   npm run build --prefix client
   ```

2. Start server with production environment.

When `NODE_ENV=production`, server serves `client/dist` and handles SPA routes.

---

## 12) Troubleshooting

- **Frontend not connecting to backend**
  - Ensure backend is running on `4000`.
  - Check `CLIENT_URL` in root `.env`.
- **MongoDB connection failed**
  - Recheck `MONGODB_URI`.
  - Confirm IP allow list and DB user in Atlas.
- **Auth keeps failing**
  - Ensure `JWT_SECRET` is set.
  - Clear browser localStorage token and login again.

---

## 13) Legacy Files

This repo also contains old static versions:

- `dsa-complete-sheetv02.html`
- `index.html` + `js/`

The active full-stack app is the `client/` + `server/` setup.
