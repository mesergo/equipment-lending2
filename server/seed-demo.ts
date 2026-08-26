// One-time setup script: creates two full demo organizations, each with a branch,
// warehouse, category, model, a few products, and a customer, so every screen (including
// the public catalog page, which needs two different orgs to verify branding is actually
// dynamic per-organization) has real, linked data without manual entry.
//
// Run once with:  npm run seed:demo
//
// org-demo is the same id server/seed-users.ts already points manager@example.com and
// coordinator@example.com at. Refuses to touch anything if an org already exists (checked
// per-org), so re-running it later never duplicates or wipes real data. Writes directly to
// MongoDB rather than the public API, because POST /organizations always generates its own
// id (see PRD.md US-103 note) and this script needs exact, predictable ids.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import type { Db } from 'mongodb';
import type { Organization, Branch, Warehouse, Category, Model, Product, Customer } from '../src/types';

interface OrgSeed {
  orgId: string;
  token: string;
  name: string;
  categoryName: string;
  modelName: string;
  price: number;
  productCount: number;
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string;
}

const SEEDS: OrgSeed[] = [
  {
    orgId: 'org-demo',
    token: 'demo',
    name: 'ארגון דוגמה',
    categoryName: 'ניידות ושיקום',
    modelName: 'כיסא גלגלים מתקפל',
    price: 0,
    productCount: 3,
    customerFirstName: 'ישראל',
    customerLastName: 'ישראלי',
    customerPhone: '0501234567',
  },
  {
    orgId: 'org-demo-2',
    token: 'demo2',
    name: 'ארגון דוגמה שני',
    categoryName: 'שהיית מלווים',
    modelName: 'מיטת מלווה מתקפלת',
    price: 80,
    productCount: 2,
    customerFirstName: 'רבקה',
    customerLastName: 'לוי',
    customerPhone: '0529876543',
  },
];

async function seedOrg(db: Db, seed: OrgSeed) {
  const orgs = db.collection<Organization>('organizations');
  const existing = await orgs.findOne({ id: seed.orgId });
  if (existing) {
    console.log(`Organization "${seed.orgId}" already exists — leaving it untouched.`);
    return;
  }

  const organization: Organization = {
    id: seed.orgId,
    token: seed.token,
    name: seed.name,
    phone: '03-1234567',
    email: `${seed.token}@example.com`,
    address: 'רחוב הדוגמה 1, תל אביב',
    description: 'ארגון לדוגמה לבדיקת המערכת',
  };
  await orgs.insertOne(organization);

  const branch: Branch = { id: `branch-${randomUUID()}`, organizationId: seed.orgId, name: 'סניף מרכזי', branchManagerName: 'דנה כהן' };
  await db.collection<Branch>('branches').insertOne(branch);

  const warehouse: Warehouse = {
    id: `wh-${randomUUID()}`,
    organizationId: seed.orgId,
    name: 'מחסן ראשי',
    location: 'קומת קרקע',
    entryCode: '1234',
    capacity: 100,
  };
  await db.collection<Warehouse>('warehouses').insertOne(warehouse);

  const category: Category = { id: `cat-${randomUUID()}`, organizationId: seed.orgId, name: seed.categoryName };
  await db.collection<Category>('categories').insertOne(category);

  const model: Model = {
    id: `model-${randomUUID()}`,
    organizationId: seed.orgId,
    categoryId: category.id,
    name: seed.modelName,
    price: seed.price,
  };
  await db.collection<Model>('models').insertOne(model);

  const products: Product[] = Array.from({ length: seed.productCount }, (_, i) => ({
    id: `prod-${randomUUID()}`,
    organizationId: seed.orgId,
    modelId: model.id,
    warehouseId: warehouse.id,
    name: `${seed.modelName} מס ${i + 1}`,
    price: seed.price,
    status: 'active',
    loanStatus: 'not_loaned',
  }));
  await db.collection<Product>('products').insertMany(products);

  const customer: Customer = {
    id: `cust-${randomUUID()}`,
    organizationId: seed.orgId,
    firstName: seed.customerFirstName,
    lastName: seed.customerLastName,
    mobilePhone: seed.customerPhone,
    city: 'תל אביב',
  };
  await db.collection<Customer>('customers').insertOne(customer);

  console.log(`Created demo organization "${organization.name}" (${organization.id}, token=${organization.token}):`);
  console.log(`  branch: ${branch.name} | warehouse: ${warehouse.name}`);
  console.log(`  category: ${category.name} > model: ${model.name}`);
  console.log(`  products: ${products.map((p) => p.name).join(', ')}`);
  console.log(`  customer: ${customer.firstName} ${customer.lastName} (${customer.mobilePhone})`);
}

async function main() {
  const db = await getDb();
  for (const seed of SEEDS) {
    await seedOrg(db, seed);
  }
}

main()
  .catch((err) => {
    console.error('Demo seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
