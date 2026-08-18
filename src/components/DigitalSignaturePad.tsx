import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { RotateCcw, Check, PenTool } from 'lucide-react';

export interface DigitalSignaturePadRef {
  getSignatureDataUrl: () => string | null;
  clear: () => void;
  hasSignature: () => boolean;
}

interface DigitalSignaturePadProps {
  onSave?: (dataUrl: string) => void;
  onClear?: () => void;
  signerName?: string;
}

export const DigitalSignaturePad = forwardRef<DigitalSignaturePadRef, DigitalSignaturePadProps>(({
  onSave,
  onClear,
  signerName = 'הלווה / המלווה',
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 500;
    canvas.height = rect.height || 128;

    ctx.strokeStyle = '#2dd4bf'; // teal-400
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    if (onClear) onClear();
  };

  useImperativeHandle(ref, () => ({
    getSignatureDataUrl: () => {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return null;
      return canvas.toDataURL('image/png');
    },
    clear: clearCanvas,
    hasSignature: () => hasDrawn,
  }));

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasDrawn && onSave) {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="border border-slate-700/80 rounded-2xl bg-slate-900/90 p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-medium text-slate-300">
          <PenTool className="w-3.5 h-3.5 text-teal-400" />
          <span>חתימת {signerName} על הצהרת השאלה ושמירת ציוד</span>
        </span>
        <button
          type="button"
          onClick={clearCanvas}
          className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors py-1 px-2 rounded-lg hover:bg-slate-800"
        >
          <RotateCcw className="w-3 h-3" />
          <span>נקה חתימה</span>
        </button>
      </div>

      <div className="relative w-full h-36 bg-slate-950/90 rounded-xl border border-dashed border-slate-700 flex items-center justify-center overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <div className="absolute pointer-events-none text-slate-500 text-xs flex flex-col items-center gap-1 select-none">
            <span>חתום כאן באצבע או בעכבר</span>
            <div className="w-48 h-px bg-slate-800 mt-2" />
          </div>
        )}
      </div>

      {hasDrawn && (
        <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
          <Check className="w-3.5 h-3.5" />
          <span>החתימה נקלטה בהצלחה</span>
        </div>
      )}
    </div>
  );
});

DigitalSignaturePad.displayName = 'DigitalSignaturePad';
