import React, { useState } from 'react';
import { 
  Search, 
  ShoppingCart, 
  HeartHandshake, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  Eye, 
  Boxes, 
  Layers, 
  Activity, 
  Zap, 
  Bed, 
  MoonStar, 
  Bath, 
  Plus, 
  ArrowRight,
  Info,
  Clock,
  Filter,
  Building2,
  Warehouse as WarehouseIcon,
  MapPin,
  Phone
} from 'lucide-react';
import { EquipmentCategory, EquipmentItem, Warehouse } from '../types';
import { useToast } from './Toast';
import { useAppTheme } from '../context/ThemeContext';

interface CatalogStoreViewProps {
  equipment: EquipmentItem[];
  warehouses?: Warehouse[];
  hospitals?: Warehouse[];
  selectedWarehouseId?: string;
  selectedHospitalId?: string;
  cartItemsCount: number;
  cartItemsIds: string[];
  onAddToCart: (item: EquipmentItem) => void;
  onOpenItemDetails: (item: EquipmentItem) => void;
  onDirectCheckout: (item: EquipmentItem) => void;
  onNavigateToCart: () => void;
}

export const CatalogStoreView: React.FC<CatalogStoreViewProps> = ({
  equipment,
  warehouses,
  hospitals,
  selectedWarehouseId,
  selectedHospitalId,
  cartItemsCount,
  cartItemsIds,
  onAddToCart,
  onOpenItemDetails,
  onDirectCheckout,
  onNavigateToCart,
}) => {
  const { showToast } = useToast();
  const { theme } = useAppTheme();
  const allWarehouses = warehouses || hospitals || [];
  const activeWarehouseId = selectedWarehouseId || selectedHospitalId || 'all';

  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>(activeWarehouseId);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EquipmentCategory | 'all'>('all');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'name' | 'deposit_low' | 'stock'>('popular');

  const categories: { id: EquipmentCategory | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: 'כל הקטלוג והעזרים', icon: Layers },
    { id: 'mobility', label: 'ניידות וכיסאות גלגלים', icon: Activity },
    { id: 'medical', label: 'מכשור נשימתי ורפואי', icon: Zap },
    { id: 'comfort', label: 'שהייה ולינת מלווים', icon: Bed },
    { id: 'sabbath', label: 'ערכות שבת ומועדים', icon: MoonStar },
    { id: 'hygiene', label: 'רחצה, שיקום ויולדות', icon: Bath },
  ];

  // Filter items by Warehouse, Category, Search, InStock
  const filteredEquipment = equipment.filter((item) => {
    // Warehouse filter
    if (selectedWarehouseFilter !== 'all') {
      const matchWh = item.warehouseId === selectedWarehouseFilter || item.hospitalId === selectedWarehouseFilter;
      if (!matchWh) return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }

    // In stock only filter
    if (onlyInStock && item.stockAvailable <= 0) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchSku = item.sku.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchLocation = item.depotLocation.toLowerCase().includes(q);
      const matchHosp = (item.hospitalName || '').toLowerCase().includes(q);
      return matchName || matchSku || matchDesc || matchLocation || matchHosp;
    }

    return true;
  });

  // Sort items
  const sortedEquipment = [...filteredEquipment].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'he');
    if (sortBy === 'deposit_low') return a.depositAmount - b.depositAmount;
    if (sortBy === 'stock') return b.stockAvailable - a.stockAvailable;
    // Popular / Featured
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });

  const currentWarehouse = allWarehouses.find((w) => w.id === selectedWarehouseFilter);

  const handleSelectWarehouse = (whId: string) => {
    setSelectedWarehouseFilter(whId);
    if (whId === 'all') {
      window.location.hash = 'all';
    } else {
      window.location.hash = whId;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-teal-700 via-teal-600 to-cyan-700 text-white shadow-xl p-6 sm:p-10">
        <div className="relative z-10 max-w-2xl space-y-3.5">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-teal-50 border border-white/30">
            <HeartHandshake className="w-4 h-4 text-teal-200" />
            <span>השאלת ציוד רפואי ועזרי שהייה • חסד מלא ללא עלות</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            ציוד רפואי, עזרי שיקום וערכות שהייה ישירות למחלקת האשפוז
          </h1>

          <p className="text-xs sm:text-sm text-teal-50 leading-relaxed max-w-xl">
            בחרו את הציוד הנדרש, ומתנדב ישנע אותו ישירות למיטת המאושפז תוך 30–60 דקות, או אספו מיידית 24/7 מארון החסד בבית החולים.
          </p>

          {/* Quick highlight points */}
          <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium text-teal-100">
            <div className="flex items-center gap-1.5 bg-black/10 px-3 py-1.5 rounded-xl border border-white/10">
              <ShieldCheck className="w-4 h-4 text-teal-300" />
              <span>השאלה חינם (0 ₪)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/10 px-3 py-1.5 rounded-xl border border-white/10">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>תפיסת מסגרת ביטחון מוחזרת</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/10 px-3 py-1.5 rounded-xl border border-white/10">
              <Boxes className="w-4 h-4 text-cyan-300" />
              <span>מחסנים ומוקדים בבתי החולים</span>
            </div>
          </div>
        </div>

        {/* Decorative background visual accent */}
        <div className="absolute left-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-center">
          <HeartHandshake className="w-96 h-96 -rotate-12 text-white" />
        </div>
      </div>

      {/* Warehouses Selection Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Boxes className="w-4 h-4 text-teal-600" />
            <span>בחירת מחסן / מוקד אספקה:</span>
          </span>
          {selectedWarehouseFilter !== 'all' && (
            <button
              onClick={() => handleSelectWarehouse('all')}
              className="text-teal-700 hover:text-teal-800 text-[11px] underline"
            >
              הצג ציוד מכל המחסנים
            </button>
          )}
        </div>

        {/* Warehouse Pills Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => handleSelectWarehouse('all')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 ${
              selectedWarehouseFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm font-black'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>כל המחסנים</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedWarehouseFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {equipment.length}
            </span>
          </button>

          {allWarehouses.map((wh) => {
            const isSelected = selectedWarehouseFilter === wh.id;
            const whItemsCount = equipment.filter(
              (e) => e.warehouseId === wh.id || e.hospitalId === wh.id
            ).length;

            return (
              <button
                key={wh.id}
                onClick={() => handleSelectWarehouse(wh.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-700/20 font-black'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{wh.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {whItemsCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Warehouse Details Callout */}
        {currentWarehouse && selectedWarehouseFilter !== 'all' && (
          <div className="mt-2 bg-teal-50/70 border border-teal-100 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-teal-900">{currentWarehouse.name}</span>
              <span className="text-teal-700 font-bold bg-white px-2 py-0.5 rounded-md border border-teal-200">
                {currentWarehouse.hospitalName}
              </span>
              <span className="text-slate-500">• {currentWarehouse.location}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span>מנהל מחסן: <strong className="text-slate-800">{currentWarehouse.managerName}</strong> ({currentWarehouse.managerPhone})</span>
              <span className="font-bold text-teal-800 bg-teal-100/60 px-2 py-0.5 rounded-md">
                {currentWarehouse.hasSmartLockers ? 'לוקרים חכמים 24/7' : 'שינוע ע״י מתנדבים'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Category Pills Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${
                isSelected
                  ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-700/20 font-black'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-teal-600'}`} />
              <span>{cat.label}</span>
              {cat.id === 'all' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isSelected ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {equipment.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="חיפוש ציוד לפי שם, מק״ט, בית חולים, מחלקה או ייעוד..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              נקה
            </button>
          )}
        </div>

        {/* Secondary filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          {/* In-Stock Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-white border-slate-300"
            />
            <span>רק פריטים זמינים כעת ({equipment.filter(e => e.stockAvailable > 0).length})</span>
          </label>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-bold">מיון:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-600 cursor-pointer"
            >
              <option value="popular">מומלץ ומבוקש ביותר</option>
              <option value="name">שם פריט (א-ת)</option>
              <option value="deposit_low">מסגרת ביטחון (מהנמוך לגבוה)</option>
              <option value="stock">מלאי זמין (מהגבוה לנמוך)</option>
            </select>
          </div>
        </div>

      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <span>
          נמצאו <strong className="text-slate-900">{sortedEquipment.length}</strong> פריטי ציוד
          {selectedWarehouseFilter !== 'all' && (
            <span> במחסן <strong className="text-teal-700">{currentWarehouse?.name}</strong> ({currentWarehouse?.hospitalName})</span>
          )}
        </span>
        {cartItemsCount > 0 && (
          <button
            onClick={onNavigateToCart}
            className="text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1"
          >
            <span>{cartItemsCount} פריטים בסל ההשאלות</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        )}
      </div>

      {/* Product Cards Grid with REAL IMAGES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedEquipment.map((item) => {
          const isAvailable = item.stockAvailable > 0 && item.status === 'available';
          const isInCart = cartItemsIds.includes(item.id);
          const warehouse = allWarehouses.find((w) => w.id === (item.warehouseId || item.hospitalId));

          return (
            <div
              key={item.id}
              className={`rounded-3xl border transition-all flex flex-col justify-between overflow-hidden bg-white shadow-sm hover:shadow-xl hover:border-teal-200 group ${
                isAvailable
                  ? 'border-slate-200'
                  : 'border-slate-200/70 opacity-80'
              }`}
            >
              {/* Product Image Section */}
              <div className="relative w-full h-48 sm:h-52 bg-slate-100 overflow-hidden">
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                    <HeartHandshake className="w-12 h-12 text-slate-300" />
                  </div>
                )}

                {/* Top Badges Overlay */}
                <div className="absolute top-3 right-3 left-3 flex items-start justify-between gap-2 pointer-events-none">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-slate-900 bg-white/95 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                      {item.sku}
                    </span>
                    {item.featured && (
                      <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-lg shadow-sm">
                        מבוקש במחלקות
                      </span>
                    )}
                    {item.isUrgentSabbath && (
                      <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-lg shadow-sm">
                        ערכת שבת
                      </span>
                    )}
                  </div>

                  {/* Stock status indicator */}
                  <div>
                    {isAvailable ? (
                      <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{item.stockAvailable} במלאי</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-200/90 px-2.5 py-0.5 rounded-full shadow-sm">
                        אזל זמנית
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                
                <div className="space-y-2">
                  
                  {/* Category */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-teal-700">
                      {item.category === 'mobility' && 'ניידות ושיקום'}
                      {item.category === 'medical' && 'רפואי ונשימתי'}
                      {item.category === 'comfort' && 'שהיית מלווים'}
                      {item.category === 'sabbath' && 'ערכות שבת'}
                      {item.category === 'hygiene' && 'רחצה ויולדות'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {item.depotLocation}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug line-clamp-2 group-hover:text-teal-700 transition-colors">
                    {item.name}
                  </h3>

                  {/* Warehouse and Hospital location tag */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <Boxes className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="font-bold text-slate-700 truncate">{warehouse?.name || 'מחסן ראשי'}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 truncate">{item.hospitalName || warehouse?.hospitalName || 'מרכז רפואי'}</span>
                  </div>

                  {/* Short Description */}
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Specs preview tags */}
                  {item.fullSpecs && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.fullSpecs.slice(0, 2).map((spec, i) => (
                        <span key={i} className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 rounded-md text-slate-600 border border-slate-200">
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pricing / Frame Hold Display */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">עלות השאלה:</span>
                    <span className="text-base font-black text-emerald-700">חינם (0 ₪)</span>
                  </div>

                  <div className="text-left">
                    <span className="text-slate-500 text-[11px] block">תפיסת מסגרת ביטחון:</span>
                    <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                      ₪{item.depositAmount}
                    </span>
                  </div>
                </div>

              </div>

              {/* Card Footer: Action Buttons */}
              <div className="p-5 pt-0 flex items-center gap-2">
                
                {/* Quick View Button */}
                <button
                  onClick={() => onOpenItemDetails(item)}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors font-bold text-xs flex items-center justify-center"
                  title="צפה במפרט מלא"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* Direct Checkout (Fast track) */}
                <button
                  disabled={!isAvailable}
                  onClick={() => onDirectCheckout(item)}
                  className="flex-1 py-3 px-3 rounded-2xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <span>השאלה ישירה</span>
                </button>

                {/* Add to Cart Button */}
                <button
                  disabled={!isAvailable}
                  onClick={() => onAddToCart(item)}
                  className={`flex-1 py-3 px-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                    isInCart
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20'
                      : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-700/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isInCart ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>בסל (הוסף עוד)</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>הוסף לסל</span>
                    </>
                  )}
                </button>

              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {sortedEquipment.length === 0 && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Search className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">לא נמצאו פריטי ציוד מתאימים</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              נסה לשנות את מילות החיפוש, לבחור קטגוריה אחרת או לבחור מחסן אחר.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              handleSelectWarehouse('all');
              setOnlyInStock(false);
            }}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-colors"
          >
            איפוס כל הסינונים
          </button>
        </div>
      )}

    </div>
  );
};
