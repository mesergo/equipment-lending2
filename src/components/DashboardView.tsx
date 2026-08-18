import React from 'react';
import { 
  HeartHandshake, 
  Clock, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle, 
  ArrowLeft, 
  QrCode, 
  MoonStar, 
  Sparkles,
  Phone,
  Bed,
  Building2,
  Calendar,
  Layers,
  Activity
} from 'lucide-react';
import { EquipmentItem, Hospital, LoanRecord, PatientRequest, SanitizationLog, Volunteer } from '../types';
import { StatsBanner } from './StatsBanner';

interface DashboardViewProps {
  hospitals: Hospital[];
  selectedHospitalId: string;
  equipment: EquipmentItem[];
  loans: LoanRecord[];
  requests: PatientRequest[];
  sanitizationQueue: SanitizationLog[];
  volunteers: Volunteer[];
  onOpenNewLoan: (equipmentId?: string) => void;
  onOpenReturnModal: (loan: LoanRecord) => void;
  onOpenReceipt: (loan: LoanRecord) => void;
  onOpenScanner: () => void;
  onOpenSabbathModal: () => void;
  onAssignVolunteerToRequest: (requestId: string, volunteerName: string) => void;
  onNavigateToTab: (tab: 'loans' | 'patient_portal' | 'sanitization' | 'inventory' | 'volunteers') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  hospitals,
  selectedHospitalId,
  equipment,
  loans,
  requests,
  sanitizationQueue,
  volunteers,
  onOpenNewLoan,
  onOpenReturnModal,
  onOpenReceipt,
  onOpenScanner,
  onOpenSabbathModal,
  onAssignVolunteerToRequest,
  onNavigateToTab,
}) => {
  // Filter data if a specific hospital is selected
  const filteredEquipment = selectedHospitalId === 'all' 
    ? equipment 
    : equipment.filter((e) => e.hospitalId === selectedHospitalId);

  const filteredLoans = selectedHospitalId === 'all'
    ? loans
    : loans.filter((l) => l.hospitalId === selectedHospitalId);

  const filteredRequests = selectedHospitalId === 'all'
    ? requests
    : requests.filter((r) => r.hospitalId === selectedHospitalId);

  const pendingRequests = filteredRequests.filter((r) => r.status === 'pending');
  const activeLoans = filteredLoans.filter((l) => l.status === 'active' || l.status === 'overdue');
  const availableVolunteers = volunteers.filter((v) => v.status === 'available');

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Quick Stats Banner */}
      <StatsBanner
        equipment={filteredEquipment}
        loans={filteredLoans}
        requests={filteredRequests}
        sanitizationQueue={sanitizationQueue}
        onNavigateToTab={onNavigateToTab}
      />

      {/* 2. Urgent Patient & Caregiver Bedside Calls (Hot Triage) */}
      {pendingRequests.length > 0 && (
        <section className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                  <span>קריאות דחופות מחדרי אשפוז להבאת ציוד ({pendingRequests.length})</span>
                  <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-black">
                    בטיפול מיידי
                  </span>
                </h2>
                <p className="text-xs text-amber-300/80">בקשות ששוגרו ע"י משפחות ומאושפזים במחלקות</p>
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab('patient_portal')}
              className="text-xs font-semibold text-amber-300 hover:text-amber-100 flex items-center gap-1 self-end sm:self-auto"
            >
              <span>מעבר לכל הקריאות</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingRequests.slice(0, 2).map((req) => (
              <div
                key={req.id}
                className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-100">{req.hospitalName}</span>
                      <div className="text-xs text-teal-300 font-semibold mt-0.5">
                        מחלקה: {req.department} | חדר {req.roomNumber} (מיטה {req.bedNumber})
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {req.createdAt}
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1">
                    <div className="text-xs font-medium text-slate-200">
                      פריטים מבוקשים: <span className="text-amber-300 font-bold">{req.requestedItemNames.join(', ')}</span>
                    </div>
                    {req.notes && (
                      <p className="text-[11px] text-slate-300 bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
                        "{req.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-400">
                    פונה: <span className="text-slate-200 font-medium">{req.requestedBy}</span> ({req.contactPhone})
                  </div>

                  <div className="flex items-center gap-1.5">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          onAssignVolunteerToRequest(req.id, e.target.value);
                        }
                      }}
                      className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-teal-500"
                    >
                      <option value="">שגר מתנדב תורן...</option>
                      {availableVolunteers.map((v) => (
                        <option key={v.id} value={v.name}>
                          {v.name} ({v.role})
                        </option>
                      ))}
                      <option value="אביעד כהן">אביעד כהן (במחלקות כעת)</option>
                      <option value="יוסי פרידמן">יוסי פרידמן (רכז)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Main Dashboard 2-Column Split: Active Loans & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Loans in Hospital Wards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <Bed className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">השאלות פעילות במחלקות</h2>
                <p className="text-xs text-slate-400">ציוד שנמצא כעת בשימוש מאושפזים ומלווים</p>
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab('loans')}
              className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              <span>צפה בכל ההשאלות ({activeLoans.length})</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {activeLoans.slice(0, 4).map((loan) => {
              const isOverdue = loan.status === 'overdue';
              return (
                <div
                  key={loan.id}
                  className={`p-4 rounded-xl bg-slate-800/80 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isOverdue ? 'border-rose-500/50 bg-rose-950/10' : 'border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  {/* Item and Patient info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100">{loan.equipmentName}</span>
                      <span className="text-[11px] font-mono text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                        {loan.equipmentSku}
                      </span>
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                          באיחור
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span className="text-slate-200 font-medium">
                        מאושפז: {loan.patientName} ({loan.caregiverRelation}: {loan.caregiverName})
                      </span>
                      <span>•</span>
                      <span className="text-teal-300">
                        {loan.department} | חדר {loan.roomNumber}
                      </span>
                      <span>•</span>
                      <span>יעד החזרה: <strong className="text-slate-200">{loan.expectedReturnDate}</strong></span>
                    </div>
                  </div>

                  {/* Actions for this loan */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => onOpenReceipt(loan)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                      title="הצג שובר חתום"
                    >
                      שובר
                    </button>
                    <button
                      onClick={() => onOpenReturnModal(loan)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold transition-colors"
                    >
                      קלוט החזרה
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Fast Actions & Volunteer Station */}
        <div className="space-y-5">
          {/* Quick Hub Panel */}
          <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>פעולות מוקד מהירות</span>
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => onOpenNewLoan()}
                className="w-full py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-md transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <PlusCircle className="w-4 h-4" />
                  <span>השאלה חדשה למאושפז</span>
                </div>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenSabbathModal}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 font-semibold text-xs transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <MoonStar className="w-4 h-4 text-indigo-400" />
                  <span>שיגור ערכת שבת למחלקה</span>
                </div>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onOpenScanner}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-teal-400" />
                  <span>סריקת ברקוד פריט מהירה</span>
                </div>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Impact & Charity Counters */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700/70 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4" />
              <span>מדדי חסד ועשייה חודשית</span>
            </h3>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                <span className="text-slate-400">משפחות שנעזרו החודש:</span>
                <span className="font-black text-slate-100 text-sm">342 משפחות</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                <span className="text-slate-400">ערכות שבת שחולקו:</span>
                <span className="font-bold text-indigo-300 text-sm">89 ערכות</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                <span className="text-slate-400">חיסכון משוער למאושפזים:</span>
                <span className="font-black text-emerald-400 text-sm">₪185,000+</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">מתנדבי חסד פעילים היום:</span>
                <span className="font-bold text-teal-300">{volunteers.length} מתנדבים</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
