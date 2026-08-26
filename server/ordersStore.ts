import { getDb } from './db';
import type { OrderRecord } from '../src/types';
import { INITIAL_ORDERS } from '../src/data/mockData';

// MongoDB-backed order storage — the same pattern as server/store.ts for users. Orders used
// to live only in the browser's React state, which meant a page refresh silently deleted
// every loan record, and two browsers/devices never saw the same data. Persisting them here is
// what makes WhatsApp reminders (a server process, not a browser tab) and cross-device admin
// notifications possible at all.
//
// createOrder/updateOrder use atomic Mongo operations (insertOne / findOneAndUpdate) rather
// than a read-all-then-write-all cycle, so two concurrent requests can't race and clobber each
// other's changes the way the old JSON-file version could.

const COLLECTION = 'orders';

let ready: Promise<unknown> | null = null;

async function ordersCollection() {
  const db = await getDb();
  const col = db.collection<OrderRecord>(COLLECTION);
  if (!ready) {
    ready = col
      .createIndex({ id: 1 }, { unique: true })
      .then(() => col.countDocuments())
      .then((count) => {
        if (count === 0 && INITIAL_ORDERS.length > 0) return col.insertMany(INITIAL_ORDERS);
      });
  }
  await ready;
  return col;
}

// Newest first, matching the old JSON-file behavior of prepending each new order.
export async function readOrders(): Promise<OrderRecord[]> {
  const col = await ordersCollection();
  return col.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
}

export async function findOrder(id: string): Promise<OrderRecord | undefined> {
  const col = await ordersCollection();
  const order = await col.findOne({ id }, { projection: { _id: 0 } });
  return order ?? undefined;
}

export async function createOrder(order: OrderRecord): Promise<OrderRecord> {
  const col = await ordersCollection();
  try {
    await col.insertOne({ ...order });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new Error(`Order ${order.id} already exists`);
    }
    throw err;
  }
  return order;
}

export async function updateOrder(id: string, patch: Partial<OrderRecord>): Promise<OrderRecord | undefined> {
  const col = await ordersCollection();
  const updated = await col.findOneAndUpdate(
    { id },
    { $set: patch },
    { returnDocument: 'after', projection: { _id: 0 } }
  );
  return updated ?? undefined;
}
