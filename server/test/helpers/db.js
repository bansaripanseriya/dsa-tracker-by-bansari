import { after, before } from 'node:test';
import mongoose from 'mongoose';

/**
 * Connect a test file to its own throwaway database, e.g. `dsa-tracker-test-solves`.
 * Test files run in parallel, so each one needs a separate database.
 *
 * Base URI: MONGODB_URI_TEST, or local `mongodb://127.0.0.1:27017/dsa-tracker-test`.
 * If MongoDB isn't reachable, `state.connected` stays false and tests should skip.
 *
 * @param {string} suffix  appended to the database name
 * @param {import('mongoose').Model[]} models  models whose indexes the tests rely on
 */
export function useTestDb(suffix, models = []) {
  const base = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/dsa-tracker-test';
  const match = base.match(/^(mongodb(?:\+srv)?:\/\/[^/]+\/)([^?]*)(\?.*)?$/);
  if (!match) throw new Error('MONGODB_URI_TEST must include a database name');
  const uri = `${match[1]}${match[2]}-${suffix}${match[3] || ''}`;
  const state = { connected: false };

  before(async () => {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 });
    } catch {
      return;
    }
    if (!/-test(-|$)/.test(mongoose.connection.name)) {
      throw new Error(`Refusing to run DB tests against "${mongoose.connection.name}" — the name must contain "-test".`);
    }
    await mongoose.connection.dropDatabase();
    for (const model of models) await model.syncIndexes();
    state.connected = true;
  });

  after(async () => {
    if (state.connected) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  return state;
}
