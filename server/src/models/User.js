import mongoose from 'mongoose';
import { buildNameSearch } from '../lib/nameSearch.js';

const progressSchema = new mongoose.Schema(
  {
    sheetDone: { type: [String], default: [] },
    practiceDone: { type: [String], default: [] },
    sheetSaved: { type: [String], default: [] },
    practiceSaved: { type: [String], default: [] },
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

/** Denormalized from progress on every save, so other users' summaries need no extra queries. */
const statsSchema = new mongoose.Schema(
  {
    totalSolved: { type: Number, default: 0 },
    easy: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard: { type: Number, default: 0 },
    lastCheckin: { type: String, default: null },
    updatedAt: { type: Date, default: null }
  },
  { _id: false }
);

/** Who can find this user. Tag and exact email always work; name search is opt-out. */
const discoverabilitySchema = new mongoose.Schema(
  {
    byName: { type: Boolean, default: true }
  },
  { _id: false }
);

/** Search index for the user's name (see lib/nameSearch.js). Never sent to clients. */
const nameSearchSchema = new mongoose.Schema(
  {
    tokens: { type: [String], default: [] },
    trigrams: { type: [String], default: [] }
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
    stats: { type: statsSchema, default: () => ({}) },
    /** Set once this user's pre-existing progress has been backfilled into `solves`. */
    solvesSyncedAt: { type: Date, default: null },
    /**
     * Public id for the friends feature: 7 chars, stored without '#'. Permanent once set.
     * No default on purpose — the unique sparse index only skips documents that lack the field.
     */
    friendTag: { type: String, trim: true },
    discoverability: { type: discoverabilitySchema, default: () => ({}) },
    nameSearch: { type: nameSearchSchema, default: () => ({}), select: false },
    resume: { type: resumeSchema, default: null },
    avatar: { type: avatarSchema, default: () => ({ presetIndex: 0 }) },
    notes: { type: [noteSchema], default: [] },
    skills: { type: [skillSchema], default: [] }
  },
  { timestamps: true }
);

userSchema.index({ friendTag: 1 }, { unique: true, sparse: true });
userSchema.index({ 'nameSearch.tokens': 1 });
userSchema.index({ 'nameSearch.trigrams': 1 });

// Keep the name search index in sync. (Update queries bypass this hook — set
// `nameSearch` explicitly there, e.g. with buildNameSearch.)
userSchema.pre('save', function syncNameSearch(next) {
  if (this.isNew || this.isModified('name')) {
    this.nameSearch = buildNameSearch(this.name);
  }
  next();
});

export const User = mongoose.model('User', userSchema);
