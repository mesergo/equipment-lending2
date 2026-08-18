import React from 'react';
import { PackageCheck, Clock, RefreshCw, MoonStar, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { EquipmentItem, LoanRecord, PatientRequest, SanitizationLog } from '../types';

interface StatsBannerProps {
  equipment: EquipmentItem[];
  loans: LoanRecord[];
  requests: PatientRequest[];
  sanitizationQueue: SanitizationLog[];
  onNavigateToTab: (tab: 'loans' | 'patient_portal' | 'sanitization' | 'inventory') => void;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({
  equipment,
  loans,
  requests,
  sanitizationQueue,
  onNavigateToTab,
}) => {
  const activeLoansCount = loans.filter((l) => l.status === 'active' || l.status === 'overdue').length;
  const overdueCount = loans.filter((l) => l.status === 'overdue').length;
  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length;
  const sanitizingCount = equipment.filter((e) => e.status === 'sanitizing').length;
  const availableCount = equipment.filter((e) => e.status === 'available').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Active Loans */}
      <button
        type="button"
        onClick={() => onNavigateToTab('loans')}
        className="group text-right p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-teal-500/50 hover:bg-slate-800 transition-all text-slate-100 flex flex-col justify-between"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-medium text-slate-400">השאלות פעילות במחלקות</span>
          <PackageCheck className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-2xl font-black text-slate-100">{activeLoansCount}</span>
          {overdueCount > 0 ? (
            <span className="text-[11px] font-semibold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/50 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {overdueCount} באיחור
            </span>
          ) : (
            <span className="text-[11px] text-emerald-400 font-medium">כולן במועד</span>
          )}
        </div>
      </button>

      {/* 2. Urgent Bedside Requests */}
      <button
        type="button"
        onClick={() => onNavigateToTab('patient_portal')}
        className={`group text-right p-4 rounded-xl border transition-all flex flex-col justify-between ${
          pendingRequestsCount > 0
            ? 'bg-amber-950/20 border-amber-500/40 hover:bg-amber-950/30'
            : 'bg-slate-800/80 border-slate-700/60 hover:bg-slate-800'
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-medium text-amber-300">קריאות דחופות מחדרי אשפוז</span>
          <Clock className={`w-4 h-4 ${pendingRequestsCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-2xl font-black text-amber-200">{pendingRequestsCount}</span>
          <span className="text-[11px] text-amber-300/80 flex items-center gap-0.5 group-hover:text-amber-200">
            <span>לטיפול מהיר</span>
            <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </button>

      {/* 3. Sanitization & Safety Protocol */}
      <button
        type="button"
        onClick={() => onNavigateToTab('sanitization')}
        className="group text-right p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-cyan-500/50 hover:bg-slate-800 transition-all text-slate-100 flex flex-col justify-between"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-medium text-slate-400">בתחנת חיטוי ובקרת איכות</span>
          <RefreshCw className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform" />
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-2xl font-black text-slate-100">{sanitizingCount}</span>
          <span className="text-[11px] text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
            פרוטוקול רפואי
          </span>
        </div>
      </button>

      {/* 4. Equipment Ready on Shelves */}
      <button
        type="button"
        onClick={() => onNavigateToTab('inventory')}
        className="group text-right p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/50 hover:bg-slate-800 transition-all text-slate-100 flex flex-col justify-between"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-medium text-slate-400">ציוד זמין מיידית במחסנים</span>
          <PackageCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-2xl font-black text-emerald-400">{availableCount}</span>
          <span className="text-[11px] text-slate-400">
            מתוך {equipment.length} פריטים
          </span>
        </div>
      </button>
    </div>
  );
};
