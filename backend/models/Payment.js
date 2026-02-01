import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const paymentSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => nanoid(4),
    unique: true
  },
  payer: {
    type: String,
    required: true
  },
  total_amount: {
    type: Number,
    required: true
  },
  amount_payed: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'Complete'],
    default: 'Pending'
  },
  payment_method: {
    type: String,
    enum: ['Cash', 'Bank Transfer'],
    default: 'Cash'
  }
}, {
  timestamps: true,
  versionKey: false
});

export default mongoose.model('Payment', paymentSchema);
