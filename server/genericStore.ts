import fs from 'node:fs';
import path from 'node:path';

// Small factory for a JSON-file-backed CRUD store - the exact same pattern as
// server/store.ts (users) and server/ordersStore.ts (orders), generalized so the new
// catalog entities (products, models, branches, customers) don't each need their own
// hand-written read/write/create/update boilerplate. Swap for a real MongoDB collection
// per entity later - callers only use the returned functions, never the file path directly.
export function createJsonStore<T extends { id: string }>(fileName: string, seed: T[]) {
  const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
  const FILE = path.join(DATA_DIR, fileName);

  function ensureSeeded(): void {
    if (fs.existsSync(FILE)) return;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(seed, null, 2), 'utf-8');
  }

  function readAll(): T[] {
    ensureSeeded();
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  }

  function writeAll(items: T[]): void {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(items, null, 2), 'utf-8');
  }

  function find(id: string): T | undefined {
    return readAll().find((i) => i.id === id);
  }

  function create(item: T): T {
    const items = readAll();
    if (items.some((i) => i.id === item.id)) {
      throw new Error(`${fileName}: id ${item.id} already exists`);
    }
    writeAll([item, ...items]);
    return item;
  }

  function update(id: string, patch: Partial<T>): T | undefined {
    const items = readAll();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    const updated = { ...items[idx], ...patch };
    items[idx] = updated;
    writeAll(items);
    return updated;
  }

  function remove(id: string): boolean {
    const items = readAll();
    const next = items.filter((i) => i.id !== id);
    if (next.length === items.length) return false;
    writeAll(next);
    return true;
  }

  return { readAll, writeAll, find, create, update, remove };
}
