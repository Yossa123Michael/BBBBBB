import { useState, useEffect } from 'react';
import {
  Scissors, ShoppingBag, User, CreditCard, Trash2, Plus, Minus,
  Receipt, RefreshCw, Smartphone, DollarSign, Store,
  LayoutDashboard, Calendar, Printer, PackagePlus, LogOut,
  Pencil, Save, Coins, Gift, Wallet, Settings, FileSpreadsheet, Clock, Send
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import PublicBooking from './components/PublicBooking';
import InventoryRestockModal from './components/InventoryRestockModal';
import LoginScreen from './components/LoginScreen';
import CustomerModal, { type CustomerData } from './components/CustomerModal';
import CommissionPayoutModal from './components/CommissionPayoutModal';
import ExpenseModal from './components/ExpenseModal';
import MasterDataModal from './components/MasterDataModal';
import BarberPortal from './components/BarberPortal';
import ExportReportModal from './components/ExportReportModal';
import BarberRosterModal from './components/BarberRosterModal';
import { DiscountSection, type DiscountMeta } from './components/PosCheckout';

import { API_BASE } from './config/api';

interface ServiceItem {
  id: string;
  code: string;
  name: string;
  base_price: string;
  default_commission_percent: string;
}

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  selling_price: string;
  default_commission_percent: string;
  stock_quantity?: number;
}

interface Barber {
  id: string;
  nickname: string;
  level: string;
}

interface CartItem {
  itemType: 'SERVICE' | 'PRODUCT';
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  barberId: string;
  barberName: string;
  commissionRate: number;
}

