import mongoose from 'mongoose';

/**
 * One document per pair of users. `userA` < `userB` (sorted as strings), so a pair can
 * only ever have one document — two people requesting each other can't create two.
 * Declining, cancelling and unfriending delete the document.
 */
const friendshipSchema = new mongoose.Schema(
  {
    userA: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userB: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
    acceptedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

friendshipSchema.index({ userA: 1, userB: 1 }, { unique: true });
friendshipSchema.index({ userA: 1, status: 1 });
friendshipSchema.index({ userB: 1, status: 1 });

export const Friendship = mongoose.model('Friendship', friendshipSchema);
