import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import bookRequestsRouter from './routes/bookRequests.js';
import booksRouter from './routes/books.js';
import directoryRouter from './routes/directory.js';

import salesRouter from './routes/sales.js';
import {
  closeConnection as closeRabbitMQ,
  connect as connectRabbitMQ
} from './utils/rabbitmq.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';
const mongoURI = process.env.BOOKSTORE_DB_URI || process.env.MONGODB_URI;

if (!process.env.BOOKSTORE_DB_URI && process.env.MONGODB_URI) {
  console.warn('⚠️  MONGODB_URI is deprecated; use BOOKSTORE_DB_URI instead');
}

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/books', booksRouter);

app.use('/bookRequests', bookRequestsRouter);
app.use('/sales', salesRouter);
app.use('/directory', directoryRouter);

// Cloud Run health check endpoint
app.get('/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;

  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'unavailable',
    database: databaseConnected ? 'connected' : 'disconnected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'RAKC Bookstore API',
    endpoints: {
      books: '/books',
      bookRequests: '/bookRequests',
      sales: '/sales',
      directory: '/directory'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

let server;
let shuttingDown = false;

async function start() {
  if (!mongoURI) {
    throw new Error('BOOKSTORE_DB_URI is required');
  }

  await mongoose.connect(mongoURI);
  console.log('✓ Connected to MongoDB');
  console.log(`✓ Database: ${mongoose.connection.db.databaseName}`);

  // RabbitMQ is optional; the connector logs and returns when it is not set.
  await connectRabbitMQ();

  server = app.listen(PORT, HOST, () => {
    console.log(`✓ Server running on ${HOST}:${PORT}`);
    console.log('✓ Ready to accept requests');
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; shutting down`);

  const stopHttpServer = server
    ? new Promise((resolve) => server.close(resolve))
    : Promise.resolve();

  await Promise.allSettled([
    stopHttpServer,
    closeRabbitMQ(),
    mongoose.disconnect()
  ]);

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
  console.error('❌ Backend startup failed:', err.message);
  process.exit(1);
});
