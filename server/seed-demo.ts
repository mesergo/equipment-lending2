// One-time setup script: creates a full demo organization (org-demo — the same id
// server/seed-users.ts already points manager@example.com and coordinator@example.com at)
// with one branch, one warehouse, one category, one model, a couple of products, and one
// customer, so every screen has real, linked data to show without manual data entry.
//
// Run once with:  npm run seed:demo
//
// Refuses to touch anything if org-demo already exists, so re-running it later never
// duplicates or wipes real data. Writes directly to MongoDB rather than going through the
// public API, because POST /organizations always generates its own id (see PRD.md US-103
// note) and this script needs the exact id "org-demo" to match the already-seeded users.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import type { Organization, Branch, Warehouse, Category, Model, Product, Customer } from '../src/types';

const ORG_ID = 'org-demo';

async function main() {
  const db = await getDb();
  const orgs = db.collection<Organization>('organizations');

  const existing = await orgs.findOne({ id: ORG_ID });
  if (existing) {
    console.log(`Organization "${ORG_ID}" already exists — leaving all demo data untouched.`);
    console.log('Delete it (and its related documents) yourself first if you want to reseed.');
    return;
  }

  const organization: Organization = {
    id: ORG_ID,
    token: 'demo',
    name: 'ארגון דוגמה',
    phone: '03-1234567',
    email: 'demo@example.com',
    address: 'רחוב הדוגמה 1, תל אביב',
    description: 'ארגון לדוגמה לבדיקת המערכת',
  };
  await orgs.insertOne(organization);

  const branch: Branch = { id: `branch-${randomUUID()}`, organizationId: ORG_ID, name: 'סניף מרכזי', branchManagerName: 'דנה כהן' };
  await db.collection<Branch>('branches').insertOne(branch);

  const warehouse: Warehouse = {
    id: `wh-${randomUUID()}`,
    organizationId: ORG_ID,
    name: 'מחסן ראשי',
    location: 'קומת קרקע',
    entryCode: '1234',
    capacity: 100,
  };
  await db.collection<Warehouse>('warehouses').insertOne(warehouse);

  const category: Category = { id: `cat-${randomUUID()}`, organizationId: ORG_ID, name: 'ניידות ושיקום' };
  await db.collection<Category>('categories').insertOne(category);

  const model: Model = {
    id: `model-${randomUUID()}`,
    organizationId: ORG_ID,
    categoryId: category.id,
    name: 'כיסא גלגלים מתקפל',
    price: 0,
  };
  await db.collection<Model>('models').insertOne(model);

  const products: Product[] = [1, 2, 3].map((n) => ({
    id: `prod-${randomUUID()}`,
    organizationId: ORG_ID,
    modelId: model.id,
    warehouseId: warehouse.id,
    name: `כיסא גלגלים מתקפל מס ${n}`,
    price: 0,
    status: 'active',
    loanStatus: 'not_loaned',
  }));
  await db.collection<Product>('products').insertMany(products);

  const customer: Customer = {
    id: `cust-${randomUUID()}`,
    organizationId: ORG_ID,
    firstName: 'ישראל',
    lastName: 'ישראלי',
    mobilePhone: '0501234567',
    city: 'תל אביב',
  };
  await db.collection<Customer>('customers').insertOne(customer);

  console.log('Created demo organization with:');
  console.log(`  organization: ${organization.name} (${organization.id}, token=${organization.token})`);
  console.log(`  branch: ${branch.name}`);
  console.log(`  warehouse: ${warehouse.name}`);
  console.log(`  category: ${category.name} > model: ${model.name}`);
  console.log(`  products: ${products.map((p) => p.name).join(', ')}`);
  console.log(`  customer: ${customer.firstName} ${customer.lastName} (${customer.mobilePhone})`);
}

main()
  .catch((err) => {
    console.error('Demo seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
