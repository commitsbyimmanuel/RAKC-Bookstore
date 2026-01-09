import express from 'express';
import Sale from '../models/Sale.js';

const router = express.Router();

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
    res.status(201).json(savedSale);
  } catch (error) {
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
