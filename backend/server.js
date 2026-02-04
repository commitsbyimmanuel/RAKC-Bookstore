import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import bookRequestsRouter from './routes/bookRequests.js';
import booksRouter from './routes/books.js';
import directoryRouter from './routes/directory.js';
import paymentsRouter from './routes/payments.js';
import salesRouter from './routes/sales.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Bookstore';

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✓ Connected to MongoDB');
    console.log(`✓ Database: ${mongoose.connection.name}`);
  })
  .catch((error) => {
    console.error('✗ MongoDB connection error:', error.message);
    process.exit(1);
  });

// Routes
app.use('/books', booksRouter);
app.use('/payments', paymentsRouter);
app.use('/bookRequests', bookRequestsRouter);
app.use('/sales', salesRouter);
app.use('/directory', directoryRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'RAKC Bookstore API',
    endpoints: {
      books: '/books',
      payments: '/payments',
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

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log('✓ Ready to accept requests');
});
