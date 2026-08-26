// One-time setup script: creates starter accounts (one super-admin, one org manager and one
// coordinator for a demo organization) in the `users` MongoDB collection, each with a
// securely hashed password.
//
// Run once with:  npm run seed:users
//
// Refuses to touch a collection that already has users in it, so re-running it later never
// wipes real accounts.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { StoredUser } from '../src/types';
import { readUsers, writeUsers } from './store';

interface SeedAccount {
  email: string;
  password: string;
  name: string;
  role: StoredUser['role'];
  organizationId?: string;
  title?: string;
}

// Passwords here are TEST credentials only — change them before giving real access to anyone.
const DEFAULT_ACCOUNTS: SeedAccount[] = [
  { email: 'admin@example.com', password: 'ChangeMe!Admin1', name: 'מנהל ראשי', role: 'super_admin' },
  { email: 'manager@example.com', password: 'ChangeMe!Manager1', name: 'מנהל ארגון דוגמה', role: 'org_manager', organizationId: 'org-demo' },
  { email: 'coordinator@example.com', password: 'ChangeMe!Coord1', name: 'סדרן ארגון דוגמה', role: 'coordinator', organizationId: 'org-demo', title: 'סדרן' },
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
    email: acc.email,
    passwordHash: bcrypt.hashSync(acc.password, 10),
    name: acc.name,
    role: acc.role,
    organizationId: acc.organizationId,
    title: acc.title,
  }));

  await writeUsers(users);

  console.log('Created starter accounts in MongoDB:\n');
  for (const acc of DEFAULT_ACCOUNTS) {
    const roleLabel = acc.organizationId ? `${acc.role} — ${acc.organizationId}` : acc.role;
    console.log(`  ${acc.email.padEnd(24)} ${acc.password.padEnd(20)} (${roleLabel})`);
  }
  console.log('\nThese are TEST passwords only. Change them before this goes anywhere real.');
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
