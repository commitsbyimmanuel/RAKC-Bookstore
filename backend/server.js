import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import {
  closeConnection as closeRabbitMQ,
  connect as connectRabbitMQ
} from './utils/rabbitmq.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = createApp();
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';
const mongoURI = process.env.BOOKSTORE_DB_URI || process.env.MONGODB_URI;

if (!process.env.BOOKSTORE_DB_URI && process.env.MONGODB_URI) {
  console.warn('⚠️  MONGODB_URI is deprecated; use BOOKSTORE_DB_URI instead');
}

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
