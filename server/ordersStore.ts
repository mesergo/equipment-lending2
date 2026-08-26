import fs from 'node:fs';
import path from 'node:path';
import type { OrderRecord } from '../src/types';
import { INITIAL_ORDERS } from '../src/data/mockData';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// NOTE: this is a small JSON-file store — the same pattern as server/store.ts for users.
// Orders used to live only in the browser's React state, which meant a page refresh
// silently deleted every loan record, and two browsers/devices never saw the same data.
// Moving them here is what makes WhatsApp reminders (a server process, not a browser tab)
// and cross-device admin notifications possible at all. When you migrate to MongoDB, swap
// the functions below for an `orders` collection — the routes in server/index.ts and the
// reminder sweep in server/reminders.ts don't need to change.

function ensureSeeded(): void {
  if (fs.existsSync(ORDERS_FILE)) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(INITIAL_ORDERS, null, 2), 'utf-8');
}

export function readOrders(): OrderRecord[] {
  ensureSeeded();
  return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
}

export function writeOrders(orders: OrderRecord[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}

export function findOrder(id: string): OrderRecord | undefined {
  return readOrders().find((o) => o.id === id);
}

export function createOrder(order: OrderRecord): OrderRecord {
  const orders = readOrders();
  if (orders.some((o) => o.id === order.id)) {
    throw new Error(`Order ${order.id} already exists`);
  }
  writeOrders([order, ...orders]);
  return order;
}

export function updateOrder(id: string, patch: Partial<OrderRecord>): OrderRecord | undefined {
  const orders = readOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return undefined;
  const updated = { ...orders[idx], ...patch };
  orders[idx] = updated;
  writeOrders(orders);
  return updated;
}
