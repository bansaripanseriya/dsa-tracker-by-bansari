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

const resumeSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 255, default: '' },
    size: { type: Number, default: 0 },
    type: { type: String, trim: true, maxlength: 120, default: '' },
    data: { type: String, default: '' },
    uploadedAt: { type: Date, default: null }
  },
  { _id: false }
);

const avatarSchema = new mongoose.Schema(
  {
    presetIndex: { type: Number, default: 0 },
    data: { type: String, default: '' },
    type: { type: String, trim: true, maxlength: 120, default: '' },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: null }
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
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    progress: { type: progressSchema, default: () => ({}) },
    resume: { type: resumeSchema, default: null },
    avatar: { type: avatarSchema, default: () => ({ presetIndex: 0 }) }
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
