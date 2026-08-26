import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Volunteer,
  Product,
  Model,
  Branch,
  Customer,
} from './types';
import {
  ORGANIZATIONS,
  WAREHOUSES,
  INITIAL_EQUIPMENT,
  INITIAL_REQUESTS,
  INITIAL_SANITIZATION_QUEUE,
  INITIAL_VOLUNTEERS,
  PRODUCTS,
  MODELS,
  BRANCHES,
  INITIAL_CUSTOMERS,
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
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView, AccessDeniedView } from './components/LoginView';
import { ReportReturnView } from './components/ReportReturnView';
import { Shield, Lock, Box, Warehouse as WarehouseIcon, Building2, LogOut } from 'lucide-react';

const AppContent: React.FC = () => {
  const { showToast } = useToast();
  const { theme } = useAppTheme();
  const { user, token, isLoading: authLoading, logout } = useAuth();

  // Core Data Collections
  const [organizations, setOrganizations] = useState<Organization[]>(ORGANIZATIONS);
  // Warehouses, the Product/Model/SKU catalog hierarchy, branches and customers now live on the
  // server too (see server/catalogRoutes.ts) - the mockData imports below are only the initial
  // render's placeholder, immediately replaced once fetchCatalog() resolves (see below). This is
  // what lets admin CRUD on any of these actually survive a page refresh.
  const [warehouses, setWarehouses] = useState<Warehouse[]>(WAREHOUSES);
  const [equipment, setEquipment] = useState<EquipmentItem[]>(INITIAL_EQUIPMENT);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [models, setModels] = useState<Model[]>(MODELS);
  const [branches, setBranches] = useState<Branch[]>(BRANCHES);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  // Orders now live on the server (server/ordersStore.ts) instead of only in this browser tab —
  // that's what lets WhatsApp reminders run independently and lets a return report reach the
  // admin panel from a different device. This starts empty and is populated by fetchOrders()
  // below once an admin is logged in; a public checkout never needs to read this list.
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [requests, setRequests] = useState<PatientRequest[]>(INITIAL_REQUESTS);
  const [sanitizationQueue, setSanitizationQueue] = useState<SanitizationLog[]>(INITIAL_SANITIZATION_QUEUE);
  const [volunteers, setVolunteers] = useState<Volunteer[]>(INITIAL_VOLUNTEERS);

  // URL HASH & Path Router: Identifies Warehouse & Tab from URL Hash
  //
  // Two link styles are supported:
  //  - Legacy/global demo links:            #main, #mobility/cart, #ADMIN ...
  //  - Per-organization association links:  #org/<CODE>, #org/<CODE>/cart,
  //    #org/<CODE>/patient_portal, #org/<CODE>/admin (organization manager, scoped to that org only)
  const parseLocationHash = (): { tab: TabType; warehouseId: string; orgCode?: string; reportOrderId?: string } => {
    if (typeof window === 'undefined') return { tab: 'catalog', warehouseId: 'main' };

    const path = window.location.pathname.toUpperCase();
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
    const hashUpper = rawHash.toUpperCase();

    // Check for /ADMIN in path or hash (global super-admin — sees every organization)
    if (path === '/ADMIN' || path === '/ADMIN/' || hashUpper === 'ADMIN' || hashUpper.startsWith('ADMIN/')) {
      return { tab: 'admin', warehouseId: 'main' };
    }

    const orgParts = rawHash.split('/').filter(Boolean);

    // Per-organization link: #org/<CODE>[/<tab>]
    if (orgParts[0] && orgParts[0].toLowerCase() === 'org' && orgParts[1]) {
      const orgCode = orgParts[1];
      const rawTab = (orgParts[2] || 'catalog').toLowerCase();

      // #org/<CODE>/return/<ORDERID> — the link a customer gets in a WhatsApp reminder to
      // self-report that they've already returned the equipment.
      if (rawTab === 'return' && orgParts[3]) {
        return { tab: 'report_return', warehouseId: 'all', orgCode, reportOrderId: orgParts[3] };
      }

      const validOrgTabs: TabType[] = ['catalog', 'cart', 'patient_portal', 'sanitization', 'admin'];
      const resolvedTab: TabType =
        rawTab === 'requests' || rawTab === 'request'
          ? 'patient_portal'
          : (validOrgTabs.includes(rawTab as TabType) ? (rawTab as TabType) : 'catalog');
      return { tab: resolvedTab, warehouseId: 'all', orgCode };
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
  const [activeOrgCode, setActiveOrgCode] = useState<string | undefined>(initialLoc.orgCode);
  const [reportOrderId, setReportOrderId] = useState<string | undefined>(initialLoc.reportOrderId);

  // Synchronize state with URL Hash changes (e.g. #main, #emergency, #mobility, #ADMIN, #cart, #org/HESED)
  useEffect(() => {
    const handleHashSync = () => {
      const { tab, warehouseId, orgCode, reportOrderId: orderId } = parseLocationHash();
      setActiveTab(tab);
      setSelectedWarehouseId(warehouseId);
      setActiveOrgCode(orgCode);
      setReportOrderId(orderId);
    };

    window.addEventListener('hashchange', handleHashSync);
    window.addEventListener('popstate', handleHashSync);
    return () => {
      window.removeEventListener('hashchange', handleHashSync);
      window.removeEventListener('popstate', handleHashSync);
    };
  }, []);

  // Update URL hash when switching tabs or warehouses (keeps the #org/<CODE> prefix when browsing inside an organization's page)
  const navigateToTab = (tab: TabType) => {
    setActiveTab(tab);
    if (activeOrgCode) {
      window.location.hash = tab === 'catalog' ? `org/${activeOrgCode}` : `org/${activeOrgCode}/${tab}`;
    } else if (tab === 'admin') {
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

  // --- Orders: fetched from the server (see server/ordersRoutes.ts) whenever an admin is
  // logged in, refreshed on an interval so a return report from a customer's own phone shows
  // up here without anyone needing to refresh the page. ---
  const authHeader = (): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {});

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/orders', { headers: authHeader() });
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      // Network hiccup — keep showing whatever we already have; the next poll will retry.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (activeTab !== 'admin' || !user) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 20000);
    return () => clearInterval(interval);
  }, [activeTab, user, fetchOrders]);

  // --- Catalog (products/models/branches/warehouses/equipment): public data, needed by the
  // anonymous customer-facing catalog too, so this fetches once on mount regardless of login. ---
  const fetchCatalog = useCallback(async () => {
    try {
      const [productsRes, modelsRes, branchesRes, warehousesRes, equipmentRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/models'),
        fetch('/api/branches'),
        fetch('/api/warehouses'),
        fetch('/api/equipment'),
      ]);
      if (productsRes.ok) setProducts((await productsRes.json()).products || []);
      if (modelsRes.ok) setModels((await modelsRes.json()).models || []);
      if (branchesRes.ok) setBranches((await branchesRes.json()).branches || []);
      if (warehousesRes.ok) setWarehouses((await warehousesRes.json()).warehouses || []);
      if (equipmentRes.ok) setEquipment((await equipmentRes.json()).equipment || []);
    } catch {
      // Network hiccup on load — keep showing the bundled mock data as a fallback.
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // Customers: contains personal info, so (like orders) this only fetches once an admin/manager
  // is logged in, and is scoped server-side to their own organization.
  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/customers', { headers: authHeader() });
      if (!res.ok) return;
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {
      // keep showing whatever we already have
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (activeTab !== 'admin' || !user) return;
    fetchCustomers();
  }, [activeTab, user, fetchCustomers]);

  // Generic create/update/delete against server/catalogRoutes.ts, shared by products, models,
  // branches, warehouses, equipment (SKUs) and customers — they're all plain id-keyed CRUD lists.
  function makeCrudHandlers<T extends { id: string }>(
    endpoint: string,
    setState: React.Dispatch<React.SetStateAction<T[]>>
  ) {
    const add = async (item: Partial<T>): Promise<T | null> => {
      try {
        const res = await fetch(`/api/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify(item),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showToast('הפעולה נכשלה', err.error, 'error');
          return null;
        }
        const data = await res.json();
        setState((prev) => [data.item, ...prev]);
        return data.item as T;
      } catch {
        showToast('הפעולה נכשלה', 'ודאו ששרת ה-API רץ ונסו שוב', 'error');
        return null;
      }
    };

    const update = async (id: string, patch: Partial<T>): Promise<T | null> => {
      try {
        const res = await fetch(`/api/${endpoint}/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify(patch),
        });
        if (!res.ok) return null;
        const data = await res.json();
        setState((prev) => prev.map((x) => ((x as { id: string }).id === id ? data.item : x)));
        return data.item as T;
      } catch {
        return null;
      }
    };

    const remove = async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/${endpoint}/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: authHeader(),
        });
        if (!res.ok) return false;
        setState((prev) => prev.filter((x) => (x as { id: string }).id !== id));
        return true;
      } catch {
        return false;
      }
    };

    return { add, update, remove };
  }

  const productHandlers = makeCrudHandlers<Product>('products', setProducts);
  const modelHandlers = makeCrudHandlers<Model>('models', setModels);
  const branchHandlers = makeCrudHandlers<Branch>('branches', setBranches);
  const warehouseHandlers = makeCrudHandlers<Warehouse>('warehouses', setWarehouses);
  const equipmentHandlers = makeCrudHandlers<EquipmentItem>('equipment', setEquipment);
  const customerHandlers = makeCrudHandlers<Customer>('customers', setCustomers);

  // Notify the admin (toast) the moment a customer's return report appears — including ones
  // that arrived from a different browser/device, thanks to orders now living on the server.
  const seenReturnReportedIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentIds = new Set(orders.filter((o) => o.orderStatus === 'return_reported').map((o) => o.id));
    currentIds.forEach((id) => {
      if (!seenReturnReportedIds.current.has(id)) {
        showToast('התקבל דיווח החזרה חדש מלקוח!', `הזמנה #${id} ממתינה לבדיקתך`, 'info');
      }
    });
    seenReturnReportedIds.current = currentIds;
  }, [orders]);

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

  // When order is completed via Checkout — persists it to the server (see server/ordersRoutes.ts)
  // so it survives refreshes, is visible to any admin session, and can be picked up by the
  // WhatsApp reminder sweep. Returns whether the save actually succeeded; CartCheckoutView only
  // advances to its confirmation screen once this resolves true.
  const handleOrderComplete = async (newOrder: OrderRecord): Promise<boolean> => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });
      if (!res.ok) return false;

      // Equipment stock is still tracked client-side only (see App.tsx-level TODOs elsewhere);
      // reflect the new loan immediately in this browser's view of it.
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
      setOrders((prev) => [newOrder, ...prev]);
      return true;
    } catch {
      return false;
    }
  };

  // Generic authenticated PATCH for staff order actions (dispatch/delivery status, hold status,
  // volunteer assignment). The server re-checks the logged-in user's role/organization against
  // the order itself — an org manager's token can't touch another organization's order even if
  // this client were tampered with.
  const patchOrder = async (orderId: string, patch: Partial<OrderRecord>): Promise<OrderRecord | null> => {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        showToast('העדכון נכשל', undefined, 'error');
        return null;
      }
      const data = await res.json();
      const updated = data.order as OrderRecord;
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      return updated;
    } catch {
      showToast('בעיית תקשורת עם השרת', undefined, 'error');
      return null;
    }
  };

  // Admin Actions: Equipment (SKU) CRUD — persisted server-side (server/catalogRoutes.ts) so a
  // new/edited/deleted SKU survives a refresh and is visible from any admin session.
  const handleAddEquipment = async (item: EquipmentItem) => {
    const created = await equipmentHandlers.add(item);
    if (created) showToast('פריט חדש נוסף לקטלוג', created.name, 'success');
  };

  const handleUpdateEquipment = async (item: EquipmentItem) => {
    await equipmentHandlers.update(item.id, item);
  };

  const handleDeleteEquipment = async (id: string) => {
    await equipmentHandlers.remove(id);
  };

  // Admin Actions: Product / Model / Branch / Customer CRUD (server/catalogRoutes.ts)
  const handleAddProduct = async (item: Product) => productHandlers.add(item);
  const handleUpdateProduct = async (id: string, patch: Partial<Product>) => productHandlers.update(id, patch);
  const handleDeleteProduct = async (id: string) => productHandlers.remove(id);

  const handleAddModel = async (item: Model) => modelHandlers.add(item);
  const handleUpdateModel = async (id: string, patch: Partial<Model>) => modelHandlers.update(id, patch);
  const handleDeleteModel = async (id: string) => modelHandlers.remove(id);

  const handleAddBranch = async (item: Branch) => branchHandlers.add(item);
  const handleUpdateBranch = async (id: string, patch: Partial<Branch>) => branchHandlers.update(id, patch);
  const handleDeleteBranch = async (id: string) => branchHandlers.remove(id);

  const handleAddCustomer = async (item: Customer) => customerHandlers.add(item);
  const handleUpdateCustomer = async (id: string, patch: Partial<Customer>) => customerHandlers.update(id, patch);
  const handleDeleteCustomer = async (id: string) => customerHandlers.remove(id);

  // Persists to the server (server/catalogRoutes.ts) instead of only this browser tab, so a new
  // warehouse survives a refresh and is visible to every admin session, not just this one.
  const handleAddWarehouse = async (newWh: Warehouse) => {
    const created = await warehouseHandlers.add(newWh);
    if (created) showToast('מחסן חדש הוקם ושויך לארגון!', created.name, 'success');
  };

  const handleAddOrganization = (newOrg: Organization) => {
    setOrganizations((prev) => [...prev, newOrg]);
  };

  // Admin Actions: Order & Hold status updates (dispatch/delivery flow only — return
  // confirmation has its own dedicated flow below, handleConfirmReturn)
  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    patchOrder(orderId, { orderStatus: newStatus });
  };

  const handleUpdateHoldStatus = (orderId: string, newHoldStatus: HoldStatus) => {
    patchOrder(orderId, { holdStatus: newHoldStatus });
  };

  const handleAssignVolunteer = (orderId: string, volunteerName: string, volunteerPhone: string) => {
    const current = orders.find((o) => o.id === orderId);
    const patch: Partial<OrderRecord> = {
      assignedVolunteerName: volunteerName,
      assignedVolunteerPhone: volunteerPhone,
    };
    if (current?.orderStatus === 'pending_dispatch') patch.orderStatus = 'in_transit';

    patchOrder(orderId, patch).then((updated) => {
      if (updated) showToast('מתנדב שובץ בהצלחה להזמנה!', `${volunteerName} (${volunteerPhone})`, 'success');
    });
  };

  // Staff confirms a customer's self-reported return after physically inspecting the equipment.
  // 'clean' releases it straight back to available stock; 'needs_sanitizing' sends it through
  // the sanitization station (see SanitizationView) before it's available again.
  const handleConfirmReturn = async (orderId: string, outcome: 'clean' | 'needs_sanitizing') => {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/confirm-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ outcome }),
      });
      if (!res.ok) {
        showToast('אישור ההחזרה נכשל', undefined, 'error');
        return;
      }
      const data = await res.json();
      const updatedOrder = data.order as OrderRecord;
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));

      if (outcome === 'clean') {
        setEquipment((prev) =>
          prev.map((item) => {
            const match = updatedOrder.items.find((i) => i.equipmentId === item.id);
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
        showToast('ההחזרה אושרה', 'הציוד שוחרר למלאי הזמין', 'success');
      } else {
        setSanitizationQueue((prev) => [
          ...updatedOrder.items.map((it) => ({
            id: `san-${orderId}-${it.equipmentId}`,
            equipmentId: it.equipmentId,
            equipmentName: it.equipmentName,
            equipmentSku: it.equipmentSku,
            organizationId: updatedOrder.organizationId,
            warehouseId: updatedOrder.warehouseId,
            hospitalId: updatedOrder.hospitalId,
            returnedAt: updatedOrder.actualReturnDate,
            returnedByPatientName: updatedOrder.patientName,
            sanitizationStep: 1 as const,
            isReadyForShelf: false,
          })),
          ...prev,
        ]);
        showToast('ההחזרה אושרה', 'הציוד הועבר לתחנת החיטוי', 'success');
      }
    } catch {
      showToast('בעיית תקשורת עם השרת', undefined, 'error');
    }
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

  // Organization scoping: an "#org/<CODE>" link locks the whole app down to a single
  // organization's own data — its own warehouses, equipment, orders, requests, and volunteers.
  // A manager visiting their organization's link (including its "/admin" sub-page) can never
  // see or touch another organization's records. The global "/ADMIN" link (no org code) is the
  // super-admin view and keeps seeing everything, unchanged.
  const activeOrganization = activeOrgCode
    ? organizations.find((o) => o.code.toLowerCase() === activeOrgCode.toLowerCase())
    : undefined;
  const orgNotFound = !!activeOrgCode && !activeOrganization;

  const scopedWarehouses = activeOrganization
    ? warehouses.filter((w) => w.organizationId === activeOrganization.id)
    : warehouses;
  const scopedWarehouseIds = new Set(scopedWarehouses.map((w) => w.id));
  const belongsToActiveOrg = (rec: { organizationId?: string; warehouseId?: string; hospitalId?: string }) =>
    (!!rec.organizationId && rec.organizationId === activeOrganization?.id) ||
    (!!rec.warehouseId && scopedWarehouseIds.has(rec.warehouseId)) ||
    (!!rec.hospitalId && scopedWarehouseIds.has(rec.hospitalId));

  const scopedOrganizations = activeOrganization ? [activeOrganization] : organizations;
  const scopedEquipment = activeOrganization ? equipment.filter(belongsToActiveOrg) : equipment;
  const scopedOrders = activeOrganization ? orders.filter(belongsToActiveOrg) : orders;
  const scopedRequests = activeOrganization ? requests.filter(belongsToActiveOrg) : requests;
  const scopedVolunteers = activeOrganization ? volunteers.filter(belongsToActiveOrg) : volunteers;
  const scopedSanitizationQueue = activeOrganization
    ? sanitizationQueue.filter(belongsToActiveOrg)
    : sanitizationQueue;
  const scopedProducts = activeOrganization
    ? products.filter((p) => p.organizationId === activeOrganization.id)
    : products;
  const scopedModels = activeOrganization
    ? models.filter((m) => m.organizationId === activeOrganization.id)
    : models;
  const scopedBranches = activeOrganization
    ? branches.filter((b) => b.organizationId === activeOrganization.id)
    : branches;
  const scopedCustomers = activeOrganization
    ? customers.filter((c) => c.organizationId === activeOrganization.id)
    : customers;

  const currentWarehouse = scopedWarehouses.find((w) => w.id === selectedWarehouseId);
  const cartItemsCount = cart.reduce((acc, c) => acc + c.quantity, 0);
  const pendingRequestsCount = scopedRequests.filter((r) => r.status === 'pending').length;
  const pendingReturnConfirmations = scopedOrders.filter((o) => o.orderStatus === 'return_reported').length;

  // Admin access control: a real, server-verified login now guards every admin route.
  // - #ADMIN (no org code) requires a logged-in super_admin.
  // - #org/<CODE>/admin requires a logged-in super_admin, OR an org_manager whose own
  //   organizationId matches this organization — never another organization's manager.
  const isAdminRoute = activeTab === 'admin';
  const hasAdminAccess =
    !isAdminRoute ||
    (!!user &&
      (user.role === 'super_admin' ||
        (user.role === 'org_manager' && !!activeOrganization && user.organizationId === activeOrganization.id)));

  // Unknown / mistyped organization link — never fall back to showing the full, unscoped catalog.
  if (orgNotFound) {
    return (
      <div className={`min-h-screen ${theme.bgClass} font-sans flex items-center justify-center p-6`} dir="rtl">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-black text-slate-900">העמותה לא נמצאה</h1>
          <p className="text-sm text-slate-500">
            הקישור <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">#org/{activeOrgCode}</span> אינו תואם לאף עמותה רשומה במערכת.
            בדקו את הקישור שקיבלתם מהעמותה, או פנו למנהל המערכת.
          </p>
        </div>
      </div>
    );
  }

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
                      {activeOrganization
                        ? `ניהול עמותת ${activeOrganization.shortName || activeOrganization.name}`
                        : 'חסד בריא • ניהול מחסנים ומלאי'}
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      {activeOrganization ? `ORG-ADMIN • ${activeOrganization.code}` : '/ADMIN'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {activeOrganization
                      ? 'ניהול ציוד, מלאי, הזמנות והשאלות עבור העמותה שלכם בלבד'
                      : 'ניהול ציוד, מלאי מחסנים, רכישות ותפיסות מסגרת אשראי'}
                  </span>
                </div>
                {pendingReturnConfirmations > 0 && (
                  <span className="animate-pulse px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5">
                    🔔 {pendingReturnConfirmations} דיווחי החזרה ממתינים לבדיקה
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {user && (
                  <button
                    onClick={() => {
                      logout();
                      navigateToTab('catalog');
                    }}
                    className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                    title="התנתקות"
                  >
                    <LogOut className="w-4 h-4 text-slate-400" />
                    <span>{user.name} • התנתקות</span>
                  </button>
                )}
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
              key={activeOrganization?.id || 'global'}
              equipment={scopedEquipment}
              warehouses={scopedWarehouses}
              hospitals={scopedWarehouses}
              organizations={scopedOrganizations}
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
              key={activeOrganization?.id || 'global'}
              cart={cart}
              hospitals={scopedWarehouses}
              selectedHospitalId={selectedWarehouseId}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveFromCart={handleRemoveFromCart}
              onClearCart={handleClearCart}
              onOrderComplete={handleOrderComplete}
              onNavigateToCatalog={() => navigateToTab('catalog')}
              onNavigateToAdmin={() => navigateToTab('admin')}
            />
          )}

          {/* VIEW 3: Admin Portal — /ADMIN or #ADMIN is the global super-admin (sees every organization).
              #org/<CODE>/admin is that organization's own manager view, locked to its own data only.
              A real, server-verified login (see src/context/AuthContext.tsx) now guards this route. */}
          {activeTab === 'admin' && (
            authLoading ? (
              <div className="text-center py-24 text-sm font-bold text-slate-400">בודק התחברות…</div>
            ) : !user ? (
              <LoginView
                title={activeOrganization ? `כניסת מנהל עמותת ${activeOrganization.name}` : 'כניסת מנהל מערכת'}
                subtitle={
                  activeOrganization
                    ? `רק מנהלים המשויכים לעמותת ${activeOrganization.code} יכולים להיכנס כאן`
                    : undefined
                }
              />
            ) : !hasAdminAccess ? (
              <AccessDeniedView
                message={
                  activeOrganization
                    ? `המשתמש "${user.name}" אינו משויך לעמותת ${activeOrganization.name} ולכן אינו יכול לנהל אותה.`
                    : `המשתמש "${user.name}" אינו סופר-אדמין ולכן אינו יכול לגשת לניהול הכללי.`
                }
              />
            ) : (
              <AdminDashboardView
                key={activeOrganization?.id || 'super-admin'}
                equipment={scopedEquipment}
                orders={scopedOrders}
                warehouses={scopedWarehouses}
                hospitals={scopedWarehouses}
                organizations={scopedOrganizations}
                volunteers={scopedVolunteers}
                products={scopedProducts}
                models={scopedModels}
                branches={scopedBranches}
                customers={scopedCustomers}
                currentUser={user}
                selectedHospitalId={selectedWarehouseId}
                onAddEquipment={handleAddEquipment}
                onUpdateEquipment={handleUpdateEquipment}
                onDeleteEquipment={handleDeleteEquipment}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onAddModel={handleAddModel}
                onUpdateModel={handleUpdateModel}
                onDeleteModel={handleDeleteModel}
                onAddBranch={handleAddBranch}
                onUpdateBranch={handleUpdateBranch}
                onDeleteBranch={handleDeleteBranch}
                onUpdateWarehouse={(id: string, patch: Partial<Warehouse>) => warehouseHandlers.update(id, patch)}
                onDeleteWarehouse={(id: string) => warehouseHandlers.remove(id)}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onUpdateHoldStatus={handleUpdateHoldStatus}
                onAssignVolunteer={handleAssignVolunteer}
                onConfirmReturn={handleConfirmReturn}
                onNavigateToCatalog={() => navigateToTab('catalog')}
                onAddWarehouse={handleAddWarehouse}
                onAddOrganization={activeOrganization ? undefined : handleAddOrganization}
              />
            )
          )}

          {/* VIEW: customer self-report-return page, reached only via a direct link (e.g. from
              a WhatsApp reminder: #org/<CODE>/return/<ORDERID>) — never from the nav bar. */}
          {activeTab === 'report_return' && (
            <ReportReturnView
              orderId={reportOrderId}
              organizationCode={activeOrganization?.code}
              onNavigateToCatalog={() => navigateToTab('catalog')}
            />
          )}

          {/* VIEW 4: Patient Bedside Requests Portal */}
          {activeTab === 'patient_portal' && (
            <PatientPortalView
              key={activeOrganization?.id || 'global'}
              hospitals={scopedWarehouses}
              selectedHospitalId={selectedWarehouseId}
              requests={scopedRequests}
              volunteers={scopedVolunteers}
              onAddNewRequest={handleAddNewRequest}
              onAssignVolunteer={handleAssignVolunteerToRequest}
              onUpdateStatus={handleUpdatePatientRequestStatus}
            />
          )}

          {/* VIEW 5: Sanitization Station */}
          {activeTab === 'sanitization' && (
            <SanitizationView
              key={activeOrganization?.id || 'global'}
              sanitizationQueue={scopedSanitizationQueue}
              equipment={scopedEquipment}
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
              <span className="font-bold text-slate-800">{activeOrganization ? activeOrganization.name : 'חסד בריא'}</span>
              <span>• עמותת השאלת ציוד רפואי ועזרי שהייה</span>
              {activeOrganization ? (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md border border-teal-200">
                  <Building2 className="w-3 h-3 text-teal-600" />
                  <span>#org/{activeOrganization.code}</span>
                </span>
              ) : currentWarehouse && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md border border-teal-200">
                  <WarehouseIcon className="w-3 h-3 text-teal-600" />
                  <span>#{selectedWarehouseId} ({currentWarehouse.name})</span>
                </span>
              )}
            </div>

            {activeOrganization ? (
              /* Organization-scoped quick links — this page only ever shows this organization's own data */
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-400 font-sans">קישורי העמותה שלכם:</span>
                <a href={`#org/${activeOrganization.code}`} className="hover:text-teal-700 underline text-slate-600">
                  #org/{activeOrganization.code}
                </a>
                <span className="text-slate-300">•</span>
                <a href={`#org/${activeOrganization.code}/patient_portal`} className="hover:text-teal-700 underline text-slate-600">
                  #org/{activeOrganization.code}/patient_portal
                </a>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => navigateToTab('admin')}
                  className="text-slate-500 hover:text-amber-700 transition-colors flex items-center gap-1"
                  title="כניסת מנהל עמותה"
                >
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>כניסת מנהל עמותה</span>
                </button>
              </div>
            ) : (
              /* Direct Warehouse Hash Links for quick identification (legacy/global demo view) */
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
            )}
          </div>
        </footer>
      )}

      {/* Global Modals */}
      
      {/* Quick View Item Details Modal */}
      <EquipmentDetailsModal
        isOpen={!!inspectingItem}
        onClose={() => setInspectingItem(null)}
        item={inspectingItem}
        hospital={scopedWarehouses.find((w) => w.id === (inspectingItem?.warehouseId || inspectingItem?.hospitalId))}
        isInCart={!!cart.find((c) => c.equipment.id === inspectingItem?.id)}
        onAddToCart={handleAddToCart}
        onDirectCheckout={handleDirectCheckout}
      />

      {/* Express Sabbath Kit Modal */}
      <SabbathKitModal
        isOpen={isSabbathModalOpen}
        onClose={() => setIsSabbathModalOpen(false)}
        hospitals={scopedWarehouses}
        onDispatchSabbathKit={(hId, dept, rm, items, phone, n) => {
          const sabbathItem = scopedEquipment.find((e) => e.isUrgentSabbath) || scopedEquipment[4];
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
        equipment={scopedEquipment}
        onScanSuccess={(code) => {
          const matched = scopedEquipment.find((e) => e.sku === code || e.id === code);
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
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
