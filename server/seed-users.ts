// One-time setup script: creates starter accounts (one super-admin, one manager per
// organization from src/data/mockData.ts) in the `users` MongoDB collection, each with a
// securely hashed password.
//
// Run once with:  npm run seed:users
//
// It refuses to touch an existing collection that already has users in it, so re-running it
// later never wipes real accounts.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { StoredUser } from './store';
import { readUsers, writeUsers } from './store';

interface SeedAccount {
  username: string;
  password: string;
  name: string;
  role: 'super_admin' | 'org_manager';
  organizationId?: string;
}

// Passwords here are TEST credentials only — change them (or edit the `users` collection
// directly / re-hash with bcryptjs) before giving real access to anyone.
const DEFAULT_ACCOUNTS: SeedAccount[] = [
  { username: 'admin', password: 'ChangeMe!Admin1', name: 'סופר-אדמין מערכת', role: 'super_admin' },
  { username: 'hesed_manager', password: 'ChangeMe!Hesed1', name: 'מנהל עמותת חסד ומרפא', role: 'org_manager', organizationId: 'org-hesed' },
  { username: 'ezer_manager', password: 'ChangeMe!Ezer1', name: 'מנהל עזר מציון', role: 'org_manager', organizationId: 'org-ezer' },
  { username: 'yad_manager', password: 'ChangeMe!Yad1', name: 'מנהל יד שרה', role: 'org_manager', organizationId: 'org-yad' },
  { username: 'lev_manager', password: 'ChangeMe!Lev1', name: 'מנהל רחשי לב', role: 'org_manager', organizationId: 'org-lev' },
];

async function main() {
  const existing = await readUsers();
  if (existing.length > 0) {
    console.log('The `users` MongoDB collection already has accounts in it — leaving it untouched.');
    console.log('Delete those documents yourself first if you really want to re-seed from scratch.');
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

  await writeUsers(users);

  console.log('Created starter accounts in MongoDB:\n');
  for (const acc of DEFAULT_ACCOUNTS) {
    const roleLabel = acc.organizationId ? `${acc.role} — ${acc.organizationId}` : acc.role;
    console.log(`  ${acc.username.padEnd(16)} ${acc.password.padEnd(20)} (${roleLabel})`);
  }
  console.log('\nThese are TEST passwords only. Change them before this goes anywhere real:');
  console.log('either edit the `users` collection directly (with a fresh bcrypt hash), or delete');
  console.log('those documents and re-run "npm run seed:users" after editing the accounts in this script.');
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
