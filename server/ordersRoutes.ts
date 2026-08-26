import { Router } from 'express';
import type { Response } from 'express';
import { createOrder, findOrder, readOrders, updateOrder } from './ordersStore';
import { requireAuth } from './auth';
import type { AuthedRequest, AuthTokenPayload } from './auth';
import { runReminderSweep } from './reminders';
import { warehousesStore } from './catalogRoutes';
import type { OrderRecord, OrderStatus } from '../src/types';

function resolveOrgId(order: OrderRecord): string | undefined {
  return order.organizationId || warehousesStore.find(order.warehouseId)?.organizationId;
}

function canAccessOrder(auth: AuthTokenPayload, order: OrderRecord): boolean {
  if (auth.role === 'super_admin') return true;
  return auth.role === 'org_manager' && auth.organizationId === resolveOrgId(order);
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export const ordersRouter = Router();

// Public: a completed checkout persists its order here (see src/App.tsx's handleOrderComplete).
ordersRouter.post('/orders', (req, res) => {
  const order = req.body as Partial<OrderRecord>;
  if (!order || !order.id || !order.patientPhone || !order.expectedReturnDate) {
    res.status(400).json({ error: 'הזמנה חסרה שדות נדרשים' });
    return;
  }
  try {
    const created = createOrder(order as OrderRecord);
    res.status(201).json({ order: created });
  } catch (err) {
    res.status(409).json({ error: (err as Error).message });
  }
});

// Protected: admin/org-manager order list, always scoped server-side to the caller's own
// organization — an org_manager's token can never pull another organization's orders, even
// if the client is tampered with.
ordersRouter.get('/orders', requireAuth, (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const all = readOrders();
  const visible = auth.role === 'super_admin' ? all : all.filter((o) => resolveOrgId(o) === auth.organizationId);
  res.json({ orders: visible });
});

// Protected: generic staff update (dispatch/delivery status, hold status, volunteer assignment).
ordersRouter.patch('/orders/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const existing = findOrder(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'הזמנה לא נמצאה' });
    return;
  }
  if (!canAccessOrder(auth, existing)) {
    res.status(403).json({ error: 'אין הרשאה לעדכן הזמנה זו' });
    return;
  }

  // Only allow the fields staff actions actually touch — never let the client overwrite
  // patient/payment/organization details through this generic endpoint.
  const { orderStatus, holdStatus, assignedVolunteerName, assignedVolunteerPhone, actualReturnDate, notes } =
    req.body || {};
  const patch: Partial<OrderRecord> = {};
  if (orderStatus !== undefined) patch.orderStatus = orderStatus as OrderStatus;
  if (holdStatus !== undefined) patch.holdStatus = holdStatus;
  if (assignedVolunteerName !== undefined) patch.assignedVolunteerName = assignedVolunteerName;
  if (assignedVolunteerPhone !== undefined) patch.assignedVolunteerPhone = assignedVolunteerPhone;
  if (actualReturnDate !== undefined) patch.actualReturnDate = actualReturnDate;
  if (notes !== undefined) patch.notes = notes;

  const updated = updateOrder(existing.id, patch);
  res.json({ order: updated });
});

// Public: the customer's own "I already returned this" report. No login — instead it requires
// the phone number on file for the order, which is enough friction to stop random guessing of
// order ids without needing a whole customer account/login system.
ordersRouter.post('/orders/:id/report-return', (req, res) => {
  const order = findOrder(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'הזמנה לא נמצאה' });
    return;
  }

  const providedPhone = normalizePhone(String(req.body?.phone || ''));
  const knownPhones = [order.patientPhone, order.caregiverPhone].filter(Boolean).map(normalizePhone);
  if (!providedPhone || !knownPhones.some((p) => p === providedPhone)) {
    res.status(403).json({ error: 'מספר הטלפון אינו תואם את מספר הטלפון שנרשם בהזמנה זו' });
    return;
  }

  if (order.orderStatus !== 'active_in_ward') {
    res.status(400).json({ error: 'לא ניתן לדווח על החזרה עבור הזמנה זו במצבה הנוכחי' });
    return;
  }

  const updated = updateOrder(order.id, {
    orderStatus: 'return_reported',
    returnReportedAt: new Date().toISOString(),
  });
  res.json({ order: updated });
});

// Protected: staff confirms the return after physically inspecting the equipment.
ordersRouter.post('/orders/:id/confirm-return', requireAuth, (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const existing = findOrder(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'הזמנה לא נמצאה' });
    return;
  }
  if (!canAccessOrder(auth, existing)) {
    res.status(403).json({ error: 'אין הרשאה לאשר החזרה עבור הזמנה זו' });
    return;
  }

  const outcome = req.body?.outcome === 'needs_sanitizing' ? 'needs_sanitizing' : 'clean';
  const newStatus: OrderStatus = outcome === 'needs_sanitizing' ? 'returned_sanitizing' : 'returned_clean';

  const updated = updateOrder(existing.id, {
    orderStatus: newStatus,
    actualReturnDate: new Date().toISOString().slice(0, 10),
    returnConfirmedAt: new Date().toISOString(),
    returnConfirmedBy: auth.username,
  });
  res.json({ order: updated, outcome });
});

// Protected, super-admin only: trigger the reminder sweep on demand (handy for testing while
// WHATSAPP_PROVIDER is still "console" — no need to wait for the hourly interval).
ordersRouter.post('/reminders/run-now', requireAuth, async (req: AuthedRequest, res: Response) => {
  if (req.auth!.role !== 'super_admin') {
    res.status(403).json({ error: 'רק סופר-אדמין יכול להפעיל שליחה ידנית' });
    return;
  }
  const result = await runReminderSweep();
  res.json(result);
});
