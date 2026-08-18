import React from 'react';
import { 
  HeartHandshake, 
  ShoppingCart, 
} from 'lucide-react';
import { useAppTheme } from '../context/ThemeContext';

export type TabType = 
  | 'catalog' 
  | 'cart' 
  | 'admin' 
  | 'patient_portal' 
  | 'sanitization';

interface NavbarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  cartCount: number;
  pendingRequestsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  cartCount,
  pendingRequestsCount,
}) => {
  const { theme } = useAppTheme();

  // Public customer-facing navigation tabs (Admin is hidden from here and accessible only via /ADMIN or #admin)
  const navItems: { id: TabType; label: string; badge?: number }[] = [
    { id: 'catalog', label: 'קטלוג ציוד ועזרים' },
    { id: 'cart', label: 'סל ותפיסת מסגרת', badge: cartCount },
    { id: 'patient_portal', label: 'קריאות סיוע מהמיטה', badge: pendingRequestsCount },
    { id: 'sanitization', label: 'תחנת חיטוי ובדיקה' },
  ];

  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${theme.headerBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand Title */}
        <div 
          onClick={() => onSelectTab('catalog')}
          className="flex items-center gap-3 shrink-0 cursor-pointer select-none"
        >
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
            <HeartHandshake className="w-6 h-6 text-teal-600" />
          </div>
          <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 whitespace-nowrap">
            חסד בריא <span className="text-teal-600 font-bold text-sm mr-1">| השאלת ציוד ועזרי שהייה</span>
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-2 overflow-x-auto py-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`whitespace-nowrap shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20 font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-full ${
                    isActive ? 'bg-white text-teal-700' : 'bg-teal-600 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions (Single Clean Cart Button) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onSelectTab('cart')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-xl transition-all whitespace-nowrap ${
              cartCount > 0
                ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>סל השאלות</span>
            {cartCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-teal-700 flex items-center justify-center text-[11px] font-black mr-0.5">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center justify-between overflow-x-auto px-4 py-2.5 border-t border-slate-200 bg-white gap-1.5 text-xs">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                isActive ? 'bg-teal-600 text-white font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="w-4 h-4 text-[10px] bg-teal-600 text-white font-black rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
