import React, { useState } from 'react';
import { 
  Users, 
  Phone, 
  Building2, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Send, 
  Plus, 
  Sparkles,
  Heart,
  MessageCircle
} from 'lucide-react';
import { Hospital, Volunteer } from '../types';
import { useToast } from './Toast';

interface VolunteersViewProps {
  volunteers: Volunteer[];
  hospitals: Hospital[];
  selectedHospitalId: string;
  onUpdateVolunteerStatus: (volunteerId: string, status: Volunteer['status']) => void;
  onAddNewVolunteer: (volunteer: Omit<Volunteer, 'id' | 'activeDispatchesCount'>) => void;
}

export const VolunteersView: React.FC<VolunteersViewProps> = ({
  volunteers,
  hospitals,
  selectedHospitalId,
  onUpdateVolunteerStatus,
  onAddNewVolunteer,
}) => {
  const { showToast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [hospitalId, setHospitalId] = useState(
    selectedHospitalId !== 'all' ? selectedHospitalId : hospitals[0]?.id || 'sheba'
  );
  const [role, setRole] = useState<Volunteer['role']>('מתנדב מחלקות');

  const filteredVolunteers = volunteers.filter((v) => {
    if (selectedHospitalId !== 'all' && v.hospitalId !== selectedHospitalId) return false;
    return true;
  });

  const handleAddVolunteer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const hospital = hospitals.find((h) => h.id === hospitalId);

    onAddNewVolunteer({
      name,
      phone,
      hospitalId,
      hospitalName: hospital?.name.split(' - ')[0] || 'מרכז רפואי',
      status: 'available',
      role,
    });

    setIsAddModalOpen(false);
    setName('');
    setPhone('');
    showToast('מתנדב חדש נוסף למערך בהצלחה!', undefined, 'success');
  };

  const handleSendShiftWhatsApp = (vol: Volunteer) => {
    const text = `שלום ${vol.name}, תודה על התנדבותך בעמותת חסד בריא בבית החולים ${vol.hospitalName}! נא לעדכן כשאתה זמין למשמרת במחלקות.`;
    window.open(`https://wa.me/972${vol.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            <span>מערך מתנדבי חסד ושינוע במחלקות</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            ניהול כוננים, רכזי מוקדים ומתנדבי חלוקת ציוד בבתי החולים
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>הוסף מתנדב חדש</span>
        </button>
      </div>

      {/* Grid of Volunteers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVolunteers.map((vol) => {
          const isAvailable = vol.status === 'available';
          const isBusy = vol.status === 'busy';
          const isOnCall = vol.status === 'on_call';

          return (
            <div
              key={vol.id}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                {/* Name & Role */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{vol.name}</h3>
                    <div className="text-xs text-teal-400 font-semibold mt-0.5">{vol.role}</div>
                  </div>

                  {/* Status badge */}
                  <div>
                    {isAvailable && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        זמין במחלקות
                      </span>
                    )}
                    {isBusy && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        בשינוע ({vol.activeDispatchesCount})
                      </span>
                    )}
                    {isOnCall && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        כונן זמין
                      </span>
                    )}
                    {vol.status === 'off_duty' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        לא במשמרת
                      </span>
                    )}
                  </div>
                </div>

                {/* Hospital & Contact */}
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-800 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">מרכז רפואי:</span>
                    <span className="font-medium text-slate-200">{vol.hospitalName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">טלפון:</span>
                    <a href={`tel:${vol.phone}`} className="text-teal-400 font-mono hover:underline">
                      {vol.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <select
                  value={vol.status}
                  onChange={(e) => onUpdateVolunteerStatus(vol.id, e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-teal-500"
                >
                  <option value="available">זמין במחלקות</option>
                  <option value="on_call">כונן טלפוני</option>
                  <option value="busy">בביצוע משימה</option>
                  <option value="off_duty">לא במשמרת</option>
                </select>

                <button
                  onClick={() => handleSendShiftWhatsApp(vol)}
                  className="p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors"
                  title="הודעת וואטסאפ למתנדב"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Volunteer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-400" />
                <span>רישום מתנדב / כונן חדש</span>
              </h2>
            </div>

            <form onSubmit={handleAddVolunteer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">שם מלא של המתנדב *</label>
                <input
                  type="text"
                  required
                  placeholder="ישראל ישראלי"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">מספר טלפון *</label>
                <input
                  type="tel"
                  required
                  placeholder="050-1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">בית חולים עיקרי</label>
                <select
                  value={hospitalId}
                  onChange={(e) => setHospitalId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">תפקיד במערך החסד</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="מתנדב מחלקות">מתנדב מחלקות ושינוע</option>
                  <option value="רכז מוקד">רכז מוקד / אחראי ארונות</option>
                  <option value="כונן שבת">כונן שבת ומועדים</option>
                  <option value="טכנאי חיטוי ובדיקה">טכנאי חיטוי ובדיקה</option>
                </select>
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
                  הוסף מתנדב
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
