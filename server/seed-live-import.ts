// One-time setup script: imports the real data that exists in the live lendingCRM system
// (https://ptdev1.message.co.il/admin) into this new MongoDB-backed app, so the rebuild
// isn't starting from empty/demo data. Scraped by hand from the admin UI on 2026-08-27 (see
// progress.txt "Iteration 17" for the full source-data notes and known data-quality caveats
// carried over faithfully from the live system).
//
// Run once with:  npm run seed:live
//
// Writes directly to MongoDB (same reasoning as seed-demo.ts): predictable ids, and the
// public API always mints its own id on create.
//
// Deliberately NOT imported:
// - User accounts: the live system only exposes password *hashes* we can't reconstruct
//   real passwords from, and inventing placeholder passwords for other people's staff
//   accounts would be misleading. See progress.txt for the list of accounts to recreate
//   manually if wanted.
// - Recording (הקלטה) audio files: they're mp3s hosted on the old server, not reachable or
//   meaningful from this app.
// - ActionLog history: the live system's "note" shown on the Loans list is itself a
//   generated action-log entry, not a stored Loan field (confirmed by inspecting the edit
//   form) — fabricating historical audit-log entries would misrepresent real system history.
// - 7 of the 14 "lendings" rows in the live system: they have no organization/status and are
//   exact near-duplicates of 7 clean rows (same customer/product/date) — orphaned test data,
//   not real loans. Skipped; noted here instead of silently dropped.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import type { Db } from 'mongodb';
import type { Organization, Branch, Warehouse, Category, Model, Product, Customer, Loan, Payment } from '../src/types';

