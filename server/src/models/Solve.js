import mongoose from 'mongoose';

/**
 * One document per (user, LeetCode problem): when the user first marked it done.
 * Feeds the weekly leaderboard. Written only by lib/solves.js.
 */
const solveSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lcNumber: { type: Number, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  /** Fixed when the solve is first recorded. */
  points: { type: Number, required: true },
  /** First time the problem was marked done. Never moves, even if it is unticked and re-ticked. */
  solvedAt: { type: Date, required: true },
  /** False while the problem is unticked; re-ticking reactivates the same document. */
  active: { type: Boolean, default: true },
  /**
   * 'live'     — recorded when the user ticked it; counts toward weekly points.
   * 'backfill' — already done before solve tracking existed; never counts toward a week.
   */
  source: { type: String, enum: ['live', 'backfill'], default: 'live' }
});

solveSchema.index({ userId: 1, lcNumber: 1 }, { unique: true });
solveSchema.index({ userId: 1, solvedAt: 1 });

export const Solve = mongoose.model('Solve', solveSchema);
