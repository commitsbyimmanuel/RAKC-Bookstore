import express from 'express';
import mongoose from 'mongoose';
import { createBookstoreAuth } from './auth/bookstoreAuth.js';
import booksRouter from './routes/books.js';
import bookRequestsRouter from './routes/bookRequests.js';
import salesRouter from './routes/sales.js';
import directoryRouter from './routes/directory.js';

export function createApp(authOptions) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  const auth = createBookstoreAuth(authOptions);
  app.use('/auth', auth.router);
  app.get('/health', (req, res) => {
    const connected = mongoose.connection.readyState === 1;
    res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'unavailable', database: connected ? 'connected' : 'disconnected' });
  });
  app.get('/', (req, res) => res.json({ message: 'RAKC Bookstore API' }));
  // Guard every business router, including direct requests that bypass the UI.
  app.use(['/books', '/bookRequests', '/sales', '/directory'], auth.requireAccess);
  app.use('/books', booksRouter);
  app.use('/bookRequests', bookRequestsRouter);
  app.use('/sales', salesRouter);
  app.use('/directory', directoryRouter);
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.type === 'entity.too.large' ? 413 : err instanceof SyntaxError ? 400 : 500;
    res.status(status).json({ error: status === 500 ? 'Internal server error' : 'Invalid request body' });
  });
  app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
  return app;
}
