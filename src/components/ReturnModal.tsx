import React, { useState } from 'react';
import { X, CheckCircle2, RotateCcw, Sparkles, Heart, AlertTriangle, ShieldCheck } from 'lucide-react';
import { LoanRecord } from '../types';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanRecord | null;
  onConfirmReturn: (loanId: string, condition: 'clean' | 'needs_sanitization' | 'damaged', depositAction: 'refund' | 'donate' | 'none', notes: string) => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  isOpen,
  onClose,
  loan,
  onConfirmReturn,
}) => {
  const [condition, setCondition] = useState<'clean' | 'needs_sanitization' | 'damaged'>('needs_sanitization');
  const [depositAction, setDepositAction] = useState<'refund' | 'donate' | 'none'>('refund');
  const [returnNotes, setReturnNotes] = useState<string>('');

  if (!isOpen || !loan) return null;

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmReturn(loan.id, condition, depositAction, returnNotes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">קליטת החזרת ציוד וסגירת השאלה</h2>
              <p className="text-xs text-slate-400">שובר #{loan.id} - {loan.equipmentName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleReturnSubmit} className="p-6 space-y-5">
          {/* Loan Summary Summary */}
          <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">מאושפז:</span>
              <span className="font-bold text-slate-100">{loan.patientName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">מחלקה וחדר:</span>
              <span className="font-medium text-slate-200">{loan.department} | חדר {loan.roomNumber} (מיטה {loan.bedNumber})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">תאריך השאלה:</span>
              <span className="text-slate-300">{loan.loanDate}</span>
            </div>
            {loan.depositAmount > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-700 text-teal-300 font-semibold">
                <span>פיקדון שנגבה בהשאלה:</span>
                <span>₪{loan.depositAmount}</span>
              </div>
            )}
          </div>

          {/* Condition Check */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-teal-400 uppercase tracking-wider">
              בדיקת מצב הציוד המוחזר
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCondition('needs_sanitization')}
                className={`p-2.5 rounded-lg border text-xs font-medium text-right flex flex-col gap-1 transition-all ${
                  condition === 'needs_sanitization'
                    ? 'bg-teal-500/20 border-teal-500 text-teal-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center gap-1 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>להעברה לחיטוי</span>
                </div>
                <span className="text-[10px] text-slate-400">תקין, דורש ניקוי וסניטציה</span>
              </button>

              <button
                type="button"
                onClick={() => setCondition('clean')}
                className={`p-2.5 rounded-lg border text-xs font-medium text-right flex flex-col gap-1 transition-all ${
                  condition === 'clean'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>מוכן למדף</span>
                </div>
                <span className="text-[10px] text-slate-400">נבדק וחזר נקי לחלוטין</span>
              </button>

              <button
                type="button"
                onClick={() => setCondition('damaged')}
                className={`p-2.5 rounded-lg border text-xs font-medium text-right flex flex-col gap-1 transition-all ${
                  condition === 'damaged'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center gap-1 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>פגום / לתחזוקה</span>
                </div>
                <span className="text-[10px] text-slate-400">שבר או בלאי טכני</span>
              </button>
            </div>
          </div>

          {/* Deposit action if deposit > 0 */}
          {loan.depositAmount > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-bold text-teal-400 uppercase tracking-wider">
                טיפול בפיקדון (₪{loan.depositAmount})
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDepositAction('refund')}
                  className={`p-2.5 rounded-lg border text-xs font-medium text-right flex items-center gap-2 transition-all ${
                    depositAction === 'refund'
                      ? 'bg-teal-500/20 border-teal-500 text-teal-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <RotateCcw className="w-4 h-4 text-teal-400" />
                  <div>
                    <div className="font-bold">החזרת פיקדון מלאה</div>
                    <div className="text-[10px] text-slate-400">זיכוי כרטיס / החזר מזומן</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDepositAction('donate')}
                  className={`p-2.5 rounded-lg border text-xs font-medium text-right flex items-center gap-2 transition-all ${
                    depositAction === 'donate'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <Heart className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="font-bold">תרומה לעמותת חסד</div>
                    <div className="text-[10px] text-slate-400">הלווה תרם את הפיקדון</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">הערות לקבלה וקליטה</label>
            <input
              type="text"
              placeholder="לדוגמה: הוחזר ע״י המתנדב אביעד, נרשם במחסן."
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-lg shadow-emerald-950 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>אשר קבלת הציוד והעבר לחיטוי</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
