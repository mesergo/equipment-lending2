import React, { useState } from 'react';
import { 
  HeartHandshake, 
  Send, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Bed, 
  Phone, 
  User, 
  Sparkles, 
  Check, 
  MoonStar, 
  Activity, 
  Bath, 
  Zap, 
  AlertCircle,
  Truck,
  ArrowLeft,
  Plus
} from 'lucide-react';
import { Hospital, PatientRequest, Volunteer } from '../types';
import { useToast } from './Toast';

interface PatientPortalViewProps {
  hospitals: Hospital[];
  selectedHospitalId: string;
  requests: PatientRequest[];
  volunteers: Volunteer[];
  onAddNewRequest: (req: Omit<PatientRequest, 'id' | 'createdAt' | 'status'>) => void;
  onAssignVolunteer: (requestId: string, volunteerName: string) => void;
  onUpdateStatus: (requestId: string, status: PatientRequest['status']) => void;
}

export const PatientPortalView: React.FC<PatientPortalViewProps> = ({
  hospitals,
  selectedHospitalId,
  requests,
  volunteers,
  onAddNewRequest,
  onAssignVolunteer,
  onUpdateStatus,
}) => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'board' | 'form'>('board');

  // Form states
  const [hospitalId, setHospitalId] = useState(
    selectedHospitalId !== 'all' ? selectedHospitalId : hospitals[0]?.id || 'sheba'
  );
  const [department, setDepartment] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [requestType, setRequestType] = useState<'equipment' | 'sabbath_kit' | 'volunteer_visit'>('equipment');
  const [equipmentRequestedName, setEquipmentRequestedName] = useState('');
  const [notes, setNotes] = useState('');

  const currentHospital = hospitals.find((h) => h.id === hospitalId);

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!department || !roomNumber || !requestedBy || !contactPhone) {
      showToast('נא למלא את כל שדות החובה המסומנים בכוכבית', undefined, 'error');
      return;
    }

    onAddNewRequest({
      hospitalId,
      department,
      roomNumber,
      bedNumber: bedNumber || 'מיטה 1',
      patientName: requestedBy,
      contactPhone,
      requestType,
      equipmentRequestedName: equipmentRequestedName || 'סיוע כללי למיטה',
      urgency,
      notes,
    });

    showToast('קריאת הסיוע נקלטה בהצלחה!', 'מתנדב כונן במחלקה יקבל את הקריאה מיד', 'success');
    setActiveSubTab('board');
    setNotes('');
    setDepartment('');
    setRoomNumber('');
  };

  return (
    <div className="space-y-6 pb-20 text-slate-900">
      
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-teal-600" />
            <span>קריאות סיוע ועזרה ישירות ממיטת האשפוז</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            מוקד קריאות חירום ועזרה למאושפזים ומלווים במחלקות בתי החולים
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('board')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'board'
                ? 'bg-teal-600 text-white shadow-sm font-black'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            לוח קריאות פעילות ({requests.length})
          </button>

          <button
            onClick={() => setActiveSubTab('form')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'form'
                ? 'bg-teal-600 text-white shadow-sm font-black'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>פתיחת קריאה חדשה</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: Active Board */}
      {activeSubTab === 'board' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((req) => {
              const hospital = hospitals.find((h) => h.id === req.hospitalId);

              return (
                <div
                  key={req.id}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between hover:border-teal-200 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        req.urgency === 'urgent'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                          : 'bg-teal-50 text-teal-700 border border-teal-200'
                      }`}>
                        {req.urgency === 'urgent' ? 'דחוף למחלקה' : 'קריאה רגילה'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">{req.createdAt}</span>
                    </div>

                    <h3 className="text-sm font-black text-slate-900">{req.equipmentRequestedName}</h3>

                    <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div>מאושפז/ת: <strong>{req.patientName}</strong></div>
                      <div>מיקום: <strong>{hospital?.name.split(' - ')[0]} • {req.department} ({req.roomNumber})</strong></div>
                      <div>טלפון: <strong className="font-mono">{req.contactPhone}</strong></div>
                      {req.notes && <div className="text-slate-500 pt-1 border-t border-slate-200">הערה: {req.notes}</div>}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className={`text-[11px] font-bold ${
                      req.status === 'completed' ? 'text-emerald-700' : req.status === 'volunteer_assigned' ? 'text-indigo-700' : 'text-amber-700'
                    }`}>
                      {req.status === 'completed' && '✓ הושלם ונמסר'}
                      {req.status === 'volunteer_assigned' && `מתנדב: ${req.assignedVolunteerName || 'שובץ'}`}
                      {req.status === 'pending' && 'ממתין למתנדב כונן'}
                    </span>

                    {req.status === 'pending' && (
                      <button
                        onClick={() => {
                          onAssignVolunteer(req.id, 'יוסי פרידמן');
                          showToast('שובצת לקריאה בהצלחה', req.patientName, 'success');
                        }}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm"
                      >
                        קח קריאה ➔
                      </button>
                    )}

                    {req.status === 'volunteer_assigned' && (
                      <button
                        onClick={() => {
                          onUpdateStatus(req.id, 'completed');
                          showToast('הקריאה סומנה כהושלמה', undefined, 'success');
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
                      >
                        סמן כנמסר ✓
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Create Request Form */}
      {activeSubTab === 'form' && (
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900">פתיחת קריאת סיוע ישירות לחדר האשפוז</h2>
            <p className="text-xs text-slate-500">הזינו את המיקום המדויק ומתנדב כונן במרכז הרפואי יגיע בהקדם</p>
          </div>

          <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs text-right">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">מחסן / מוקד אספקה קרוב *</label>
                <select
                  value={hospitalId}
                  onChange={(e) => setHospitalId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600 font-medium"
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
                  placeholder="למשל: אורתופדיה ג׳"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">מספר חדר *</label>
                <input
                  type="text"
                  required
                  placeholder="למשל: 304"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">מספר מיטה</label>
                <input
                  type="text"
                  placeholder="למשל: ליד החלון / מיטה 2"
                  value={bedNumber}
                  onChange={(e) => setBedNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">שם המאושפז / הפונה *</label>
                <input
                  type="text"
                  required
                  placeholder="שם מלא"
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">מה נדרש להביא למיטה? *</label>
              <input
                type="text"
                required
                placeholder="למשל: כיסא גלגלים לירידה לבדיקה / מיטת מלווה ללילה / מטען לטלפון"
                value={equipmentRequestedName}
                onChange={(e) => setEquipmentRequestedName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">דחיפות הקריאה</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUrgency('normal')}
                  className={`p-3 rounded-xl border text-center font-bold transition-all ${
                    urgency === 'normal'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  רגיל (במהלך השעה הקרובה)
                </button>

                <button
                  type="button"
                  onClick={() => setUrgency('urgent')}
                  className={`p-3 rounded-xl border text-center font-bold transition-all ${
                    urgency === 'urgent'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  דחוף (הגעה מיידית למחלקה)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">הערות נוספות</label>
              <textarea
                rows={2}
                placeholder="הנחיות כניסה למחלקה או פרטים נוספים..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveSubTab('board')}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                ביטול
              </button>

              <button
                type="submit"
                className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-md shadow-teal-700/20 transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>שגר קריאה למתנדב כונן ➔</span>
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
};
