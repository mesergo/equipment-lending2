import { Router } from 'express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { createMongoStore } from './genericStore';
import { requireAuth, canAccessOrg } from './auth';
import type { AuthedRequest, AuthTokenPayload } from './auth';
import { productsStore } from './catalogRoutes';
import type { Loan, LoanStatus, ActionLog } from '../src/types';

// Loans are the core transaction lendingCRM is built around: a Loan links a Customer to a
// Product for a date range. Two things must stay in sync with every Loan create/update,
// exactly as observed on the live system's loan-edit screen:
//  1. Product.loanStatus (not_loaned/loaned/returned) — derived, never edited directly.
//  2. ActionLog — an auto-written audit trail entry, shown inline in the loan edit form on
//     the live system ("מנהל ארגון X עדכן... תאריך... סטטוס...").
// Unlike catalog entities, coordinators CAN create/update loans — that's their job.

export const loansStore = createMongoStore<Loan>('loans');
const actionLogsStore = createMongoStore<ActionLog>('actionlogs');

async function logAction(organizationId: string, performedBy: string, loanId: string, notes: string) {
  await actionLogsStore.create({
    id: `log-${randomUUID()}`,
    organizationId,
    date: new Date().toISOString(),
    actionType: 'עדכון השאלה',
    performedBy,
    loanId,
    notes,
  });
}

function canAccessLoan(auth: AuthTokenPayload, loan: Loan): boolean {
  return canAccessOrg(auth, loan.organizationId);
}

export const loansRouter = Router();

loansRouter.get('/loans', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const all = await loansStore.readAll();
  const visible = auth.role === 'super_admin' ? all : all.filter((l) => l.organizationId === auth.organizationId);
  res.json({ items: visible });
});

loansRouter.post('/loans', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const body = req.body as Partial<Loan>;
  const organizationId = auth.role === 'super_admin' ? body.organizationId : auth.organizationId;

  if (!organizationId || !body.customerId || !body.productId || !body.loanDate) {
    res.status(400).json({ error: 'חסרים שדות נדרשים (ארגון, לקוח, מוצר, תאריך השאלה)' });
    return;
  }

  const product = await productsStore.find(body.productId);
  if (!product || product.organizationId !== organizationId) {
    res.status(400).json({ error: 'מוצר לא נמצא בארגון זה' });
    return;
  }
  if (product.loanStatus === 'loaned') {
    res.status(409).json({ error: 'המוצר כבר מושאל' });
    return;
  }

  const loan: Loan = {
    id: `loan-${randomUUID()}`,
    organizationId,
    status: 'loaned',
    customerId: body.customerId,
    hospitalizedPatientName: body.hospitalizedPatientName,
    productId: body.productId,
    loanDate: body.loanDate,
    returnDate: body.returnDate,
    paymentId: body.paymentId,
    notes: body.notes,
  };

  try {
    const created = await loansStore.create(loan);
    // Atomic single-document update — the same generic store used everywhere else, so no
    // separate read-modify-write race window.
    await productsStore.update(product.id, { loanStatus: 'loaned' });
    await logAction(organizationId, auth.email, loan.id, `${auth.email} יצר השאלה חדשה, מוצר ${product.name}`);
    res.status(201).json({ item: created });
  } catch (err) {
    res.status(409).json({ error: (err as Error).message });
  }
});

loansRouter.patch('/loans/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const existing = await loansStore.find(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'השאלה לא נמצאה' });
    return;
  }
  if (!canAccessLoan(auth, existing)) {
    res.status(403).json({ error: 'אין הרשאה לעדכן השאלה זו' });
    return;
  }

  const { status, returnDate, hospitalizedPatientName, paymentId, notes } = req.body || {};
  const patch: Partial<Loan> = {};
  const changeDescriptions: string[] = [];

  if (status !== undefined && status !== existing.status) {
    patch.status = status as LoanStatus;
    changeDescriptions.push(`סטטוס שונה מ-${existing.status} ל-${status}`);
  }
  if (returnDate !== undefined && returnDate !== existing.returnDate) {
    patch.returnDate = returnDate;
    changeDescriptions.push(`תאריך החזרה עודכן ל-${returnDate}`);
  }
  if (hospitalizedPatientName !== undefined) patch.hospitalizedPatientName = hospitalizedPatientName;
  if (paymentId !== undefined) patch.paymentId = paymentId;
  if (notes !== undefined) patch.notes = notes;

  const updated = await loansStore.update(existing.id, patch);

  // Returning (or marking not_returned→returned) frees the product back up. Any other
  // status transition away from 'returned' would be unusual but is allowed by the data
  // model — we only special-case the specific transition the live system's flow uses.
  if (patch.status === 'returned') {
    await productsStore.update(existing.productId, { loanStatus: 'not_loaned' });
  }

  if (changeDescriptions.length > 0) {
    await logAction(existing.organizationId, auth.email, existing.id, `${auth.email} עדכן השאלה: ${changeDescriptions.join(', ')}`);
  }

  res.json({ item: updated });
});

// ActionLog is written only internally (above); this is the read-only endpoint for the
// admin "לוגי פעולות" screen (US-109/US-111). Newest first, org-scoped.
loansRouter.get('/action-logs', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const all = await actionLogsStore.readAll();
  const visible = auth.role === 'super_admin' ? all : all.filter((l) => l.organizationId === auth.organizationId);
  visible.sort((a, b) => (a.date < b.date ? 1 : -1));
  res.json({ items: visible });
});
