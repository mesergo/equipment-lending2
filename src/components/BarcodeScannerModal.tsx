import React, { useState } from 'react';
import { X, QrCode, Search, CheckCircle2, PackageCheck, AlertCircle } from 'lucide-react';
import { EquipmentItem } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment?: EquipmentItem[];
  onSelectEquipment?: (equipmentId: string) => void;
  onScanSuccess?: (code: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  equipment = [],
  onSelectEquipment,
  onScanSuccess,
}) => {
  const [scannedCode, setScannedCode] = useState('');
  const [searchResult, setSearchResult] = useState<EquipmentItem | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const handleScanOrSearch = (codeToSearch: string) => {
    const term = codeToSearch.trim().toLowerCase();
    if (!term) return;

    setHasSearched(true);
    const found = (equipment || []).find(
      (e) => e.sku.toLowerCase() === term || e.id.toLowerCase() === term || e.name.toLowerCase().includes(term)
    );
    setSearchResult(found || null);
    if (onScanSuccess) {
      onScanSuccess(term);
    }
  };

  const handleQuickSimulateScan = (sku: string) => {
    setScannedCode(sku);
    handleScanOrSearch(sku);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">סורק ברקוד ומק"ט ציוד</h2>
              <p className="text-[11px] text-slate-400">זיהוי מהיר של פריט להשאלה או החזרה</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Simulated Scanner Viewfinder */}
          <div className="relative w-full h-44 bg-slate-950 rounded-xl border-2 border-dashed border-teal-500/60 overflow-hidden flex flex-col items-center justify-center">
            {/* Animated Laser line */}
            <div className="absolute inset-x-0 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-bounce top-1/2 -translate-y-1/2" />
            
            <QrCode className="w-16 h-16 text-teal-500/30" />
            <span className="text-xs text-slate-400 mt-2 font-medium">כוון את המצלמה לברקוד שעל הציוד</span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">סורק לייזר פעיל</span>
          </div>

          {/* Manual / Quick Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">הזן או הדבק מק"ט / ברקוד ידנית</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="למשל: MED-WC-001 או MED-BED-01"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScanOrSearch(scannedCode)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
              />
              <button
                type="button"
                onClick={() => handleScanOrSearch(scannedCode)}
                className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>חפש</span>
              </button>
            </div>
          </div>

          {/* Quick Demo Barcodes */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400">לחיצה מהירה לדוגמה:</span>
            <div className="flex flex-wrap gap-1.5">
              {['MED-WC-001', 'MED-BED-02', 'MED-SAB-01', 'MED-OXY-01'].map((sku) => (
                <button
                  key={sku}
                  type="button"
                  onClick={() => handleQuickSimulateScan(sku)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-teal-300 font-mono text-[11px] border border-slate-700"
                >
                  {sku}
                </button>
              ))}
            </div>
          </div>

          {/* Search result display */}
          {hasSearched && (
            <div className="pt-2 border-t border-slate-800">
              {searchResult ? (
                <div className="p-3 bg-teal-950/40 border border-teal-500/40 rounded-xl space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-teal-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>זוהה בהצלחה: {searchResult.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        מק"ט: <span className="font-mono text-teal-400">{searchResult.sku}</span> | מיקום: {searchResult.depotLocation}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        סטטוס: {searchResult.status === 'available' ? 'זמין להשאלה' : searchResult.status === 'loaned' ? 'מושאל כעת' : 'בחיטוי'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectEquipment(searchResult.id);
                      onClose();
                    }}
                    className="w-full py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>פתח פעולה עבור פריט זה</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>לא נמצא פריט תואם למק"ט או הברקוד שנסרק.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
