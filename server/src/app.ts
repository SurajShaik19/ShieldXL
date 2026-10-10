import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import platformRoutes from './routes/platformRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import aiStatusRoutes from './routes/aiStatusRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

export const app = express();

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow dev tools / Vite proxy
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl) or localhost
      if (!origin || origin.startsWith('http://localhost') || origin === config.clientOrigin) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiter to /api
app.use('/api', apiRateLimiter);

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/ai/status', aiStatusRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/health', healthRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
});

// Centralized error handler
app.use(errorHandler);
