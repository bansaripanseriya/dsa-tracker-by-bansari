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

const noteSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true, maxlength: 80 },
    title: { type: String, trim: true, maxlength: 200, default: 'Untitled' },
    body: { type: String, trim: true, maxlength: 20000, default: '' },
    lang: { type: String, trim: true, maxlength: 80, default: 'JavaScript' },
    priority: { type: String, trim: true, maxlength: 30, default: 'Low' },
    createdAt: { type: String, required: true },
    prettyTime: { type: String, trim: true, maxlength: 120, default: '' }
  },
  { _id: false }
);

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 80, required: true }
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
    avatar: { type: avatarSchema, default: () => ({ presetIndex: 0 }) },
    notes: { type: [noteSchema], default: [] },
    skills: { type: [skillSchema], default: [] }
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
