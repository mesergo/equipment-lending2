import { Router } from 'express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { createMongoStore, legacyIdQuery } from './genericStore';
import { requireAuth, optionalAuth, canAccessOrg } from './auth';
import type { AuthedRequest, AuthTokenPayload } from './auth';
import { readUsers } from './store';
import type {
  Organization,
  Branch,
  Warehouse,
  Category,
  Model,
  Product,
  ProductStatus,
  ProductLoanStatus,
  Customer,
  Loan,
  LoanStatus,
} from '../src/types';

// Server-side persistence for the full catalog hierarchy seen in lendingCRM:
// Organization > Branch / Warehouse / Category > Model > Product (SKU), plus Customer and
// Loan. See PRD.md §2 for the field-by-field source. All entities share the same generic
// org-scoped CRUD shape (makeCrud below) except Organizations, which only super_admin
// can create/edit/delete (organizations aren't self-service).
//
// Every collection below is a raw, as-is export of the legacy lendingCRM system (Laravel/
// MySQL): numeric `id`s and snake_case column names (organization_id, product_model_id, ...),
// not this app's string-id/camelCase convention — see `models`/`warehouses`/`loans`, which
// are empty; the real data lives in `product_models`/`equipment_warehouses`/`lendings`. Every
// store below reads straight from the real legacy collection and maps field names/types onto
// this app's shape *at read time only* — nothing is copied, renamed, or rewritten in Mongo. A
// document this app creates going forward (still string ids like `wh-<uuid>`, still camelCase)
// passes through the same mapping unchanged, since every field lookup below tries the
// camelCase name first and falls back to the legacy snake_case one.

export type LegacyDoc = { id: string; [key: string]: unknown };

export function toStr(value: unknown): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}

// Wraps a legacy Mongo collection with a pure, synchronous field mapping — used by every
// entity below that doesn't need to look data up in another collection (organizations,
// categories, models, warehouses, customers). Branches, products and loans need a related
// collection to derive one field (branch manager name, product loan status, loan
// organizationId), so those are hand-written further down instead of using this factory.
// Exported so paymentsRoutes.ts (a legacy collection too — see server/paymentsRoutes.ts) can
// reuse the same pattern instead of duplicating it.
export function wrapLegacyStore<TApp extends { id: string }>(collectionName: string, toApp: (doc: LegacyDoc) => TApp) {
  const raw = createMongoStore<LegacyDoc>(collectionName, [], legacyIdQuery);
  return {
    readAll: async () => (await raw.readAll()).map(toApp),
    find: async (id: string) => {
      const doc = await raw.find(id);
      return doc ? toApp(doc) : undefined;
    },
    create: async (item: TApp) => toApp(await raw.create(item as unknown as LegacyDoc)),
    update: async (id: string, patch: Partial<TApp>) => {
      const updated = await raw.update(id, patch as Partial<LegacyDoc>);
      return updated ? toApp(updated) : undefined;
    },
    remove: (id: string) => raw.remove(id),
  };
}

function toOrganization(doc: LegacyDoc): Organization {
  return {
    id: String(doc.id),
    token: doc.token as string,
    name: doc.name as string,
    logoUrl: toStr(doc.logoUrl ?? doc.logo),
    phone: toStr(doc.phone ?? doc.phone_number),
    email: toStr(doc.email),
    address: toStr(doc.address),
    description: toStr(doc.description),
  };
}
export const organizationsStore = wrapLegacyStore('organizations', toOrganization);

function toCategory(doc: LegacyDoc): Category {
  return {
    id: String(doc.id),
    organizationId: String(doc.organizationId ?? doc.organization_id),
    name: doc.name as string,
    recordingUrl: toStr(doc.recordingUrl ?? doc.recording),
  };
}
export const categoriesStore = wrapLegacyStore('categories', toCategory);

// Models live in `product_models`, not the (empty) `models` collection.
function toModel(doc: LegacyDoc): Model {
  return {
    id: String(doc.id),
    organizationId: String(doc.organizationId ?? doc.organization_id),
    categoryId: String(doc.categoryId ?? doc.category_id),
    name: doc.name as string,
    imageUrl: toStr(doc.imageUrl ?? doc.image),
    price: (doc.price ?? undefined) as number | undefined,
    recordingUrl: toStr(doc.recordingUrl ?? doc.recording),
  };
}
export const modelsStore = wrapLegacyStore('product_models', toModel);

