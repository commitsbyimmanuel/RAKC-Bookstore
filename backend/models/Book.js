import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

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