async function main() {
  const db = await getDb();

  const orgs = db.collection<Organization>('organizations');
  if (await orgs.findOne({ id: 'org-shevet-achim' })) {
    console.log('Live-import organizations already exist — leaving everything untouched.');
    console.log('Delete those documents yourself first if you really want to re-import from scratch.');
    return;
  }

  const organizations: Organization[] = [
    { id: 'org-shevet-achim', token: '07e510c5d42ab93bc9cf10245c41578b8d18718c', name: 'שבת אחים', phone: '0542546565', email: 'shevet@gmail.com', address: 'תל השומר' },
    { id: 'org-testerר', token: '3c48159d651ac6f5f1a0405f11d40022c50c282f', name: 'testerר', phone: '025788963', email: 'tester@mesergo.co.il', address: 'בית שמש' },
    { id: 'org-a', token: '9d5f15fd8457df08aaac5375e2f998a3d7945cf6', name: 'ארגון א', phone: '0580582585', email: 'hhh@hh', address: 'כתובת א' },
  ];
  await orgs.insertMany(organizations);

  const branches: Branch[] = [
    { id: `branch-${randomUUID()}`, organizationId: 'org-shevet-achim', name: 'בית חולים תל השומר', branchManagerName: 'מנהל ארגון שבת אחים' },
    { id: `branch-${randomUUID()}`, organizationId: 'org-a', name: 'tester', branchManagerName: 'admin' },
    { id: `branch-${randomUUID()}`, organizationId: 'org-a', name: 'חיה ר', branchManagerName: 'חיה ר' },
    { id: `branch-${randomUUID()}`, organizationId: 'org-shevet-achim', name: 'כללי', branchManagerName: 'מנהל ארגון שבת אחים' },
  ];
  await db.collection<Branch>('branches').insertMany(branches);

  const accessNote = 'יש ליצור קשר טלפוני עם נציג';
  const wh = {
    telHashomer: `wh-${randomUUID()}`,
    rachel: `wh-${randomUUID()}`,
    ezerMetzion: `wh-${randomUUID()}`,
    dana: `wh-${randomUUID()}`,
    dubi1: `wh-${randomUUID()}`,
    dubi2: `wh-${randomUUID()}`,
  };
  // This script predates Warehouse.branchId (added once the real system's branch_id FK was
  // discovered) and, more importantly, predates pointing MONGODB_URI at the real legacy
  // database — the `warehouses` collection it writes to is no longer what the app reads from
  // (that's `equipment_warehouses` now, see catalogRoutes.ts). Kept only as a historical
  // record of the hand-scraped import; branchId below is a placeholder to satisfy the type.
  const warehouses: Warehouse[] = [
    { id: wh.telHashomer, organizationId: 'org-shevet-achim', branchId: branches[0].id, name: 'תל השומר בניין אשפוז מרכזי', location: 'בית כנסת', accessInstructions: accessNote, capacity: 20 },
    { id: wh.rachel, organizationId: 'org-shevet-achim', branchId: branches[0].id, name: 'רחל', location: 'משורר 5 פתח תקווה', accessInstructions: accessNote, capacity: 100 },
    { id: wh.ezerMetzion, organizationId: 'org-shevet-achim', branchId: branches[0].id, name: 'עזר מציון תל השומר', location: 'ביתן 61 תל השומר', accessInstructions: `${accessNote}. שעות פעילות א-ה 9:00-15:00. מחוץ לשעות הפעילות יש לבדוק אתנו`, capacity: 15 },
    { id: wh.dana, organizationId: 'org-shevet-achim', branchId: branches[0].id, name: 'דנה', location: 'ההדר 4 פתח תקווה', accessInstructions: accessNote, capacity: 100 },
    { id: wh.dubi1, organizationId: 'org-shevet-achim', branchId: branches[0].id, name: 'דובי', location: 'מנחת שלמה 9 פתח תקווה', accessInstructions: accessNote, capacity: 10 },
    { id: wh.dubi2, organizationId: 'org-shevet-achim', branchId: branches[0].id, name: 'דובי', location: 'מנחת שלמה 9 פתח תקווה', accessInstructions: accessNote, capacity: 10 },
  ];
  await db.collection<Warehouse>('warehouses').insertMany(warehouses);

  const catBase = `cat-${randomUUID()}`;
  const catMattress = `cat-${randomUUID()}`;
  // Live system has the model "מיטה מתקפלת" filed under org testerר but pointing at a category
  // that only exists under org שבת אחים — a real inconsistency in the source data. To keep this
  // app's org-scoping intact (categories/models are always same-org) we give testerר its own
  // copy of that category rather than either dropping the model or breaking referential integrity.
  const catBaseForTester = `cat-${randomUUID()}`;
  const categories: Category[] = [
    { id: catBase, organizationId: 'org-shevet-achim', name: 'בסיס למזרן' },
    { id: catMattress, organizationId: 'org-shevet-achim', name: 'מזרן מתקפל' },
    { id: catBaseForTester, organizationId: 'org-testerר', name: 'בסיס למזרן' },
  ];
  await db.collection<Category>('categories').insertMany(categories);

  const modelFoldingBed = `model-${randomUUID()}`;
  const model6cm = `model-${randomUUID()}`;
  const modelBase = `model-${randomUUID()}`;
  const model8cm = `model-${randomUUID()}`;
  const models: Model[] = [
    { id: modelFoldingBed, organizationId: 'org-testerר', categoryId: catBaseForTester, name: 'מיטה מתקפלת', price: 100.5 },
    { id: model6cm, organizationId: 'org-shevet-achim', categoryId: catMattress, name: 'מזרן מתקפל עובי 6 סמ', price: 0 },
    { id: modelBase, organizationId: 'org-shevet-achim', categoryId: catBase, name: 'בסיס מיטה מתקפל (ללא מזרן)', price: 0 },
    { id: model8cm, organizationId: 'org-shevet-achim', categoryId: catMattress, name: 'מזרן מתקפל עובי 8 סמ', price: 0 },
  ];
  await db.collection<Model>('models').insertMany(models);

  // [name, modelId, warehouseId, loanStatus]
  const productRows: Array<[string, string, string, Product['loanStatus']]> = [
    ['בסיס מיטה מתקפל (ללא מזרן) מס 309', modelBase, wh.telHashomer, 'not_loaned'],
    ['בסיס מיטה מתקפל (ללא מזרן) מס 311', modelBase, wh.telHashomer, 'loaned'],
    ['בסיס מיטה מתקפל (ללא מזרן) מס 310', modelBase, wh.telHashomer, 'not_loaned'],
    ['בסיס מיטה מתקפל (ללא מזרן) מס 304', modelBase, wh.telHashomer, 'not_loaned'],
    ['בסיס מיטה מתקפל (ללא מזרן) מס 307', modelBase, wh.telHashomer, 'returned'],
    ['בסיס מיטה מתקפל (ללא מזרן) מס 301', modelBase, wh.telHashomer, 'not_loaned'],
    ['מזרן מתקפל מס 203', model8cm, wh.telHashomer, 'not_loaned'],
    ['מזרן מתקפל מס 208', model8cm, wh.telHashomer, 'not_loaned'],
    ['מזרן מתקפל מס 212', model8cm, wh.telHashomer, 'returned'],
    ['מזרן מתקפל מס 214', model8cm, wh.telHashomer, 'not_loaned'],
    ['מזרן מתקפל מס 209', model8cm, wh.telHashomer, 'loaned'],
    ['מזרן מתקפל מס 213', model8cm, wh.telHashomer, 'not_loaned'],
    ['מזרן מתקפל מס 211', model8cm, wh.telHashomer, 'not_loaned'],
    ['מזרן מתקפל מס 108', model6cm, wh.telHashomer, 'not_loaned'],
    ['מזרן מתקפל מס 205', model8cm, wh.telHashomer, 'not_loaned'],
    ['בסיס מיטה מתקפל (ללא מזרן) מס 306', modelBase, wh.telHashomer, 'not_loaned'],
    ['מזרן מתקפל מס 204', model8cm, wh.telHashomer, 'not_loaned'],
    ['מזרן מתקפל מס 107', model6cm, wh.ezerMetzion, 'not_loaned'],
    ['מזרן מתקפל מס 101', model6cm, wh.telHashomer, 'not_loaned'],
    ['מזרן מתקפל מס 103', model6cm, wh.ezerMetzion, 'not_loaned'],
    ['מזרן מתקפל מס 206', model8cm, wh.ezerMetzion, 'not_loaned'],
    ['מזרן מתקפל מס 210', model8cm, wh.telHashomer, 'not_loaned'],
    ['בסיס מיטה מתקפל( ללא מזרן) מס 308', modelBase, wh.rachel, 'not_loaned'],
    ['מזרן מתקפל מס 102', model6cm, wh.rachel, 'not_loaned'],
    ['מזרן מתקפל מס 104', model6cm, wh.rachel, 'not_loaned'],
    ['בסיס מיטה מתקפל (ללא מזרן) מס 312', modelBase, wh.dana, 'not_loaned'],
    ['מזרן מתקפל מס 109', model6cm, wh.telHashomer, 'returned'],
    ['מזרן מתקפל מס 105', model6cm, wh.rachel, 'not_loaned'],
    ['בסיס מיטה מתקפל (ללא מזרן) מס 302', modelBase, wh.telHashomer, 'not_loaned'],
    ['בסיס מיטה מתקפל (ללא מזרן) מס 303', modelBase, wh.telHashomer, 'returned'],
    ['מזרן מתקפל מס 106', model6cm, wh.telHashomer, 'not_loaned'],
    ['מזרן מתקפל מס 207', model8cm, wh.telHashomer, 'loaned'],
  ];
  const productIds = new Map<string, string>();
  const products: Product[] = productRows.map(([name, modelId, warehouseId, loanStatus]) => {
    const id = `prod-${randomUUID()}`;
    productIds.set(name, id);
    return { id, organizationId: 'org-shevet-achim', modelId, warehouseId, name, price: 0, status: 'active', loanStatus };
  });
  await db.collection<Product>('products').insertMany(products);

  const custMazranLenashim = `cust-${randomUUID()}`;
  const custMiunYoldot = `cust-${randomUUID()}`;
  const custNituheiHaze = `cust-${randomUUID()}`;
  const custMitaLeyoldotRaz = `cust-${randomUUID()}`;
  const custShlomi = `cust-${randomUUID()}`;
  const custLakoachA = `cust-${randomUUID()}`;
  const custLakoachB = `cust-${randomUUID()}`;
  const customers: Customer[] = [
    { id: custMazranLenashim, organizationId: 'org-shevet-achim', firstName: 'מזרן לנשים 31.7', lastName: 'מזרן לנשים 31.7', idNumber: '111111111', mobilePhone: '0504111833' },
    { id: custMiunYoldot, organizationId: 'org-shevet-achim', firstName: 'מיון יולדות', lastName: 'מיון יולדות', idNumber: '111111111', mobilePhone: '0546358299' },
    { id: custNituheiHaze, organizationId: 'org-shevet-achim', firstName: 'ניתוחי חזה', lastName: 'ניתוחי חזה', idNumber: '111111111', mobilePhone: '0506222360' },
    { id: custMitaLeyoldotRaz, organizationId: 'org-shevet-achim', firstName: 'מיטה ליולדות רז', lastName: 'מיטה ליולדות רז', idNumber: '111111111', mobilePhone: '0547330334' },
    { id: custShlomi, organizationId: 'org-testerר', firstName: 'shlomi', lastName: 'kakon', idNumber: '313113131', mobilePhone: '0585050000', city: 'hadid', street: 'hairus', buildingNumber: '49' },
    // mobilePhone is blank in the live system for this customer — carried over as-is (known
    // source data gap, same as the id-number field which holds "ההה" instead of a real value).
    { id: custLakoachA, organizationId: 'org-a', firstName: 'לקוח א', lastName: 'משפחה לקוח א', idNumber: 'ההה', mobilePhone: '' },
    { id: custLakoachB, organizationId: 'org-a', firstName: 'לקוח בב', lastName: 'משפחה לקוח ב', idNumber: '42024', mobilePhone: '0580580580', city: 'בני ברק', street: "ר' עקיבא", buildingNumber: '141' },
  ];
  await db.collection<Customer>('customers').insertMany(customers);

  const paymentShevet = `pay-${randomUUID()}`;
  const paymentTester = `pay-${randomUUID()}`;
  const payments: Payment[] = [
    { id: paymentShevet, organizationId: 'org-shevet-achim', customerId: custLakoachA, wasCharged: false, status: 'waiting', chargeAmount: 120, chargeReason: 'סיבה א', issueDate: '2025-11-13', date: '2025-11-24', clearingCompanyPaymentId: '17458795547676', lastCardDigits: '1234' },
    { id: paymentTester, organizationId: 'org-testerר', customerId: custShlomi, wasCharged: false, status: 'waiting', chargeAmount: 100.5, issueDate: '2020-05-02', date: '2025-11-29', clearingCompanyPaymentId: '1', lastCardDigits: '0' },
  ];
  await db.collection<Payment>('payments').insertMany(payments);

  // [customerId, productName, status, loanDate]
  const loanRows: Array<[string, string, Loan['status'], string]> = [
    [custMitaLeyoldotRaz, 'בסיס מיטה מתקפל (ללא מזרן) מס 307', 'returned', '2026-08-14'],
    [custMitaLeyoldotRaz, 'מזרן מתקפל מס 109', 'returned', '2026-08-14'],
    [custNituheiHaze, 'בסיס מיטה מתקפל (ללא מזרן) מס 303', 'returned', '2026-08-09'],
    [custNituheiHaze, 'מזרן מתקפל מס 212', 'returned', '2026-08-09'],
    [custMazranLenashim, 'מזרן מתקפל מס 209', 'loaned', '2026-07-31'],
    [custMiunYoldot, 'בסיס מיטה מתקפל (ללא מזרן) מס 311', 'loaned', '2026-08-06'],
    [custMiunYoldot, 'מזרן מתקפל מס 207', 'loaned', '2026-08-06'],
  ];
  const loans: Loan[] = loanRows.map(([customerId, productName, status, loanDate]) => ({
    id: `loan-${randomUUID()}`,
    organizationId: 'org-shevet-achim',
    status,
    customerId,
    productId: productIds.get(productName)!,
    loanDate,
    paymentId: paymentShevet,
  }));
  await db.collection<Loan>('loans').insertMany(loans);

  console.log('Imported live data from ptdev1.message.co.il/admin:');
  console.log(`  ${organizations.length} organizations, ${branches.length} branches, ${warehouses.length} warehouses`);
  console.log(`  ${categories.length} categories, ${models.length} models, ${products.length} products`);
  console.log(`  ${customers.length} customers, ${payments.length} payments, ${loans.length} loans`);
  console.log('Not imported: user accounts (no real passwords available), recording audio files, action-log history, 7 orphaned duplicate lending rows.');
}

main()
  .catch((err) => {
    console.error('Live-data import failed:', err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
