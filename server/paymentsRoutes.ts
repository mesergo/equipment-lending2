import { Router } from 'express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { createMongoStore } from './genericStore';
import { requireAuth, canAccessOrg } from './auth';
import type { AuthedRequest } from './auth';
import type { Payment } from '../src/types';

// Payment is a data model only — no real clearing-company integration yet (see PRD.md §3
// Non-Goals). Standard org-scoped CRUD, same shape as the catalog entities.

export const paymentsStore = createMongoStore<Payment>('payments');

export const paymentsRouter = Router();

paymentsRouter.get('/payments', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const all = await paymentsStore.readAll();
  const visible = auth.role === 'super_admin' ? all : all.filter((p) => p.organizationId === auth.organizationId);
  res.json({ items: visible });
});

paymentsRouter.post('/payments', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const body = req.body as Partial<Payment>;
  const organizationId = auth.role === 'super_admin' ? body.organizationId : auth.organizationId;
  if (!organizationId || !body.customerId) {
    res.status(400).json({ error: 'חסר ארגון או לקוח' });
    return;
  }
  const item: Payment = {
    id: `payment-${randomUUID()}`,
    organizationId,
    customerId: body.customerId,
    wasCharged: body.wasCharged ?? false,
    status: body.status ?? 'waiting',
    chargeAmount: body.chargeAmount,
    chargeReason: body.chargeReason,
    issueDate: body.issueDate,
    date: body.date,
    clearingCompanyPaymentId: body.clearingCompanyPaymentId,
    lastCardDigits: body.lastCardDigits,
  };
  try {
    const created = await paymentsStore.create(item);
    res.status(201).json({ item: created });
  } catch (err) {
    res.status(409).json({ error: (err as Error).message });
  }
});

paymentsRouter.patch('/payments/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const existing = await paymentsStore.find(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'לא נמצא' });
    return;
  }
  if (!canAccessOrg(auth, existing.organizationId)) {
    res.status(403).json({ error: 'אין הרשאה' });
    return;
  }
  const { organizationId: _ignored, ...patch } = req.body || {};
  const updated = await paymentsStore.update(existing.id, patch);
  res.json({ item: updated });
});
