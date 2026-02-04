import express from 'express';
import Book from '../models/Book.js';
import Sale from '../models/Sale.js';
import { publishToQueue } from '../utils/rabbitmq.js';

const router = express.Router();

// GET top sellers (aggregated from sales data)
router.get('/top-sellers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 14;
    
    // Aggregate sales to get total quantity sold per ISBN
    const topSellersData = await Sale.aggregate([
      // Unwind the items array to process each item separately
      { $unwind: '$items' },
      
      // Group by ISBN and sum quantities
      {
        $group: {
          _id: '$items.isbn',
          totalSold: { $sum: '$items.quantity' }
        }
      },
      
      // Sort by total sold (descending)
      { $sort: { totalSold: -1 } },
      
      // Limit to requested number
      { $limit: limit }
    ]);
    
    // Get ISBNs of top sellers
    const topISBNs = topSellersData.map(item => item._id);
    
    // Fetch book details for these ISBNs from the Books collection
    const books = await Book.find({ isbn: { $in: topISBNs } });
    
    // Create a map of ISBN to book details
    const booksMap = {};
    books.forEach(book => {
      booksMap[book.isbn] = book;
    });
    
    // Combine sales data with book details, maintaining sort order
    const topSellers = topSellersData
      .map(item => {
        const book = booksMap[item._id];
        if (!book) return null;
        
        return {
          isbn: item._id,
          totalSold: item.totalSold,
          title: book.title,
          authors: book.authors,
          coverUrl: book.coverUrl,
          price: book.price,
          stock: book.stock
        };
      })
      .filter(item => item !== null); // Remove any books not found in inventory
    
    res.json(topSellers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all sales (with optional query filters)
router.get('/', async (req, res) => {
  try {
    const query = {};
    
    // Support query parameters for filtering
    Object.keys(req.query).forEach(key => {
      query[key] = req.query[key];
    });
    
    const sales = await Sale.find(query).select('-_id -__v');
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single sale by ID
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findOne({ id: req.params.id }).select('-_id -__v');
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new sale
router.post('/', async (req, res) => {
  try {
    const sale = new Sale(req.body);
    await sale.save();
    const savedSale = await Sale.findOne({ id: sale.id }).select('-_id -__v');
    
    // Publish to RabbitMQ if sendReceipt is true and email exists
    // Wrapped in try-catch so email failures don't break sale creation
    if (savedSale.sendReceipt && savedSale.customerEmail) {
      try {
        await publishToQueue('emails-to-send', {
          type: 'order_confirmation',
          data: {
            customerEmail: savedSale.customerEmail,
            customerName: savedSale.customerName,
            orderId: savedSale.id,
            orderDate: savedSale.purchaseDate,
            paymentMethod: savedSale.paymentMethod,
            orderItems: savedSale.items,
            totalAmount: savedSale.totalAmount
          }
        });
      } catch (emailError) {
        console.error('Failed to publish email notification:', emailError.message);
        // Continue with sale response even if email fails
      }
    }
    
    res.status(201).json(savedSale);
  } catch (error) {
    console.error('Sale creation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT full update of sale
router.put('/:id', async (req, res) => {
  try {
    const sale = await Sale.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true, overwrite: true }
    ).select('-_id -__v');
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json(sale);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PATCH partial update of sale
router.patch('/:id', async (req, res) => {
  try {
    const sale = await Sale.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-_id -__v');
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json(sale);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE sale
router.delete('/:id', async (req, res) => {
  try {
    const sale = await Sale.findOneAndDelete({ id: req.params.id }).select('-_id -__v');
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
