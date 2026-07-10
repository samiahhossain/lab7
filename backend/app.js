import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

import authRoutes from './routes/auth.js';
import apartmentRoutes from './routes/apartments.js';
import uploadRoutes from './routes/upload.js';
import profileRoutes from './routes/profile.js';

const app = express();
const FRONTEND_ORIGIN = 'http://localhost:5173';

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/apartments', apartmentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/profile', profileRoutes);
export default app;
