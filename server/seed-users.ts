// One-time setup script: creates server/data/users.json with starter accounts (one super-admin,
// one manager per organization from src/data/mockData.ts), each with a securely hashed password.
//
// Run once with:  npm run seed:users
//
// It refuses to touch an existing users.json, so re-running it later never wipes real accounts.
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { StoredUser } from './store';
import { writeUsers } from './store';

const USERS_FILE = path.resolve(process.cwd(), 'server', 'data', 'users.json');

interface SeedAccount {
  username: string;
  password: string;
  name: string;
  role: 'super_admin' | 'org_manager';
  organizationId?: string;
}

// Passwords here are TEST credentials only — change them (or edit server/data/users.json /
// re-hash with bcryptjs) before giving real access to anyone.
const DEFAULT_ACCOUNTS: SeedAccount[] = [
  { username: 'admin', password: 'ChangeMe!Admin1', name: 'סופר-אדמין מערכת', role: 'super_admin' },
  { username: 'hesed_manager', password: 'ChangeMe!Hesed1', name: 'מנהל עמותת חסד ומרפא', role: 'org_manager', organizationId: 'org-hesed' },
  { username: 'ezer_manager', password: 'ChangeMe!Ezer1', name: 'מנהל עזר מציון', role: 'org_manager', organizationId: 'org-ezer' },
  { username: 'yad_manager', password: 'ChangeMe!Yad1', name: 'מנהל יד שרה', role: 'org_manager', organizationId: 'org-yad' },
  { username: 'lev_manager', password: 'ChangeMe!Lev1', name: 'מנהל רחשי לב', role: 'org_manager', organizationId: 'org-lev' },
];

function main() {
  if (fs.existsSync(USERS_FILE)) {
    console.log(`server/data/users.json already exists — leaving it untouched.\n(${USERS_FILE})`);
    console.log('Delete that file yourself first if you really want to re-seed from scratch.');
    return;
  }

  const users: StoredUser[] = DEFAULT_ACCOUNTS.map((acc) => ({
    id: randomUUID(),
    username: acc.username,
    passwordHash: bcrypt.hashSync(acc.password, 10),
    name: acc.name,
    role: acc.role,
    organizationId: acc.organizationId,
  }));

  writeUsers(users);

  console.log('Created server/data/users.json with these starter accounts:\n');
  for (const acc of DEFAULT_ACCOUNTS) {
    const roleLabel = acc.organizationId ? `${acc.role} — ${acc.organizationId}` : acc.role;
    console.log(`  ${acc.username.padEnd(16)} ${acc.password.padEnd(20)} (${roleLabel})`);
  }
  console.log('\nThese are TEST passwords only. Change them before this goes anywhere real:');
  console.log('either edit server/data/users.json directly (with a fresh bcrypt hash), or delete');
  console.log('the file and re-run "npm run seed:users" after editing the accounts in this script.');
}

main();
