import express from 'express';
import Payment from '../models/Payment.js';

const router = express.Router();

// GET all payments (with optional query filters)
router.get('/', async (req, res) => {
  try {
    const query = {};
    
    // Support query parameters for filtering
    Object.keys(req.query).forEach(key => {
      query[key] = req.query[key];
    });
    
    const payments = await Payment.find(query).select('-_id -__v');
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single payment by ID
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findOne({ id: req.params.id }).select('-_id -__v');
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new payment
router.post('/', async (req, res) => {
  try {
    const payment = new Payment(req.body);
    await payment.save();
    const savedPayment = await Payment.findOne({ id: payment.id }).select('-_id -__v');
    res.status(201).json(savedPayment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT full update of payment
router.put('/:id', async (req, res) => {
  try {
    const payment = await Payment.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true, overwrite: true }
    ).select('-_id -__v');
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PATCH partial update of payment
router.patch('/:id', async (req, res) => {
  try {
    const payment = await Payment.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-_id -__v');
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE payment
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findOneAndDelete({ id: req.params.id }).select('-_id -__v');
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
