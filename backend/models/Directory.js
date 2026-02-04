import mongoose from 'mongoose';

const directorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
  },
  email: {
    type: String,
  },
  birthday: {
    type: String,
  },
});

// Index for efficient name searching
directorySchema.index({ name: 'text' });

export default mongoose.model('Directory', directorySchema, 'directory');
