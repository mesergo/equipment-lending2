import { getDb } from './db';

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: 'super_admin' | 'org_manager';
  // Required when role === 'org_manager'. Matches Organization.id in src/data/mockData.ts.
  organizationId?: string;
}

const COLLECTION = 'users';

let indexesReady: Promise<unknown> | null = null;

async function usersCollection() {
  const db = await getDb();
  const col = db.collection<StoredUser>(COLLECTION);
  // Case-insensitive unique index on username (collation strength 2 = case-insensitive),
  // mirrors the case-insensitive lookup findUserByUsername already did against the JSON file.
  if (!indexesReady) {
    indexesReady = col.createIndex(
      { username: 1 },
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

// Replaces the whole collection with `users` — matches the old JSON-file behavior (seed
// scripts build the full starter-account array once and call this exactly once).
export async function writeUsers(users: StoredUser[]): Promise<void> {
  const col = await usersCollection();
  await col.deleteMany({});
  if (users.length > 0) await col.insertMany(users);
}

export async function findUserByUsername(username: string): Promise<StoredUser | undefined> {
  const needle = username.toLowerCase();
  const all = await readUsers();
  return all.find((u) => u.username.toLowerCase() === needle);
}
