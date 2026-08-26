import { Router } from 'express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { createMongoStore } from './genericStore';
import { requireAuth, canAccessOrg } from './auth';
import type { AuthedRequest, AuthTokenPayload } from './auth';
import type { Organization, Branch, Warehouse, Category, Model, Product, Customer } from '../src/types';

// Server-side persistence for the full catalog hierarchy seen in lendingCRM:
// Organization > Branch / Warehouse / Category > Model > Product (SKU), plus Customer.
// See PRD.md §2 for the field-by-field source. All entities share the same generic
// org-scoped CRUD shape (makeCrud below) except Organizations, which only super_admin
// can create/edit/delete (organizations aren't self-service).

export const organizationsStore = createMongoStore<Organization>('organizations');
export const branchesStore = createMongoStore<Branch>('branches');
export const warehousesStore = createMongoStore<Warehouse>('warehouses');
export const categoriesStore = createMongoStore<Category>('categories');
export const modelsStore = createMongoStore<Model>('models');
export const productsStore = createMongoStore<Product>('products');
export const customersStore = createMongoStore<Customer>('customers');

// Coordinators can view catalog data (read routes are public/auth-read below) but not
// create/edit/delete it — that's reserved for org_manager and super_admin. See progress.txt
// (US-102 learning) for why this check lives here rather than in canAccessOrg.
function canWriteCatalog(auth: AuthTokenPayload): boolean {
  return auth.role === 'super_admin' || auth.role === 'org_manager';
}

export const catalogRouter = Router();

// ---- Organizations: public read (the catalog page needs it by token), super_admin-only write ----
catalogRouter.get('/organizations', async (_req, res) => {
  res.json({ items: await organizationsStore.readAll() });
});

catalogRouter.get('/organizations/by-token/:token', async (req, res) => {
  const all = await organizationsStore.readAll();
  const org = all.find((o) => o.token === req.params.token);
  if (!org) {
    res.status(404).json({ error: 'ארגון לא נמצא' });
    return;
  }
  res.json({ organization: org });
});

catalogRouter.post('/organizations', requireAuth, async (req: AuthedRequest, res: Response) => {
  if (req.auth!.role !== 'super_admin') {
    res.status(403).json({ error: 'רק מנהל ראשי יכול ליצור ארגון' });
    return;
  }
  const body = req.body as Partial<Organization>;
  if (!body.name || !body.token) {
    res.status(400).json({ error: 'חסר שם או token' });
    return;
  }
  try {
    const created = await organizationsStore.create({ ...body, id: `org-${randomUUID()}` } as Organization);
    res.status(201).json({ item: created });
  } catch (err) {
    res.status(409).json({ error: (err as Error).message });
  }
});

catalogRouter.patch('/organizations/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  if (req.auth!.role !== 'super_admin') {
    res.status(403).json({ error: 'רק מנהל ראשי יכול לערוך ארגון' });
    return;
  }
  const updated = await organizationsStore.update(req.params.id, req.body || {});
  if (!updated) {
    res.status(404).json({ error: 'לא נמצא' });
    return;
  }
  res.json({ item: updated });
});

catalogRouter.delete('/organizations/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  if (req.auth!.role !== 'super_admin') {
    res.status(403).json({ error: 'רק מנהל ראשי יכול למחוק ארגון' });
    return;
  }
  await organizationsStore.remove(req.params.id);
  res.json({ ok: true });
});

