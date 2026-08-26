import { getDb } from './db';
import type { StoredUser } from '../src/types';

const COLLECTION = 'users';

let indexesReady: Promise<unknown> | null = null;

async function usersCollection() {
  const db = await getDb();
  const col = db.collection<StoredUser>(COLLECTION);
  // Case-insensitive unique index on email (collation strength 2 = case-insensitive) —
  // matches the live system's login-by-email screen.
  if (!indexesReady) {
    indexesReady = col.createIndex(
      { email: 1 },
      { unique: true, collation: { locale: 'en', strength: 2 } }
    );
  }
  await indexesReady;
  return col;
}

export async function readUsers(): Promise<StoredUser[]> {
  const col = await usersCollection();
  return col.find({}, { projection: { _id: 0 } }).toArray();
}

// Replaces the whole collection with `users` — used only by the seed scripts, which build
// the full starter-account array once and call this exactly once.
export async function writeUsers(users: StoredUser[]): Promise<void> {
  const col = await usersCollection();
  await col.deleteMany({});
  if (users.length > 0) await col.insertMany(users);
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  const needle = email.toLowerCase();
  const all = await readUsers();
  return all.find((u) => u.email.toLowerCase() === needle);
}
