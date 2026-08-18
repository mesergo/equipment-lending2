import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  Building2, 
  Bed, 
  Phone, 
  User, 
  Mail, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Send, 
  Printer, 
  FileText, 
  Key, 
  Share2, 
  Sparkles,
  Heart,
  Truck,
  RotateCcw
} from 'lucide-react';
import { CartItem, DeliveryMethod, EquipmentItem, Hospital, OrderRecord } from '../types';
import { DigitalSignaturePad, DigitalSignaturePadRef } from './DigitalSignaturePad';
import { useToast } from './Toast';

interface CartCheckoutViewProps {
  cart: CartItem[];
  hospitals: Hospital[];
  selectedHospitalId: string;
  onUpdateQuantity: (equipmentId: string, delta: number) => void;
  onRemoveFromCart: (equipmentId: string) => void;
  onClearCart: () => void;
  onOrderComplete: (order: OrderRecord) => void;
  onNavigateToCatalog: () => void;
  onNavigateToAdmin: () => void;
}

export const CartCheckoutView: React.FC<CartCheckoutViewProps> = ({
  cart,
  hospitals,
  selectedHospitalId,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onOrderComplete,
  onNavigateToCatalog,
  onNavigateToAdmin,
}) => {
  const { showToast } = useToast();
  const signaturePadRef = useRef<DigitalSignaturePadRef>(null);

  // Stepper state: 1 (Cart Review) -> 2 (Patient & Delivery) -> 3 (Frame Hold Credit Card) -> 4 (Signature) -> 5 (Confirmation Slip)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 2: Patient & Delivery Details
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [caregiverRelation, setCaregiverRelation] = useState('בן/בת משפחה');
  const [hospitalId, setHospitalId] = useState(selectedHospitalId !== 'all' ? selectedHospitalId : 'sheba');
  const [department, setDepartment] = useState('פנימית א׳');
  const [roomNumber, setRoomNumber] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('bedside_volunteer');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Step 3: Credit Card Frame Hold
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardHolderId, setCardHolderId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [voluntaryDonation, setVoluntaryDonation] = useState<number>(18);
  const [isProcessingHold, setIsProcessingHold] = useState(false);

  // Step 4: Digital Signature
  const [digitalSignatureDataUrl, setDigitalSignatureDataUrl] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Step 5: Completed Order
  const [completedOrder, setCompletedOrder] = useState<OrderRecord | null>(null);

  // Calculations
  const totalHoldAmount = cart.reduce((acc, item) => acc + item.equipment.depositAmount * item.quantity, 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const selectedHospital = hospitals.find((h) => h.id === hospitalId) || hospitals[0];

  // Validation before going to next step
  const handleValidateStep2 = () => {
    if (!patientName.trim()) {
      showToast('נא להזין שם מאושפז מלא', undefined, 'error');
      return false;
    }
    if (!patientPhone.trim() || patientPhone.length < 9) {
      showToast('נא להזין מספר טלפון תקין ליצירת קשר', undefined, 'error');
      return false;
    }
    if (!roomNumber.trim()) {
      showToast('נא להזין מספר חדר במחלקה', undefined, 'error');
      return false;
    }
    return true;
  };

  const handleValidateStep3 = () => {
    if (!cardHolderName.trim()) {
      showToast('נא להזין שם בעל הכרטיס', undefined, 'error');
      return false;
    }
    if (!cardHolderId.trim() || cardHolderId.length < 8) {
      showToast('נא להזין ת.ז. של בעל הכרטיס (9 ספרות)', undefined, 'error');
      return false;
    }
    const cleanCard = cardNumber.replace(/\D/g, '');
    if (cleanCard.length < 15) {
      showToast('נא להזין מספר כרטיס אשראי תקין (16 ספרות)', undefined, 'error');
      return false;
    }
    if (!cardExp.trim() || !cardExp.includes('/')) {
      showToast('נא להזין תוקף כרטיס תקין (MM/YY)', undefined, 'error');
      return false;
    }
    if (!cardCvv.trim() || cardCvv.length < 3) {
      showToast('נא להזין 3 ספרות בגב הכרטיס (CVV)', undefined, 'error');
      return false;
    }
    return true;
  };

  // Submit Order & Process simulated Hold
  const handleFinalizeOrder = () => {
    const signature = signaturePadRef.current?.getSignatureDataUrl() || digitalSignatureDataUrl;
    if (!signature && !digitalSignatureDataUrl) {
      showToast('נא לחתום דיגיטלית על שטר השמירה וההשאלה', undefined, 'error');
      return;
    }
    if (!termsAccepted) {
      showToast('נא לאשר את תקנון השאלת הציוד בחסד', undefined, 'error');
      return;
    }

    setIsProcessingHold(true);

    setTimeout(() => {
      setIsProcessingHold(false);

      const newOrderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const holdAuthCode = `AUTH-HLD-${Math.floor(10000 + Math.random() * 90000)}`;
      const lockerCode = deliveryMethod === 'self_pickup_locker' ? `L-${Math.floor(1000 + Math.random() * 9000)}` : undefined;

      const maskedCard = `****-****-****-${cardNumber.replace(/\D/g, '').slice(-4) || '7721'}`;

      const now = new Date();
      const returnDate = new Date();
      returnDate.setDate(now.getDate() + 14);

      const orderRecord: OrderRecord = {
        id: newOrderId,
        patientName,
        patientId: patientId || 'לא צוין',
        patientPhone,
        caregiverName: caregiverName || patientName,
        caregiverPhone: caregiverPhone || patientPhone,
        caregiverRelation,
        warehouseId: hospitalId,
        warehouseName: selectedHospital.name,
        hospitalId,
        hospitalName: selectedHospital.name,
        department,
        roomNumber,
        bedNumber: bedNumber || 'מיטה 1',
        deliveryMethod,
        lockerAccessCode: lockerCode,
        assignedVolunteerName: deliveryMethod === 'bedside_volunteer' ? 'יוסי פרידמן (כונן שיבא)' : undefined,
        assignedVolunteerPhone: deliveryMethod === 'bedside_volunteer' ? '054-8432190' : undefined,
        items: cart.map((c) => ({
          equipmentId: c.equipment.id,
          equipmentName: c.equipment.name,
          equipmentSku: c.equipment.sku,
          quantity: c.quantity,
          depositPerUnit: c.equipment.depositAmount,
          days: c.selectedDays,
        })),
        totalHoldAmount,
        voluntaryDonation,
        holdStatus: 'held',
        holdAuthCode,
        cardHolderName,
        cardHolderId,
        creditCardMasked: maskedCard,
        cardExp,
        digitalSignatureUrl: signature || undefined,
        orderStatus: 'pending_dispatch',
        createdAt: now.toLocaleDateString('he-IL') + ' ' + now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        expectedReturnDate: returnDate.toLocaleDateString('he-IL'),
        notes: deliveryNotes,
      };

      setCompletedOrder(orderRecord);
      onOrderComplete(orderRecord);
      onClearCart();
      setCurrentStep(5);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0d9488', '#2dd4bf', '#10b981', '#f59e0b'],
      });

      showToast('תפיסת המסגרת וההשאלה אושרו בהצלחה!', `שובר #${newOrderId} הונפק`, 'success');
    }, 1200);
  };

  // If cart is empty and not on confirmation step
  if (cart.length === 0 && currentStep !== 5) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
          <ShoppingCart className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">סל ההשאלות שלכם ריק כרגע</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            עיינו בקטלוג הציוד, בחרו את הציוד ועזרי השהייה הנדרשים לכם במחלקת האשפוז, והוסיפו אותם לסל.
          </p>
        </div>
        <button
          onClick={onNavigateToCatalog}
          className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-teal-700/20 transition-all inline-flex items-center gap-2"
        >
          <span>מעבר לקטלוג הציוד והעזרים</span>
          <ArrowRight className="w-4 h-4 rotate-180" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* Checkout Stepper Progress */}
      {currentStep !== 5 && (
        <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold">
            {[
              { num: 1, label: 'סקירת סל' },
              { num: 2, label: 'מאושפז ואספקה' },
              { num: 3, label: 'תפיסת מסגרת' },
              { num: 4, label: 'חתימה ושטר' },
            ].map((step) => {
              const isDone = currentStep > step.num;
              const isCurrent = currentStep === step.num;

              return (
                <div key={step.num} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                  </div>
                  <span className={`hidden sm:inline ${isCurrent ? 'text-teal-700 font-black' : isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 1: Cart Items Review */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-teal-600" />
                <span>פריטים בסל ההשאלות ({totalItemsCount})</span>
              </h2>

              <button
                type="button"
                onClick={onClearCart}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>רוקן סל</span>
              </button>
            </div>

            {/* Cart Items List */}
            <div className="divide-y divide-slate-100">
              {cart.map((c) => {
                const item = c.equipment;
                return (
                  <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    <div className="flex items-center gap-3.5 flex-1">
                      {/* Product Thumbnail */}
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                        {item.photoUrl ? (
                          <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ShoppingCart className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.sku}
                          </span>
                          <span className="text-[11px] text-teal-700 font-semibold">{item.depotLocation}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.name}</h4>
                        <div className="text-xs text-slate-500">
                          תפיסת מסגרת: <strong className="text-teal-700">₪{item.depositAmount}</strong> ליחידה
                        </div>
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="p-1 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-black text-slate-900">{c.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="p-1 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-left min-w-[70px]">
                        <span className="text-[10px] text-slate-500 block">סה״כ מסגרת:</span>
                        <span className="text-xs font-black text-teal-800">₪{item.depositAmount * c.quantity}</span>
                      </div>

                      <button
                        onClick={() => onRemoveFromCart(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                        title="הסר פריט"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Summary Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span>עלות השאלה ודמי שימוש:</span>
                <span className="font-black text-emerald-700 text-sm">חינם (0 ₪)</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>סה״כ תפיסת מסגרת אשראי לביטחון:</span>
                <span className="font-black text-teal-800 text-sm">₪{totalHoldAmount}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                * תפיסת המסגרת היא ערבון בלבד ואינה מחויבת מחשבונכם. היא משתחררת אוטומטית עם החזרת הציוד.
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={onNavigateToCatalog}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                <span>המשך בעיון בקטלוג</span>
              </button>

              <button
                onClick={() => setCurrentStep(2)}
                className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-teal-700/20 transition-all flex items-center gap-2"
              >
                <span>המשך להזנת פרטי מאושפז ואספקה</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* STEP 2: Patient & Delivery Details */}
      {currentStep === 2 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900">שלב 2: פרטי המאושפז והמיקום בבית החולים</h2>
            <p className="text-xs text-slate-500">הזינו את פרטי החדר והמחלקה כדי שנוכל לשנע את הציוד ישירות למיטה</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right text-xs">
            
            {/* Hospital / Warehouse Picker */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">מחסן / מוקד אספקה *</label>
              <select
                value={hospitalId}
                onChange={(e) => {
                  setHospitalId(e.target.value);
                  const h = hospitals.find(x => x.id === e.target.value);
                  const depts = h?.departments || h?.sections;
                  if (depts && depts.length > 0) setDepartment(depts[0]);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-teal-600"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">שם מלא של המאושפז/ת *</label>
              <input
                type="text"
                required
                placeholder="למשל: דוד לוי"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">טלפון ליצירת קשר במחלקה *</label>
              <input
                type="tel"
                required
                placeholder="05X-XXXXXXX"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">מחלקה / אגף מאשפז *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              >
                {((selectedHospital as any)?.departments || (selectedHospital as any)?.sections || ['פנימית א׳', 'פנימית ב׳', 'כירורגית כללית', 'אורתופדיה', 'יולדות ונשים', 'טיפול נמרץ', 'שיקום']).map((d: string) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 font-bold mb-1">מספר חדר *</label>
                <input
                  type="text"
                  required
                  placeholder="למשל: 312"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">מספר מיטה</label>
                <input
                  type="text"
                  placeholder="מיטה 1/2"
                  value={bedNumber}
                  onChange={(e) => setBedNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">שם מלווה / איש קשר נוסף</label>
              <input
                type="text"
                placeholder="למשל: שרה לוי"
                value={caregiverName}
                onChange={(e) => setCaregiverName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">קרבה למאושפז</label>
              <select
                value={caregiverRelation}
                onChange={(e) => setCaregiverRelation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              >
                <option value="בן/בת זוג">בן/בת זוג</option>
                <option value="הורה">הורה</option>
                <option value="בן/בת">בן/בת</option>
                <option value="אח/אחות">אח/אחות</option>
                <option value="עוזר/ת צמוד">עוזר/ת צמוד</option>
                <option value="אחר">אחר</option>
              </select>
            </div>

          </div>

          {/* Delivery Method Selector */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-black text-slate-900">אופן קבלת הציוד *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              <div
                onClick={() => setDeliveryMethod('bedside_volunteer')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  deliveryMethod === 'bedside_volunteer'
                    ? 'border-teal-600 bg-teal-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <Truck className="w-4 h-4 text-teal-600" />
                  <span>שליחות מתנדב למיטה</span>
                </div>
                <p className="text-[11px] text-slate-500">הגעה ישירה לחדר האשפוז תוך 30–60 דקות ללא תשלום</p>
              </div>

              <div
                onClick={() => setDeliveryMethod('self_pickup_locker')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  deliveryMethod === 'self_pickup_locker'
                    ? 'border-teal-600 bg-teal-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <Key className="w-4 h-4 text-indigo-600" />
                  <span>איסוף עצמי מלוקר 24/7</span>
                </div>
                <p className="text-[11px] text-slate-500">קוד סודי לפתיחת תא נעול בארון החסד בבית החולים</p>
              </div>

              <div
                onClick={() => setDeliveryMethod('home_delivery')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  deliveryMethod === 'home_delivery'
                    ? 'border-teal-600 bg-teal-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>משלוח לבית לקראת שחרור</span>
                </div>
                <p className="text-[11px] text-slate-500">תיאום שינוע עד לבית החולה לקראת השחרור מבית החולים</p>
              </div>

            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              ➔ חזרה לסל
            </button>

            <button
              onClick={() => {
                if (handleValidateStep2()) {
                  setCurrentStep(3);
                }
              }}
              className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-teal-700/20 transition-all flex items-center gap-2"
            >
              <span>המשך לתפיסת מסגרת אשראי לביטחון</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* STEP 3: Credit Card Frame Hold Authorization */}
      {currentStep === 3 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <span>שלב 3: תפיסת מסגרת אשראי לביטחון (ערבון)</span>
              </h2>
              <span className="text-xs font-black text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                סה״כ מסגרת: ₪{totalHoldAmount}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              בהתאם לתקנון השאלת ציוד רפואי, נדרשת תפיסת מסגרת לביטחון. הכרטיס לא יחויב בעלות השאלה.
            </p>
          </div>

          {/* Information Card */}
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl space-y-1 text-xs text-teal-950">
            <div className="flex items-center gap-2 font-bold text-teal-800">
              <Lock className="w-4 h-4" />
              <span>תפיסת מסגרת (Credit Hold) אינה חיוב כספי</span>
            </div>
            <p className="text-[11px] text-teal-800 leading-relaxed">
              הסכום של ₪{totalHoldAmount} נשמר באופן מאובטח כערבות לשמירה על הציוד ומשתחרר אוטומטית בחברת האשראי מיד עם בדיקת הציוד והחזרתו למוקד.
            </p>
          </div>

          {/* Credit Card Form */}
          <div className="space-y-4 text-right text-xs">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">שם בעל הכרטיס (כפי שמופיע באשראי) *</label>
                <input
                  type="text"
                  required
                  placeholder="למשל: דוד לוי"
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ת.ז. של בעל הכרטיס *</label>
                <input
                  type="text"
                  maxLength={9}
                  required
                  placeholder="9 ספרות"
                  value={cardHolderId}
                  onChange={(e) => setCardHolderId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">מספר כרטיס אשראי *</label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={19}
                  required
                  placeholder="4580 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                    setCardNumber(val);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-teal-600"
                />
                <CreditCard className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">תוקף (MM/YY) *</label>
                <input
                  type="text"
                  maxLength={5}
                  required
                  placeholder="MM/YY"
                  value={cardExp}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2, 4);
                    setCardExp(v);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-mono text-center focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">3 ספרות בגב הכרטיס (CVV) *</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="•••"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-mono text-center focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

          </div>

          {/* Voluntary Donation to Charity */}
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span className="text-xs font-black text-slate-900">תרומת רשות לתמיכה בפעילות העמותה</span>
              </div>
              <span className="text-[11px] text-slate-500">אופציונלי</span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs">
              {[
                { amount: 0, label: 'ללא תרומה' },
                { amount: 18, label: '₪18 (חי)' },
                { amount: 36, label: '₪36' },
                { amount: 50, label: '₪50' },
              ].map((d) => (
                <button
                  key={d.amount}
                  type="button"
                  onClick={() => setVoluntaryDonation(d.amount)}
                  className={`py-2 rounded-xl font-bold border transition-all text-center ${
                    voluntaryDonation === d.amount
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              ➔ חזרה לפרטי אספקה
            </button>

            <button
              onClick={() => {
                if (handleValidateStep3()) {
                  setCurrentStep(4);
                }
              }}
              className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-teal-700/20 transition-all flex items-center gap-2"
            >
              <span>המשך לחתימה דיגיטלית על שטר השאלה</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* STEP 4: Digital Signature & Loan Agreement Terms */}
      {currentStep === 4 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <span>שלב 4: חתימה דיגיטלית על שטר השאלה ושמירת ציוד</span>
            </h2>
            <p className="text-xs text-slate-500">
              אנא עיינו בהתחייבות ההשאלה וחתמו במסך באצבע או בעכבר לאישור ההשאלה
            </p>
          </div>

          {/* Loan Agreement Terms */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-700 max-h-40 overflow-y-auto leading-relaxed">
            <h4 className="font-bold text-slate-900">תקנון השאלת ציוד עמותת ״חסד בריא״:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>הציוד מושאל למאושפז לתקופת האשפוז ללא כל עלות שימוש או שכירות.</li>
              <li>הלווה מתחייב לשמור על הציוד בשלמותו, להשתמש בו בהתאם להוראות הבטיחות, ולהחזירו נקי ותקין.</li>
              <li>מסגרת האשראי שנתפסה תשמש כערבון בלבד ותשוחרר במלואה עם החזרת הציוד למוקד.</li>
              <li>במקרה של אי-החזרת הציוד או נזק מכוון, תהא רשאית העמותה לגבות את סכום הפיקדון לכיסוי עלות הציוד.</li>
            </ol>
          </div>

          {/* Terms Checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 select-none bg-teal-50 p-3 rounded-xl border border-teal-200">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-white border-slate-300"
            />
            <span>קראתי ואני מאשר/ת את תנאי שטר השאלת הציוד והשמירה עליו</span>
          </label>

          {/* Digital Signature Pad */}
          <DigitalSignaturePad
            ref={signaturePadRef}
            signerName={patientName || 'הלווה'}
            onSave={(url) => setDigitalSignatureDataUrl(url)}
          />

          {/* Navigation & Submit */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              ➔ חזרה לאשראי
            </button>

            <button
              onClick={handleFinalizeOrder}
              disabled={isProcessingHold}
              className="px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-2xl shadow-xl shadow-teal-700/30 transition-all flex items-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {isProcessingHold ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>מבצע אישור מסגרת סולק...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>אשר תפיסת מסגרת והנפק שובר השאלה ➔</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* STEP 5: Official Confirmation Slip (#ORD-XXXX) */}
      {currentStep === 5 && completedOrder && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-slate-900 animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="text-center space-y-2 border-b border-slate-100 pb-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">ההשאלה אושרה ותפיסת המסגרת בוצעה בהצלחה!</h2>
            <p className="text-xs text-slate-500">
              שובר השאלה רשמי מס׳ <strong className="font-mono text-teal-700 font-bold">#{completedOrder.id}</strong>
            </p>
          </div>

          {/* Key Slip Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">פרטי המאושפז והמיקום</div>
              <div>שם מאושפז: <strong>{completedOrder.patientName}</strong></div>
              <div>מרכז רפואי: <strong>{completedOrder.hospitalName}</strong></div>
              <div>מחלקה וחדר: <strong>{completedOrder.department} (חדר {completedOrder.roomNumber})</strong></div>
              <div>טלפון ליצירת קשר: <strong className="font-mono">{completedOrder.patientPhone}</strong></div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">אופן האספקה והשחרור</div>
              {completedOrder.deliveryMethod === 'bedside_volunteer' && (
                <div className="space-y-1">
                  <div className="text-emerald-700 font-bold flex items-center gap-1">
                    <Truck className="w-4 h-4" />
                    <span>שליחות מתנדב עד המיטה</span>
                  </div>
                  <div>מתנדב משובץ: <strong>{completedOrder.assignedVolunteerName}</strong></div>
                  <div>טלפון מתנדב: <strong className="font-mono">{completedOrder.assignedVolunteerPhone}</strong></div>
                </div>
              )}
              {completedOrder.deliveryMethod === 'self_pickup_locker' && (
                <div className="space-y-1">
                  <div className="text-indigo-700 font-bold flex items-center gap-1">
                    <Key className="w-4 h-4" />
                    <span>איסוף עצמי מלוקר/ארון חסד</span>
                  </div>
                  <div>קוד סודי לפתיחת התא: <strong className="font-mono text-sm text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{completedOrder.lockerAccessCode}</strong></div>
                </div>
              )}
              <div>תאריך השאלה: <strong>{completedOrder.createdAt}</strong></div>
              <div>יעד החזרה משוער: <strong>{completedOrder.expectedReturnDate}</strong></div>
            </div>

          </div>

          {/* Ordered Items Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900">פריטי הציוד שהושאלו:</h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">מק״ט</th>
                    <th className="p-3">שם פריט</th>
                    <th className="p-3 text-center">כמות</th>
                    <th className="p-3 text-center">מסגרת ביטחון</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {completedOrder.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-mono font-bold text-teal-700">{it.equipmentSku}</td>
                      <td className="p-3 font-medium text-slate-900">{it.equipmentName}</td>
                      <td className="p-3 text-center font-bold">{it.quantity}</td>
                      <td className="p-3 text-center font-bold text-teal-800">₪{it.depositPerUnit * it.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Frame Hold Authorization Bar */}
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-teal-900 block">קוד אישור סולק מאובטח:</span>
              <span className="font-mono text-xs text-teal-800 font-bold">{completedOrder.holdAuthCode}</span>
            </div>

            <div>
              <span className="font-bold text-teal-900 block">סכום מסגרת תפוסה:</span>
              <span className="font-black text-sm text-teal-800">₪{completedOrder.totalHoldAmount} (ערבון)</span>
            </div>

            <div>
              <span className="font-bold text-teal-900 block">כרטיס אשראי:</span>
              <span className="font-mono text-teal-800">{completedOrder.creditCardMasked}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>הדפס שובר</span>
              </button>

              <button
                onClick={() => {
                  const text = `שלום, הונפק שובר השאלת ציוד #${completedOrder.id} עבור ${completedOrder.patientName} במחלקת ${completedOrder.department}.`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>שתף בוואטסאפ</span>
              </button>
            </div>

            <button
              onClick={onNavigateToCatalog}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-md transition-all"
            >
              חזרה לקטלוג הציוד ➔
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
