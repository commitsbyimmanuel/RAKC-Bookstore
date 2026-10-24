import mongoose from 'mongoose';
import { actorSchema } from '../utils/actor.js';

// Append-only application events. There are no update/delete audit routes.
const auditLogSchema = new mongoose.Schema({
  domain: { type: String, required: true, immutable: true },
  type: { type: String, required: true, immutable: true },
  isbn: { type: String, required: true, immutable: true },
  bookId: { type: String, required: true, immutable: true },
  bookTitle: { type: String, immutable: true },
  user: { type: actorSchema, required: true, immutable: true },
  timestamp: { type: Date, required: true, immutable: true },
  oldQuantity: { type: Number, required: true, immutable: true },
  newQuantity: { type: Number, required: true, min: 0, validate: Number.isSafeInteger, immutable: true },
  comment: { type: String, required: true, immutable: true },
}, { collection: 'auditLogs', versionKey: false, autoCreate: false, autoIndex: false });

export default mongoose.model('AuditLog', auditLogSchema);
