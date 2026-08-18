import React, { useState } from 'react';
import { 
  Package, 
  ShoppingCart, 
  CreditCard, 
  BarChart3, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Truck, 
  Building2, 
  Boxes,
  User, 
  Printer, 
  ExternalLink, 
  Layers, 
  TrendingUp, 
  HeartHandshake, 
  FileText,
  RotateCcw,
  Sparkles,
  Lock,
  Unlock,
  Check,
  Phone,
  MapPin,
  X
} from 'lucide-react';
import { 
  EquipmentCategory, 
  EquipmentItem, 
  EquipmentStatus, 
  HoldStatus, 
  Warehouse, 
  Organization,
  OrderRecord, 
  OrderStatus, 
  Volunteer 
} from '../types';
import { AddEquipmentModal } from './AddEquipmentModal';
import { EditEquipmentModal } from './EditEquipmentModal';
import { useToast } from './Toast';

interface AdminDashboardViewProps {
  equipment: EquipmentItem[];
  orders: OrderRecord[];
  warehouses?: Warehouse[];
  hospitals?: Warehouse[];
  organizations?: Organization[];
  volunteers: Volunteer[];
  selectedHospitalId: string;
  onAddEquipment: (item: EquipmentItem) => void;
  onUpdateEquipment: (item: EquipmentItem) => void;
  onDeleteEquipment: (id: string) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onUpdateHoldStatus: (orderId: string, newHoldStatus: HoldStatus) => void;
  onAssignVolunteer: (orderId: string, volunteerName: string, volunteerPhone: string) => void;
  onNavigateToCatalog: () => void;
  onAddWarehouse?: (warehouse: Warehouse) => void;
  onAddOrganization?: (organization: Organization) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  equipment,
  orders,
  warehouses,
  hospitals,
  organizations = [],
  volunteers,
  selectedHospitalId,
  onAddEquipment,
  onUpdateEquipment,
  onDeleteEquipment,
  onUpdateOrderStatus,
  onUpdateHoldStatus,
  onAssignVolunteer,
  onNavigateToCatalog,
  onAddWarehouse,
  onAddOrganization,
}) => {
  const { showToast } = useToast();
  const allWarehouses = warehouses || hospitals || [];

  // Admin sub-tabs: 'organizations' | 'inventory' | 'orders' | 'holds' | 'analytics'
  const [activeTab, setActiveTab] = useState<'organizations' | 'inventory' | 'orders' | 'holds' | 'analytics'>('organizations');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  
  // Add Warehouse Modal
  const [isAddWhModalOpen, setIsAddWhModalOpen] = useState(false);
  const [targetOrgIdForNewWh, setTargetOrgIdForNewWh] = useState<string>(organizations[0]?.id || 'org-hesed');
  const [newWhName, setNewWhName] = useState('');
  const [newWhHospital, setNewWhHospital] = useState('המרכז הרפואי שיבא תל השומר');
  const [newWhCity, setNewWhCity] = useState('רמת גן');
  const [newWhLocation, setNewWhLocation] = useState('');
  const [newWhManagerName, setNewWhManagerName] = useState('');
  const [newWhManagerPhone, setNewWhManagerPhone] = useState('');
  const [newWhHasLockers, setNewWhHasLockers] = useState(true);

  // Filters for inventory
  const [invSearch, setInvSearch] = useState('');
  const [invOrg, setInvOrg] = useState<string>('all');
  const [invWarehouse, setInvWarehouse] = useState<string>('all');
  const [invCategory, setInvCategory] = useState<EquipmentCategory | 'all'>('all');
  const [invStatus, setInvStatus] = useState<EquipmentStatus | 'all'>('all');

  // Filters for orders
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [orderOrgFilter, setOrderOrgFilter] = useState<string>('all');

  // Filters for holds
  const [holdSearch, setHoldSearch] = useState('');
  const [holdStatusFilter, setHoldStatusFilter] = useState<HoldStatus | 'all'>('all');

  // Filtered Inventory
  const filteredEquipment = equipment.filter((item) => {
    if (invOrg !== 'all') {
      const itemOrg = item.organizationId || allWarehouses.find(w => w.id === item.warehouseId)?.organizationId;
      if (itemOrg !== invOrg) return false;
    }
    if (invWarehouse !== 'all') {
      if (item.warehouseId !== invWarehouse && item.hospitalId !== invWarehouse) return false;
    }
    if (invCategory !== 'all' && item.category !== invCategory) return false;
    if (invStatus !== 'all' && item.status !== invStatus) return false;
    if (invSearch.trim()) {
      const q = invSearch.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.depotLocation.toLowerCase().includes(q) ||
        (item.organizationName || '').toLowerCase().includes(q) ||
        (item.hospitalName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Orders
  const filteredOrders = orders.filter((ord) => {
    if (orderOrgFilter !== 'all' && ord.organizationId !== orderOrgFilter) return false;
    if (orderStatusFilter !== 'all' && ord.orderStatus !== orderStatusFilter) return false;
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      return (
        ord.id.toLowerCase().includes(q) ||
        ord.patientName.toLowerCase().includes(q) ||
        ord.department.toLowerCase().includes(q) ||
        ord.roomNumber.toLowerCase().includes(q) ||
        (ord.organizationName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Holds
  const filteredHolds = orders.filter((ord) => {
    if (holdStatusFilter !== 'all' && ord.holdStatus !== holdStatusFilter) return false;
    if (holdSearch.trim()) {
      const q = holdSearch.toLowerCase();
      return (
        ord.id.toLowerCase().includes(q) ||
        ord.cardHolderName.toLowerCase().includes(q) ||
        ord.holdAuthCode.toLowerCase().includes(q) ||
        ord.patientName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Release credit hold
  const handleReleaseHold = (order: OrderRecord) => {
    onUpdateHoldStatus(order.id, 'released');
    onUpdateOrderStatus(order.id, 'returned_clean');
    showToast('תפיסת מסגרת האשראי שוחררה בהצלחה!', `שוחררו ₪${order.totalHoldAmount} לכרטיס ${order.creditCardMasked}`, 'success');
  };

  // Charge hold in case of unreturned/damaged equipment
  const handleChargeHold = (order: OrderRecord) => {
    if (confirm(`האם לחייב בפועל את מסגרת האשראי על סך ₪${order.totalHoldAmount}?`)) {
      onUpdateHoldStatus(order.id, 'charged');
      showToast('מסגרת הביטחון חויבה בפועל', `חויבו ₪${order.totalHoldAmount}`, 'info');
    }
  };

  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhName.trim()) return;

    const parentOrg = organizations.find(o => o.id === targetOrgIdForNewWh);
    const newWh: Warehouse = {
      id: `wh-${Date.now()}`,
      code: `WH-${Math.floor(100 + Math.random() * 900)}`,
      name: newWhName,
      organizationId: targetOrgIdForNewWh,
      organizationName: parentOrg?.name || 'עמותת חסד',
      hospitalName: newWhHospital,
      city: newWhCity,
      location: newWhLocation || 'מתחם מרכזי',
      managerName: newWhManagerName || 'רכז מוקד',
      managerPhone: newWhManagerPhone || '050-0000000',
      activeVolunteersCount: 5,
      hasSmartLockers: newWhHasLockers,
      sections: ['עמדת ניפוק ראשית', 'ארון חירום', 'מדף עזרים'],
      departments: ['פנימית', 'כירורגיה', 'אורתופדיה', 'מיון'],
    };

    if (onAddWarehouse) {
      onAddWarehouse(newWh);
    }
    showToast('מחסן חדש הוקם ושויך לארגון!', newWh.name, 'success');
    setIsAddWhModalOpen(false);
    setNewWhName('');
    setNewWhLocation('');
  };

  // Summary Metrics
  const totalEquipmentCount = equipment.reduce((acc, curr) => acc + curr.stockTotal, 0);
  const totalAvailableCount = equipment.reduce((acc, curr) => acc + curr.stockAvailable, 0);
  const totalActiveHoldsAmount = orders
    .filter((o) => o.holdStatus === 'held')
    .reduce((acc, curr) => acc + curr.totalHoldAmount, 0);
  const totalReleasedHoldsAmount = orders
    .filter((o) => o.holdStatus === 'released')
    .reduce((acc, curr) => acc + curr.totalHoldAmount, 0);
  const totalDonations = orders.reduce((acc, curr) => acc + (curr.voluntaryDonation || 0), 0);

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              מערכת ניהול ובקרה ארצית
            </span>
            <span className="font-mono text-xs text-slate-400">/ADMIN</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            ניהול ארגונים, מחסנים, מלאי ציוד והשאלות
          </h1>
          <p className="text-xs text-slate-500">
            שליטה מלאה במחסנים לפי בתי חולים, בקרה על תפיסות מסגרת (0 ₪ עלות השאלה) ושחרור ערבונות
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAddWhModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center gap-2"
          >
            <Boxes className="w-4 h-4" />
            <span>הוסף מחסן לארגון</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-teal-700/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>הוסף פריט ציוד</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Organizations count */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>ארגונים ועמותות</span>
            <Building2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{organizations.length}</div>
          <div className="text-[11px] text-slate-500">{allWarehouses.length} מחסנים בפריסה ארצית</div>
        </div>

        {/* Total Warehouses */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>מחסנים ומוקדים</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700">{allWarehouses.length}</div>
          <div className="text-[11px] text-slate-500">{new Set(allWarehouses.map(w => w.hospitalName)).size} בתי חולים שונים</div>
        </div>

        {/* Total Equipment */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>מלאי ציוד זמין</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{totalAvailableCount} / {totalEquipmentCount}</div>
          <div className="text-[11px] text-slate-500">{equipment.length} דגמים שונים</div>
        </div>

        {/* Active Holds */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>מסגרות שמורות</span>
            <Lock className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-700">₪{totalActiveHoldsAmount.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500">
            {orders.filter((o) => o.holdStatus === 'held').length} מסגרות פעילות
          </div>
        </div>

        {/* Released Holds & Donations */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>מסגרות ששוחררו</span>
            <Unlock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">₪{totalReleasedHoldsAmount.toLocaleString()}</div>
          <div className="text-[11px] text-amber-600 font-semibold">
            + ₪{totalDonations} תרומות
          </div>
        </div>

      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'organizations', label: 'ארגונים ומחסנים בבתי חולים', icon: Building2, count: organizations.length },
          { id: 'inventory', label: 'ניהול ציוד ומלאי', icon: Package, count: equipment.length },
          { id: 'orders', label: 'ניהול הזמנות והשאלות', icon: ShoppingCart, count: orders.length },
          { id: 'holds', label: 'תפיסות מסגרת אשראי', icon: CreditCard, count: orders.filter(o => o.holdStatus === 'held').length },
          { id: 'analytics', label: 'דוחות וסטטיסטיקות', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20 font-black'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white text-teal-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 0: Organizations & Warehouses Management */}
      {activeTab === 'organizations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">פריסת ארגונים ומחסנים</h2>
              <p className="text-xs text-slate-500">לכל ארגון יכולים להיות מספר מחסנים בבית חולים אחד או במספר בתי חולים</p>
            </div>
            <button
              onClick={() => setIsAddWhModalOpen(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף מחסן חדש</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {organizations.map((org) => {
              const orgWarehouses = allWarehouses.filter(w => w.organizationId === org.id);
              const orgEquipment = equipment.filter(
                e => e.organizationId === org.id || orgWarehouses.some(w => w.id === e.warehouseId)
              );
              const orgActiveLoans = orders.filter(
                o => (o.organizationId === org.id || orgWarehouses.some(w => w.id === o.warehouseId)) && (o.orderStatus === 'active_in_ward' || o.orderStatus === 'in_transit')
              ).length;

              return (
                <div key={org.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                  
                  {/* Organization Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-black text-lg border border-teal-200 shrink-0">
                        <Building2 className="w-6 h-6 text-teal-600" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-slate-900">{org.name}</h3>
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                            {org.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 max-w-2xl">{org.description}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1 font-bold text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-teal-600" />
                            <span>{org.contactPhone}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>מטה: {org.headquarters || 'מרכז ארצי'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-2xl">
                      <div className="text-xs text-slate-500">השאלות פעילות</div>
                      <div className="text-xl font-black text-teal-700">{orgActiveLoans} מושאלים</div>
                      <div className="text-[11px] text-slate-500">{orgEquipment.length} פריטים במלאי</div>
                    </div>
                  </div>

                  {/* Organization's Warehouses List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Boxes className="w-4 h-4 text-teal-600" />
                        <span>מחסנים ומוקדים של הארגון ({orgWarehouses.length} מחסנים):</span>
                      </span>
                      <button
                        onClick={() => {
                          setTargetOrgIdForNewWh(org.id);
                          setIsAddWhModalOpen(true);
                        }}
                        className="text-teal-700 hover:text-teal-800 text-xs font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>הוסף מחסן לארגון זה</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {orgWarehouses.map((wh) => {
                        const whEquipmentCount = equipment.filter(e => e.warehouseId === wh.id || e.hospitalId === wh.id).length;
                        return (
                          <div key={wh.id} className="p-4 bg-slate-50 hover:bg-teal-50/40 border border-slate-200 rounded-2xl space-y-3 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-mono text-[10px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                                  {wh.code}
                                </span>
                                <h4 className="font-extrabold text-slate-900 text-sm mt-1">{wh.name}</h4>
                                <div className="text-xs font-bold text-teal-800 flex items-center gap-1 mt-0.5">
                                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                                  <span>{wh.hospitalName}</span>
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                wh.hasSmartLockers ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {wh.hasSmartLockers ? 'לוקרים 24/7' : 'שינוע בלבד'}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-600 space-y-1 bg-white p-2.5 rounded-xl border border-slate-200/80">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{wh.location}</span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-slate-500">
                                <span>מנהל: {wh.managerName}</span>
                                <span className="font-mono">{wh.managerPhone}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1">
                              <span className="text-slate-500">{wh.activeVolunteersCount} מתנדבים</span>
                              <span className="font-bold text-teal-700">{whEquipmentCount} פריטי ציוד במחסן</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 1: Inventory & Equipment Management */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="חיפוש פריט לפי שם, מק״ט, ארגון או מיקום מוקד..."
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              
              {/* Organization filter */}
              <select
                value={invOrg}
                onChange={(e) => {
                  setInvOrg(e.target.value);
                  setInvWarehouse('all');
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-600 font-bold"
              >
                <option value="all">כל הארגונים</option>
                {organizations.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>

              {/* Warehouse filter */}
              <select
                value={invWarehouse}
                onChange={(e) => setInvWarehouse(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
              >
                <option value="all">כל המחסנים</option>
                {allWarehouses
                  .filter(w => invOrg === 'all' || w.organizationId === invOrg)
                  .map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
              </select>

              <select
                value={invCategory}
                onChange={(e) => setInvCategory(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
              >
                <option value="all">כל הקטגוריות</option>
                <option value="mobility">ניידות ושיקום</option>
                <option value="medical">מכשור רפואי ונשימתי</option>
                <option value="comfort">שהייה ולינת מלווים</option>
                <option value="sabbath">ערכות שבת</option>
                <option value="hygiene">רחצה ויולדות</option>
              </select>

              <select
                value={invStatus}
                onChange={(e) => setInvStatus(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
              >
                <option value="all">כל הסטטוסים</option>
                <option value="available">זמין במלאי</option>
                <option value="loaned">מושאל כעת</option>
                <option value="sanitizing">בחיטוי ובדיקה</option>
                <option value="maintenance">בתיקון/תחזוקה</option>
              </select>
            </div>

          </div>

          {/* Equipment Table with Thumbnails */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">תמונה</th>
                    <th className="p-4">מק״ט ושם פריט</th>
                    <th className="p-4">ארגון ומחסן</th>
                    <th className="p-4">קטגוריה</th>
                    <th className="p-4 text-center">מלאי (זמין / כולל)</th>
                    <th className="p-4 text-center">מסגרת ביטחון</th>
                    <th className="p-4">סטטוס</th>
                    <th className="p-4 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEquipment.map((item) => {
                    const warehouse = allWarehouses.find((w) => w.id === (item.warehouseId || item.hospitalId));
                    const orgName = item.organizationName || warehouse?.organizationName || 'עמותת חסד';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Thumbnail */}
                        <td className="p-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                            {item.photoUrl ? (
                              <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Name & SKU */}
                        <td className="p-4">
                          <div className="font-extrabold text-slate-900 text-xs">{item.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                              {item.sku}
                            </span>
                            {item.isUrgentSabbath && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.2 rounded border border-indigo-200">
                                שבת
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Org & Warehouse */}
                        <td className="p-4">
                          <div className="font-bold text-teal-800">{orgName}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {warehouse?.name || 'מחסן ראשי'} ({item.depotLocation})
                          </div>
                        </td>

                        {/* Category */}
                        <td className="p-4 text-slate-600">
                          {item.category === 'mobility' && 'ניידות ושיקום'}
                          {item.category === 'medical' && 'רפואי ונשימתי'}
                          {item.category === 'comfort' && 'שהייה ולינה'}
                          {item.category === 'sabbath' && 'ערכות שבת'}
                          {item.category === 'hygiene' && 'רחצה ויולדות'}
                        </td>

                        {/* Stock */}
                        <td className="p-4 text-center font-bold">
                          <span className={item.stockAvailable > 0 ? 'text-emerald-700 font-black' : 'text-rose-600 font-black'}>
                            {item.stockAvailable}
                          </span>
                          <span className="text-slate-400"> / {item.stockTotal}</span>
                        </td>

                        {/* Frame Hold */}
                        <td className="p-4 text-center font-bold text-slate-800">
                          ₪{item.depositAmount}
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            item.status === 'available'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : item.status === 'loaned'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {item.status === 'available' && 'זמין להשאלה'}
                            {item.status === 'loaned' && 'מושאל כעת'}
                            {item.status === 'sanitizing' && 'בחיטוי ובדיקה'}
                            {item.status === 'maintenance' && 'בתיקון/מעבדה'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                              title="ערוך פריט"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`למחוק את ${item.name}?`)) {
                                  onDeleteEquipment(item.id);
                                  showToast('הפריט הוסר מהמערכת', undefined, 'info');
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                              title="מחק פריט"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: Orders & Loans Management */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          
          {/* Orders Filter Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="חיפוש הזמנה לפי מס׳ הזמנה, שם מאושפז, מחלקה..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={orderOrgFilter}
                onChange={(e) => setOrderOrgFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-600 font-bold"
              >
                <option value="all">כל הארגונים</option>
                {organizations.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>

              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
              >
                <option value="all">כל הסטטוסים</option>
                <option value="pending_dispatch">ממתין לשינוע</option>
                <option value="in_transit">בשינוע לחדר</option>
                <option value="active_in_ward">פעיל במחלקה</option>
                <option value="returned_clean">הוחזר ושוחרר</option>
              </select>
            </div>
          </div>

          {/* Orders Cards / Table */}
          <div className="space-y-3">
            {filteredOrders.map((ord) => (
              <div key={ord.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                      {ord.id}
                    </span>
                    <span className="text-xs text-slate-500">{ord.createdAt}</span>
                    <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                      {ord.organizationName || 'עמותת חסד ומרפא'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      ord.orderStatus === 'active_in_ward'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : ord.orderStatus === 'in_transit'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {ord.orderStatus === 'active_in_ward' && '✓ פעיל בחדר המאושפז'}
                      {ord.orderStatus === 'in_transit' && '🚚 בשינוע ע״י מתנדב'}
                      {ord.orderStatus === 'pending_dispatch' && '⏳ ממתין לשינוע'}
                      {ord.orderStatus === 'returned_clean' && '✓ הוחזר ונבדק'}
                    </span>
                  </div>
                </div>

                {/* Patient & Location info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold block">פרטי מאושפז ומלווה</span>
                    <div className="font-black text-slate-900">{ord.patientName}</div>
                    <div className="text-slate-600">מלווה: {ord.caregiverName} ({ord.caregiverRelation})</div>
                    <div className="text-slate-500 font-mono">{ord.patientPhone}</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold block">מיקום אספקה</span>
                    <div className="font-black text-slate-900">{ord.department}</div>
                    <div className="text-slate-600">חדר {ord.roomNumber} • {ord.bedNumber}</div>
                    <div className="text-teal-700 font-medium">{ord.warehouseName || ord.hospitalName}</div>
                  </div>

                  <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-2xl space-y-1">
                    <span className="text-[11px] text-teal-800 font-bold block">ערבון ומסגרת ביטחון</span>
                    <div className="text-base font-black text-teal-900">
                      ₪{ord.totalHoldAmount} <span className="text-xs font-normal text-slate-500">(0 ₪ השאלה)</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      כרטיס {ord.creditCardMasked} • אישור {ord.holdAuthCode}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-bold">
                      {ord.holdStatus === 'held' ? '🔒 מסגרת תפוסה בביטחון' : '🔓 מסגרת שוחררה'}
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[11px] font-bold text-slate-500 mb-2 block">פריטים בהשאלה:</span>
                  <div className="flex flex-wrap gap-2">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-800 flex items-center gap-2">
                        <span className="font-bold text-teal-800">{it.quantity}x</span>
                        <span>{it.equipmentName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">({it.equipmentSku})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Truck className="w-4 h-4 text-teal-600" />
                    <span>מתנדב משובץ: <strong className="text-slate-800">{ord.assignedVolunteerName || 'טרם שובץ'}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    {ord.holdStatus === 'held' && (
                      <button
                        onClick={() => handleReleaseHold(ord)}
                        className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold transition-colors flex items-center gap-1.5"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>קבלת ציוד ושחרור מסגרת</span>
                      </button>
                    )}

                    {ord.orderStatus === 'pending_dispatch' && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, 'in_transit')}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors"
                      >
                        העבר לשינוע
                      </button>
                    )}

                    {ord.orderStatus === 'in_transit' && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, 'active_in_ward')}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors"
                      >
                        אושר מסירה בחדר
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB 3: Credit Card & Frame Holds */}
      {activeTab === 'holds' && (
        <div className="space-y-4">
          
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-3xl flex items-center justify-between text-xs text-teal-900">
            <div className="space-y-0.5">
              <span className="font-extrabold text-sm block">ניהול תפיסות מסגרת אשראי (J5 Authorizations)</span>
              <p className="text-teal-700">
                כל ההשאלות הן בחינם (0 ₪). מסגרת האשראי נשמרת כבטוחה בלבד ומשוחררת אוטומטית בעת החזרת הציוד למחסן.
              </p>
            </div>
            <div className="text-left font-mono font-bold text-teal-800 shrink-0">
              0 ₪ חיובי שווא
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">קוד אישור (J5)</th>
                    <th className="p-4">הזמנה ומאושפז</th>
                    <th className="p-4">ארגון ומחסן</th>
                    <th className="p-4">בעל הכרטיס</th>
                    <th className="p-4">כרטיס ותוקף</th>
                    <th className="p-4 text-center">סכום מסגרת</th>
                    <th className="p-4 text-center">תרומה שנאספה</th>
                    <th className="p-4">סטטוס מסגרת</th>
                    <th className="p-4 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHolds.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono font-black text-teal-800">
                        {ord.holdAuthCode || 'J5-849201'}
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-900">{ord.patientName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{ord.id} • חדר {ord.roomNumber}</div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-teal-800">{ord.organizationName || 'עמותת חסד'}</div>
                        <div className="text-[11px] text-slate-500">{ord.warehouseName || ord.hospitalName}</div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-900">{ord.cardHolderName}</div>
                        <div className="text-[11px] text-slate-500">ת.ז.: {ord.cardHolderId}</div>
                      </td>

                      <td className="p-4 font-mono text-slate-700">
                        <div>{ord.creditCardMasked}</div>
                        <div className="text-[10px] text-slate-400">תוקף: {ord.cardExp}</div>
                      </td>

                      <td className="p-4 text-center">
                        <span className="text-sm font-black text-teal-800">
                          ₪{ord.totalHoldAmount}
                        </span>
                      </td>

                      <td className="p-4 text-center font-bold text-amber-600">
                        {ord.voluntaryDonation > 0 ? `₪${ord.voluntaryDonation}` : '—'}
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          ord.holdStatus === 'held'
                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                            : ord.holdStatus === 'released'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {ord.holdStatus === 'held' && '🔒 מסגרת תפוסה'}
                          {ord.holdStatus === 'released' && '🔓 שוחררה במלואה'}
                          {ord.holdStatus === 'charged' && '⚠️ חויב בגין אי-החזרה'}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        {ord.holdStatus === 'held' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleReleaseHold(ord)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs flex items-center gap-1 transition-all"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>שחרר מסגרת</span>
                            </button>

                            <button
                              onClick={() => handleChargeHold(ord)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl font-bold text-xs transition-all"
                              title="גבה פיקדון בגין נזק או אי-החזרה"
                            >
                              גבה
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">הפעולה הושלמה</span>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: Analytics & Insights */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Category Demand breakdown */}
          <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                <span>התפלגות ביקוש לפי קטגוריות ציוד</span>
              </h3>
              <span className="text-xs text-slate-500">חודש נוכחי</span>
            </div>

            <div className="space-y-3">
              {[
                { label: 'ניידות וכיסאות גלגלים', count: 42, pct: 40, color: 'bg-teal-600' },
                { label: 'מכשור נשימתי ורפואי', count: 28, pct: 27, color: 'bg-indigo-600' },
                { label: 'שהייה ולינת מלווים (מיטות VIP)', count: 22, pct: 21, color: 'bg-amber-500' },
                { label: 'ערכות שבת ומועדים', count: 18, pct: 17, color: 'bg-rose-500' },
                { label: 'רחצה, שיקום ויולדות', count: 12, pct: 11, color: 'bg-emerald-600' },
              ].map((c, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <span>{c.label}</span>
                    <span className="font-bold">{c.count} השאלות ({c.pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${c.color} rounded-full`} style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hospital Performance */}
          <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                <span>מדדי אספקה לפי מרכזים רפואיים ומחסנים</span>
              </h3>
              <span className="text-xs text-slate-500">זמן ממוצע למיטה</span>
            </div>

            <div className="space-y-3">
              {allWarehouses.slice(0, 5).map((h) => (
                <div key={h.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900">{h.name}</div>
                    <div className="text-[11px] text-slate-500">{h.hospitalName} • {h.activeVolunteersCount} מתנדבים פעילים</div>
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-black text-emerald-700">28 דקות</div>
                    <div className="text-[10px] text-slate-500">ממוצע הגעה למחלקה</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Add Warehouse Modal */}
      {isAddWhModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">הקמת מחסן חדש לארגון</h2>
                  <p className="text-xs text-slate-500">הגדרת מחסן או מוקד אספקה בבית חולים</p>
                </div>
              </div>
              <button onClick={() => setIsAddWhModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="p-6 space-y-4 text-xs text-right">
              <div>
                <label className="block text-slate-700 font-bold mb-1">שיוך לארגון בעלים *</label>
                <select
                  value={targetOrgIdForNewWh}
                  onChange={(e) => setTargetOrgIdForNewWh(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-600"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">שם המחסן / המוקד *</label>
                <input
                  type="text"
                  required
                  placeholder="למשל: מחסן ציוד שיקום - שיבא"
                  value={newWhName}
                  onChange={(e) => setNewWhName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">בית חולים / מרכז רפואי *</label>
                  <input
                    type="text"
                    required
                    value={newWhHospital}
                    onChange={(e) => setNewWhHospital(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">עיר</label>
                  <input
                    type="text"
                    value={newWhCity}
                    onChange={(e) => setNewWhCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">מיקום מדויק (בניין, קומה, חדר)</label>
                <input
                  type="text"
                  placeholder="למשל: בניין אשפוז מרכזי - קומה 0 (שער א׳)"
                  value={newWhLocation}
                  onChange={(e) => setNewWhLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">שם מנהל המחסן</label>
                  <input
                    type="text"
                    placeholder="הרב אליהו לוי"
                    value={newWhManagerName}
                    onChange={(e) => setNewWhManagerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">טלפון מנהל המחסן</label>
                  <input
                    type="text"
                    placeholder="052-7654321"
                    value={newWhManagerPhone}
                    onChange={(e) => setNewWhManagerPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newWhHasLockers}
                    onChange={(e) => setNewWhHasLockers(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                  />
                  <span className="font-bold text-slate-800">כולל עמדת לוקרים חכמה לאיסוף 24/7</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddWhModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black shadow-md shadow-teal-700/20"
                >
                  שמור והקם מחסן
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Equipment Modal */}
      <AddEquipmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        hospitals={allWarehouses}
        warehouses={allWarehouses}
        organizations={organizations}
        onAdd={(item) => {
          onAddEquipment(item);
          showToast('פריט נוסף בהצלחה לקטלוג!', item.name, 'success');
        }}
      />

      {/* Edit Equipment Modal */}
      <EditEquipmentModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        hospitals={allWarehouses}
        warehouses={allWarehouses}
        organizations={organizations}
        onSave={(updated) => {
          onUpdateEquipment(updated);
          showToast('פרטי הפריט והמלאי נשמרו בהצלחה', updated.name, 'success');
        }}
        onDelete={(id) => {
          onDeleteEquipment(id);
          showToast('הפריט נמחק בהצלחה', undefined, 'info');
        }}
      />

    </div>
  );
};
