import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
import { actorSchema } from '../utils/actor.js';

const saleItemSchema = new mongoose.Schema({
  isbn: String,
  title: String,
  quantity: Number,
  unitPrice: Number,
  coverUrl: String
}, { _id: false });

const saleSchema = new mongoose.Schema({
  createdBy: { type: actorSchema, immutable: true, default: undefined },
  updatedBy: { type: actorSchema, default: undefined },
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
  customerEmail: {
    type: String,
    default: ''
  },
  sendReceipt: {
    type: Boolean,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer'],
    default: 'Cash'
  },
  totalAmount: {
    type: Number,
    required: true
  },
  purchaseDate: {
    type: Date,
    required: true
  },
  soldAt: {
    type: Date,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Complete'],
    default: 'Pending'
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  versionKey: false
});

export default mongoose.model('Sale', saleSchema);
