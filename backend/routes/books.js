import express from 'express';
import Book from '../models/Book.js';

const router = express.Router();

// GET all books (with optional query filters and search)
router.get('/', async (req, res) => {
  try {
    let query = {};
    
    // Support general search across multiple fields
    if (req.query.search) {
      const searchStr = req.query.search;
      query = {
        $or: [
          { isbn: { $regex: searchStr, $options: 'i' } },
          { title: { $regex: searchStr, $options: 'i' } },
          { authors: { $regex: searchStr, $options: 'i' } }
        ]
      };
    } else {
      // Support specific field filtering (like json-server)
      Object.keys(req.query).forEach(key => {
        query[key] = req.query[key];
      });
    }
    
    const books = await Book.find(query).select('-_id -__v');
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single book by ID
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findOne({ id: req.params.id }).select('-_id -__v');
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new book
router.post('/', async (req, res) => {
  try {
    const book = new Book(req.body);
    await book.save();
    const savedBook = await Book.findOne({ id: book.id }).select('-_id -__v');
    res.status(201).json(savedBook);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT full update of book
router.put('/:id', async (req, res) => {
  try {
    const book = await Book.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true, overwrite: true }
    ).select('-_id -__v');
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PATCH partial update of book
router.patch('/:id', async (req, res) => {
  try {
    const book = await Book.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-_id -__v');
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE book
router.delete('/:id', async (req, res) => {
  try {
    const book = await Book.findOneAndDelete({ id: req.params.id }).select('-_id -__v');
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
