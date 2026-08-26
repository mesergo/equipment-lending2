import { MongoClient, type Db } from 'mongodb';

// Single shared MongoDB connection for the whole server. Every store calls getDb()
// instead of each managing its own MongoClient.

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Missing MONGODB_URI. Copy .env.example to .env and set MONGODB_URI to your MongoDB ' +
      'connection string before starting the server.'
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
