import fs from 'node:fs';
import path from 'node:path';

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: 'super_admin' | 'org_manager';
  // Required when role === 'org_manager'. Matches Organization.id in src/data/mockData.ts.
  organizationId?: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// NOTE: this is a small JSON-file store, only meant to get real login working quickly
// without any external service. When you move the app onto your own MongoDB server,
// replace the three functions below with calls to a `users` collection there — the rest
// of the app (JWT signing/verification, the /api/auth routes, the React AuthContext) does
// not need to change at all.

export function readUsers(): StoredUser[] {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

export function writeUsers(users: StoredUser[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export function findUserByUsername(username: string): StoredUser | undefined {
  const needle = username.toLowerCase();
  return readUsers().find((u) => u.username.toLowerCase() === needle);
}
