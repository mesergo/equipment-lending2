import { MongoClient, type Db } from 'mongodb';

// Single shared MongoDB connection for the whole server. Every store (server/store.ts,
// server/ordersStore.ts, server/genericStore.ts) calls getDb() instead of each managing its
// own MongoClient - mirrors the "one JWT_SECRET check at startup" pattern already used in
// server/auth.ts, just for the DB connection instead of the signing secret.

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Missing MONGODB_URI. Copy .env.example to .env and set MONGODB_URI to your MongoDB ' +
      'connection string (Atlas or local) before starting the server.'
  );
}

let dbPromise: Promise<Db> | null = null;

export function getDb(): Promise<Db> {
  if (!dbPromise) {
    const client = new MongoClient(MONGODB_URI as string);
    dbPromise = client.connect().then((connected) => connected.db());
  }
  return dbPromise;
}
