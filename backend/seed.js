import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import mongoose from 'mongoose';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Book from './models/Book.js';
import BookRequest from './models/BookRequest.js';
import Payment from './models/Payment.js';
import Sale from './models/Sale.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Bookstore';

async function seedDatabase() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');
    console.log(`✓ Database: ${mongoose.connection.name}`);

    // Read the db.json file from frontend directory
    const dbPath = join(__dirname, '..', 'frontend', 'db.json');
    console.log(`\nReading data from: ${dbPath}`);
    const data = JSON.parse(await readFile(dbPath, 'utf-8'));

    // Clear existing collections
    console.log('\nClearing existing collections...');
    await Book.deleteMany({});
    console.log('✓ Cleared books collection');
    
    await Payment.deleteMany({});
    console.log('✓ Cleared payments collection');
    
    await BookRequest.deleteMany({});
    console.log('✓ Cleared bookRequests collection');
    
    await Sale.deleteMany({});
    console.log('✓ Cleared sales collection');

    // Insert books
    console.log('\nSeeding books...');
    const books = await Book.insertMany(data.books);
    console.log(`✓ Inserted ${books.length} books`);

    // Insert payments
    console.log('Seeding payments...');
    const payments = await Payment.insertMany(data.payments);
    console.log(`✓ Inserted ${payments.length} payments`);

    // Insert book requests
    console.log('Seeding book requests...');
    const bookRequests = await BookRequest.insertMany(data.bookRequests);
    console.log(`✓ Inserted ${bookRequests.length} book requests`);

    // Insert sales
    console.log('Seeding sales...');
    const sales = await Sale.insertMany(data.sales);
    console.log(`✓ Inserted ${sales.length} sales`);

    console.log('\n✓ Database seeding completed successfully!');
    console.log('\nSummary:');
    console.log(`  - Books: ${books.length}`);
    console.log(`  - Payments: ${payments.length}`);
    console.log(`  - Book Requests: ${bookRequests.length}`);
    console.log(`  - Sales: ${sales.length}`);

  } catch (error) {
    console.error('\n✗ Error seeding database:', error.message);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

// Run the seed function
seedDatabase();
