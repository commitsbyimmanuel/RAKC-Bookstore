import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const bookRequestSchema = new mongoose.Schema({
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
  requesterName: {
    type: String,
    required: true
  },
  fulfilled: {
    type: Boolean,
    default: false
  },
  requestedAt: {
    type: String,
    required: true
  },
  fulfilledAt: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  versionKey: false
});

export default mongoose.model('BookRequest', bookRequestSchema);
