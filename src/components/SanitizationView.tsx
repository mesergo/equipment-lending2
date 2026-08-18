import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  User, 
  FileCheck,
  Building2,
  Package,
  Layers
} from 'lucide-react';
import { EquipmentItem, SanitizationLog } from '../types';
import { useToast } from './Toast';

interface SanitizationViewProps {
  sanitizationQueue: SanitizationLog[];
  equipment: EquipmentItem[];
  onAdvanceSanitizationStep: (logId: string) => void;
  onFinishSanitization: (logId: string, technicianNotes: string) => void;
}

export const SanitizationView: React.FC<SanitizationViewProps> = ({
  sanitizationQueue,
  equipment,
  onAdvanceSanitizationStep,
  onFinishSanitization,
}) => {
  const { showToast } = useToast();
  const [selectedLogId, setSelectedLogId] = useState<string>(sanitizationQueue[0]?.id || '');
  const [notes, setNotes] = useState<string>('');

  const activeLog = sanitizationQueue.find((s) => s.id === selectedLogId) || sanitizationQueue[0];

  const steps = [
    { step: 1, title: 'ניקוי ראשוני והסרת לכלוך', desc: 'שטיפה יסודית, בדיקת חלקי פלסטיק וריפודים' },
    { step: 2, title: 'חיטוי בחומר רפואי (דרגת בי״ח)', desc: 'חיטוי באלכוהול 70% / כלורהקסידין מאושר למניעת זיהומים' },
    { step: 3, title: 'בדיקת תקינות ובטיחות טכנית', desc: 'בדיקת מעצורים, גלגלים, חיבורי חשמל וסוללות' },
    { step: 4, title: 'אריזה סטרילית והחזרה למדף', desc: 'הדפסת תווית "עבר חיטוי ותקין" והשבה למלאי הזמין' },
  ];

  const handleComplete = (logId: string) => {
    onFinishSanitization(logId, notes || 'בוצע חיטוי מלא לפי פרוטוקול משרד הבריאות ובטיחות בית החולים.');
    showToast('הציוד הועבר בהצלחה למדף המלאי הזמין!', 'תווית "חוטא ותקין" עודכנה במערכת', 'success');
    setNotes('');
  };

  return (
    <div className="space-y-6 pb-12 text-slate-900">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            <span>תחנת חיטוי, סטריליזציה ובקרת איכות רפואית</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            פרוטוקול 4 שלבים קפדני למניעת זיהומים צולבים בבתי חולים לפני החזרת ציוד למדף
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-full">
            {sanitizationQueue.length} פריטים בתהליך
          </span>
        </div>
      </div>

      {sanitizationQueue.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">אין פריטים הממתינים לחיטוי כרגע</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            כל הציוד שהוחזר עבר בדיקה, סטריליזציה מלאה והוחזר למדפי המלאי הזמין.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Queue List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">תור פריטים לחיטוי</h3>
            <div className="space-y-2">
              {sanitizationQueue.map((item) => {
                const isSelected = activeLog?.id === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedLogId(item.id)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-teal-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {item.equipmentSku}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        שלב {item.sanitizationStep}/4
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900">{item.equipmentName}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">הוחזר ע״י: {item.returnedByPatientName}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Item Workflow */}
          {activeLog && (
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="font-mono text-xs font-bold text-teal-700">{activeLog.equipmentSku}</span>
                  <h2 className="text-base font-black text-slate-900">{activeLog.equipmentName}</h2>
                </div>

                <span className="text-xs font-bold text-slate-500">
                  הוחזר בתאריך {activeLog.returnedAt}
                </span>
              </div>

              {/* 4 Steps Checklist */}
              <div className="space-y-3">
                {steps.map((s) => {
                  const isDone = activeLog.sanitizationStep > s.step;
                  const isCurrent = activeLog.sanitizationStep === s.step;

                  return (
                    <div
                      key={s.step}
                      className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                        isDone
                          ? 'bg-emerald-50/40 border-emerald-200 text-slate-800'
                          : isCurrent
                          ? 'bg-teal-50 border-teal-400 shadow-sm text-slate-900 font-medium'
                          : 'bg-slate-50/50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            isDone
                              ? 'bg-emerald-600 text-white'
                              : isCurrent
                              ? 'bg-teal-600 text-white animate-pulse'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold">{s.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
                        </div>
                      </div>

                      {isCurrent && (
                        <button
                          onClick={() => onAdvanceSanitizationStep(activeLog.id)}
                          className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0"
                        >
                          אשר שלב זה ➔
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Complete & Return to Shelf */}
              {activeLog.sanitizationStep >= 4 && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>כל שלבי החיטוי הושלמו בהצלחה! הציוד מוכן לחזרה למדף.</span>
                  </div>

                  <button
                    onClick={() => handleComplete(activeLog.id)}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>אשר השבה למלאי הזמין בקטלוג ➔</span>
                  </button>
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
};