// Warehouses live in `equipment_warehouses`, not the (empty) `warehouses` collection.
function toWarehouse(doc: LegacyDoc): Warehouse {
  return {
    id: String(doc.id),
    organizationId: String(doc.organizationId ?? doc.organization_id),
    branchId: String(doc.branchId ?? doc.branch_id),
    name: doc.name as string,
    location: toStr(doc.location),
    entryCode: toStr(doc.entryCode ?? doc.entry_code),
    accessInstructions: toStr(doc.accessInstructions ?? doc.access_directions),
    capacity: (doc.capacity ?? undefined) as number | undefined,
    stockQuantity: (doc.stockQuantity ?? doc.stock_quantity ?? undefined) as number | undefined,
    notes: toStr(doc.notes),
    recordingUrl: toStr(doc.recordingUrl ?? doc.recording),
  };
}
export const warehousesStore = wrapLegacyStore('equipment_warehouses', toWarehouse);

function toCustomer(doc: LegacyDoc): Customer {
  return {
    id: String(doc.id),
    organizationId: String(doc.organizationId ?? doc.organization_id),
    firstName: (doc.firstName ?? doc.first_name) as string,
    lastName: (doc.lastName ?? doc.last_name) as string,
    idNumber: toStr(doc.idNumber ?? doc.id_number),
    mobilePhone: (doc.mobilePhone ?? doc.mobile_phone) as string,
    additionalPhone: toStr(doc.additionalPhone ?? doc.additional_telephone),
    email: toStr(doc.email),
    city: toStr(doc.city),
    street: toStr(doc.street),
    buildingNumber: toStr(doc.buildingNumber ?? doc.building_number),
  };
}
export const customersStore = wrapLegacyStore('customers', toCustomer);

// Branches: `branch.manager_user_id` is a FK into `users`, not a plain name string like this
// app's Branch.branchManagerName — resolved by name here, read-side only.
const rawBranchesStore = createMongoStore<LegacyDoc>('branches', [], legacyIdQuery);

async function toBranch(doc: LegacyDoc, managerNameById: Map<string, string>): Promise<Branch> {
  const managerId = toStr(doc.manager_user_id);
  return {
    id: String(doc.id),
    organizationId: String(doc.organizationId ?? doc.organization_id),
    name: doc.name as string,
    branchManagerName: (doc.branchManagerName as string | undefined) ?? (managerId ? managerNameById.get(managerId) : undefined),
    recordingUrl: toStr(doc.recordingUrl ?? doc.recording),
  };
}

export const branchesStore = {
  readAll: async (): Promise<Branch[]> => {
    const [rawBranches, users] = await Promise.all([rawBranchesStore.readAll(), readUsers()]);
    const managerNameById = new Map(users.map((u) => [u.id, u.name]));
    return Promise.all(rawBranches.map((doc) => toBranch(doc, managerNameById)));
  },
  find: async (id: string) => (await branchesStore.readAll()).find((b) => b.id === id),
  create: async (item: Branch) => {
    await rawBranchesStore.create(item as unknown as LegacyDoc);
    return (await branchesStore.readAll()).find((b) => b.id === item.id) as Branch;
  },
  update: async (id: string, patch: Partial<Branch>) => {
    const updated = await rawBranchesStore.update(id, patch as Partial<LegacyDoc>);
    return updated ? (await branchesStore.readAll()).find((b) => b.id === id) : undefined;
  },
  remove: (id: string) => rawBranchesStore.remove(id),
};

// Products: `product_model_id`/`equipment_warehouse_id` FKs instead of modelId/warehouseId,
// and no stored loan-status field at all — the legacy system derives "is this on loan" from
// the `lendings` rows, so we do the same at read time (most recent lending per product; a
// null/unrecognized status — the known "orphaned duplicate" rows, see seed-live-import.ts —
// is treated as not currently blocking the product).
const rawProductsStore = createMongoStore<LegacyDoc>('products', [], legacyIdQuery);
const rawLendingsStore = createMongoStore<LegacyDoc>('lendings', [], legacyIdQuery);

function mapLendingStatus(raw: unknown): LoanStatus {
  if (raw === 'on loan') return 'loaned';
  if (raw === 'returned') return 'returned';
  if (raw === null || raw === undefined) return 'pending_review';
  return raw as LoanStatus;
}

function computeProductLoanStatus(productId: string, rawLendings: LegacyDoc[]): ProductLoanStatus {
  const candidates = rawLendings.filter((l) => toStr(l.productId ?? l.product_id) === productId);
  if (candidates.length === 0) return 'not_loaned';
  candidates.sort((a, b) => String(b.loanDate ?? b.loan_date ?? '').localeCompare(String(a.loanDate ?? a.loan_date ?? '')));
  const latestStatus = mapLendingStatus(candidates[0].status);
  if (latestStatus === 'returned') return 'not_loaned';
  if (latestStatus === 'loaned' || latestStatus === 'not_returned') return 'loaned';
  return 'not_loaned'; // pending_review (unknown/orphaned legacy row) — don't block re-lending
}

