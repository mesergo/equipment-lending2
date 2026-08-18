import React from 'react';
import { 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  Building2, 
  Package, 
  ShoppingCart, 
  Check, 
  Lock,
  HeartHandshake
} from 'lucide-react';
import { EquipmentItem, Hospital } from '../types';

interface EquipmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EquipmentItem | null;
  hospital?: Hospital;
  isInCart: boolean;
  onAddToCart: (item: EquipmentItem) => void;
  onDirectCheckout: (item: EquipmentItem) => void;
}

export const EquipmentDetailsModal: React.FC<EquipmentDetailsModalProps> = ({
  isOpen,
  onClose,
  item,
  hospital,
  isInCart,
  onAddToCart,
  onDirectCheckout,
}) => {
  if (!isOpen || !item) return null;

  const isAvailable = item.status === 'available' && item.stockAvailable > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                {item.sku}
              </span>
              {item.isUrgentSabbath && (
                <span className="text-[11px] font-black bg-indigo-600 text-white px-2.5 py-0.5 rounded-lg shadow-sm">
                  ערכת שבת
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-900">{item.name}</h2>
            <p className="text-xs text-slate-500">
              {hospital?.name || 'מחסן ראשי'} • {item.depotLocation}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Large Photo Section */}
          {item.photoUrl && (
            <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
              <img
                src={item.photoUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 shadow-sm">
                תמונה מקורית של הציוד
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">תיאור ומטרת השימוש</h3>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {item.description}
            </p>
          </div>

          {/* Key Specs */}
          {item.fullSpecs && item.fullSpecs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">מפרט טכני ובטיחות</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {item.fullSpecs.map((spec, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>{spec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deposit & Stock Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
              <span className="text-[11px] text-slate-500 block">עלות השאלה</span>
              <span className="text-base font-black text-emerald-700">חינם (0 ₪)</span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
              <span className="text-[11px] text-slate-500 block">מסגרת ביטחון</span>
              <span className="text-base font-black text-teal-800">₪{item.depositAmount}</span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
              <span className="text-[11px] text-slate-500 block">זמינות במלאי</span>
              <span className={`text-base font-black ${isAvailable ? 'text-emerald-700' : 'text-rose-600'}`}>
                {item.stockAvailable} יח׳
              </span>
            </div>
          </div>

          {/* Frame Hold explanation */}
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-start gap-3 text-xs text-teal-900">
            <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="block font-bold">תפיסת מסגרת אשראי בלבד:</strong>
              <p className="text-teal-800 leading-relaxed">
                סכום מסגרת הביטחון (₪{item.depositAmount}) אינו מחויב בחשבון, אלא נתפס כערבון בלבד ומשתחרר אוטומטית עם החזרת הציוד למוקד.
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            סגירה
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!isAvailable}
              onClick={() => {
                onAddToCart(item);
                onClose();
              }}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isInCart
                  ? 'bg-teal-100 text-teal-800 border border-teal-300'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-sm'
              }`}
            >
              {isInCart ? (
                <>
                  <Check className="w-4 h-4 text-teal-600" />
                  <span>בסל ההשאלות</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>הוסף לסל</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={!isAvailable}
              onClick={() => {
                onDirectCheckout(item);
                onClose();
              }}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-2xl shadow-md shadow-teal-700/20 transition-all disabled:bg-slate-200 disabled:text-slate-400"
            >
              הזמן ישירות למיטה ➔
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
