import React, { useState, useEffect } from 'react';
import { 
  CartItem, 
  EquipmentItem, 
  HoldStatus, 
  Warehouse, 
  Organization,
  OrderRecord, 
  OrderStatus, 
  PatientRequest, 
  SanitizationLog, 
  Volunteer 
} from './types';
import { 
  ORGANIZATIONS,
  WAREHOUSES, 
  INITIAL_EQUIPMENT, 
  INITIAL_ORDERS, 
  INITIAL_REQUESTS, 
  INITIAL_SANITIZATION_QUEUE, 
  INITIAL_VOLUNTEERS 
} from './data/mockData';
import { Navbar, TabType } from './components/Navbar';
import { CatalogStoreView } from './components/CatalogStoreView';
import { CartCheckoutView } from './components/CartCheckoutView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { PatientPortalView } from './components/PatientPortalView';
import { SanitizationView } from './components/SanitizationView';
import { EquipmentDetailsModal } from './components/EquipmentDetailsModal';
import { SabbathKitModal } from './components/SabbathKitModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { ToastProvider, useToast } from './components/Toast';
import { ThemeProvider, useAppTheme } from './context/ThemeContext';
import { Shield, Lock, Box, Warehouse as WarehouseIcon } from 'lucide-react';

const AppContent: React.FC = () => {
  const { showToast } = useToast();
  const { theme } = useAppTheme();

  // Core Data Collections
  const [organizations, setOrganizations] = useState<Organization[]>(ORGANIZATIONS);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(WAREHOUSES);
  const [equipment, setEquipment] = useState<EquipmentItem[]>(INITIAL_EQUIPMENT);
  const [orders, setOrders] = useState<OrderRecord[]>(INITIAL_ORDERS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [requests, setRequests] = useState<PatientRequest[]>(INITIAL_REQUESTS);
  const [sanitizationQueue, setSanitizationQueue] = useState<SanitizationLog[]>(INITIAL_SANITIZATION_QUEUE);
  const [volunteers, setVolunteers] = useState<Volunteer[]>(INITIAL_VOLUNTEERS);

  // URL HASH & Path Router: Identifies Warehouse & Tab from URL Hash
  const parseLocationHash = (): { tab: TabType; warehouseId: string } => {
    if (typeof window === 'undefined') return { tab: 'catalog', warehouseId: 'main' };

    const path = window.location.pathname.toUpperCase();
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
    const hashUpper = rawHash.toUpperCase();

    // Check for /ADMIN in path or hash
    if (path === '/ADMIN' || path === '/ADMIN/' || hashUpper === 'ADMIN' || hashUpper.startsWith('ADMIN/')) {
      return { tab: 'admin', warehouseId: 'main' };
    }

    const validWarehouseIds = ['main', 'mobility', 'emergency', 'sabbath', 'lockers', 'maternity', 'all'];
    const parts = rawHash.split('/');

    let targetWarehouse = 'main';
    let targetTab: TabType = 'catalog';

    if (parts.length > 0 && parts[0]) {
      const first = parts[0].toLowerCase().replace(/^warehouse-/, '');
      if (validWarehouseIds.includes(first)) {
        targetWarehouse = first;
        if (parts[1]) {
          const second = parts[1].toLowerCase();
          if (['catalog', 'cart', 'patient_portal', 'sanitization', 'admin'].includes(second)) {
            targetTab = second as TabType;
          }
        }
      } else if (['cart', 'patient_portal', 'sanitization', 'admin', 'catalog'].includes(first)) {
        targetTab = first as TabType;
      } else if (first === 'requests') {
        targetTab = 'patient_portal';
      }
    }

    return { tab: targetTab, warehouseId: targetWarehouse };
  };

  const initialLoc = parseLocationHash();
  const [activeTab, setActiveTab] = useState<TabType>(initialLoc.tab);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(initialLoc.warehouseId);

  // Synchronize state with URL Hash changes (e.g. #main, #emergency, #mobility, #ADMIN, #cart)
  useEffect(() => {
    const handleHashSync = () => {
      const { tab, warehouseId } = parseLocationHash();
      setActiveTab(tab);
      setSelectedWarehouseId(warehouseId);
    };

    window.addEventListener('hashchange', handleHashSync);
    window.addEventListener('popstate', handleHashSync);
    return () => {
      window.removeEventListener('hashchange', handleHashSync);
      window.removeEventListener('popstate', handleHashSync);
    };
  }, []);

  // Update URL hash when switching tabs or warehouses
  const navigateToTab = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'admin') {
      window.location.hash = 'ADMIN';
    } else if (tab === 'catalog') {
      window.location.hash = selectedWarehouseId;
    } else {
      window.location.hash = `${selectedWarehouseId}/${tab}`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Modals
  const [inspectingItem, setInspectingItem] = useState<EquipmentItem | null>(null);
  const [isSabbathModalOpen, setIsSabbathModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Cart operations
  const handleAddToCart = (item: EquipmentItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.equipment.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.equipment.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { equipment: item, quantity: 1, selectedDays: 14 }];
    });
    showToast('נוסף לסל ההשאלות', item.name, 'success');
  };

  const handleDirectCheckout = (item: EquipmentItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.equipment.id === item.id);
      if (existing) return prev;
      return [...prev, { equipment: item, quantity: 1, selectedDays: 14 }];
    });
    navigateToTab('cart');
  };

  const handleUpdateQuantity = (equipmentId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.equipment.id === equipmentId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (equipmentId: string) => {
    setCart((prev) => prev.filter((c) => c.equipment.id !== equipmentId));
    showToast('הפריט הוסר מהסל', undefined, 'info');
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // When order is completed via Checkout
  const handleOrderComplete = (newOrder: OrderRecord) => {
    setOrders((prev) => [newOrder, ...prev]);

    // Update equipment stock
    setEquipment((prev) =>
      prev.map((item) => {
        const orderItem = newOrder.items.find((i) => i.equipmentId === item.id);
        if (orderItem) {
          const newAvail = Math.max(0, item.stockAvailable - orderItem.quantity);
          return {
            ...item,
            stockAvailable: newAvail,
            status: newAvail === 0 ? 'loaned' : item.status,
          };
        }
        return item;
      })
    );
  };

  // Admin Actions: Equipment CRUD
  const handleAddEquipment = (item: EquipmentItem) => {
    setEquipment((prev) => [item, ...prev]);
  };

  const handleUpdateEquipment = (item: EquipmentItem) => {
    setEquipment((prev) => prev.map((e) => (e.id === item.id ? item : e)));
  };

  const handleDeleteEquipment = (id: string) => {
    setEquipment((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddWarehouse = (newWh: Warehouse) => {
    setWarehouses((prev) => [...prev, newWh]);
  };

  const handleAddOrganization = (newOrg: Organization) => {
    setOrganizations((prev) => [...prev, newOrg]);
  };

  // Admin Actions: Order & Hold status updates
  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return { ...ord, orderStatus: newStatus };
        }
        return ord;
      })
    );

    // If marked as returned, return stock to available
    if (newStatus === 'returned_clean') {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        setEquipment((prev) =>
          prev.map((item) => {
            const match = order.items.find((i) => i.equipmentId === item.id);
            if (match) {
              return {
                ...item,
                stockAvailable: Math.min(item.stockTotal, item.stockAvailable + match.quantity),
                status: 'available',
              };
            }
            return item;
          })
        );
      }
    }
  };

  const handleUpdateHoldStatus = (orderId: string, newHoldStatus: HoldStatus) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, holdStatus: newHoldStatus } : ord))
    );
  };

  const handleAssignVolunteer = (orderId: string, volunteerName: string, volunteerPhone: string) => {
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              assignedVolunteerName: volunteerName,
              assignedVolunteerPhone: volunteerPhone,
              orderStatus: ord.orderStatus === 'pending_dispatch' ? 'in_transit' : ord.orderStatus,
            }
          : ord
      )
    );
    showToast('מתנדב שובץ בהצלחה להזמנה!', `${volunteerName} (${volunteerPhone})`, 'success');
  };

  // Patient Request actions
  const handleAddNewRequest = (reqData: Omit<PatientRequest, 'id' | 'createdAt' | 'status'>) => {
    const newReq: PatientRequest = {
      ...reqData,
      id: `req-${Date.now()}`,
      createdAt: 'עכשיו',
      status: 'pending',
    };
    setRequests((prev) => [newReq, ...prev]);
  };

  const handleAssignVolunteerToRequest = (requestId: string, volunteerName: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'volunteer_assigned',
              assignedVolunteerName: volunteerName,
            }
          : r
      )
    );
  };

  const handleUpdatePatientRequestStatus = (requestId: string, status: PatientRequest['status']) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status } : r))
    );
  };

  // Sanitization Actions
  const handleAdvanceSanitizationStep = (logId: string) => {
    setSanitizationQueue((prev) =>
      prev.map((item) => {
        if (item.id === logId) {
          const nextStep = (Math.min(4, item.sanitizationStep + 1)) as 1 | 2 | 3 | 4;
          return {
            ...item,
            sanitizationStep: nextStep,
            isReadyForShelf: nextStep === 4,
          };
        }
        return item;
      })
    );
  };

  const handleFinishSanitization = (logId: string, technicianNotes: string) => {
    const target = sanitizationQueue.find((s) => s.id === logId);
    if (target) {
      // Put back in available stock
      setEquipment((prev) =>
        prev.map((e) => (e.id === target.equipmentId ? { ...e, status: 'available', stockAvailable: Math.min(e.stockTotal, e.stockAvailable + 1) } : e))
      );
    }
    setSanitizationQueue((prev) => prev.filter((s) => s.id !== logId));
  };

  const currentWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);
  const cartItemsCount = cart.reduce((acc, c) => acc + c.quantity, 0);
  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className={`min-h-screen ${theme.bgClass} font-sans selection:bg-teal-500 selection:text-white flex flex-col justify-between transition-colors`} dir="rtl">
      
      <div>
        {/* Global Navbar (Only shown when not in /ADMIN view) */}
        {activeTab !== 'admin' ? (
          <Navbar
            activeTab={activeTab}
            onSelectTab={navigateToTab}
            cartCount={cartItemsCount}
            pendingRequestsCount={pendingRequestsCount}
          />
        ) : (
          /* Dedicated Admin Header when on /ADMIN */
          <header className="sticky top-0 z-40 bg-white border-b border-slate-200 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base sm:text-lg text-slate-900">
                      חסד בריא • ניהול מחסנים ומלאי
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      /ADMIN
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    ניהול ציוד, מלאי מחסנים, רכישות ותפיסות מסגרת אשראי
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigateToTab('catalog')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <span>חזרה לחנות הקטלוג הרגילה ➔</span>
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Main App Body */}
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
          
          {/* VIEW 1: E-Commerce Catalog Store */}
          {activeTab === 'catalog' && (
            <CatalogStoreView
              equipment={equipment}
              warehouses={warehouses}
              hospitals={warehouses}
              organizations={organizations}
              selectedWarehouseId={selectedWarehouseId}
              selectedHospitalId={selectedWarehouseId}
              cartItemsCount={cartItemsCount}
              cartItemsIds={cart.map((c) => c.equipment.id)}
              onAddToCart={handleAddToCart}
              onOpenItemDetails={(item) => setInspectingItem(item)}
              onDirectCheckout={handleDirectCheckout}
              onNavigateToCart={() => navigateToTab('cart')}
            />
          )}

          {/* VIEW 2: Cart & Frame Hold Checkout */}
          {activeTab === 'cart' && (
            <CartCheckoutView
              cart={cart}
              hospitals={warehouses}
              selectedHospitalId={selectedWarehouseId}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveFromCart={handleRemoveFromCart}
              onClearCart={handleClearCart}
              onOrderComplete={handleOrderComplete}
              onNavigateToCatalog={() => navigateToTab('catalog')}
              onNavigateToAdmin={() => navigateToTab('admin')}
            />
          )}

          {/* VIEW 3: Admin Portal (Available at /ADMIN or #ADMIN) */}
          {activeTab === 'admin' && (
            <AdminDashboardView
              equipment={equipment}
              orders={orders}
              warehouses={warehouses}
              hospitals={warehouses}
              organizations={organizations}
              volunteers={volunteers}
              selectedHospitalId={selectedWarehouseId}
              onAddEquipment={handleAddEquipment}
              onUpdateEquipment={handleUpdateEquipment}
              onDeleteEquipment={handleDeleteEquipment}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onUpdateHoldStatus={handleUpdateHoldStatus}
              onAssignVolunteer={handleAssignVolunteer}
              onNavigateToCatalog={() => navigateToTab('catalog')}
              onAddWarehouse={handleAddWarehouse}
              onAddOrganization={handleAddOrganization}
            />
          )}

          {/* VIEW 4: Patient Bedside Requests Portal */}
          {activeTab === 'patient_portal' && (
            <PatientPortalView
              hospitals={warehouses}
              selectedHospitalId={selectedWarehouseId}
              requests={requests}
              volunteers={volunteers}
              onAddNewRequest={handleAddNewRequest}
              onAssignVolunteer={handleAssignVolunteerToRequest}
              onUpdateStatus={handleUpdatePatientRequestStatus}
            />
          )}

          {/* VIEW 5: Sanitization Station */}
          {activeTab === 'sanitization' && (
            <SanitizationView
              sanitizationQueue={sanitizationQueue}
              equipment={equipment}
              onAdvanceSanitizationStep={handleAdvanceSanitizationStep}
              onFinishSanitization={handleFinishSanitization}
            />
          )}

        </main>
      </div>

      {/* Public Footer with clean warehouse direct HASH links and subtle admin link */}
      {activeTab !== 'admin' && (
        <footer className="mt-16 border-t border-slate-200 bg-white py-8 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-800">חסד בריא</span>
              <span>• עמותת השאלת ציוד רפואי ועזרי שהייה</span>
              {currentWarehouse && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md border border-teal-200">
                  <WarehouseIcon className="w-3 h-3 text-teal-600" />
                  <span>#{selectedWarehouseId} ({currentWarehouse.name})</span>
                </span>
              )}
            </div>

            {/* Direct Warehouse Hash Links for quick identification */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="text-slate-400 font-sans">זיהוי מחסן ב-URL:</span>
              <a href="#main" className="hover:text-teal-700 underline text-slate-600">#main</a>
              <span className="text-slate-300">•</span>
              <a href="#mobility" className="hover:text-teal-700 underline text-slate-600">#mobility</a>
              <span className="text-slate-300">•</span>
              <a href="#emergency" className="hover:text-teal-700 underline text-slate-600">#emergency</a>
              <span className="text-slate-300">•</span>
              <a href="#sabbath" className="hover:text-teal-700 underline text-slate-600">#sabbath</a>
              <span className="text-slate-300">•</span>
              <a href="#lockers" className="hover:text-teal-700 underline text-slate-600">#lockers</a>
              <span className="text-slate-300">•</span>
              <a href="#maternity" className="hover:text-teal-700 underline text-slate-600">#maternity</a>
              <span className="text-slate-300">•</span>
              <a href="#all" className="hover:text-teal-700 underline text-slate-600">#all</a>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => navigateToTab('admin')}
                className="text-slate-500 hover:text-amber-700 transition-colors flex items-center gap-1"
                title="גישה למערכת הניהול"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>/ADMIN</span>
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Global Modals */}
      
      {/* Quick View Item Details Modal */}
      <EquipmentDetailsModal
        isOpen={!!inspectingItem}
        onClose={() => setInspectingItem(null)}
        item={inspectingItem}
        hospital={warehouses.find((w) => w.id === (inspectingItem?.warehouseId || inspectingItem?.hospitalId))}
        isInCart={!!cart.find((c) => c.equipment.id === inspectingItem?.id)}
        onAddToCart={handleAddToCart}
        onDirectCheckout={handleDirectCheckout}
      />

      {/* Express Sabbath Kit Modal */}
      <SabbathKitModal
        isOpen={isSabbathModalOpen}
        onClose={() => setIsSabbathModalOpen(false)}
        hospitals={warehouses}
        onDispatchSabbathKit={(hId, dept, rm, items, phone, n) => {
          const sabbathItem = equipment.find((e) => e.isUrgentSabbath) || equipment[4];
          if (sabbathItem) {
            handleAddToCart(sabbathItem);
            navigateToTab('cart');
            showToast('ערכת שבת שובצה לסל להזמנה ישירה לחדר האשפוז', undefined, 'success');
          }
        }}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        equipment={equipment}
        onScanSuccess={(code) => {
          const matched = equipment.find((e) => e.sku === code || e.id === code);
          if (matched) {
            setInspectingItem(matched);
            showToast('פריט זוהה בסריקה!', matched.name, 'success');
          } else {
            showToast('מק״ט לא נמצא בקטלוג', code, 'error');
          }
        }}
      />

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
