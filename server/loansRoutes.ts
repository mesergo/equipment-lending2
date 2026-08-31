import { Router } from 'express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { createMongoStore } from './genericStore';
import { requireAuth, canAccessOrg } from './auth';
import type { AuthedRequest, AuthTokenPayload } from './auth';
import { productsStore, organizationsStore, customersStore, loansStore } from './catalogRoutes';
import { notify } from './notificationsRoutes';
import type { Loan, LoanStatus, ActionLog, Customer } from '../src/types';

// Loans are the core transaction lendingCRM is built around: a Loan links a Customer to a
// Product for a date range. Two things must stay in sync with every Loan create/update,
// exactly as observed on the live system's loan-edit screen:
//  1. Product.loanStatus (not_loaned/loaned/returned) — derived, never edited directly.
//  2. ActionLog — an auto-written audit trail entry, shown inline in the loan edit form on
//     the live system ("מנהל ארגון X עדכן... תאריך... סטטוס...").
// Unlike catalog entities, coordinators CAN create/update loans — that's their job.
//
// loansStore itself lives in catalogRoutes.ts (reads the real `lendings` collection) — it's
// defined there because computing Product.loanStatus also needs the raw lendings data, and
// that avoids a circular import between this file and catalogRoutes.ts.

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
    await notify(organizationId, 'השאלה חדשה', `${auth.email} יצר השאלה חדשה עבור ${product.name}`, loan.id);
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
    const product = await productsStore.find(existing.productId);
    await notify(existing.organizationId, 'החזרה הושלמה בהצלחה', `${auth.email} סימן שהמוצר ${product?.name ?? ''} הוחזר`, existing.id);
  }

  if (changeDescriptions.length > 0) {
    await logAction(existing.organizationId, auth.email, existing.id, `${auth.email} עדכן השאלה: ${changeDescriptions.join(', ')}`);
  }

  res.json({ item: updated });
});

// Public (no login) endpoint backing the "המשך לשלב הבא" button on the catalog page
// (PublicCatalogView) — a customer submitting the wizard has no auth token. Resolves the
// organization by its public token, finds-or-creates the Customer by phone within that org
// (matches how the live system's bedside request flow identifies returning customers by
// phone — see server/catalogRoutes.ts's /customers/lookup), then creates one Loan per
// selected product, applying the exact same Product.loanStatus flip + ActionLog write as the
// authenticated create path above. Products that became unavailable between page-load and
// submit (race with another customer, or staff) are silently skipped rather than failing the
// whole request — the response tells the caller which ones actually went through.
loansRouter.post('/public/loan-requests', async (req, res) => {
  const { token, productIds, firstName, lastName, phone, hospitalizedPatientName, loanDate, notes } = req.body || {};

  if (
    !token ||
    !Array.isArray(productIds) ||
    productIds.length === 0 ||
    !firstName ||
    !lastName ||
    !phone
  ) {
    res.status(400).json({ error: 'חסרים שדות נדרשים (מוצרים, שם פרטי, שם משפחה, טלפון)' });
    return;
  }

  const organizations = await organizationsStore.readAll();
  const organization = organizations.find((o) => o.token === token);
  if (!organization) {
    res.status(404).json({ error: 'ארגון לא נמצא' });
    return;
  }

  const normalizedPhone = String(phone).replace(/\D/g, '');
  const customers = await customersStore.readAll();
  let customer = customers.find(
    (c) => c.organizationId === organization.id && c.mobilePhone.replace(/\D/g, '') === normalizedPhone
  );
  if (!customer) {
    customer = await customersStore.create({
      id: `cust-${randomUUID()}`,
      organizationId: organization.id,
      firstName: String(firstName),
      lastName: String(lastName),
      mobilePhone: String(phone),
    } as Customer);
  }

  const today = new Date().toISOString().slice(0, 10);
  const requestedLoanDate = loanDate ? String(loanDate) : today;
  const createdLoans: Loan[] = [];

  for (const productId of productIds) {
    const product = await productsStore.find(String(productId));
    if (!product || product.organizationId !== organization.id) continue;
    if (product.loanStatus !== 'not_loaned') continue; // no longer available — skip, don't fail the whole request

    const loan: Loan = {
      id: `loan-${randomUUID()}`,
      organizationId: organization.id,
      status: 'loaned',
      customerId: customer.id,
      hospitalizedPatientName: hospitalizedPatientName ? String(hospitalizedPatientName) : undefined,
      productId: product.id,
      loanDate: requestedLoanDate,
      notes: notes ? String(notes) : undefined,
    };
    const created = await loansStore.create(loan);
    await productsStore.update(product.id, { loanStatus: 'loaned' });
    await logAction(
      organization.id,
      `${customer.firstName} ${customer.lastName} (בקשה ציבורית)`,
      loan.id,
      `בקשת השאלה ציבורית נוצרה עבור ${product.name}`
    );
    await notify(organization.id, 'השאלה חדשה', `בקשת השאלה ציבורית התקבלה עבור ${product.name} (${customer.firstName} ${customer.lastName})`, loan.id);
    createdLoans.push(created);
  }

  if (createdLoans.length === 0) {
    res.status(409).json({ error: 'המוצרים שנבחרו כבר אינם זמינים — נא לרענן ולנסות שוב' });
    return;
  }

  res.status(201).json({ loans: createdLoans, customer, skipped: productIds.length - createdLoans.length });
});

