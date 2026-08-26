import { useEffect, useState } from 'react';
import EntityTable from './EntityTable';
import { useAuthedFetch } from '../context/AuthContext';
import type { Organization, Branch, Warehouse, Category, Model, Product, Customer } from '../types';

// Fetches a list once and turns it into <select> options — used by entities whose fields
// reference another entity (Model→Category, Product→Model/Warehouse).
function useOptions(apiPath: string, labelKey: string): Array<{ value: string; label: string }> {
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
      ]}
    />
  );
}

export function BranchesScreen() {
  return (
    <EntityTable<Branch>
      title="סניפים"
      apiPath="/api/branches"
      fields={[
        { key: 'name', label: 'שם', required: true },
        { key: 'branchManagerName', label: 'שם מנהל סניף' },
      ]}
    />
  );
}

export function WarehousesScreen() {
  return (
    <EntityTable<Warehouse>
      title="מחסנים"
      apiPath="/api/warehouses"
      fields={[
        { key: 'name', label: 'שם', required: true },
        { key: 'location', label: 'מיקום' },
        { key: 'entryCode', label: 'קוד כניסה' },
        { key: 'capacity', label: 'קיבולת', type: 'number' },
      ]}
    />
  );
}

export function CategoriesScreen() {
  return (
    <EntityTable<Category>
      title="קטגוריות"
      apiPath="/api/categories"
      fields={[{ key: 'name', label: 'שם', required: true }]}
    />
  );
}

export function ModelsScreen() {
  const categoryOptions = useOptions('/api/categories', 'name');
  return (
    <EntityTable<Model>
      title="דגמים"
      apiPath="/api/models"
      fields={[
        { key: 'name', label: 'שם', required: true },
        { key: 'categoryId', label: 'קטגוריה', type: 'select', options: categoryOptions, required: true },
        { key: 'price', label: 'מחיר', type: 'number' },
      ]}
    />
  );
}

export function ProductsScreen() {
  const modelOptions = useOptions('/api/models', 'name');
  const warehouseOptions = useOptions('/api/warehouses', 'name');
  return (
    <EntityTable<Product>
      title="מוצרים"
      apiPath="/api/products"
      fields={[
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
  return (
    <EntityTable<Customer>
      title="לקוחות"
      apiPath="/api/customers"
      fields={[
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
