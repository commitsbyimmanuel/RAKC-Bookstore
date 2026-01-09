import express from 'express';
import BookRequest from '../models/BookRequest.js';

const router = express.Router();

// GET all book requests (with optional query filters)
router.get('/', async (req, res) => {
  try {
    const query = {};
    
    // Support query parameters for filtering
    Object.keys(req.query).forEach(key => {
      query[key] = req.query[key];
    });
    
    const bookRequests = await BookRequest.find(query).select('-_id -__v');
    res.json(bookRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single book request by ID
router.get('/:id', async (req, res) => {
  try {
    const bookRequest = await BookRequest.findOne({ id: req.params.id }).select('-_id -__v');
    if (!bookRequest) {
      return res.status(404).json({ error: 'Book request not found' });
    }
    res.json(bookRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new book request
router.post('/', async (req, res) => {
  try {
    const bookRequest = new BookRequest(req.body);
    await bookRequest.save();
    const savedRequest = await BookRequest.findOne({ id: bookRequest.id }).select('-_id -__v');
    res.status(201).json(savedRequest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT full update of book request
router.put('/:id', async (req, res) => {
  try {
    const bookRequest = await BookRequest.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true, overwrite: true }
    ).select('-_id -__v');
    
    if (!bookRequest) {
      return res.status(404).json({ error: 'Book request not found' });
    }
    res.json(bookRequest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PATCH partial update of book request
router.patch('/:id', async (req, res) => {
  try {
    const bookRequest = await BookRequest.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-_id -__v');
    
    if (!bookRequest) {
      return res.status(404).json({ error: 'Book request not found' });
    }
    res.json(bookRequest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE book request
router.delete('/:id', async (req, res) => {
  try {
    const bookRequest = await BookRequest.findOneAndDelete({ id: req.params.id }).select('-_id -__v');
    if (!bookRequest) {
      return res.status(404).json({ error: 'Book request not found' });
    }
    res.json(bookRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
