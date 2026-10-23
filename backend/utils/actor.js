import mongoose from 'mongoose';

export const actorSchema = new mongoose.Schema({ userId: String, name: String, email: String }, { _id: false });

export function actorFor(req) {
  const user = req.auth?.user;
  return user ? { userId: user.id, name: user.name, email: user.email } : undefined;
}

export function saleFields(req, creating = false) {
  // Attribution always comes from the validated identity, never the client body.
  const fields = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) =>
    key !== 'createdBy' && key !== 'updatedBy' && !key.startsWith('$') && !key.includes('.'),
  ));
  return { ...fields, ...(creating ? { createdBy: actorFor(req) } : {}), updatedBy: actorFor(req) };
}