// Self-service return flow (public, no login), matching the live system's "החזרת ציוד" page:
// a customer enters their phone, sees what's currently out on loan, and picks what they're
// returning. Org-scoped by token like the rest of the public flow, so a phone number that
// exists in two different organizations can't cross over.
loansRouter.get('/public/customer-loans', async (req, res) => {
  const token = String(req.query.token || '');
  const phone = String(req.query.phone || '').replace(/\D/g, '');
  if (!token || !phone) {
    res.status(400).json({ error: 'חסר ארגון או מספר טלפון' });
    return;
  }

  const organizations = await organizationsStore.readAll();
  const organization = organizations.find((o) => o.token === token);
  if (!organization) {
    res.status(404).json({ error: 'ארגון לא נמצא' });
    return;
  }

  const customers = await customersStore.readAll();
  const customer = customers.find(
    (c) => c.organizationId === organization.id && c.mobilePhone.replace(/\D/g, '') === phone
  );
  if (!customer) {
    res.json({ loans: [] });
    return;
  }

  const [allLoans, allProducts] = await Promise.all([loansStore.readAll(), productsStore.readAll()]);
  const productsById = new Map(allProducts.map((p) => [p.id, p]));
  const openLoans = allLoans
    .filter((l) => l.customerId === customer.id && (l.status === 'loaned' || l.status === 'not_returned'))
    .map((l) => ({ id: l.id, productName: productsById.get(l.productId)?.name ?? l.productId, loanDate: l.loanDate }));

  res.json({ loans: openLoans });
});

loansRouter.post('/public/loan-returns', async (req, res) => {
  const { token, phone, loanIds } = req.body || {};
  if (!token || !phone || !Array.isArray(loanIds) || loanIds.length === 0) {
    res.status(400).json({ error: 'חסרים שדות נדרשים' });
    return;
  }

  const organizations = await organizationsStore.readAll();
  const organization = organizations.find((o) => o.token === token);
  if (!organization) {
    res.status(404).json({ error: 'ארגון לא נמצא' });
    return;
  }

  const normalizedPhone = String(phone).replace(/\D/g, '');
  const customers = await customersStore.readAll();
  const customer = customers.find(
    (c) => c.organizationId === organization.id && c.mobilePhone.replace(/\D/g, '') === normalizedPhone
  );
  if (!customer) {
    res.status(404).json({ error: 'לקוח לא נמצא' });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  let returnedCount = 0;

  for (const loanId of loanIds) {
    const loan = await loansStore.find(String(loanId));
    // Only ever act on a loan that's actually this customer's and still open — never trust
    // the id alone, since this endpoint has no auth to fall back on.
    if (!loan || loan.customerId !== customer.id || loan.organizationId !== organization.id) continue;
    if (loan.status !== 'loaned' && loan.status !== 'not_returned') continue;

    await loansStore.update(loan.id, { status: 'returned', returnDate: today });
    const product = await productsStore.find(loan.productId);
    if (product) await productsStore.update(product.id, { loanStatus: 'not_loaned' });
    await logAction(
      organization.id,
      `${customer.firstName} ${customer.lastName} (החזרה עצמאית)`,
      loan.id,
      `בקשת החזרה עצמאית התקבלה עבור ${product?.name ?? loan.productId}`
    );
    await notify(organization.id, 'החזרה הושלמה בהצלחה', `${customer.firstName} ${customer.lastName} החזיר/ה את ${product?.name ?? ''}`, loan.id);
    returnedCount++;
  }

  if (returnedCount === 0) {
    res.status(409).json({ error: 'לא נמצאו השאלות פתוחות תואמות להחזרה' });
    return;
  }

  res.json({ returned: returnedCount });
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
