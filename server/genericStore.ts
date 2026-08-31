import { getDb } from './db';
import type { Document } from 'mongodb';

// Some collections (the legacy lendingCRM tables migrated as-is into MongoDB — equipment_warehouses,
// product_models, products, lendings, users, ...) store `id` as a real number (e.g. 28), not this
// app's string convention. A route param or JWT `sub` is always a string, and Mongo equality
// queries are type-strict ({id: "28"} never matches a stored {id: 28}) — so any store reading one
// of those collections must match both representations. New items this app creates still get its
// own string ids (e.g. `wh-<uuid>`), which this also matches unchanged (falls through to the plain
// {id} query below).
export function legacyIdQuery(id: string): Record<string, unknown> {
  const asNumber = Number(id);
  if (id !== '' && Number.isFinite(asNumber) && String(asNumber) === id) {
    return { id: { $in: [id, asNumber] } };
  }
  return { id };
}

// Small factory for a MongoDB-backed CRUD store, shared by every entity in the new data
// model (organizations, branches, warehouses, categories, models, products, customers,
// loans, payments, action logs). Untyped Document collection rather than Collection<T>: the
// mongodb driver's generic helper types (OptionalUnlessRequiredId<T>, WithId<T>) don't
// resolve cleanly against a generic `T extends { id: string }` here, so we cast at the
// boundaries below instead.
export function createMongoStore<T extends { id: string }>(
  collectionName: string,
  seed: T[] = [],
  matchId: (id: string) => Record<string, unknown> = (id) => ({ id })
) {
  let ready: Promise<unknown> | null = null;

  async function collection() {
    const db = await getDb();
    const col = db.collection<Document>(collectionName);
    if (!ready) {
      ready = col
        .createIndex({ id: 1 }, { unique: true })
        .then(() => col.countDocuments())
        .then((count) => {
          if (count === 0 && seed.length > 0) return col.insertMany(seed as Document[]);
        });
    }
    await ready;
    return col;
  }

  async function readAll(): Promise<T[]> {
    const col = await collection();
    const docs = await col.find({}, { projection: { _id: 0 } }).toArray();
    return docs as unknown as T[];
  }

  async function find(id: string): Promise<T | undefined> {
    const col = await collection();
    const item = await col.findOne(matchId(id), { projection: { _id: 0 } });
    return (item as unknown as T | null) ?? undefined;
  }

  async function create(item: T): Promise<T> {
    const col = await collection();
    try {
      await col.insertOne({ ...item } as Document);
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new Error(`${collectionName}: id ${item.id} already exists`);
      }
      throw err;
    }
    return item;
  }

  async function update(id: string, patch: Partial<T>): Promise<T | undefined> {
    const col = await collection();
    const updated = await col.findOneAndUpdate(
      matchId(id),
      { $set: patch as Document },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    return (updated as unknown as T | null) ?? undefined;
  }

  async function remove(id: string): Promise<boolean> {
    const col = await collection();
    const res = await col.deleteOne(matchId(id));
    return res.deletedCount > 0;
  }

  return { readAll, find, create, update, remove };
}
