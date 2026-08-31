import { Router } from 'express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { createMongoStore } from './genericStore';
import { requireAuth } from './auth';
import type { AuthedRequest } from './auth';
import type { Notification } from '../src/types';

// In-app notification center, matching the bell/badge seen on the live lendingCRM admin
// panel (loan created, loan returned). Org-scoped like every other entity — super_admin sees
// every organization's notifications, org_manager/coordinator only their own.
// NOT the `notifications` collection — that name is already taken by the real legacy
// system's own Laravel/Filament notification table (per-admin-user, UUID ids, JSON-encoded
// `data` column, `created_at`/`read_at` timestamps — a completely different shape). Writing
// there would corrupt real historical data and explains the "Invalid Date" seen while first
// wiring this up: `createMongoStore<Notification>('notifications')` was reading those legacy
// rows straight through with no field mapping. This collection is new and app-only.
export const notificationsStore = createMongoStore<Notification>('app_notifications');

export async function notify(organizationId: string, title: string, body: string, loanId?: string) {
  await notificationsStore.create({
    id: `notif-${randomUUID()}`,
    organizationId,
    title,
    body,
    date: new Date().toISOString(),
    read: false,
    loanId,
  });
}

export const notificationsRouter = Router();

notificationsRouter.get('/notifications', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const all = await notificationsStore.readAll();
  const visible = auth.role === 'super_admin' ? all : all.filter((n) => n.organizationId === auth.organizationId);
  visible.sort((a, b) => (a.date < b.date ? 1 : -1));
  res.json({ items: visible });
});

notificationsRouter.patch('/notifications/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  const updated = await notificationsStore.update(req.params.id, { read: Boolean(req.body?.read) });
  if (!updated) {
    res.status(404).json({ error: 'לא נמצא' });
    return;
  }
  res.json({ item: updated });
});

notificationsRouter.post('/notifications/mark-all-read', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const all = await notificationsStore.readAll();
  const mine = auth.role === 'super_admin' ? all : all.filter((n) => n.organizationId === auth.organizationId);
  await Promise.all(mine.filter((n) => !n.read).map((n) => notificationsStore.update(n.id, { read: true })));
  res.json({ ok: true });
});

notificationsRouter.delete('/notifications', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const all = await notificationsStore.readAll();
  const mine = auth.role === 'super_admin' ? all : all.filter((n) => n.organizationId === auth.organizationId);
  await Promise.all(mine.map((n) => notificationsStore.remove(n.id)));
  res.json({ ok: true });
});
