import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { connectDb } from './config/db.js';
import authRoutes from './routes/auth.js';
import progressRoutes from './routes/progress.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load `.env` from repository root (parent of `server/`), not `server/.env`
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const clientOrigins = (
  process.env.CLIENT_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  'http://localhost:5173'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: clientOrigins,
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../../client/dist');
  app.use(express.static(dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
}

async function main() {
  app.listen(PORT, HOST, () => {
    console.log(`API listening on http://${HOST}:${PORT}`);
  });

  try {
    await connectDb();
    console.log('Database connected');
  } catch (e) {
    console.error('Database connection failed:', e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