// ---- Generic org-scoped CRUD for the rest of the catalog hierarchy ----
function makeCrud<T extends { id: string; organizationId: string }>(
  router: Router,
  path: string,
  store: ReturnType<typeof createMongoStore<T>>,
  idPrefix: string,
  extraDefaults: Partial<T> = {}
) {
  router.get(path, async (_req, res) => {
    res.json({ items: await store.readAll() });
  });

  router.post(path, requireAuth, async (req: AuthedRequest, res: Response) => {
    const auth = req.auth!;
    if (!canWriteCatalog(auth)) {
      res.status(403).json({ error: 'סדרן אינו יכול ליצור פריטי קטלוג' });
      return;
    }
    const body = req.body as Partial<T>;
    const organizationId = auth.role === 'org_manager' ? auth.organizationId : body.organizationId;
    if (!organizationId) {
      res.status(400).json({ error: 'חסר ארגון (organizationId)' });
      return;
    }
    const item = { ...extraDefaults, ...body, id: `${idPrefix}-${randomUUID()}`, organizationId } as T;
    try {
      const created = await store.create(item);
      res.status(201).json({ item: created });
    } catch (err) {
      res.status(409).json({ error: (err as Error).message });
    }
  });

  router.patch(`${path}/:id`, requireAuth, async (req: AuthedRequest, res: Response) => {
    const auth = req.auth!;
    if (!canWriteCatalog(auth)) {
      res.status(403).json({ error: 'סדרן אינו יכול לערוך פריטי קטלוג' });
      return;
    }
    const existing = await store.find(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'לא נמצא' });
      return;
    }
    if (!canAccessOrg(auth, existing.organizationId)) {
      res.status(403).json({ error: 'אין הרשאה' });
      return;
    }
    const { organizationId: _ignored, ...patch } = req.body || {};
    const updated = await store.update(existing.id, patch as Partial<T>);
    res.json({ item: updated });
  });

  router.delete(`${path}/:id`, requireAuth, async (req: AuthedRequest, res: Response) => {
    const auth = req.auth!;
    if (!canWriteCatalog(auth)) {
      res.status(403).json({ error: 'סדרן אינו יכול למחוק פריטי קטלוג' });
      return;
    }
    const existing = await store.find(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'לא נמצא' });
      return;
    }
    if (!canAccessOrg(auth, existing.organizationId)) {
      res.status(403).json({ error: 'אין הרשאה' });
      return;
    }
    await store.remove(existing.id);
    res.json({ ok: true });
  });
}

makeCrud<Branch>(catalogRouter, '/branches', branchesStore, 'branch');
makeCrud<Warehouse>(catalogRouter, '/warehouses', warehousesStore, 'wh');
makeCrud<Category>(catalogRouter, '/categories', categoriesStore, 'cat');
makeCrud<Model>(catalogRouter, '/models', modelsStore, 'model');
makeCrud<Product>(catalogRouter, '/products', productsStore, 'prod', { status: 'active', loanStatus: 'not_loaned' });

// Customers: contains personal info (ת.ז, כתובת), so listing requires login — matches
// customers.get requiring auth in the old implementation, and the fact that lendingCRM's
// customer list is only ever seen inside the admin panel.
catalogRouter.get('/customers', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const all = await customersStore.readAll();
  const visible = auth.role === 'super_admin' ? all : all.filter((c) => c.organizationId === auth.organizationId);
  res.json({ items: visible });
});

// Look up a returning customer by phone (for the public loan-request form) — public, no login.
catalogRouter.get('/customers/lookup', async (req, res) => {
  const phone = String(req.query.phone || '').replace(/\D/g, '');
  if (!phone) {
    res.status(400).json({ error: 'יש לספק מספר טלפון' });
    return;
  }
  const all = await customersStore.readAll();
  const match = all.find((c) => c.mobilePhone.replace(/\D/g, '') === phone);
  res.json({ customer: match || null });
});

catalogRouter.post('/customers', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const body = req.body as Partial<Customer>;
  const organizationId = auth.role === 'org_manager' || auth.role === 'coordinator' ? auth.organizationId : body.organizationId;
  if (!organizationId) {
    res.status(400).json({ error: 'חסר ארגון (organizationId)' });
    return;
  }
  const item = { ...body, id: `cust-${randomUUID()}`, organizationId } as Customer;
  try {
    const created = await customersStore.create(item);
    res.status(201).json({ item: created });
  } catch (err) {
    res.status(409).json({ error: (err as Error).message });
  }
});

catalogRouter.patch('/customers/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const existing = await customersStore.find(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'לא נמצא' });
    return;
  }
  if (!canAccessOrg(auth, existing.organizationId)) {
    res.status(403).json({ error: 'אין הרשאה' });
    return;
  }
  const { organizationId: _ignored, ...patch } = req.body || {};
  const updated = await customersStore.update(existing.id, patch);
  res.json({ item: updated });
});
