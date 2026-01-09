import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const saleItemSchema = new mongoose.Schema({
  isbn: String,
  title: String,
  quantity: Number,
  unitPrice: Number
}, { _id: false });

const saleSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => nanoid(4),
    unique: true
  },
  items: {
    type: [saleItemSchema],
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  purchaseDate: {
    type: String,
    required: true
  },
  soldAt: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  versionKey: false
});

export default mongoose.model('Sale', saleSchema);
