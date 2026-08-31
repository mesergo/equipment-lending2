import { useEffect, useState } from 'react';
import EntityTable from './EntityTable';
import type { FieldConfig } from './EntityTable';
import { useAuth, useAuthedFetch } from '../context/AuthContext';
import type { Organization, Branch, Warehouse, Category, Model, Product, Customer, Payment } from '../types';

// Fetches a list once and turns it into <select> options — used by entities whose fields
// reference another entity (Model→Category, Product→Model/Warehouse, User→Organization).
export function useOptions(apiPath: string, labelKey: string): Array<{ value: string; label: string }> {
  const authedFetch = useAuthedFetch();
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    authedFetch(apiPath)
      .then((res) => res.json())
      .then((data) => {
        const items = (data.items || []) as Record<string, unknown>[];
        setOptions(items.map((i) => ({ value: String(i.id), label: String(i[labelKey] ?? i.id) })));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiPath]);

  return options;
}

// Every catalog entity except Organization itself is org-scoped: the backend requires
// organizationId on create (see makeCrud in server/catalogRoutes.ts) and, for org_manager/
// coordinator, auto-fills it from their own account — but for super_admin (who has no
// organizationId of their own and manages every org) nothing fills it in, so without this
// field super_admin could not create a branch/warehouse/category/model/product/customer/
// payment at all. Not shown to org_manager/coordinator: their submitted value would be
// silently overridden server-side anyway (forced to their own org), so showing an editable
// selector there would be misleading. createOnly: true because every entity's PATCH route
// strips organizationId from the patch — it's immutable once set.
function useOrgField<T extends { organizationId: string }>(): FieldConfig<T> | null {
  const { user } = useAuth();
  const organizationOptions = useOptions('/api/organizations', 'name');
  if (user?.role !== 'super_admin') return null;
  return { key: 'organizationId', label: 'ארגון', type: 'select', options: organizationOptions, required: true, createOnly: true };
}

export function OrganizationsScreen() {
  return (
    <EntityTable<Organization>
      title="ארגונים"
      apiPath="/api/organizations"
      fields={[
        { key: 'name', label: 'שם', required: true },
        { key: 'token', label: 'Token (לינק ציבורי)', required: true },
        { key: 'phone', label: 'טלפון' },
        { key: 'email', label: 'מייל' },
        { key: 'address', label: 'כתובת' },
        { key: 'logoUrl', label: 'לוגו', type: 'image' },
      ]}
    />
  );
}

export function BranchesScreen() {
  const orgField = useOrgField<Branch>();
  return (
    <EntityTable<Branch>
      title="סניפים"
      apiPath="/api/branches"
      fields={[
        ...(orgField ? [orgField] : []),
        { key: 'name', label: 'שם', required: true },
        { key: 'branchManagerName', label: 'שם מנהל סניף' },
      ]}
    />
  );
}

export function WarehousesScreen() {
  const orgField = useOrgField<Warehouse>();
  return (
    <EntityTable<Warehouse>
      title="מחסנים"
      apiPath="/api/warehouses"
      fields={[
        ...(orgField ? [orgField] : []),
        { key: 'name', label: 'שם', required: true },
        { key: 'location', label: 'מיקום' },
        { key: 'entryCode', label: 'קוד כניסה' },
        { key: 'capacity', label: 'קיבולת', type: 'number' },
      ]}
    />
  );
}

export function CategoriesScreen() {
  const orgField = useOrgField<Category>();
  return (
    <EntityTable<Category>
      title="קטגוריות"
      apiPath="/api/categories"
      fields={[...(orgField ? [orgField] : []), { key: 'name', label: 'שם', required: true }]}
    />
  );
}

export function ModelsScreen() {
  const orgField = useOrgField<Model>();
  const categoryOptions = useOptions('/api/categories', 'name');
  return (
    <EntityTable<Model>
      title="דגמים"
      apiPath="/api/models"
      fields={[
        ...(orgField ? [orgField] : []),
        { key: 'name', label: 'שם', required: true },
        { key: 'categoryId', label: 'קטגוריה', type: 'select', options: categoryOptions, required: true },
        { key: 'price', label: 'מחיר', type: 'number' },
        { key: 'imageUrl', label: 'תמונה', type: 'image' },
      ]}
    />
  );
}

export function ProductsScreen() {
  const orgField = useOrgField<Product>();
  const modelOptions = useOptions('/api/models', 'name');
  const warehouseOptions = useOptions('/api/warehouses', 'name');
  return (
    <EntityTable<Product>
      title="מוצרים"
      apiPath="/api/products"
      fields={[
        ...(orgField ? [orgField] : []),
        { key: 'name', label: 'שם (כולל מספר פריט)', required: true },
        { key: 'modelId', label: 'דגם', type: 'select', options: modelOptions, required: true },
        { key: 'warehouseId', label: 'מחסן', type: 'select', options: warehouseOptions, required: true },
        {
          key: 'loanStatus',
          label: 'סטטוס השאלה',
          type: 'select',
          options: [
            { value: 'not_loaned', label: 'לא הושאל' },
            { value: 'loaned', label: 'מושאל' },
            { value: 'returned', label: 'חזר' },
          ],
        },
        { key: 'price', label: 'מחיר', type: 'number' },
      ]}
    />
  );
}

export function CustomersScreen() {
  const orgField = useOrgField<Customer>();
  return (
    <EntityTable<Customer>
      title="לקוחות"
      apiPath="/api/customers"
      fields={[
        ...(orgField ? [orgField] : []),
        { key: 'firstName', label: 'שם', required: true },
        { key: 'lastName', label: 'שם משפחה', required: true },
        { key: 'idNumber', label: 'ת.ז' },
        { key: 'mobilePhone', label: 'מספר טלפון', required: true },
        { key: 'city', label: 'עיר' },
        { key: 'street', label: 'רחוב' },
        { key: 'buildingNumber', label: 'מספר בנין' },
      ]}
    />
  );
}

export function PaymentsScreen() {
  const orgField = useOrgField<Payment>();
  const customerOptions = useOptions('/api/customers', 'firstName');
  return (
    <EntityTable<Payment>
      title="תשלומים"
      apiPath="/api/payments"
      fields={[
        ...(orgField ? [orgField] : []),
        { key: 'customerId', label: 'לקוח', type: 'select', options: customerOptions, required: true },
        { key: 'chargeAmount', label: 'סכום החיוב', type: 'number' },
        { key: 'chargeReason', label: 'סיבת החיוב' },
        {
          key: 'status',
          label: 'סטטוס',
          type: 'select',
          options: [
            { value: 'waiting', label: 'ממתין' },
            { value: 'charged', label: 'חויב' },
            { value: 'failed', label: 'נכשל' },
          ],
        },
        { key: 'wasCharged', label: 'האם חויב?', type: 'boolean' },
        { key: 'lastCardDigits', label: 'ספרות אחרונות' },
      ]}
    />
  );
}
