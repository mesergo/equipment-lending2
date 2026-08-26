// Express server for the equipment-lending app. Rebuilt from scratch to match the live
// lendingCRM admin panel (see PRD.md) — this file grows as each entity's routes are added
// (US-103 onward); today it only has auth.
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import cors from 'cors';
import express from 'express';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from './store';
import { signToken, requireAuth } from './auth';
import type { AuthedRequest } from './auth';
import { getDb } from './db';
import { catalogRouter } from './catalogRoutes';
import { loansRouter } from './loansRoutes';
import { paymentsRouter } from './paymentsRoutes';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', catalogRouter);
app.use('/api', loansRouter);
app.use('/api', paymentsRouter);

function toPublicUser(user: Awaited<ReturnType<typeof findUserByEmail>>) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    title: user.title,
  };
}

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(400).json({ error: 'יש להזין כתובת דואר אלקטרוני וסיסמה' });
    return;
  }

  const user = await findUserByEmail(String(email));
  if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
    res.status(401).json({ error: 'כתובת דואר אלקטרוני או סיסמה שגויים' });
    return;
  }

  res.json({ token: signToken(user), user: toPublicUser(user) });
});

app.get('/api/auth/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await findUserByEmail(req.auth!.email);
  if (!user) {
    res.status(401).json({ error: 'המשתמש לא נמצא' });
    return;
  }
  res.json({ user: toPublicUser(user) });
});

// Production deployment: this same Express process also serves the built frontend when it
// finds one. In local dev, `dist/` doesn't exist, so this block is skipped.
const DIST_DIR = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  app.use(express.static(DIST_DIR));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
  console.log(`Serving built frontend from ${DIST_DIR}`);
}

const PORT = Number(process.env.PORT) || Number(process.env.AUTH_SERVER_PORT) || 4001;

getDb()
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
      console.log('No users yet? Run: npm run seed:users');
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB — check MONGODB_URI in .env:', err);
    process.exit(1);
  });
