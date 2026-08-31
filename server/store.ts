import { getDb } from './db';
import { legacyIdQuery } from './genericStore';
import type { Document } from 'mongodb';
import type { StoredUser, UserRole } from '../src/types';

const COLLECTION = 'users';

let indexesReady: Promise<unknown> | null = null;

async function usersCollection() {
  const db = await getDb();
  const col = db.collection<Document>(COLLECTION);
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

// The real `users` collection is a raw export of the legacy lendingCRM system (Laravel/MySQL):
// numeric `id`, the password hash is in a field called `password` (not `passwordHash`), and
// `role` uses that system's own vocabulary — mapped here, read-side only. Nothing is rewritten
// in Mongo; a user created by this app already has passwordHash/role in this app's own shape,
// which passes through unchanged below.
function mapRole(raw: unknown): UserRole {
  switch (raw) {
    case 'super_admin':
    case 'admin':
      return 'super_admin';
    case 'organization_manager':
      return 'org_manager';
    case 'dispatcher':
      return 'coordinator';
    default:
      return raw as UserRole;
  }
}

function toUser(doc: Document): StoredUser {
  const organizationId = doc.organizationId ?? doc.organization_id;
  return {
    id: String(doc.id),
    organizationId: organizationId == null ? undefined : String(organizationId),
    name: doc.name as string,
    email: doc.email as string,
    passwordHash: (doc.passwordHash ?? doc.password) as string,
    role: mapRole(doc.role),
    title: doc.title as string | undefined,
  };
}

export async function readUsers(): Promise<StoredUser[]> {
  const col = await usersCollection();
  const docs = await col.find({}, { projection: { _id: 0 } }).toArray();
  return docs.map(toUser);
}

// Replaces the whole collection with `users` — used only by the seed scripts, which build
// the full starter-account array once and call this exactly once.
export async function writeUsers(users: StoredUser[]): Promise<void> {
  const col = await usersCollection();
  await col.deleteMany({});
  if (users.length > 0) await col.insertMany(users as unknown as Document[]);
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  const needle = email.toLowerCase();
  const all = await readUsers();
  return all.find((u) => u.email.toLowerCase() === needle);
}

export async function findUserById(id: string): Promise<StoredUser | undefined> {
  const col = await usersCollection();
  const user = await col.findOne(legacyIdQuery(id), { projection: { _id: 0 } });
  return user ? toUser(user) : undefined;
}

export async function createUser(user: StoredUser): Promise<StoredUser> {
  const col = await usersCollection();
  try {
    await col.insertOne({ ...user } as Document);
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
    legacyIdQuery(id),
    { $set: patch as Document },
    { returnDocument: 'after', projection: { _id: 0 } }
  );
  return updated ? toUser(updated) : undefined;
}
