// Minimal local auth server for the equipment-lending app.
//
// This is intentionally small: it only handles login/session validation with a real,
// server-checked password + signed token (instead of the old "URL hash" access model).
// It does NOT yet own the equipment/orders/etc. data — that still lives in the React app's
// in-memory mock state (src/data/mockData.ts). When you migrate everything to your MongoDB
// server, this is the place to grow: swap server/store.ts to read/write a `users` collection,
// and add the equipment/orders/etc. routes here, each protected with requireAuth (and checking
// req.auth.organizationId against the record being modified) instead of trusting the client.
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import cors from 'cors';
import express from 'express';
import bcrypt from 'bcryptjs';
import { findUserByUsername } from './store';
import { signToken, requireAuth } from './auth';
import type { AuthedRequest } from './auth';
import { ordersRouter } from './ordersRoutes';
import { catalogRouter } from './catalogRoutes';
import { aiSearchRouter } from './aiSearchRoutes';
import { setupRouter } from './setupRoutes';
import { runReminderSweep } from './reminders';
import { getDb } from './db';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', ordersRouter);
app.use('/api', catalogRouter);
app.use('/api', aiSearchRouter);
app.use('/api', setupRouter);

function toPublicUser(user: ReturnType<typeof findUserByUsername>) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
  };
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    res.status(400).json({ error: 'יש להזין שם משתמש וסיסמה' });
    return;
  }

  const user = findUserByUsername(String(username));
  if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
    res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
    return;
  }

  res.json({ token: signToken(user), user: toPublicUser(user) });
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
  const user = findUserByUsername(req.auth!.username);
  if (!user) {
    res.status(401).json({ error: 'המשתמש לא נמצא' });
    return;
  }
  res.json({ user: toPublicUser(user) });
});

// Production deployment (e.g. cPanel's "Setup Node.js App" / Passenger): a shared-hosting Node
// app slot typically runs a single process per domain, so instead of the local-dev setup (Vite's
// own dev server + this API server, on two ports, wired together by vite.config.ts's proxy),
// this same Express process also serves the built frontend when it finds one - see
// `npm run build:deploy` (builds both `dist/` and this file's compiled form). In local dev,
// `dist/` doesn't exist, so this block is simply skipped and nothing changes about `npm run dev`.
// Registered LAST, after every API route above, so it never intercepts an /api/* request.
const DIST_DIR = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  app.use(express.static(DIST_DIR));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
  console.log(`Serving built frontend from ${DIST_DIR}`);
}

// PORT: shared hosts running this via Phusion Passenger (cPanel's Node.js App setup) assign the
// port themselves and expose it as process.env.PORT - that takes priority when present. Falls
// back to AUTH_SERVER_PORT (local dev / a plain VPS) and then 4001.
const PORT = Number(process.env.PORT) || Number(process.env.AUTH_SERVER_PORT) || 4001;

// WhatsApp return reminders: checks every REMINDER_CHECK_INTERVAL_MINUTES (default 60) whether
// any order needs a reminder today. Runs as long as this process runs — no browser tab required.
// With WHATSAPP_PROVIDER unset (or "console"), nothing is actually sent; it's logged to the
// console and to server/data/whatsapp-log.jsonl instead. See server/whatsapp.ts.
const REMINDER_INTERVAL_MS = (Number(process.env.REMINDER_CHECK_INTERVAL_MINUTES) || 60) * 60 * 1000;

function runSweepAndLog() {
  runReminderSweep()
    .then((result) => {
      if (result.sent > 0) {
        console.log(`[reminders] sent ${result.sent}/${result.checked} reminder(s): ${result.sentOrderIds.join(', ')}`);
      }
    })
    .catch((err) => console.error('[reminders] sweep failed', err));
}

// Wait for MongoDB before accepting any traffic — a route that hits the DB before it's
// connected would otherwise fail with a confusing error deep in some store call instead of a
// clear one here at startup.
getDb()
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
      console.log('No users yet? Run: npm run seed:users');
    });
    runSweepAndLog(); // once on startup, so a fresh `npm run dev` shows something immediately
    setInterval(runSweepAndLog, REMINDER_INTERVAL_MS);
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB — check MONGODB_URI in .env:', err);
    process.exit(1);
  });
