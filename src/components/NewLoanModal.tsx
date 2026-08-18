import React, { useState } from 'react';
import { X, Check, Shield, FileText, AlertCircle, Sparkles, Building2, User, Phone, MapPin } from 'lucide-react';
import { EquipmentCategory, EquipmentItem, Hospital, LoanRecord } from '../types';
import { DigitalSignaturePad } from './DigitalSignaturePad';

interface NewLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals: Hospital[];
  equipment: EquipmentItem[];
  defaultSelectedEquipmentId?: string;
  defaultHospitalId?: string;
  onSubmitLoan: (loanData: Omit<LoanRecord, 'id' | 'smsSent'>) => void;
}

export const NewLoanModal: React.FC<NewLoanModalProps> = ({
  isOpen,
  onClose,
  hospitals,
  equipment,
  defaultSelectedEquipmentId,
  defaultHospitalId,
  onSubmitLoan,
}) => {
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(
    defaultHospitalId && defaultHospitalId !== 'all' ? defaultHospitalId : hospitals[0]?.id || 'sheba'
  );
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>(defaultSelectedEquipmentId || '');
  const [department, setDepartment] = useState<string>('');
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [bedNumber, setBedNumber] = useState<string>('');

  // Patient & Caregiver info
  const [patientName, setPatientName] = useState<string>('');
  const [patientIdNumber, setPatientIdNumber] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [caregiverName, setCaregiverName] = useState<string>('');
  const [caregiverRelation, setCaregiverRelation] = useState<string>('בן/בת');
  const [caregiverPhone, setCaregiverPhone] = useState<string>('');
  const [loanDays, setLoanDays] = useState<number>(7);
  const [volunteerName, setVolunteerName] = useState<string>('מתנדב תורן');
  const [notes, setNotes] = useState<string>('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);

  if (!isOpen) return null;

  const currentHospital = hospitals.find((h) => h.id === selectedHospitalId);
  const availableEquipment = equipment.filter(
    (e) => (e.hospitalId === selectedHospitalId || !selectedHospitalId) && e.status === 'available'
  );
  const selectedItem = equipment.find((e) => e.id === selectedEquipmentId);

  const calculateReturnDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipmentId || !patientName || !patientPhone || !department || !roomNumber) {
      return;
    }

    const item = equipment.find((i) => i.id === selectedEquipmentId);
    if (!item) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const returnDateStr = calculateReturnDate(loanDays);

    onSubmitLoan({
      equipmentId: item.id,
      equipmentName: item.name,
      equipmentSku: item.sku,
      category: item.category,
      patientName,
      patientIdNumber: patientIdNumber || '000000000',
      patientPhone,
      caregiverName: caregiverName || patientName,
      caregiverRelation: caregiverRelation || 'עצמי',
      caregiverPhone: caregiverPhone || patientPhone,
      hospitalId: selectedHospitalId,
      hospitalName: currentHospital?.name || 'מרכז רפואי',
      department,
      roomNumber,
      bedNumber: bedNumber || 'א',
      loanDate: todayStr,
      expectedReturnDate: returnDateStr,
      status: 'active',
      depositAmount: item.depositAmount || 0,
      depositStatus: item.depositAmount > 0 ? 'held' : 'free',
      signatureDataUrl: signatureDataUrl || undefined,
      volunteerName: volunteerName || 'צוות חסד',
      volunteerPhone: '050-0000000',
      notes,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">טופס השאלה דיגיטלי למאושפז</h2>
              <p className="text-xs text-slate-400">רישום השאלה, מיקום במחלקה וחתימה על שמירת הציוד</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* 1. Hospital and Location in Ward */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wider text-teal-400 uppercase flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              1. מיקום בבית החולים והמחלקה
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">בית חולים / מרכז רפואי</label>
                <select
                  value={selectedHospitalId}
                  onChange={(e) => setSelectedHospitalId(e.target.value)}
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
                <label className="block text-xs font-medium text-slate-300 mb-1">מחלקה / אגף *</label>
                <select
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="">-- בחר מחלקה --</option>
                  {(currentHospital?.departments || currentHospital?.sections || []).map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                  <option value="אחר">אחר (ציין בהערות)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">מספר חדר *</label>
                <input
                  type="text"
                  required
                  placeholder="לדוגמה: 214"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">מספר מיטה / סימון</label>
                <input
                  type="text"
                  placeholder="מיטה א' / ליד החלון"
                  value={bedNumber}
                  onChange={(e) => setBedNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Equipment Selection */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold tracking-wider text-teal-400 uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              2. בחירת הציוד להשאלה
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">פריט מתוך המלאי הזמין *</label>
              <select
                required
                value={selectedEquipmentId}
                onChange={(e) => setSelectedEquipmentId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="">-- בחר פריט זמין --</option>
                {availableEquipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} [{item.sku}] - {item.depotLocation}
                  </option>
                ))}
              </select>
            </div>

            {selectedItem && (
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-200">{selectedItem.name}</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">{selectedItem.description}</p>
                </div>
                <div className="text-left shrink-0">
                  <span className="font-bold text-teal-400">
                    {selectedItem.depositAmount > 0 ? `פיקדון: ₪${selectedItem.depositAmount}` : 'ללא עלות / חסד מלא'}
                  </span>
                  <div className="text-[10px] text-slate-400">עד {selectedItem.maxLoanDays} ימי השאלה</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">משך השאלה מבוקש (ימים)</label>
                <select
                  value={loanDays}
                  onChange={(e) => setLoanDays(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value={3}>3 ימים (סוף שבוע / קצר)</option>
                  <option value={7}>7 ימים (שבוע)</option>
                  <option value={14}>14 ימים (שבועיים)</option>
                  <option value={30}>30 ימים (חודש)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">תאריך יעד משוער להחזרה</label>
                <input
                  type="text"
                  disabled
                  value={calculateReturnDate(loanDays)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* 3. Patient and Caregiver Details */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold tracking-wider text-teal-400 uppercase flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              3. פרטי המאושפז והמלווה
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">שם מלא של המאושפז *</label>
                <input
                  type="text"
                  required
                  placeholder="שם פרטי ומשפחה"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">ת.ז. של המאושפז</label>
                <input
                  type="text"
                  placeholder="9 ספרות"
                  value={patientIdNumber}
                  onChange={(e) => setPatientIdNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">טלפון ליצירת קשר *</label>
                <input
                  type="tel"
                  required
                  placeholder="050-0000000"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">שם המלווה במחלקה</label>
                <input
                  type="text"
                  placeholder="שם בן המשפחה / המלווה"
                  value={caregiverName}
                  onChange={(e) => setCaregiverName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">קרבה לחולה</label>
                <select
                  value={caregiverRelation}
                  onChange={(e) => setCaregiverRelation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="בן/בת">בן / בת</option>
                  <option value="בן זוג">בן / בת זוג</option>
                  <option value="הורה">הורה</option>
                  <option value="אח/ות">אח / אחות</option>
                  <option value="חבר/ה">חבר / מלווה אישי</option>
                  <option value="עצמי">המאושפז עצמו</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">טלפון מלווה</label>
                <input
                  type="tel"
                  placeholder="054-0000000"
                  value={caregiverPhone}
                  onChange={(e) => setCaregiverPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Digital Signature & Agreement */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold tracking-wider text-teal-400 uppercase flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              4. הצהרת השאלה וחתימה דיגיטלית
            </h3>

            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-slate-200">תנאי עמותת החסד להשאלת ציוד בבתי חולים:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li>הציוד מושאל לצורך שימוש המאושפז/מלווה במחלקה בלבד ובאהבה ללא כל מטרת רווח.</li>
                <li>הלווה מתחייב לשמור על הציוד נקי ותקין, ולהחזירו למוקד החסד בסיום האשפוז או במועד היעד.</li>
                <li>במקרה של שחרור מוקדם או צורך בהארכה, יש להודיע לרכז המוקד או בוואטסאפ של העמותה.</li>
              </ul>
            </div>

            <DigitalSignaturePad
              signerName={caregiverName || patientName || 'הלווה'}
              onSave={(url) => setSignatureDataUrl(url)}
              onClear={() => setSignatureDataUrl('')}
            />

            <div className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                id="agree"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500"
              />
              <label htmlFor="agree">אני מאשר קבלת הציוד במצב תקין ומתחייב להחזירו בסיום השימוש.</label>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={!selectedEquipmentId || !patientName || !patientPhone || !department || !roomNumber || !agreedToTerms}
              className="px-6 py-2 text-sm font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-lg shadow-teal-950 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>השלם השאלה והנפק שובר</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
