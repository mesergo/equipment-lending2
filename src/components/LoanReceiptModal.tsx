import React from 'react';
import { X, Printer, Share2, HeartHandshake, QrCode, Phone, Calendar, MapPin, CheckCircle, Shield } from 'lucide-react';
import { LoanRecord } from '../types';
import { useToast } from './Toast';

interface LoanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanRecord | null;
}

export const LoanReceiptModal: React.FC<LoanReceiptModalProps> = ({
  isOpen,
  onClose,
  loan,
}) => {
  const { showToast } = useToast();

  if (!isOpen || !loan) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*שובר השאלה - חסד בריא*%0A` +
      `מרכז רפואי: ${loan.hospitalName}%0A` +
      `מחלקה: ${loan.department}, חדר: ${loan.roomNumber}, מיטה: ${loan.bedNumber}%0A` +
      `מאושפז: ${loan.patientName}%0A` +
      `ציוד: ${loan.equipmentName} (${loan.equipmentSku})%0A` +
      `תאריך השאלה: ${loan.loanDate}%0A` +
      `תאריך יעד להחזרה: ${loan.expectedReturnDate}%0A` +
      `מוקד חסד וסיוע: 077-8899000`;
    
    window.open(`https://wa.me/?text=${text}`, '_blank');
    showToast('קישור שובר נשלח לשיתוף בוואטסאפ', undefined, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-xl bg-slate-900 print:bg-white print:text-black border border-slate-700/80 print:border-none rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Controls - Hide in Print */}
        <div className="px-5 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Shield className="w-4 h-4 text-teal-400" />
            <span>שובר השאלה ומסמך התחייבות רשמי</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>וואטסאפ</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>הדפסה</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* The Printable Slip Body */}
        <div className="p-6 space-y-5 print:p-6 bg-slate-900 print:bg-white text-slate-100 print:text-black">
          {/* Header */}
          <div className="border-b border-slate-800 print:border-black/20 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 print:bg-teal-50 border border-teal-500/30 print:border-teal-600 flex items-center justify-center text-teal-400 print:text-teal-700">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-100 print:text-black">חסד בריא</h1>
                <p className="text-xs text-teal-400 print:text-teal-700 font-medium">
                  מערך השאלת ציוד רפואי וסיוע למאושפזים ומלווים בבתי חולים
                </p>
                <p className="text-[10px] text-slate-400 print:text-gray-500">עמותה רשומה מס' 580123456 | שירות ללא כוונת רווח</p>
              </div>
            </div>

            <div className="text-left">
              <div className="text-xs font-bold text-slate-300 print:text-gray-700">שובר השאלה</div>
              <div className="text-sm font-mono font-bold text-teal-400 print:text-black">{loan.id.toUpperCase()}</div>
              <div className="text-[10px] text-slate-400 print:text-gray-500">{loan.loanDate}</div>
            </div>
          </div>

          {/* Hospital and Bed Location Box */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-800/60 print:bg-gray-100 rounded-xl border border-slate-700/60 print:border-gray-300 text-xs">
            <div>
              <div className="text-slate-400 print:text-gray-600 text-[11px]">מרכז רפואי</div>
              <div className="font-bold text-slate-100 print:text-black text-sm">{loan.hospitalName}</div>
            </div>
            <div>
              <div className="text-slate-400 print:text-gray-600 text-[11px]">מיקום מדויק</div>
              <div className="font-bold text-slate-100 print:text-black text-sm">
                מחלקה: {loan.department} | חדר {loan.roomNumber} (מיטה {loan.bedNumber})
              </div>
            </div>
          </div>

          {/* Equipment Details */}
          <div className="space-y-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 print:text-gray-600 uppercase">פרטי הציוד שהושאל</span>
            <div className="p-3 bg-slate-800/40 print:bg-gray-50 rounded-lg border border-slate-700/40 print:border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-slate-100 print:text-black">{loan.equipmentName}</div>
                <div className="text-slate-400 print:text-gray-600 font-mono text-[11px]">מק"ט: {loan.equipmentSku}</div>
              </div>
              <div className="text-left">
                <span className="inline-block px-2.5 py-1 rounded bg-teal-500/20 print:bg-teal-100 text-teal-300 print:text-teal-800 font-semibold text-xs">
                  {loan.depositAmount > 0 ? `פיקדון: ₪${loan.depositAmount}` : 'ללא פיקדון / חסד מלא'}
                </span>
              </div>
            </div>
          </div>

          {/* Patient and Caregiver Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-800/30 print:bg-gray-50 rounded-lg border border-slate-700/30 print:border-gray-200">
              <span className="text-[11px] text-slate-400 print:text-gray-500 block mb-0.5">פרטי המאושפז</span>
              <div className="font-bold text-slate-200 print:text-black">{loan.patientName}</div>
              <div className="text-slate-400 print:text-gray-600 text-[11px]">טלפון: {loan.patientPhone}</div>
              <div className="text-slate-400 print:text-gray-600 text-[11px]">ת.ז: {loan.patientIdNumber}</div>
            </div>

            <div className="p-3 bg-slate-800/30 print:bg-gray-50 rounded-lg border border-slate-700/30 print:border-gray-200">
              <span className="text-[11px] text-slate-400 print:text-gray-500 block mb-0.5">מלווה אחראי במחלקה</span>
              <div className="font-bold text-slate-200 print:text-black">{loan.caregiverName} ({loan.caregiverRelation})</div>
              <div className="text-slate-400 print:text-gray-600 text-[11px]">טלפון: {loan.caregiverPhone}</div>
              <div className="text-slate-400 print:text-gray-600 text-[11px]">מתנדב מוסר: {loan.volunteerName}</div>
            </div>
          </div>

          {/* Dates & Deadlines */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-teal-950/40 print:bg-teal-50 border border-teal-500/30 print:border-teal-200 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-400 print:text-teal-700" />
              <div>
                <span className="text-slate-300 print:text-gray-700">תאריך השאלה: </span>
                <span className="font-bold text-slate-100 print:text-black">{loan.loanDate}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-300 print:text-gray-700">תאריך יעד להחזרה: </span>
              <span className="font-extrabold text-teal-300 print:text-teal-800">{loan.expectedReturnDate}</span>
            </div>
          </div>

          {/* Signature & Barcode area */}
          <div className="pt-2 border-t border-slate-800 print:border-gray-200 flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] text-slate-400 print:text-gray-500 mb-1">חתימת הלווה / המלווה:</div>
              {loan.signatureDataUrl ? (
                <img
                  src={loan.signatureDataUrl}
                  alt="חתימה דיגיטלית"
                  className="h-12 border border-slate-700 print:border-gray-300 rounded bg-slate-950 print:bg-white p-1"
                />
              ) : (
                <div className="h-10 w-36 border border-dashed border-slate-700 print:border-gray-400 rounded flex items-center justify-center text-[10px] text-slate-500">
                  נחתם דיגיטלית במוקד
                </div>
              )}
            </div>

            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-white p-1 rounded flex items-center justify-center">
                <QrCode className="w-12 h-12 text-slate-900" />
              </div>
              <span className="text-[9px] text-slate-400 print:text-gray-500 mt-0.5 font-mono">סרוק להחזרה</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center pt-2 border-t border-slate-800 print:border-gray-200 text-[10px] text-slate-400 print:text-gray-600 leading-relaxed">
            רפואה שלמה ובריאות איתנה! לכל שאלה, הארכה או החזרה נא לפנות למוקד חסד: <strong className="text-slate-200 print:text-black">077-8899000</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
