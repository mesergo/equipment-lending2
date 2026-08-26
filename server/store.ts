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

export async function findUserById(id: string): Promise<StoredUser | undefined> {
  const col = await usersCollection();
  const user = await col.findOne({ id }, { projection: { _id: 0 } });
  return user ?? undefined;
}

export async function createUser(user: StoredUser): Promise<StoredUser> {
  const col = await usersCollection();
  try {
    await col.insertOne({ ...user });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new Error(`כתובת הדואר האלקטרוני ${user.email} כבר בשימוש`);
    }
    throw err;
  }
  return user;
}

export async function updateUser(id: string, patch: Partial<StoredUser>): Promise<StoredUser | undefined> {
  const col = await usersCollection();
  const updated = await col.findOneAndUpdate(
    { id },
    { $set: patch },
    { returnDocument: 'after', projection: { _id: 0 } }
  );
  return updated ?? undefined;
}
