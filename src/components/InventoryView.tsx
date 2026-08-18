import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ShieldAlert, 
  Tag, 
  Layers, 
  Check, 
  X,
  Building2,
  HeartHandshake,
  MoonStar,
  Activity,
  Bed,
  Bath,
  Eye
} from 'lucide-react';
import { EquipmentCategory, EquipmentItem, EquipmentStatus, Hospital } from '../types';

interface InventoryViewProps {
  equipment: EquipmentItem[];
  hospitals: Hospital[];
  selectedHospitalId: string;
  onOpenNewLoanForItem: (equipmentId: string) => void;
  onAddNewItem: (item: Omit<EquipmentItem, 'id'>) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  equipment,
  hospitals,
  selectedHospitalId,
  onOpenNewLoanForItem,
  onAddNewItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New item form state
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState<EquipmentCategory>('mobility');
  const [newDescription, setNewDescription] = useState('');
  const [newHospitalId, setNewHospitalId] = useState(
    selectedHospitalId !== 'all' ? selectedHospitalId : hospitals[0]?.id || 'sheba'
  );
  const [newDepotLocation, setNewDepotLocation] = useState('');
  const [newDepositAmount, setNewDepositAmount] = useState<number>(0);
  const [newMaxDays, setNewMaxDays] = useState<number>(14);

  const categories: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'כל הקטגוריות', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'mobility', label: 'ניידות ושיקום', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'medical', label: 'מכשור רפואי ונשימתי', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'comfort', label: 'שהייה ולינת מלווים', icon: <Bed className="w-3.5 h-3.5" /> },
    { id: 'sabbath', label: 'ערכות שבת ומועדים', icon: <MoonStar className="w-3.5 h-3.5" /> },
    { id: 'hygiene', label: 'רחצה, היגיינה ויולדות', icon: <Bath className="w-3.5 h-3.5" /> },
  ];

  // Filtering
  const filtered = equipment.filter((item) => {
    if (selectedHospitalId !== 'all' && item.hospitalId !== selectedHospitalId) return false;
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.depotLocation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newSku) return;

    onAddNewItem({
      sku: newSku,
      name: newName,
      category: newCategory,
      description: newDescription,
      hospitalId: newHospitalId,
      depotLocation: newDepotLocation || 'מוקד ראשי',
      status: 'available',
      condition: 'new',
      depositAmount: newDepositAmount,
      maxLoanDays: newMaxDays,
      lastSanitizedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    });

    setIsAddModalOpen(false);
    setNewName('');
    setNewSku('');
    setNewDescription('');
    setNewDepotLocation('');
  };

  const getStatusBadge = (status: EquipmentStatus) => {
    switch (status) {
      case 'available':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>זמין להשאלה</span>
          </span>
        );
      case 'loaned':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>מושאל במחלקה</span>
          </span>
        );
      case 'sanitizing':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>בתחנת חיטוי</span>
          </span>
        );
      case 'maintenance':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            <span>בתיקון/תחזוקה</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-400" />
            <span>קטלוג ומלאי ציוד רפואי ועזרי שהייה</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            ניהול מצבת הציוד במוקדים, ארונות החסד ומחסני הבקרה בבתי החולים
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>קליטת פריט חדש למלאי</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search input & status selector */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-800/80">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="חיפוש לפי שם ציוד, מק''ט (MED-...), מיקום בארון או תיאור..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="available">זמין להשאלה בלבד</option>
              <option value="loaned">מושאל כעת</option>
              <option value="sanitizing">בתחנת חיטוי</option>
              <option value="maintenance">בתחזוקה</option>
            </select>
          </div>
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const isAvailable = item.status === 'available';
          const hospital = hospitals.find((h) => h.id === item.hospitalId);

          return (
            <div
              key={item.id}
              className={`p-5 rounded-2xl bg-slate-900/90 border transition-all flex flex-col justify-between gap-4 ${
                isAvailable
                  ? 'border-slate-800 hover:border-teal-500/40 hover:shadow-lg'
                  : 'border-slate-800/60 opacity-90'
              }`}
            >
              {/* Top part: SKU & Badge */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                    {item.sku}
                  </span>
                  {getStatusBadge(item.status)}
                </div>

                <h3 className="text-sm font-bold text-slate-100 leading-snug">
                  {item.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Middle details */}
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-800 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">מרכז רפואי:</span>
                  <span className="font-medium text-slate-200">{hospital?.name.split(' - ')[0]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">מיקום במבנה:</span>
                  <span className="text-slate-200">{item.depotLocation}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">פיקדון נדרש:</span>
                  <span className="font-bold text-teal-300">
                    {item.depositAmount > 0 ? `₪${item.depositAmount}` : 'ללא עלות'}
                  </span>
                </div>
                {item.lastSanitizedAt && (
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-700/50 text-slate-400">
                    <span>חוטא ונבדק:</span>
                    <span>{item.lastSanitizedAt}</span>
                  </div>
                )}
              </div>

              {/* Bottom Action */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">
                  השאלה מקס': <strong>{item.maxLoanDays} ימים</strong>
                </span>

                {isAvailable ? (
                  <button
                    onClick={() => onOpenNewLoanForItem(item.id)}
                    className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>השאל למאושפז</span>
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 font-medium">
                    {item.status === 'loaned' ? 'בשימוש כעת במחלקה' : 'בתהליך טיפול'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-dashed border-slate-800 text-slate-400 space-y-2">
          <Package className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-sm font-semibold">לא נמצא פריט תואם לחיפוש או הסינון שנבחר</p>
          <p className="text-xs text-slate-500">נסה לשנות את מונחי החיפוש או לבחור בקטגוריה אחרת</p>
        </div>
      )}

      {/* Add New Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-400" />
                <span>קליטת פריט חדש למאגר הציוד</span>
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">שם הפריט *</label>
                  <input
                    type="text"
                    required
                    placeholder="לדוגמה: כיסא גלגלים אקסטרה רחב"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">מק"ט / ברקוד *</label>
                  <input
                    type="text"
                    required
                    placeholder="MED-WC-003"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">קטגוריה</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as EquipmentCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="mobility">ניידות ושיקום</option>
                    <option value="medical">מכשור רפואי ונשימתי</option>
                    <option value="comfort">שהייה ולינת מלווים</option>
                    <option value="sabbath">ערכות שבת ומועדים</option>
                    <option value="hygiene">רחצה והיגיינה</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">מרכז רפואי</label>
                  <select
                    value={newHospitalId}
                    onChange={(e) => setNewHospitalId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">מיקום מדויק במוקד/ארון חסד</label>
                <input
                  type="text"
                  placeholder="ארון קומה 2 / מדף עליון"
                  value={newDepotLocation}
                  onChange={(e) => setNewDepotLocation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">תיאור והנחיות שימוש</label>
                <textarea
                  rows={2}
                  placeholder="פירוט תכונות, הוראות קיפול או תכולת ערכה..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">סכום פיקדון (0 = ללא עלות)</label>
                  <input
                    type="number"
                    min="0"
                    value={newDepositAmount}
                    onChange={(e) => setNewDepositAmount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">משך השאלה מירבי (ימים)</label>
                  <input
                    type="number"
                    min="1"
                    value={newMaxDays}
                    onChange={(e) => setNewMaxDays(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg shadow-lg"
                >
                  הוסף פריט לקטלוג
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
