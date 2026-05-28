import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import uploadRouter from './routes/upload';
import openaiRouter from './routes/openai';
import orderRouter from './routes/order';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/upload', uploadRouter);
app.use('/api/openai', openaiRouter);
app.use('/api/order', orderRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Illuminated Signs Backend' });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