export default function App() {
  // Sesi Autentikasi RBAC
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('barber_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('barber_auth_user');
      return null;
    }
  });

  // Mode Khusus Portal Pelanggan (Bisa diakses via tombol atau URL ?portal=customer)
  const [isCustomerPortal, setIsCustomerPortal] = useState<boolean>(() => {
    return window.location.pathname === '/booking' || window.location.search.includes('portal=customer');
  });

  // Jika OWNER login langsung buka DASHBOARD, jika KASIR langsung buka POS
  const [currentView, setCurrentView] = useState<'POS' | 'DASHBOARD' | 'BOOKING'>(() => {
    return currentUser?.role === 'OWNER' ? 'DASHBOARD' : 'POS';
  });
  const [activeTab, setActiveTab] = useState<'SERVICE' | 'PRODUCT'>('SERVICE');

  // Tab Khusus Tampilan Layar HP (Mobile Tab Switcher)
  const [mobilePosTab, setMobilePosTab] = useState<'CATALOG' | 'CART' | 'PAYMENT'>('CATALOG');

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'DEBIT'>('QRIS');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<any>(null);

  // Modal Antrean & Riwayat
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [actualCashInput, setActualCashInput] = useState('');
  const [varianceReasonInput, setVarianceReasonInput] = useState('');
  const [shiftSummaryResult, setShiftSummaryResult] = useState<any>(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);

  // CRM State & Barber Notes
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData>({
    id: '99999999-9999-9999-9999-999999999999',
    full_name: 'John Doe',
    phone: '081299887766',
    loyalty_points: 24,
    total_visits: 5,
    haircut_notes: 'Low taper fade, atas dirapikan 1-2 cm pakai teknik scissor over comb, belah samping.',
  });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showMasterModal, setShowMasterModal] = useState(false);

  // Penukaran Poin Loyalitas
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // State Voucher & Diskon Manual Kasir POS
  const [posDiscountTotal, setPosDiscountTotal] = useState<number>(0);
  const [discountMeta, setDiscountMeta] = useState<DiscountMeta>({
    voucherId: null,
    voucherCode: null,
    voucherDiscount: 0,
    manualDiscount: 0,
    discountReason: null,
  });

  const handleLogout = () => {
    localStorage.removeItem('barber_auth_user');
    setCurrentUser(null);
    setCurrentView('POS');
  };

  const [showExportModal, setShowExportModal] = useState(false);

  const fetchCatalog = async () => {
    try {
      const res = await fetch(`${API_BASE}/test-catalog`);
      const data = await res.json();
      if (data.success) {
        setServices(data.data.services);
        setProducts(data.data.products);
        setBarbers(data.data.barbers);
        if (data.data.barbers.length > 0) {
          setSelectedBarber(data.data.barbers[0]);
        }
      }
    } catch (err) {
      console.error('Gagal memuat katalog:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchCatalog();
    }
  }, [currentUser]);

  // Kalkulasi Belanja, Diskon Poin (1 Poin = Rp 1.000), serta Diskon Voucher/Manual
  const POINT_CONVERSION_RATE = 1000;
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const remainingAfterPosDiscount = Math.max(0, subtotal - posDiscountTotal);
  const maxRedeemablePoints = Math.min(
    selectedCustomer.loyalty_points || 0,
    Math.floor(remainingAfterPosDiscount / POINT_CONVERSION_RATE)
  );
  const pointsDiscountAmount = pointsToRedeem * POINT_CONVERSION_RATE;
  const discountAmount = pointsDiscountAmount + posDiscountTotal;
  const totalPayable = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    if (pointsToRedeem > maxRedeemablePoints) {
      setPointsToRedeem(maxRedeemablePoints);
    }
  }, [subtotal, posDiscountTotal, selectedCustomer.loyalty_points, maxRedeemablePoints, pointsToRedeem]);

  const addToCart = (item: ServiceItem | ProductItem, type: 'SERVICE' | 'PRODUCT') => {
    if (!selectedBarber) {
      alert('Pilih Kapster / Barber terlebih dahulu!');
      return;
    }

    const price = Number(type === 'SERVICE' ? (item as ServiceItem).base_price : (item as ProductItem).selling_price);
    const comm = Number(item.default_commission_percent);

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.barberId === selectedBarber.id);
      if (existing) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [
        ...prev,
        {
          itemType: type,
          id: item.id,
          name: item.name,
          unitPrice: price,
          quantity: 1,
          barberId: selectedBarber.id,
          barberName: selectedBarber.nickname,
          commissionRate: comm,
        }
      ];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const item = prev[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter((_, idx) => idx !== index);
      return prev.map((i, idx) => idx === index ? { ...i, quantity: newQty } : i);
    });
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    const payload = {
      outletId: "22222222-2222-2222-2222-222222222222",
      shiftId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      customerId: selectedCustomer.id,
      bookingId: activeBookingId || undefined,
      pointsRedeemed: pointsToRedeem,
      voucherId: discountMeta.voucherId,
      voucherDiscount: discountMeta.voucherDiscount,
      manualDiscount: discountMeta.manualDiscount,
      discountReason: discountMeta.discountReason,
      items: cart.map(i => ({
        itemType: i.itemType,
        id: i.id,
        barberId: i.barberId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        customCommissionRate: i.commissionRate,
      })),
      payment: {
        method: paymentMethod,
        amountPaid: totalPayable,
        referenceNumber: paymentMethod === 'QRIS' ? `QRIS-TRX-${Date.now().toString().slice(-4)}` : undefined
      }
    };

    try {
      const res = await fetch(`${API_BASE}/pos/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success) {
        setSuccessReceipt({
          ...result.data,
          items: [...cart],
          customerName: selectedCustomer.full_name,
          customerPhone: selectedCustomer.phone,
          subtotal: subtotal,
          discountAmount: discountAmount,
          pointsDiscountAmount: pointsDiscountAmount,
          posDiscountTotal: posDiscountTotal,
          discountReason: discountMeta.discountReason,
          pointsRedeemed: pointsToRedeem,
          grandTotal: totalPayable,
          date: new Date().toLocaleTimeString('id-ID')
        });

        setSelectedCustomer(prev => ({
          ...prev,
          loyalty_points: Math.max(0, (prev.loyalty_points || 0) - pointsToRedeem) + (result.data.pointsEarned || 0),
          total_visits: (prev.total_visits || 0) + 1
        }));

        setCart([]);
        setPointsToRedeem(0);
        setPosDiscountTotal(0);
        setDiscountMeta({
          voucherId: null,
          voucherCode: null,
          voucherDiscount: 0,
          manualDiscount: 0,
          discountReason: null,
        });
        setActiveBookingId(null);
      } else {
        alert('Gagal checkout: ' + result.message);
      }
    } catch (err: any) {
      alert('Error checkout: ' + err.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const fetchActiveBookings = async () => {
    try {
      const res = await fetch(`${API_BASE}/bookings/active?outletId=22222222-2222-2222-2222-222222222222`);
      const result = await res.json();
      if (result.success) {
        setActiveBookings(result.data);
      }
    } catch (err) {
      console.error('Gagal mengambil data booking:', err);
    }
  };

  const handleCheckInBooking = (booking: any) => {
    const selectedB = barbers.find(b => b.id === booking.barber_id) || barbers[0];
    setSelectedBarber(selectedB);
    setActiveBookingId(booking.id);

    setSelectedCustomer(prev => ({
      ...prev,
      id: booking.customer_id || prev.id,
      full_name: booking.customer_name || prev.full_name,
      phone: booking.customer_phone || prev.phone,
    }));

    setCart([
      {
        itemType: 'SERVICE',
        id: booking.service_id,
        name: booking.service_name,
        unitPrice: Number(booking.base_price),
        quantity: 1,
        barberId: booking.barber_id,
        barberName: booking.barber_name,
        commissionRate: Number(booking.default_commission_percent),
      }
    ]);

    setShowQueueModal(false);
    setMobilePosTab('CART');
  };

  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/shifts/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualCash: Number(actualCashInput),
          varianceReason: varianceReasonInput || undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setShiftSummaryResult(result.data);
      } else {
        alert('Gagal tutup shift: ' + result.message);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleOpenShift = async () => {
    try {
      const res = await fetch(`${API_BASE}/shifts/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' })
      });
      const data = await res.json();
      if (data.success) {
        alert('Shift kasir aktif kembali!');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleSendReceiptWA = async (transactionId?: string, defaultPhone?: string) => {
  if (!transactionId) {
    alert('ID Transaksi tidak ditemukan.');
    return;
  }

  const targetPhone = prompt(
    'Masukkan nomor WhatsApp pelanggan:',
    defaultPhone && defaultPhone !== '-' ? defaultPhone : ''
  );
  if (!targetPhone || !targetPhone.trim()) return;

  try {
    const res = await fetch(`${API_BASE}/master/pos/send-receipt-wa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId,
        customerPhone: targetPhone.trim(),
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert('Struk WhatsApp berhasil dikirim ke ' + targetPhone);
    } else {
      alert('Gagal mengirim struk WA: ' + data.message);
    }
  } catch (err: any) {
    alert('Error kirim WA: ' + err.message);
  }
};

  const fetchRecentTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE}/pos/transactions?outletId=22222222-2222-2222-2222-222222222222`);
      const data = await res.json();
      if (data.success) {
        setRecentTransactions(data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil riwayat transaksi:', err);
    }
  };

  const handleVoidTransaction = async (trxId: string, invoiceNumber: string) => {
    const reason = prompt(`Konfirmasi VOID transaksi ${invoiceNumber}.\nMasukkan alasan:`);
    if (!reason) return;

    try {
      const res = await fetch(`${API_BASE}/pos/transactions/${trxId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        fetchRecentTransactions();
      } else {
        alert('Gagal void: ' + result.message);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleSaveNotes = async () => {
    try {
      const res = await fetch(`${API_BASE}/customers/${selectedCustomer.id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ haircutNotes: noteDraft })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedCustomer(prev => ({ ...prev, haircut_notes: noteDraft }));
        setIsEditingNotes(false);
      } else {
        alert('Gagal memperbarui catatan: ' + data.message);
      }
    } catch (err: any) {
      alert('Error simpan catatan: ' + err.message);
    }
  };

  const [showRosterModal, setShowRosterModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // 1. Jika dibuka sebagai Portal Pelanggan (Customer), tampilkan khusus halaman Booking
  if (isCustomerPortal) {
    return (
      <PublicBooking
        onBack={() => {
          setIsCustomerPortal(false);
          window.history.replaceState({}, '', '/');
        }}
        onOpenAuth={(mode) => {
          setAuthInitialMode(mode);
          setIsCustomerPortal(false);
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  }

  // 2. Guard Layar Login (Gaya Spotify: Daftar | Masuk + Auto-Detect Role)
  if (!currentUser) {
    return (
      <LoginScreen
        initialMode={authInitialMode}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentView(user.role === 'OWNER' ? 'DASHBOARD' : 'POS');
        }}
        onOpenCustomerPortal={() => {
          setIsCustomerPortal(true);
          window.history.replaceState({}, '', '/?portal=customer');
        }}
      />
    );
  }

  // Jika yang login adalah Kapster/Barber, alihkan langsung ke portal kapster
  if (currentUser.role === 'BARBER') {
    return <BarberPortal currentUser={currentUser} onLogout={handleLogout} />;
  }

  // Jika yang login adalah Pelanggan (Customer), alihkan ke Portal Member & Booking Online
  if (currentUser.role === 'CUSTOMER') {
    return <PublicBooking currentUser={currentUser} onLogout={handleLogout} />;
  }

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans select-none">
      {/* ================= TOP NAVIGATION BAR (RESPONSIF MOBILE & DESKTOP) ================= */}
      <header className="min-h-12 border-b border-zinc-800 bg-zinc-900/90 px-3 py-2 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 select-none shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none pb-1 sm:pb-0">
          <span className="font-black tracking-wider text-gold-400 text-xs sm:text-sm flex items-center gap-1 shrink-0 mr-1">
            💈 BARBERSHOP<span className="text-zinc-400">OS</span>
          </span>
          <span className="text-zinc-700 hidden sm:inline">|</span>

          <button
            onClick={() => setCurrentView('POS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
              currentView === 'POS' ? 'bg-gold-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" /> Kasir POS
          </button>

          {currentUser.role === 'OWNER' && (
            <button
              onClick={() => setCurrentView('DASHBOARD')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                currentView === 'DASHBOARD' ? 'bg-gold-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </button>
          )}

          {currentUser.role === 'OWNER' && (
            <button
              onClick={() => setShowMasterModal(true)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 shrink-0"
            >
              <Settings className="w-3.5 h-3.5 text-gold-400" /> Master Data
            </button>
          )}

          {currentUser.role === 'OWNER' && (
            <button
              onClick={() => setShowExportModal(true)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Ekspor Excel
            </button>
          )}

          <button
            onClick={() => setShowRosterModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 shrink-0"
          >
            <Clock className="w-3.5 h-3.5 text-gold-400" /> Jadwal Barber
          </button>

          <button
            onClick={() => setCurrentView('BOOKING')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
              currentView === 'BOOKING' ? 'bg-gold-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Booking Klien
          </button>

          <button
            onClick={() => { fetchActiveBookings(); setShowQueueModal(true); }}
            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 shrink-0"
          >
            <Receipt className="w-3.5 h-3.5 text-gold-400" /> Antrean
          </button>

          <button
            onClick={() => { fetchRecentTransactions(); setShowHistoryModal(true); }}
            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 shrink-0"
          >
            <Receipt className="w-3.5 h-3.5 text-gold-400" /> Riwayat
          </button>

          <button
            onClick={() => setShowRestockModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 shrink-0"
          >
            <PackagePlus className="w-3.5 h-3.5 text-gold-400" /> Restock
          </button>

          <button
            onClick={() => setShowCommissionModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 shrink-0"
          >
            <Coins className="w-3.5 h-3.5 text-gold-400" /> Komisi
          </button>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 shrink-0"
          >
            <Wallet className="w-3.5 h-3.5 text-gold-400" /> Beban
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setShiftSummaryResult(null); setShowCloseShiftModal(true); }}
              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
            >
              Closing
            </button>
            <button
              onClick={handleOpenShift}
              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
            >
              Buka Shift
            </button>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
            <div className="text-right">
              <div className="text-[11px] font-bold text-zinc-200 leading-tight">{currentUser.name}</div>
              <div className="text-[9px] font-mono text-gold-400 uppercase leading-none">{currentUser.role}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar"
              className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ================= CONTENT ROUTER ================= */}
      {currentView === 'DASHBOARD' && currentUser.role === 'OWNER' ? (
        <Dashboard />
      ) : currentView === 'BOOKING' ? (
        <PublicBooking onBack={() => setCurrentView('POS')} />
      ) : (
        /* KASIR POS CONTAINER */
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">

          {/* KOLOM 1: KATALOG (RESPONSIF MOBILE/DESKTOP) */}
          <div className={`w-full lg:w-[40%] flex-col border-r border-zinc-800/80 bg-zinc-900/40 flex-1 overflow-hidden ${
            mobilePosTab === 'CATALOG' ? 'flex' : 'hidden lg:flex'
          }`}>
            <div className="p-3 border-b border-zinc-800 bg-zinc-900/90 flex justify-between items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <Store className="w-4 h-4 text-gold-500" />
                <span className="font-bold text-xs tracking-wide">CABANG MAKASSAR</span>
              </div>
              <div className="flex items-center gap-1 bg-zinc-800/90 px-2 py-1 rounded-lg border border-zinc-700">
                <User className="w-3.5 h-3.5 text-gold-400" />
                <select
                  className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
                  value={selectedBarber?.id || ''}
                  onChange={(e) => setSelectedBarber(barbers.find(b => b.id === e.target.value) || null)}
                >
                  {barbers.map(b => (
                    <option key={b.id} value={b.id} className="bg-zinc-800 text-zinc-100">
                      {b.nickname} ({b.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex border-b border-zinc-800 bg-zinc-950/60 p-2 gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('SERVICE')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'SERVICE' ? 'bg-gold-500 text-zinc-950 shadow-md shadow-gold-500/20' : 'text-zinc-400 hover:bg-zinc-800/50'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" /> LAYANAN
              </button>
              <button
                onClick={() => setActiveTab('PRODUCT')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'PRODUCT' ? 'bg-gold-500 text-zinc-950 shadow-md shadow-gold-500/20' : 'text-zinc-400 hover:bg-zinc-800/50'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" /> PRODUK
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2.5 content-start">
              {activeTab === 'SERVICE' ? (
                services.map(srv => (
                  <div
                    key={srv.id}
                    onClick={() => addToCart(srv, 'SERVICE')}
                    className="p-3 bg-zinc-900 border border-zinc-800/80 hover:border-gold-500/60 rounded-xl cursor-pointer transition-all active:scale-95 group shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">{srv.code}</span>
                      <h4 className="font-bold text-xs sm:text-sm text-zinc-100 group-hover:text-gold-400 transition-colors mt-0.5 leading-snug">{srv.name}</h4>
                    </div>
                    <div className="mt-3 flex justify-between items-end">
                      <span className="text-xs sm:text-sm font-bold text-gold-500">Rp {Number(srv.base_price).toLocaleString('id-ID')}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">Kms: {srv.default_commission_percent}%</span>
                    </div>
                  </div>
                ))
              ) : (
                products.map(prd => {
                  const isOutOfStock = Number(prd.stock_quantity || 0) <= 0;
                  return (
                    <div
                      key={prd.id}
                      onClick={() => {
                        if (isOutOfStock) {
                          alert('Stok produk ini habis!');
                          return;
                        }
                        addToCart(prd, 'PRODUCT');
                      }}
                      className={`p-3 bg-zinc-900 border rounded-xl cursor-pointer transition-all active:scale-95 group shadow-sm flex flex-col justify-between ${
                        isOutOfStock
                          ? 'border-red-900/40 opacity-60 cursor-not-allowed'
                          : 'border-zinc-800/80 hover:border-gold-500/60'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">{prd.sku}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                            isOutOfStock ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-zinc-800 text-emerald-400'
                          }`}>
                            {isOutOfStock ? 'Habis' : `Stok: ${prd.stock_quantity}`}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-zinc-100 group-hover:text-gold-400 transition-colors mt-0.5 leading-snug">
                          {prd.name}
                        </h4>
                      </div>
                      <div className="mt-3 flex justify-between items-end">
                        <span className="text-xs sm:text-sm font-bold text-gold-500">
                          Rp {Number(prd.selling_price).toLocaleString('id-ID')}
                        </span>
                        <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                          Kms: {prd.default_commission_percent}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* KOLOM 2: ORDER & TICKET (RESPONSIF MOBILE/DESKTOP) */}
          <div className={`w-full lg:w-[35%] flex-col border-r border-zinc-800/80 bg-zinc-950 flex-1 overflow-hidden ${
            mobilePosTab === 'CART' ? 'flex' : 'hidden lg:flex'
          }`}>
            <div className="p-3 border-b border-zinc-800 bg-zinc-900/60 space-y-2 shrink-0">
              <div className="flex justify-between items-center">
                <div
                  onClick={() => setShowCustomerModal(true)}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center font-bold text-xs border border-gold-500/30">
                    {selectedCustomer.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-zinc-100">{selectedCustomer.full_name}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-gold-500/10 text-gold-400 font-mono">
                        {selectedCustomer.loyalty_points} Pts
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">{selectedCustomer.phone}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="text-[10px] px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
                  >
                    Ganti
                  </button>
                  <button
                    onClick={() => setCart([])}
                    className="p-1 text-zinc-400 hover:text-red-400 rounded"
                    title="Reset Keranjang"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Barber Notes Card */}
              <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-[11px]">
                <div className="flex justify-between items-center text-zinc-400 mb-1">
                  <span className="font-bold uppercase tracking-wider text-[9px] text-gold-400">✂️ Barber Notes</span>
                  {isEditingNotes ? (
                    <button onClick={handleSaveNotes} className="text-emerald-400 font-bold hover:underline flex items-center gap-1 text-[10px]">
                      <Save className="w-3 h-3" /> Simpan
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setNoteDraft(selectedCustomer.haircut_notes || '');
                        setIsEditingNotes(true);
                      }}
                      className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 text-[10px]"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  )}
                </div>

                {isEditingNotes ? (
                  <textarea
                    rows={2}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-[11px] text-zinc-200 focus:outline-none focus:border-gold-500"
                    placeholder="Preferensi cukur..."
                  />
                ) : (
                  <p className="text-zinc-300 italic text-[11px] line-clamp-2">
                    {selectedCustomer.haircut_notes || 'Belum ada catatan preferensi.'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-2 py-12">
                  <Receipt className="w-8 h-8 opacity-30" />
                  <p className="text-xs font-medium">Keranjang masih kosong</p>
                  <p className="text-[10px] text-zinc-400">Pilih item dari katalog</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-xl flex justify-between items-center">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-200 truncate">{item.name}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-gold-400 shrink-0">
                          {item.barberName}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-gold-500 mt-0.5">
                        Rp {(item.unitPrice * item.quantity).toLocaleString('id-ID')}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateQuantity(idx, -1)}
                        className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-4 text-center text-xs font-bold font-mono">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(idx, 1)}
                        className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Tombol Pintas Tambah Produk & Layanan di Mobile */}
              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setActiveTab('PRODUCT'); setMobilePosTab('CATALOG'); }}
                  className="py-2.5 px-2 bg-zinc-900 border border-dashed border-gold-500/50 hover:border-gold-500 text-gold-400 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> + Tambah Produk
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('SERVICE'); setMobilePosTab('CATALOG'); }}
                  className="py-2.5 px-2 bg-zinc-900 border border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Scissors className="w-3.5 h-3.5" /> + Layanan Lain
                </button>
              </div>
            </div>

            {/* Mobile Helper: Tombol Lanjut ke Bayar */}
            <div className="lg:hidden p-3 border-t border-zinc-800 bg-zinc-950 shrink-0">
              <button
                onClick={() => setMobilePosTab('PAYMENT')}
                disabled={cart.length === 0}
                className="w-full py-3 bg-gold-500 hover:bg-gold-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black text-xs rounded-xl flex justify-between px-4 items-center active:scale-95 shadow-lg shadow-gold-500/20"
              >
                <span>LANJUT PEMBAYARAN</span>
                <span>Rp {totalPayable.toLocaleString('id-ID')} →</span>
              </button>
            </div>
          </div>

          {/* KOLOM 3: PAYMENT & TENDER (RESPONSIF MOBILE/DESKTOP) */}
          <div className={`w-full lg:w-[25%] flex-col justify-between p-4 lg:p-5 bg-zinc-900/50 flex-1 overflow-y-auto ${
            mobilePosTab === 'PAYMENT' ? 'flex' : 'hidden lg:flex'
          }`}>
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Rincian Pembayaran</h3>

              {/* CRM Points Box */}
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-gold-400" /> Tukar Poin Member
                  </span>
                  <span className="text-[11px] font-mono text-gold-400 font-bold">
                    {selectedCustomer.loyalty_points} Pts
                  </span>
                </div>

                {selectedCustomer.loyalty_points > 0 && subtotal > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={maxRedeemablePoints}
                        value={pointsToRedeem}
                        onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                        className="w-full accent-gold-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                      />
                      <span className="font-mono text-xs font-bold text-gold-400 w-12 text-right">
                        {pointsToRedeem} Pts
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>1 Pts = Rp 1.000</span>
                      <button
                        type="button"
                        onClick={() => setPointsToRedeem(pointsToRedeem === maxRedeemablePoints ? 0 : maxRedeemablePoints)}
                        className="text-gold-400 font-semibold hover:underline"
                      >
                        {pointsToRedeem === maxRedeemablePoints ? 'Batal' : 'Gunakan Maks'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-zinc-500">
                    {subtotal === 0 ? 'Pilih pesanan untuk menukar poin' : 'Belum memiliki poin loyalitas'}
                  </div>
                )}
              </div>

              {/* Komponen Voucher & Diskon Manual Kasir */}
              <DiscountSection
                subtotal={subtotal}
                onDiscountChange={(totalDisc, meta) => {
                  setPosDiscountTotal(totalDisc);
                  setDiscountMeta(meta);
                }}
              />

              {/* Subtotal & Tagihan */}
              <div className="space-y-1.5 text-xs border-b border-zinc-800 pb-3 pt-1">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span className="font-semibold text-zinc-200">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                {pointsDiscountAmount > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>Diskon Poin ({pointsToRedeem} Pts)</span>
                    <span className="font-semibold text-emerald-400">
                      -Rp {pointsDiscountAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
                {posDiscountTotal > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span className="truncate pr-2">
                      Diskon {discountMeta.discountReason ? `(${discountMeta.discountReason})` : 'Kasir'}
                    </span>
                    <span className="font-semibold text-emerald-400 shrink-0">
                      -Rp {posDiscountTotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-400">
                  <span>Pajak (0%)</span>
                  <span className="font-semibold text-zinc-200">Rp 0</span>
                </div>
              </div>

              <div className="py-1.5">
                <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">TOTAL TAGIHAN</div>
                <div className="text-2xl font-black text-gold-400 tracking-tight mt-0.5 font-mono">
                  Rp {totalPayable.toLocaleString('id-ID')}
                </div>
              </div>

              {/* Metode Pembayaran */}
              <div className="space-y-2 pb-3">
                <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Metode Bayar</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('QRIS')}
                    className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                      paymentMethod === 'QRIS'
                        ? 'bg-gold-500/20 border-gold-500 text-gold-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" /> QRIS
                  </button>
                  <button
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                      paymentMethod === 'CASH'
                        ? 'bg-gold-500/20 border-gold-500 text-gold-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" /> TUNAI
                  </button>
                  <button
                    onClick={() => setPaymentMethod('DEBIT')}
                    className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                      paymentMethod === 'DEBIT'
                        ? 'bg-gold-500/20 border-gold-500 text-gold-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" /> KARTU
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isCheckingOut}
              className={`w-full py-3.5 rounded-xl font-black text-xs tracking-wide flex items-center justify-center gap-2 transition-all shrink-0 ${
                cart.length === 0 || isCheckingOut
                  ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed'
                  : 'bg-gold-500 hover:bg-gold-400 text-zinc-950 active:scale-[0.98] shadow-lg shadow-gold-500/20'
              }`}
            >
              {isCheckingOut ? <RefreshCw className="w-4 h-4 animate-spin" /> : <>PROSES PEMBAYARAN</>}
            </button>
          </div>

          {/* ================= BOTTOM BAR KHUSUS MOBILE (< lg) ================= */}
          <div className="lg:hidden border-t border-zinc-800 bg-zinc-950 px-2 py-2 flex justify-around items-center z-30 shrink-0">
            <button
              onClick={() => setMobilePosTab('CATALOG')}
              className={`flex-1 py-1.5 flex flex-col items-center gap-1 text-[10px] font-bold rounded-xl transition-all ${
                mobilePosTab === 'CATALOG' ? 'text-gold-400 bg-gold-500/10' : 'text-zinc-400'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>1. Katalog</span>
            </button>

            <button
              onClick={() => setMobilePosTab('CART')}
              className={`flex-1 py-1.5 flex flex-col items-center gap-1 text-[10px] font-bold rounded-xl transition-all relative ${
                mobilePosTab === 'CART' ? 'text-gold-400 bg-gold-500/10' : 'text-zinc-400'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>2. Tiket</span>
              {cart.length > 0 && (
                <span className="absolute top-0 right-4 bg-gold-500 text-zinc-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobilePosTab('PAYMENT')}
              className={`flex-1 py-1.5 flex flex-col items-center gap-1 text-[10px] font-bold rounded-xl transition-all ${
                mobilePosTab === 'PAYMENT' ? 'text-gold-400 bg-gold-500/10' : 'text-zinc-400'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>3. Bayar</span>
            </button>
          </div>

        </div>
      )}

      {/* ================= MODAL STRUK DENGAN THERMAL PRINT ================= */}
      {successReceipt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl">
            <div
              id="thermal-receipt"
              className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-2 select-text"
            >
              <div className="text-center pb-2 border-b border-dashed border-zinc-700">
                <div className="font-bold text-sm text-zinc-100 uppercase">BARBERSHOP OS</div>
                <div className="text-[10px] text-zinc-400">Jl. Penghibur No. 88, Makassar</div>
              </div>

              <div className="text-[10px] text-zinc-400 border-b border-dashed border-zinc-700 pb-2 space-y-0.5">
                <div className="flex justify-between">
                  <span>No: {successReceipt.invoiceNumber}</span>
                  <span>{successReceipt.date || new Date().toLocaleTimeString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir: {currentUser.name}</span>
                  <span>Cust: {successReceipt.customerName}</span>
                </div>
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-zinc-700">
                {successReceipt.items?.map((item: any, idx: number) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-zinc-200 truncate">{item.name}</div>
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>{item.quantity}x @{Number(item.unitPrice).toLocaleString('id-ID')}</span>
                      <span className="font-bold text-zinc-100">
                        Rp {(item.quantity * item.unitPrice).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-[11px] pt-1 border-b border-dashed border-zinc-700 pb-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal:</span>
                  <span>Rp {Number(successReceipt.subtotal || successReceipt.grandTotal).toLocaleString('id-ID')}</span>
                </div>
                {Number(successReceipt.pointsDiscountAmount) > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Diskon Poin ({successReceipt.pointsRedeemed} Pts):</span>
                    <span>-Rp {Number(successReceipt.pointsDiscountAmount).toLocaleString('id-ID')}</span>
                  </div>
                )}
                {Number(successReceipt.posDiscountTotal) > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span className="truncate pr-2">
                      Diskon {successReceipt.discountReason ? `(${successReceipt.discountReason})` : ''}:
                    </span>
                    <span>-Rp {Number(successReceipt.posDiscountTotal).toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-zinc-100 text-xs pt-1 border-t border-dashed border-zinc-800">
                  <span>TOTAL:</span>
                  <span>Rp {Number(successReceipt.grandTotal).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>Metode:</span>
                  <span>{paymentMethod}</span>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>Poin Didapat:</span>
                  <span>+{successReceipt.pointsEarned || 0} Pts</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 bg-gold-500 hover:bg-gold-400 text-zinc-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-gold-500/20 active:scale-95"
              >
                <Printer className="w-4 h-4" /> Cetak
              </button>
              <button
              onClick={() => handleSendReceiptWA(successReceipt.transactionId, successReceipt.customerPhone)}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" /> Kirim WA
            </button>
              <button
                onClick={() => { setSuccessReceipt(null); setMobilePosTab('CATALOG'); }}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-bold text-xs"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL ANTREAN RESERVASI (GRUP PER HARI) ================= */}
      {showQueueModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header Modal */}
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/90">
              <div>
                <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gold-500" /> Jadwal Antrean Reservasi
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Jadwal booking hari ini hingga 7 hari ke depan</p>
              </div>
              <button
                onClick={() => setShowQueueModal(false)}
                className="px-2.5 py-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg text-xs font-mono"
              >
                ✕ Tutup
              </button>
            </div>

            {/* List Antrean Dikelompokkan Per Hari */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeBookings.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  <Calendar className="w-8 h-8 opacity-30 mx-auto mb-2" />
                  Tidak ada jadwal booking aktif untuk 7 hari ke depan.
                </div>
              ) : (
                (() => {
                  const grouped: { [key: string]: typeof activeBookings } = {};
                  activeBookings.forEach((b) => {
                    const dateKey = (b.booking_date || '').toString().slice(0, 10);
                    if (!grouped[dateKey]) grouped[dateKey] = [];
                    grouped[dateKey].push(b);
                  });

                  return Object.keys(grouped).map((dateStr) => {
                    const d = new Date(dateStr + 'T00:00:00');
                    const isToday = new Date().toISOString().slice(0, 10) === dateStr;

                    const dayLabel = d.toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });

                    return (
                      <div key={dateStr} className="space-y-2">
                        {/* Header Grup Tanggal */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            isToday
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-gold-500/10 text-gold-400 border-gold-500/30'
                          }`}>
                            {isToday ? 'Hari Ini' : 'Mendatang'}
                          </span>
                          <span className="text-xs font-bold text-zinc-300 font-mono">
                            {dayLabel}
                          </span>
                        </div>

                        {/* Kartu Booking dalam Tanggal Tersebut */}
                        <div className="space-y-2 pl-1 border-l-2 border-zinc-800 ml-2">
                          {grouped[dateStr].map((b) => (
                            <div
                              key={b.id}
                              className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/90 flex justify-between items-center ml-2 shadow-sm"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-zinc-200">{b.customer_name}</span>
                                  <span className="text-[9px] font-mono text-gold-400 bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800">
                                    {b.booking_code}
                                  </span>
                                </div>
                                <div className="text-[11px] text-zinc-400">
                                  {b.service_name} • <span className="text-zinc-300 font-medium">{b.barber_name}</span>
                                </div>
                                <div className="text-[10px] text-gold-500 font-mono">
                                  ⏰ {b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)} WITA
                                </div>
                              </div>

                              <button
                                onClick={() => handleCheckInBooking(b)}
                                className="px-3 py-1.5 bg-gold-500 hover:bg-gold-400 active:scale-95 text-zinc-950 text-xs font-black rounded-lg shadow-md shadow-gold-500/20"
                              >
                                CHECK-IN
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL RIWAYAT TRANSAKSI & VOID ================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-zinc-100">Riwayat Penjualan Kasir</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-zinc-400 text-xs font-mono">✕ Tutup</button>
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-[10px] uppercase">
                    <th className="pb-2">Invoice</th>
                    <th className="pb-2">Pelanggan</th>
                    <th className="pb-2">Total</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                  {recentTransactions.map((trx) => (
                    <tr key={trx.id}>
                      <td className="py-2 text-gold-400 font-bold">{trx.invoice_number}</td>
                      <td className="py-2 text-zinc-300 font-sans">{trx.customer_name}</td>
                      <td className="py-2 text-zinc-100 font-bold">Rp {Number(trx.grand_total).toLocaleString('id-ID')}</td>
                      <td className="py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          (trx.status === 'PAID' || trx.status === 'COMPLETED') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>{trx.status}</span>
                      </td>
                      <td className="py-2 text-right space-x-1.5">
                      {(trx.status === 'PAID' || trx.status === 'COMPLETED') && (
                        <>
                          <button
                            onClick={() => handleSendReceiptWA(trx.id, trx.customer_phone)}
                            className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold"
                            title="Kirim Struk WhatsApp"
                          >
                            WA
                          </button>
                          <button
                            onClick={() => handleVoidTransaction(trx.id, trx.invoice_number)}
                            className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-[10px] font-bold"
                          >
                            Void
                          </button>
                        </>
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

      {/* ================= MODAL CLOSING SHIFT ================= */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-zinc-100">Rekonsiliasi Kas (Closing)</h3>
              <button onClick={() => setShowCloseShiftModal(false)} className="text-zinc-400 text-xs font-mono">✕ Tutup</button>
            </div>
            {shiftSummaryResult ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1.5">
                  <div className="flex justify-between text-zinc-400"><span>Kas Awal:</span><span>Rp {shiftSummaryResult.reconciliation.openingCash.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-zinc-400"><span>Sales Tunai:</span><span>Rp {shiftSummaryResult.reconciliation.cashSales.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between border-t border-zinc-800 pt-1 font-bold text-zinc-200"><span>Target:</span><span>Rp {shiftSummaryResult.reconciliation.expectedCash.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between font-bold text-gold-400"><span>Fisik:</span><span>Rp {shiftSummaryResult.reconciliation.actualCash.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between border-t border-zinc-800 pt-1 font-bold"><span>Selisih:</span><span className={shiftSummaryResult.reconciliation.variance === 0 ? 'text-emerald-400' : 'text-red-400'}>Rp {shiftSummaryResult.reconciliation.variance.toLocaleString('id-ID')}</span></div>
                </div>
                <button onClick={() => setShowCloseShiftModal(false)} className="w-full py-2.5 bg-zinc-800 text-zinc-200 rounded-xl font-bold text-xs">Selesai</button>
              </div>
            ) : (
              <form onSubmit={handleCloseShiftSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Uang Tunai Fisik di Laci</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 1000000"
                    value={actualCashInput}
                    onChange={(e) => setActualCashInput(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Alasan Selisih (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Jika ada selisih"
                    value={varianceReasonInput}
                    onChange={(e) => setVarianceReasonInput(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100"
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-red-500 text-zinc-950 font-black text-xs rounded-xl">KUNCI & TUTUP SHIFT</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Auxiliaries */}
      <InventoryRestockModal isOpen={showRestockModal} onClose={() => setShowRestockModal(false)} onSuccess={() => fetchCatalog()} />
      <CustomerModal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} onSelectCustomer={(c) => setSelectedCustomer(c)} />
      <CommissionPayoutModal isOpen={showCommissionModal} onClose={() => setShowCommissionModal(false)} currentUser={currentUser} />
      <ExpenseModal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} currentUser={currentUser} />
      <MasterDataModal isOpen={showMasterModal} onClose={() => setShowMasterModal(false)} onUpdated={() => fetchCatalog()} />
      <ExportReportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
      <BarberRosterModal isOpen={showRosterModal} onClose={() => setShowRosterModal(false)} barbers={barbers} />
    </div>
  );
}