import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import uploadRouter from './routes/upload';
import openaiRouter from './routes/openai';
import orderRouter from './routes/order';

const app = express();
const port = process.env.PORT || 3000;

console.log('[server] Starting backend. FAL_API_KEY is', process.env.FAL_API_KEY ? 'SET' : 'NOT SET');

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger to trace incoming requests
app.use((req, _res, next) => {
  console.log('[server] Request:', { method: req.method, url: req.url, bodyPreview: JSON.stringify(req.body ?? {}).slice(0,200) });
  next();
});

app.use('/api/upload', uploadRouter);
app.use('/api/openai', openaiRouter);
app.use('/api/order', orderRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Illuminated Signs Backend' });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

// Global error handler to catch unhandled errors
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[server] Unhandled error:', { message: err?.message, stack: err?.stack, full: err });
  res.status(500).json({ error: 'Server internal error' });
});

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught Exception:', err);
  process.exit(1);
});
