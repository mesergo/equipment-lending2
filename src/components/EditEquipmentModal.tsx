import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, Trash2 } from 'lucide-react';
import { EquipmentItem, Warehouse, Organization, Product, Model } from '../types';

interface EditEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EquipmentItem | null;
  hospitals?: Warehouse[];
  warehouses?: Warehouse[];
  organizations?: Organization[];
  products?: Product[];
  models?: Model[];
  onSave: (updatedItem: EquipmentItem) => void;
  onDelete?: (itemId: string) => void;
}

export const EditEquipmentModal: React.FC<EditEquipmentModalProps> = ({
  isOpen,
  onClose,
  item,
  hospitals,
  warehouses,
  organizations = [],
  products = [],
  models = [],
  onSave,
  onDelete,
}) => {
  const allWarehouses = warehouses || hospitals || [];
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [modelId, setModelId] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('org-hesed');
  const [warehouseId, setWarehouseId] = useState('main');
  const [depotLocation, setDepotLocation] = useState('');
  const [description, setDescription] = useState('');
  const [specsText, setSpecsText] = useState('');
  const [stockTotal, setStockTotal] = useState<number>(0);
  const [stockAvailable, setStockAvailable] = useState<number>(0);
  const [condition, setCondition] = useState<'new' | 'excellent' | 'good' | 'needs_inspection'>('excellent');
  const [status, setStatus] = useState<EquipmentItem['status']>('available');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setSku(item.sku);
      setModelId(item.modelId || '');
      setSelectedOrgId(item.organizationId || allWarehouses.find(w => w.id === (item.warehouseId || item.hospitalId))?.organizationId || 'org-hesed');
      setWarehouseId(item.warehouseId || item.hospitalId || allWarehouses[0]?.id || 'main');
      setDepotLocation(item.depotLocation);
      setDescription(item.description);
      setSpecsText(item.fullSpecs ? item.fullSpecs.join(', ') : '');
      setStockTotal(item.stockTotal);
      setStockAvailable(item.stockAvailable);
      setCondition(item.condition);
      setStatus(item.status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  if (!isOpen || !item) return null;

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

    const fullSpecs = specsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updated: EquipmentItem = {
      ...item,
      name,
      sku,
      modelId: modelId || undefined,
      organizationId: selectedOrg?.id || selectedWarehouse?.organizationId || 'org-hesed',
      organizationName: selectedOrg?.name || selectedWarehouse?.organizationName || 'עמותת חסד ומרפא',
      warehouseId,
      hospitalId: warehouseId,
      hospitalName: selectedWarehouse?.hospitalName || 'מרכז רפואי',
      depotLocation,
      description,
      fullSpecs: fullSpecs.length > 0 ? fullSpecs : item.fullSpecs,
      stockTotal: Number(stockTotal),
      stockAvailable: Number(stockAvailable),
      // Deposit / max loan days / photo are Model-level attributes now — never typed in per-SKU.
      // Fall back to whatever the item already had if no model is linked yet.
      depositAmount: selectedModel?.depositAmount ?? item.depositAmount,
      maxLoanDays: selectedModel?.maxLoanDays ?? item.maxLoanDays,
      photoUrl: selectedModel?.imageUrl || item.photoUrl,
      isUrgentSabbath: selectedModel?.isUrgentSabbath ?? item.isUrgentSabbath,
      featured: selectedModel?.featured ?? item.featured,
      weightCapacityKg: selectedModel?.weightCapacityKg ?? item.weightCapacityKg,
      condition,
      status,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">עריכת פריט (מק"ט) #{item.sku}</h2>
              <p className="text-xs text-slate-500">עדכון פרטים, שיוך לארגון, מחסן, דגם, מלאי וסטטוס זמינות</p>
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
            {selectedModel && (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                  {selectedModel.imageUrl && (
                    <img src={selectedModel.imageUrl} alt={selectedModel.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <div>פיקדון: <strong className="text-teal-700">₪{selectedModel.depositAmount}</strong> · עד {selectedModel.maxLoanDays} ימי השאלה</div>
                  <div className="text-slate-400">התמונה, הפיקדון וימי ההשאלה נלקחים מהדגם — לעריכתם עברו ללשונית "מוצרים ודגמים".</div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">שם הפריט</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">מק״ט</label>
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
            <label className="block text-slate-700 font-bold mb-1">מיקום מדויק במוקד</label>
            <input
              type="text"
              value={depotLocation}
              onChange={(e) => setDepotLocation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">תיאור הפריט</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">מפרט טכני (מופרד בפסיקים)</label>
            <input
              type="text"
              value={specsText}
              onChange={(e) => setSpecsText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <label className="block text-slate-700 font-bold mb-1">מלאי כולל</label>
              <input
                type="number"
                min={0}
                value={stockTotal}
                onChange={(e) => setStockTotal(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">מלאי זמין כעת</label>
              <input
                type="number"
                min={0}
                value={stockAvailable}
                onChange={(e) => setStockAvailable(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">מצב פיזי / תקינות</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              >
                <option value="new">חדש באריזה</option>
                <option value="excellent">מצוין (כמו חדש)</option>
                <option value="good">תקין ומוכן לשימוש</option>
                <option value="needs_inspection">דרושה בדיקת טכנאי</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">סטטוס פריט (מוצר)</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              >
                <option value="available">זמין</option>
                <option value="unavailable">לא זמין</option>
                <option value="on_loan">בהשאלה</option>
                <option value="faulty_pending_inspection">תקול וממתין לבדיקה</option>
                <option value="sanitizing">בתהליך חיטוי ובדיקה</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-200">
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`האם אתה בטוח שברצונך למחוק את פריט ${item.name}?`)) {
                    onDelete(item.id);
                    onClose();
                  }
                }}
                className="px-4 py-2.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>מחק פריט</span>
              </button>
            )}

            <div className="flex items-center gap-2 mr-auto">
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
                <Save className="w-4 h-4" />
                <span>שמור שינויים</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
