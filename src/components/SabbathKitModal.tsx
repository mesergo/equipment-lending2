import React, { useState } from 'react';
import { X, MoonStar, Check, Sparkles, Heart, Phone, MapPin } from 'lucide-react';
import { Hospital } from '../types';
import { useToast } from './Toast';

interface SabbathKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals: Hospital[];
  onDispatchSabbathKit: (hospitalId: string, department: string, room: string, requestedItems: string[], contactPhone: string, notes: string) => void;
}

export const SabbathKitModal: React.FC<SabbathKitModalProps> = ({
  isOpen,
  onClose,
  hospitals,
  onDispatchSabbathKit,
}) => {
  const { showToast } = useToast();
  const [hospitalId, setHospitalId] = useState(hospitals[0]?.id || 'sheba');
  const [department, setDepartment] = useState('');
  const [room, setRoom] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [selectedKits, setSelectedKits] = useState<{ [key: string]: boolean }>({
    'פלטת שבת כשרה מאושרת בטיחות': true,
    'מיחם שבת מבודד 40 כוסות': true,
    'נרות שבת לד בטיחותיים + ברכות': true,
    'ערכת קידוש והבדלה (גביע, יין, בשמים)': true,
    'כיסויי חלות מהודרים וסכין שבת': false,
    'מיטת מלווה מתקפלת לשבת': true,
    'ערכת היגיינה ומשחת שיניים לשבת': false,
  });

  if (!isOpen) return null;

  const currentHospital = hospitals.find((h) => h.id === hospitalId);

  const toggleKit = (item: string) => {
    setSelectedKits((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const items = Object.keys(selectedKits).filter((k) => selectedKits[k]);
    if (items.length === 0) {
      showToast('נא לבחור לפחות פריט אחד לערכת שבת', undefined, 'error');
      return;
    }
    if (!department || !room || !contactPhone) {
      showToast('נא למלא מחלקה, חדר ומספר טלפון', undefined, 'error');
      return;
    }

    onDispatchSabbathKit(hospitalId, department, room, items, contactPhone, notes);
    onClose();
    showToast('קריאת ערכת שבת שוגרה למתנדבי המוקד!', `למחלקת ${department} חדר ${room}`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-700 text-amber-300 flex items-center justify-center shadow-inner">
              <MoonStar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">הזמנת ערכת שבת ומועדים למחלקה</h2>
                <span className="text-[10px] bg-amber-400 text-indigo-950 font-black px-2 py-0.5 rounded-full">
                  ללא עלות
                </span>
              </div>
              <p className="text-xs text-indigo-200">אספקה מרוכזת של ציוד שבת מאושר בטיחות עד ערב שבת בשעה 16:00</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-indigo-200 hover:text-white hover:bg-indigo-700/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleDispatch} className="p-6 overflow-y-auto space-y-4 text-xs text-right">
          
          {/* Kit Items selection checkboxes */}
          <div className="space-y-2">
            <label className="block text-slate-700 font-bold">בחירת פריטי ערכת השבת הדרושים לכם:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.keys(selectedKits).map((itemKey) => {
                const isChecked = selectedKits[itemKey];
                return (
                  <div
                    key={itemKey}
                    onClick={() => toggleKit(itemKey)}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      isChecked
                        ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 font-bold shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <span className="text-xs">{itemKey}</span>
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Location fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-slate-700 font-bold mb-1">בית חולים *</label>
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">מחלקה מאשפזת *</label>
              <input
                type="text"
                required
                placeholder="למשל: כירורגית ב׳"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">מספר חדר *</label>
              <input
                type="text"
                required
                placeholder="למשל: 402"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">טלפון ליצירת קשר *</label>
              <input
                type="tel"
                required
                placeholder="05X-XXXXXXX"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">הערות ובקשות מיוחדות</label>
            <input
              type="text"
              placeholder="למשל: נשמח לקבל לפני השעה 15:00"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              ביטול
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-700/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>שגר הזמנת ערכת שבת ➔</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
