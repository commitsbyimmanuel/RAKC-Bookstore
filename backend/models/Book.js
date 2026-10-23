import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
import { actorSchema } from '../utils/actor.js';

const stockAdjustmentSchema = new mongoose.Schema({
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  comment: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    validate: value => value.split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word)).length >= 3
  },
  adjustedAt: { type: Date, default: Date.now },
  adjustedBy: { type: actorSchema, default: undefined }
}, { _id: false });

const bookSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => nanoid(4),
    unique: true
  },
  isbn: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  authors: {
    type: [String],
    required: true
  },
  coverUrl: String,
  stock: {
    type: Number,
    default: 0
  },
  stockAdjustments: { type: [stockAdjustmentSchema], default: undefined },
  location: String,
  price: {
    type: Number,
    required: true
  },
  description: String,
  publisher: String,
  publishedDate: String,
  pageCount: Number,
  categories: [String]
}, {
  timestamps: true,
  versionKey: false
});

export default mongoose.model('Book', bookSchema);
