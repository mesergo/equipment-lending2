import { useEffect, useState } from 'react';
import { useAuthedFetch } from '../context/AuthContext';

export type FieldType = 'text' | 'number' | 'select' | 'boolean';

export interface FieldConfig<T> {
  key: keyof T & string;
  label: string;
  type?: FieldType;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
}

interface EntityTableProps<T extends { id: string }> {
  title: string;
  apiPath: string; // e.g. "/api/branches"
  fields: FieldConfig<T>[];
}

// One generic table (list + create + inline edit + delete) reused for every catalog entity
// (organizations/branches/warehouses/categories/models/products/customers) instead of seven
// near-identical components — mirrors how the backend's makeCrud is already one factory, not
// seven copies. Field configuration per entity lives in App.tsx's RouteContent.
export default function EntityTable<T extends { id: string }>({ title, apiPath, fields }: EntityTableProps<T>) {
  const authedFetch = useAuthedFetch();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const res = await authedFetch(apiPath);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiPath]);

  function startCreate() {
    setEditingId(null);
    setCreating(true);
    setFormValues({});
    setError(null);
  }

  function startEdit(item: T) {
    setCreating(false);
    setEditingId(item.id);
    const values: Record<string, string> = {};
    for (const f of fields) values[f.key] = item[f.key] != null ? String(item[f.key]) : '';
    setFormValues(values);
    setError(null);
  }

  function cancelForm() {
    setEditingId(null);
    setCreating(false);
    setError(null);
  }

  function buildBody(): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = formValues[f.key] ?? '';
      if (raw === '') continue;
      body[f.key] = f.type === 'number' ? Number(raw) : f.type === 'boolean' ? raw === 'true' : raw;
    }
    return body;
  }

  async function submitCreate() {
    setError(null);
    const res = await authedFetch(apiPath, { method: 'POST', body: JSON.stringify(buildBody()) });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'שגיאה ביצירה');
      return;
    }
    setCreating(false);
    await load();
  }

  async function submitEdit() {
    if (!editingId) return;
    setError(null);
    const res = await authedFetch(`${apiPath}/${editingId}`, { method: 'PATCH', body: JSON.stringify(buildBody()) });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'שגיאה בעדכון');
      return;
    }
    setEditingId(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm('למחוק פריט זה?')) return;
    await authedFetch(`${apiPath}/${id}`, { method: 'DELETE' });
    await load();
  }

  function renderField(f: FieldConfig<T>) {
    if (f.type === 'select' || f.type === 'boolean') {
      const options = f.type === 'boolean' ? [{ value: 'true', label: 'כן' }, { value: 'false', label: 'לא' }] : f.options;
      return (
        <select
          className="border rounded px-2 py-1 text-sm"
          value={formValues[f.key] ?? ''}
          onChange={(e) => setFormValues({ ...formValues, [f.key]: e.target.value })}
        >
          <option value="">— בחר —</option>
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={f.type === 'number' ? 'number' : 'text'}
        className="border rounded px-2 py-1 text-sm w-full"
        value={formValues[f.key] ?? ''}
        onChange={(e) => setFormValues({ ...formValues, [f.key]: e.target.value })}
        required={f.required}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{title}</h1>
        {!creating && !editingId && (
          <button onClick={startCreate} className="bg-teal-600 text-white text-sm rounded px-3 py-1.5">
            + חדש
          </button>
        )}
      </div>

      {(creating || editingId) && (
        <div className="bg-white border rounded p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                {renderField(f)}
              </div>
            ))}
          </div>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={creating ? submitCreate : submitEdit}
              className="bg-teal-600 text-white text-sm rounded px-3 py-1.5"
            >
              שמור
            </button>
            <button onClick={cancelForm} className="text-sm text-gray-600 px-3 py-1.5">
              ביטול
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">טוען...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">אין פריטים עדיין.</p>
      ) : (
        <div className="bg-white border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                {fields.map((f) => (
                  <th key={f.key} className="text-right px-3 py-2 font-medium text-gray-600">
                    {f.label}
                  </th>
                ))}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  {fields.map((f) => (
                    <td key={f.key} className="px-3 py-2">
                      {f.type === 'select'
                        ? f.options?.find((o) => o.value === item[f.key])?.label ?? String(item[f.key] ?? '')
                        : f.type === 'boolean'
                          ? item[f.key]
                            ? 'כן'
                            : 'לא'
                          : String(item[f.key] ?? '')}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-left whitespace-nowrap">
                    <button onClick={() => startEdit(item)} className="text-teal-600 text-xs me-3">
                      עריכה
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 text-xs">
                      מחיקה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
