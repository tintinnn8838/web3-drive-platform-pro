import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRouter from './routes/auth.js';
import filesRouter from './routes/files.js';
import foldersRouter from './routes/folders.js';
import { isR2Configured } from './lib/storage.js';
import { repositoryHealth } from './lib/repository.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

app.get('/health', async (_req, res) => {
  const repo = await repositoryHealth();
  res.json({
    status: 'ok',
    storage: isR2Configured() ? 'cloudflare-r2' : 'local-fallback',
    database: repo.mode,
    version: '2.1.0-mvp',
    timestamp: new Date().toISOString(),
  });
});

app.use('/auth', authRouter);
app.use('/api/files', filesRouter);
app.use('/api/folders', foldersRouter);

app.use((_req, res) => res.status(404).json({ error: 'Route không tồn tại' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 8787;
app.listen(port, async () => {
  const repo = await repositoryHealth();
  console.log(`\n🚀 Web3 Drive Backend chạy trên http://localhost:${port}`);
  console.log(`📦 Storage: ${isR2Configured() ? '✅ Cloudflare R2' : '⚠️  Local fallback'}`);
  console.log(`🗄️  Metadata: ${repo.mode}\n`);
});
