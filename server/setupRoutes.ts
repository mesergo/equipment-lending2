import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { StoredUser } from './store';
import { readUsers, writeUsers } from './store';

// One-time REMOTE setup, for hosts where you only have FTP + a control panel and no SSH/terminal
// to run `npm run seed:users` yourself (this is exactly the situation on plain shared hosting -
// see the deployment section in README.md). This route does the same thing seed-users.ts does
// locally, just reachable over HTTP once, right after the app is first deployed.
//
// Safety:
//  - Refuses everything unless SETUP_SECRET is set in the server's environment variables AND the
//    caller provides the same value - without it, this route always 403s. Unset SETUP_SECRET in
//    your panel once you've used this, so the route goes back to refusing everyone.
//  - Refuses if the `users` MongoDB collection already has accounts in it - it can only ever
//    create the starter accounts the very first time, never reset or overwrite real accounts.

interface SeedAccount {
  username: string;
  password: string;
  name: string;
  role: 'super_admin' | 'org_manager';
  organizationId?: string;
}

// Same TEST credentials as server/seed-users.ts - change them immediately after first login.
const DEFAULT_ACCOUNTS: SeedAccount[] = [
  { username: 'admin', password: 'ChangeMe!Admin1', name: 'סופר-אדמין מערכת', role: 'super_admin' },
  { username: 'hesed_manager', password: 'ChangeMe!Hesed1', name: 'מנהל עמותת חסד ומרפא', role: 'org_manager', organizationId: 'org-hesed' },
  { username: 'ezer_manager', password: 'ChangeMe!Ezer1', name: 'מנהל עזר מציון', role: 'org_manager', organizationId: 'org-ezer' },
  { username: 'yad_manager', password: 'ChangeMe!Yad1', name: 'מנהל יד שרה', role: 'org_manager', organizationId: 'org-yad' },
  { username: 'lev_manager', password: 'ChangeMe!Lev1', name: 'מנהל רחשי לב', role: 'org_manager', organizationId: 'org-lev' },
];

export const setupRouter = Router();

setupRouter.post('/setup/seed-users', async (req, res) => {
  const expected = process.env.SETUP_SECRET;
  const provided = String(req.query.secret || req.body?.secret || '');

  if (!expected) {
    res.status(403).json({ error: 'SETUP_SECRET אינו מוגדר בסביבת השרת - אין דרך להריץ הקמה מרחוק כרגע' });
    return;
  }
  if (provided !== expected) {
    res.status(403).json({ error: 'secret שגוי או חסר' });
    return;
  }
  const existing = await readUsers();
  if (existing.length > 0) {
    res.status(409).json({ error: 'כבר יש חשבונות ב-MongoDB - ההקמה כבר בוצעה קודם לכן' });
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

  res.json({
    ok: true,
    accounts: DEFAULT_ACCOUNTS.map(({ username, password, role, organizationId }) => ({
      username,
      password,
      role,
      organizationId,
    })),
    warning: 'אלו סיסמאות בדיקה בלבד - יש להחליף אותן מיד לאחר ההתחברות הראשונה, ולבטל את SETUP_SECRET בפאנל.',
  });
});
