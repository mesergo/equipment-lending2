import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { EquipmentItem, Warehouse, Organization, Product, Model } from '../types';

interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals?: Warehouse[];
  warehouses?: Warehouse[];
  organizations?: Organization[];
  products?: Product[];
  models?: Model[];
  onAdd: (item: EquipmentItem) => void;
}

export const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({
  isOpen,
  onClose,
  hospitals,
  warehouses,
  organizations = [],
  products = [],
  models = [],
  onAdd,
}) => {
  const allWarehouses = warehouses || hospitals || [];
  const [name, setName] = useState('');
  const [sku, setSku] = useState(`MED-${Math.floor(100 + Math.random() * 900)}`);
  const [modelId, setModelId] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizations[0]?.id || allWarehouses[0]?.organizationId || 'org-hesed');
  const [warehouseId, setWarehouseId] = useState(allWarehouses[0]?.id || 'main');
  const [depotLocation, setDepotLocation] = useState('מוקד ראשי - מדף א׳');
  const [description, setDescription] = useState('');
  const [specsText, setSpecsText] = useState('קל משקל, מתקפל, עמיד במים');
  const [stockTotal, setStockTotal] = useState<number>(5);

  if (!isOpen) return null;

  const filteredWarehouses = selectedOrgId === 'all'
    ? allWarehouses
    : allWarehouses.filter(w => !w.organizationId || w.organizationId === selectedOrgId);

  const selectedWarehouse = allWarehouses.find(w => w.id === warehouseId) || allWarehouses[0];
  const selectedOrg = organizations.find(o => o.id === (selectedOrgId || selectedWarehouse?.organizationId));

  // Models available for whichever org is selected, grouped by their Product ("מוצר").
  const orgModels = models.filter((m) => !selectedOrgId || selectedOrgId === 'all' || m.organizationId === selectedOrgId);
  const orgProducts = products.filter((p) => orgModels.some((m) => m.productId === p.id));
  const selectedModel = models.find((m) => m.id === modelId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || !modelId) return;

    const fullSpecs = specsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newItem: EquipmentItem = {
      id: `eq-${Date.now()}`,
      sku,
      name,
      modelId,
      organizationId: selectedOrg?.id || selectedWarehouse?.organizationId || 'org-hesed',
      organizationName: selectedOrg?.name || selectedWarehouse?.organizationName || 'עמותת חסד ומרפא',
      warehouseId,
      hospitalId: warehouseId,
      hospitalName: selectedWarehouse?.hospitalName || 'מרכז רפואי',
      depotLocation,
      description: description || 'ציוד רפואי איכותי ומאושר לשימוש במחלקות האשפוז.',
      fullSpecs: fullSpecs.length > 0 ? fullSpecs : ['עומד בתקן בתי חולים', 'עבר חיטוי רפואי מלא'],
      status: 'available',
      condition: 'new',
      stockTotal: Number(stockTotal),
      stockAvailable: Number(stockTotal),
      // Deposit, max loan days, image, weight capacity and the Sabbath/featured flags all live on
      // the Model now (see src/components/AdminDashboardView.tsx's "מוצרים ודגמים" tab) — never
      // typed in per-SKU, so this new item just inherits whatever the chosen Model has.
      depositAmount: selectedModel?.depositAmount ?? 0,
      maxLoanDays: selectedModel?.maxLoanDays ?? 14,
      photoUrl: selectedModel?.imageUrl,
      isUrgentSabbath: selectedModel?.isUrgentSabbath,
      featured: selectedModel?.featured,
      weightCapacityKg: selectedModel?.weightCapacityKg,
      lastSanitizedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    onAdd(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">הוספת פריט (מק"ט) חדש לקטלוג</h2>
              <p className="text-xs text-slate-500">הזנת פרטי הפריט, שיוך לארגון, מחסן ודגם קיים</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs text-right">

          {/* Organization & Warehouse Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-teal-50/50 border border-teal-100 rounded-2xl">
            <div>
              <label className="block text-teal-900 font-bold mb-1">ארגון בעלים / משאיל *</label>
              <select
                value={selectedOrgId}
                onChange={(e) => {
                  const newOrg = e.target.value;
                  setSelectedOrgId(newOrg);
                  setModelId('');
                  const matchingWh = allWarehouses.find(w => w.organizationId === newOrg);
                  if (matchingWh) setWarehouseId(matchingWh.id);
                }}
                className="w-full bg-white border border-teal-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-600"
              >
                {organizations.length > 0 ? (
                  organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))
                ) : (
                  <>
                    <option value="org-hesed">עמותת חסד ומרפא</option>
                    <option value="org-ezer">עזר מציון</option>
                    <option value="org-yad">יד שרה</option>
                    <option value="org-lev">רחשי לב</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-teal-900 font-bold mb-1">מחסן / מוקד אספקה של הארגון *</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full bg-white border border-teal-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-600"
              >
                {filteredWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.hospitalName || w.location})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">דגם ("מוצר" &gt; "דגם") *</label>
            <select
              required
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-600"
            >
              <option value="">בחר דגם...</option>
              {orgProducts.map((product) => (
                <optgroup key={product.id} label={product.name}>
                  {orgModels.filter((m) => m.productId === product.id).map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {orgProducts.length === 0 && (
              <p className="text-[11px] text-amber-700 mt-1">אין עדיין מוצרים/דגמים לארגון זה — הוסיפו דרך לשונית "מוצרים ודגמים" לפני הוספת מק"ט.</p>
            )}
            {selectedModel && (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                  {selectedModel.imageUrl && (
                    <img src={selectedModel.imageUrl} alt={selectedModel.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="text-[11px] text-slate-600">
                  פיקדון: <strong className="text-teal-700">₪{selectedModel.depositAmount}</strong> · עד {selectedModel.maxLoanDays} ימי השאלה
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">שם הפריט *</label>
              <input
                type="text"
                required
                placeholder="למשל: כיסא גלגלים קל משקל"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">מק״ט פריט *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">מיקום מדויק במוקד (מדף / תא לוקר)</label>
            <input
              type="text"
              placeholder="למשל: מדף א׳ עמדה 02"
              value={depotLocation}
              onChange={(e) => setDepotLocation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">תיאור הפריט</label>
            <textarea
              rows={2}
              placeholder="פירוט על הציוד, התאמה לחולים והנחיות שימוש..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">מפרט טכני (מופרד בפסיקים)</label>
            <input
              type="text"
              placeholder="משקל, מידות, קיבולת, חומרים..."
              value={specsText}
              onChange={(e) => setSpecsText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <label className="block text-slate-700 font-bold mb-1">כמות מלאי התחלתית</label>
            <input
              type="number"
              min={1}
              value={stockTotal}
              onChange={(e) => setStockTotal(Number(e.target.value))}
              className="w-full sm:w-40 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black shadow-md shadow-teal-700/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף פריט לקטלוג</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
