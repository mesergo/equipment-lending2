import { Router } from 'express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { requireAuth, canAccessOrg } from './auth';
import type { AuthedRequest } from './auth';
import { wrapLegacyStore, toStr } from './catalogRoutes';
import type { LegacyDoc } from './catalogRoutes';
import type { Payment, PaymentStatus } from '../src/types';

// Payment is a data model only — no real clearing-company integration yet (see PRD.md §3
// Non-Goals). Like every other entity, `payments` is a raw legacy collection (Laravel/MySQL
// field names: charge_amount, payment_id_at_the_clearing_company, ...) — mapped at read time
// the same way as catalogRoutes.ts, reusing its wrapLegacyStore/toStr helpers instead of
// duplicating the pattern.
function toPayment(doc: LegacyDoc): Payment {
  return {
    id: String(doc.id),
    organizationId: String(doc.organizationId ?? doc.organization_id),
    customerId: String(doc.customerId ?? doc.customer_id),
    wasCharged: Boolean(doc.wasCharged ?? doc.charged),
    isCashPayment: Boolean(doc.isCashPayment ?? doc.is_cash ?? false),
    status: (doc.status ?? 'waiting') as PaymentStatus,
    amount: (doc.amount ?? undefined) as number | undefined,
    chargeAmount: doc.chargeAmount != null ? Number(doc.chargeAmount) : doc.charge_amount != null ? Number(doc.charge_amount) : undefined,
    chargeReason: toStr(doc.chargeReason ?? doc.charge_reason),
    issueDate: toStr(doc.issueDate ?? doc.release_date),
    date: toStr(doc.date),
    clearingCompanyPaymentId: toStr(doc.clearingCompanyPaymentId ?? doc.payment_id_at_the_clearing_company),
    lastCardDigits: toStr(doc.lastCardDigits ?? doc.last_4_digits_of_the_payment_method),
  };
}

export const paymentsStore = wrapLegacyStore('payments', toPayment);

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
    isCashPayment: body.isCashPayment ?? false,
    status: body.status ?? 'waiting',
    amount: body.amount,
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
