import express from 'express';
import Directory from '../models/Directory.js';

const router = express.Router();

// GET search directory by name
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.json([]);
    }

    // Search for members where name contains the query (case-insensitive)
    // This will match first name or last name
    const members = await Directory.find({
      name: { $regex: query, $options: 'i' }
    })
    .select('name email')
    .limit(10)
    .lean();

    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all directory members
router.get('/', async (req, res) => {
  try {
    const members = await Directory.find().select('-__v').lean();
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
