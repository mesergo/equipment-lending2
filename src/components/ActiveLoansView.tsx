import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Calendar, 
  Clock, 
  Share2, 
  CheckCircle2, 
  RotateCcw, 
  AlertTriangle, 
  Phone, 
  Plus, 
  Printer, 
  Bed, 
  ShieldCheck,
  Building2,
  Send
} from 'lucide-react';
import { Hospital, LoanRecord } from '../types';
import { useToast } from './Toast';

interface ActiveLoansViewProps {
  loans: LoanRecord[];
  hospitals: Hospital[];
  selectedHospitalId: string;
  onOpenNewLoan: () => void;
  onOpenReturnModal: (loan: LoanRecord) => void;
  onOpenReceipt: (loan: LoanRecord) => void;
  onExtendLoan: (loanId: string, additionalDays: number) => void;
}

export const ActiveLoansView: React.FC<ActiveLoansViewProps> = ({
  loans,
  hospitals,
  selectedHospitalId,
  onOpenNewLoan,
  onOpenReturnModal,
  onOpenReceipt,
  onExtendLoan,
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'returned'>('all');

  const filteredLoans = loans.filter((loan) => {
    if (selectedHospitalId !== 'all' && loan.hospitalId !== selectedHospitalId) return false;
    if (statusFilter !== 'all' && loan.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        loan.patientName.toLowerCase().includes(q) ||
        loan.patientPhone.includes(q) ||
        loan.equipmentName.toLowerCase().includes(q) ||
        loan.equipmentSku.toLowerCase().includes(q) ||
        loan.department.toLowerCase().includes(q) ||
        loan.roomNumber.includes(q) ||
        loan.caregiverName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSendReminderSMS = (loan: LoanRecord) => {
    showToast(
      `הודעת תזכורת נשלחה ל-${loan.caregiverName || loan.patientName}`,
      `SMS נשלח בהצלחה לטלפון ${loan.caregiverPhone || loan.patientPhone}`,
      'success'
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <span>ניהול השאלות ומעקב במחלקות</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            מעקב אחר ציוד שנמסר למאושפזים, תאריכי יעד להחזרה והארכות תקופה
          </p>
        </div>

        <button
          onClick={onOpenNewLoan}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>השאלה חדשה למאושפז</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="חיפוש לפי שם מאושפז, מלווה, טלפון, מחלקה, חדר או מק''ט..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="all">כל השוברים</option>
            <option value="active">השאלות פעילות</option>
            <option value="overdue">באיחור להחזרה</option>
            <option value="returned">הוחזרו והושלמו</option>
          </select>
        </div>
      </div>

      {/* Loans List */}
      <div className="space-y-3">
        {filteredLoans.map((loan) => {
          const isOverdue = loan.status === 'overdue';
          const isReturned = loan.status === 'returned';

          return (
            <div
              key={loan.id}
              className={`p-5 rounded-2xl bg-slate-900/90 border transition-all space-y-4 ${
                isOverdue
                  ? 'border-rose-500/50 bg-rose-950/10'
                  : isReturned
                  ? 'border-slate-800/60 opacity-70'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header row: Item name, SKU, Status badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-extrabold text-base text-slate-100">{loan.equipmentName}</span>
                  <span className="font-mono text-xs text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                    {loan.equipmentSku}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    #{loan.id}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isOverdue && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>איחור בהחזרה</span>
                    </span>
                  )}
                  {loan.status === 'active' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                      <span>פעיל במחלקה</span>
                    </span>
                  )}
                  {isReturned && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>הוחזר ונסגר</span>
                    </span>
                  )}
                  {loan.depositAmount > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-teal-300 border border-slate-700">
                      פיקדון: ₪{loan.depositAmount}
                    </span>
                  )}
                </div>
              </div>

              {/* Grid with 3 columns: Location in Hospital, Patient & Caregiver info, Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                {/* Col 1: Hospital location */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">מיקום במרכז הרפואי:</span>
                  <div className="font-bold text-slate-200">{loan.hospitalName}</div>
                  <div className="text-teal-300 font-medium">
                    מחלקה: {loan.department} | חדר {loan.roomNumber} (מיטה {loan.bedNumber})
                  </div>
                </div>

                {/* Col 2: Patient & Caregiver */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">פרטי מאושפז ומלווה:</span>
                  <div className="font-bold text-slate-200">
                    {loan.patientName} <span className="text-slate-400 font-normal">({loan.patientPhone})</span>
                  </div>
                  <div className="text-slate-300">
                    מלווה: {loan.caregiverName} ({loan.caregiverRelation}) - {loan.caregiverPhone}
                  </div>
                </div>

                {/* Col 3: Dates */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">לוח זמנים:</span>
                  <div className="text-slate-300">
                    נמסר בתאריך: <strong className="text-slate-200">{loan.loanDate}</strong>
                  </div>
                  <div className="text-slate-300">
                    יעד החזרה: <strong className={isOverdue ? 'text-rose-400 font-bold' : 'text-teal-300 font-bold'}>{loan.expectedReturnDate}</strong>
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>מתנדב מוסר: {loan.volunteerName}</span>
                  {loan.notes && <span className="text-slate-500">• {loan.notes}</span>}
                </div>

                <div className="flex items-center gap-2">
                  {/* WhatsApp SMS Reminder */}
                  {!isReturned && (
                    <button
                      onClick={() => handleSendReminderSMS(loan)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1"
                      title="שליחת תזכורת ב-SMS"
                    >
                      <Send className="w-3.5 h-3.5 text-teal-400" />
                      <span>תזכורת SMS</span>
                    </button>
                  )}

                  {/* Extend loan */}
                  {!isReturned && (
                    <button
                      onClick={() => onExtendLoan(loan.id, 7)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-teal-300 text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>הארך בשבוע</span>
                    </button>
                  )}

                  {/* View slip */}
                  <button
                    onClick={() => onOpenReceipt(loan)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5 text-teal-400" />
                    <span>שובר רשמי</span>
                  </button>

                  {/* Return item */}
                  {!isReturned && (
                    <button
                      onClick={() => onOpenReturnModal(loan)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>קלוט החזרה</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredLoans.length === 0 && (
          <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-dashed border-slate-800 text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold">לא נמצאו שוברי השאלה בהתאם לסינון</p>
          </div>
        )}
      </div>
    </div>
  );
};
