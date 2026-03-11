import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRouter from './routes/auth.js';
import filesRouter from './routes/files.js';
import foldersRouter from './routes/folders.js';
import { isR2Configured } from './lib/storage.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    storage: isR2Configured() ? 'cloudflare-r2' : 'local-fallback',
    database: 'postgresql-prisma',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/auth', authRouter);
app.use('/api/files', filesRouter);
app.use('/api/folders', foldersRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Route không tồn tại' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`\n🚀 Web3 Drive Backend v2.0 chạy trên http://localhost:${port}`);
  console.log(`📦 Storage: ${isR2Configured() ? '✅ Cloudflare R2' : '⚠️  Local fallback'}`);
  console.log(`🗄️  Database: PostgreSQL + Prisma\n`);
});
