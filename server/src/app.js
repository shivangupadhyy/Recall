import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sql } from 'drizzle-orm';

import connectDB, { db } from './config/db.js';
import redisClient, { connectRedis } from './config/redis.js';
import './queues/workers/embeddingWorker.js';
import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/document.routes.js';

// Resolve ES module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload directory exists on startup
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded PDFs statically
app.use('/uploads', express.static(uploadDir));

// DB and Redis Connections
connectDB();
connectRedis();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let redisStatus = 'offline';
  try {
    if (redisClient.isOpen) {
      redisStatus = 'online';
    }
  } catch (err) {
    redisStatus = `error: ${err.message}`;
  }

  let dbStatus = 'disconnected';
  try {
    // Run a simple test query to verify Postgres is alive
    await db.execute(sql`SELECT 1`);
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  res.status(200).json({
    status: 'ok',
    message: 'Study Companion API is healthy',
    timestamp: new Date(),
    services: {
      database: dbStatus,
      redis: redisStatus
    }
  });
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

export default app;
