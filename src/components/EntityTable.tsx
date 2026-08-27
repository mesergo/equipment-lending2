import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Inbox } from 'lucide-react';
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

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

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
          className={inputClass}
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
        className={inputClass}
        value={formValues[f.key] ?? ''}
        onChange={(e) => setFormValues({ ...formValues, [f.key]: e.target.value })}
        required={f.required}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {!creating && !editingId && (
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            חדש
          </button>
        )}
      </div>

      {(creating || editingId) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                {renderField(f)}
              </div>
            ))}
          </div>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={creating ? submitCreate : submitEdit}
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              שמור
            </button>
            <button onClick={cancelForm} className="text-sm font-medium text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              ביטול
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Inbox className="w-10 h-10 mb-2" strokeWidth={1.5} />
          <p className="text-sm">אין פריטים עדיין</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  {fields.map((f) => (
                    <th key={f.key} className="text-right px-4 py-3 font-medium text-gray-500">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    {fields.map((f) => (
                      <td key={f.key} className="px-4 py-3 text-gray-700">
                        {f.type === 'select'
                          ? f.options?.find((o) => o.value === item[f.key])?.label ?? String(item[f.key] ?? '')
                          : f.type === 'boolean'
                            ? item[f.key]
                              ? 'כן'
                              : 'לא'
                            : String(item[f.key] ?? '')}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-left whitespace-nowrap">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => startEdit(item)}
                          aria-label="עריכה"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          aria-label="מחיקה"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
