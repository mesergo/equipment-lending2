import { Router } from 'express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { createMongoStore } from './genericStore';
import { requireAuth } from './auth';
import type { AuthedRequest, AuthTokenPayload } from './auth';
import {
  PRODUCTS,
  MODELS,
  BRANCHES,
  WAREHOUSES,
  INITIAL_EQUIPMENT,
  INITIAL_CUSTOMERS,
} from '../src/data/mockData';
import type { Product, Model, Branch, Warehouse, EquipmentItem, Customer } from '../src/types';

// Server-side persistence for the catalog hierarchy (Product > Model > SKU/EquipmentItem),
// plus Branch, Warehouse and Customer - the same MongoDB pattern already used for orders and
// users (see server/ordersStore.ts, server/store.ts). Moving these here (out of App.tsx's
// in-memory React state) is what makes admin CRUD on them actually survive a page refresh, and
// is a prerequisite for the "מלאי נגזר אוטומטית" (derived stock) requirement: stock counts are
// computed from SKU status server-side, never typed in by hand.

const productsStore = createMongoStore<Product>('products', PRODUCTS);
const modelsStore = createMongoStore<Model>('models', MODELS);
const branchesStore = createMongoStore<Branch>('branches', BRANCHES);
// Exported so other routes (e.g. server/ordersRoutes.ts) can resolve a warehouse's
// organizationId against the live, server-persisted list — not just the original mockData.ts
// seed — otherwise a brand-new warehouse created after this file loaded wouldn't resolve.
export const warehousesStore = createMongoStore<Warehouse>('warehouses', WAREHOUSES);
const equipmentStore = createMongoStore<EquipmentItem>('equipment', INITIAL_EQUIPMENT);
const customersStore = createMongoStore<Customer>('customers', INITIAL_CUSTOMERS);

function canAccessOrg(auth: AuthTokenPayload, organizationId: string | undefined): boolean {
  if (auth.role === 'super_admin') return true;
  return auth.role === 'org_manager' && auth.organizationId === organizationId;
}

export const catalogRouter = Router();

// ---- Public read endpoints: the customer-facing catalog (no login) needs these. ----
catalogRouter.get('/products', async (_req, res) => res.json({ products: await productsStore.readAll() }));
catalogRouter.get('/models', async (_req, res) => res.json({ models: await modelsStore.readAll() }));
catalogRouter.get('/branches', async (_req, res) => res.json({ branches: await branchesStore.readAll() }));
catalogRouter.get('/warehouses', async (_req, res) => res.json({ warehouses: await warehousesStore.readAll() }));
catalogRouter.get('/equipment', async (_req, res) => res.json({ equipment: await equipmentStore.readAll() }));

// ---- Customers: contains personal info, so reading requires login too, scoped like orders. ----
catalogRouter.get('/customers', requireAuth, async (req: AuthedRequest, res: Response) => {
  const auth = req.auth!;
  const all = await customersStore.readAll();
  const visible = auth.role === 'super_admin' ? all : all.filter((c) => c.organizationId === auth.organizationId);
  res.json({ customers: visible });
});

// Look up a returning customer by phone (for the "לקוח חוזר" step in the loan form) - public,
// since the customer isn't logged in; only exposes name/phone/notes, never used for admin listing.
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

function makeCrud<T extends { id: string; organizationId?: string }>(
  router: Router,
  path: string,
  store: ReturnType<typeof createMongoStore<T>>,
  idPrefix: string
) {
  router.post(path, requireAuth, async (req: AuthedRequest, res: Response) => {
    const auth = req.auth!;
    const body = req.body as Partial<T>;
    const organizationId = auth.role === 'org_manager' ? auth.organizationId : body.organizationId;
    if (!organizationId) {
      res.status(400).json({ error: 'חסר ארגון (organizationId)' });
      return;
    }
    const item = { ...body, id: `${idPrefix}-${randomUUID()}`, organizationId } as T;
    try {
      const created = await store.create(item);
      res.status(201).json({ item: created });
    } catch (err) {
      res.status(409).json({ error: (err as Error).message });
    }
  });

  router.patch(`${path}/:id`, requireAuth, async (req: AuthedRequest, res: Response) => {
    const auth = req.auth!;
    const existing = await store.find(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'לא נמצא' });
      return;
    }
    if (!canAccessOrg(auth, existing.organizationId)) {
      res.status(403).json({ error: 'אין הרשאה' });
      return;
    }
    // Never let the client move a record to another organization through this generic patch.
    const { organizationId: _ignored, ...patch } = req.body || {};
    const updated = await store.update(existing.id, patch as Partial<T>);
    res.json({ item: updated });
  });

  router.delete(`${path}/:id`, requireAuth, async (req: AuthedRequest, res: Response) => {
    const auth = req.auth!;
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

makeCrud<Product>(catalogRouter, '/products', productsStore, 'prod');
makeCrud<Model>(catalogRouter, '/models', modelsStore, 'model');
makeCrud<Branch>(catalogRouter, '/branches', branchesStore, 'branch');
makeCrud<Warehouse>(catalogRouter, '/warehouses', warehousesStore, 'wh');
makeCrud<EquipmentItem>(catalogRouter, '/equipment', equipmentStore, 'eq');
makeCrud<Customer>(catalogRouter, '/customers', customersStore, 'cust');