function toProduct(doc: LegacyDoc, loanStatus: ProductLoanStatus): Product {
  return {
    id: String(doc.id),
    organizationId: String(doc.organizationId ?? doc.organization_id),
    modelId: String(doc.modelId ?? doc.product_model_id),
    warehouseId: String(doc.warehouseId ?? doc.equipment_warehouse_id),
    name: doc.name as string,
    price: (doc.price ?? undefined) as number | undefined,
    status: (doc.status ?? 'active') as ProductStatus,
    loanStatus,
    imageUrl: toStr(doc.imageUrl ?? doc.image),
    purchaseDate: toStr(doc.purchaseDate ?? doc.purchase_date),
    notes: toStr(doc.notes),
    dedication: toStr(doc.dedication),
  };
}

export const productsStore = {
  readAll: async (): Promise<Product[]> => {
    const [rawProducts, rawLendings] = await Promise.all([rawProductsStore.readAll(), rawLendingsStore.readAll()]);
    return rawProducts.map((doc) => toProduct(doc, computeProductLoanStatus(String(doc.id), rawLendings)));
  },
  find: async (id: string) => (await productsStore.readAll()).find((p) => p.id === id),
  create: async (item: Product) => {
    await rawProductsStore.create(item as unknown as LegacyDoc);
    return productsStore.find(item.id) as Promise<Product>;
  },
  update: async (id: string, patch: Partial<Product>) => {
    const updated = await rawProductsStore.update(id, patch as Partial<LegacyDoc>);
    return updated ? productsStore.find(id) : undefined;
  },
  remove: (id: string) => rawProductsStore.remove(id),
};

// Loans live in `lendings`, not the (empty) `loans` collection. Some legacy rows have no
// organization_id at all — backfilled from the linked product's org (read-side only) so
// org-scoped users (org_manager/coordinator) can actually see them; a super_admin already
// sees everything unfiltered either way.
function toLoan(doc: LegacyDoc, fallbackOrganizationId: string | undefined): Loan {
  return {
    id: String(doc.id),
    organizationId: String(doc.organizationId ?? doc.organization_id ?? fallbackOrganizationId ?? ''),
    status: mapLendingStatus(doc.status),
    customerId: String(doc.customerId ?? doc.customer_id),
    hospitalizedPatientName: toStr(doc.hospitalizedPatientName ?? doc.hospitalized_name),
    productId: String(doc.productId ?? doc.product_id),
    loanDate: (doc.loanDate ?? doc.loan_date) as string,
    returnDate: toStr(doc.returnDate ?? doc.return_date),
    paymentId: toStr(doc.paymentId ?? doc.payment_id),
    notes: toStr(doc.notes ?? doc.note),
  };
}

export const loansStore = {
  readAll: async (): Promise<Loan[]> => {
    const [rawLendings, rawProducts] = await Promise.all([rawLendingsStore.readAll(), rawProductsStore.readAll()]);
    const orgIdByProductId = new Map(rawProducts.map((p) => [String(p.id), toStr(p.organizationId ?? p.organization_id)]));
    return rawLendings.map((doc) => toLoan(doc, orgIdByProductId.get(toStr(doc.productId ?? doc.product_id) ?? '')));
  },
  find: async (id: string) => (await loansStore.readAll()).find((l) => l.id === id),
  create: async (item: Loan) => {
    await rawLendingsStore.create(item as unknown as LegacyDoc);
    return loansStore.find(item.id) as Promise<Loan>;
  },
  update: async (id: string, patch: Partial<Loan>) => {
    const updated = await rawLendingsStore.update(id, patch as Partial<LegacyDoc>);
    return updated ? loansStore.find(id) : undefined;
  },
  remove: (id: string) => rawLendingsStore.remove(id),
};

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
  // optionalAuth, not requireAuth: the public catalog page (no login) calls this same route
  // for its own organization's products/models/branches, filtering client-side by org token —
  // that must keep working unfiltered. But a logged-in org_manager/coordinator must NOT see
  // every organization's data just because the route has no token at all; when a valid token
  // IS present and the caller isn't super_admin, scope the response to their own org.
  router.get(path, optionalAuth, async (req: AuthedRequest, res: Response) => {
    const auth = req.auth;
    const all = await store.readAll();
    const visible = !auth || auth.role === 'super_admin' ? all : all.filter((item) => item.organizationId === auth.organizationId);
    res.json({ items: visible });
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
