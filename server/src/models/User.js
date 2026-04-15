import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema(
  {
    sheetDone: { type: [String], default: [] },
    practiceDone: { type: [String], default: [] },
    streak: {
      checkins: { type: [String], default: [] }
    },
    openSections: { type: [Number], default: [1, 2, 3] }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 320
    },
    passwordHash: { type: String, required: true },
    name: { type: String, trim: true, maxlength: 120, default: '' },
    progress: { type: progressSchema, default: () => ({}) }
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
