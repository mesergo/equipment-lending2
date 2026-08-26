import { Router } from 'express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { requireAuth } from './auth';
import type { AuthedRequest, AuthTokenPayload } from './auth';
import { readUsers, findUserById, createUser, updateUser } from './store';
import type { StoredUser, UserRole } from '../src/types';

// User management (US-113). Only super_admin and org_manager manage users — coordinators
// don't get a "ניהול הרשאות" screen. super_admin can create/edit any role in any
// organization; org_manager is confined to org_manager/coordinator within their own org
// (never super_admin, never another organization).

function toPublicUser(user: StoredUser) {
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}

function canManageUsers(auth: AuthTokenPayload): boolean {
  return auth.role === 'super_admin' || auth.role === 'org_manager';
}

// Which roles the caller is allowed to assign to someone else.
function assignableRoles(auth: AuthTokenPayload): UserRole[] {
  return auth.role === 'super_admin' ? ['super_admin', 'org_manager', 'coordinator'] : ['org_manager', 'coordinator'];
}

export const usersRouter = Router();

usersRouter.get('/users', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  if (!canManageUsers(auth)) {
    res.status(403).json({ error: 'אין הרשאה' });
    return;
  }
  const all = await readUsers();
  const visible = auth.role === 'super_admin' ? all : all.filter((u) => u.organizationId === auth.organizationId);
  res.json({ items: visible.map(toPublicUser) });
});

usersRouter.post('/users', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  if (!canManageUsers(auth)) {
    res.status(403).json({ error: 'אין הרשאה' });
    return;
  }
  const body = req.body as Partial<StoredUser> & { password?: string };
  if (!body.email || !body.password || !body.name || !body.role) {
    res.status(400).json({ error: 'חסרים שדות נדרשים (מייל, סיסמה, שם, תפקיד)' });
    return;
  }
  if (!assignableRoles(auth).includes(body.role)) {
    res.status(403).json({ error: 'אין הרשאה להקצות תפקיד זה' });
    return;
  }
  const organizationId = auth.role === 'org_manager' ? auth.organizationId : body.organizationId;
  if (body.role !== 'super_admin' && !organizationId) {
    res.status(400).json({ error: 'חסר ארגון' });
    return;
  }

  const user: StoredUser = {
    id: `user-${randomUUID()}`,
    email: body.email,
    passwordHash: bcrypt.hashSync(body.password, 10),
    name: body.name,
    role: body.role,
    organizationId: body.role === 'super_admin' ? undefined : organizationId,
    title: body.title,
  };

  try {
    const created = await createUser(user);
    res.status(201).json({ item: toPublicUser(created) });
  } catch (err) {
    res.status(409).json({ error: (err as Error).message });
  }
});

usersRouter.patch('/users/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  if (!canManageUsers(auth)) {
    res.status(403).json({ error: 'אין הרשאה' });
    return;
  }
  const existing = await findUserById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'לא נמצא' });
    return;
  }
  if (auth.role === 'org_manager' && existing.organizationId !== auth.organizationId) {
    res.status(403).json({ error: 'אין הרשאה' });
    return;
  }

  const { name, title, role, password } = req.body as Partial<StoredUser> & { password?: string };
  const patch: Partial<StoredUser> = {};
  if (name !== undefined) patch.name = name;
  if (title !== undefined) patch.title = title;
  if (role !== undefined) {
    if (!assignableRoles(auth).includes(role)) {
      res.status(403).json({ error: 'אין הרשאה להקצות תפקיד זה' });
      return;
    }
    patch.role = role;
  }
  if (password) patch.passwordHash = bcrypt.hashSync(password, 10);

  const updated = await updateUser(existing.id, patch);
  res.json({ item: updated ? toPublicUser(updated) : null });
});
