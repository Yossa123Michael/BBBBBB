import { useState, useEffect, useRef } from 'react';
import {
  Home,
  Scissors,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  LogOut,
  Award,
  Clock,
  CreditCard,
  XCircle,
  Lock,
  Gift,
  Minus,
  Plus,
  MapPin,
  ShoppingBag,
  Ticket,
  History,
  Headphones,
  Copy,
  Check,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Store,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api/v1`;

interface Service {
  id: string;
  name: string;
  base_price: number;
  duration_minutes?: number;
  description?: string;
}

interface Product {
  id: string;
  sku?: string;
  name: string;
  selling_price: number;
}

interface Barber {
  id: string;
  nickname: string;
  level: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

interface OutletOption {
  id: string;
  shortName: string;
  name: string;
  address: string;
  csPhone: string;
}

interface PaymentChannel {
  id: string;
  label: string;
  type: 'QR' | 'VA';
  bankName: string;
  vaPrefix?: string;
}

const OUTLET_BRANCHES: OutletOption[] = [
  {
    id: '22222222-2222-2222-2222-222222222222',
    shortName: 'Makassar — Pantai Losari',
    name: 'Cabang Makassar — Pantai Losari',
    address: 'Jl. Penghibur No. 88, Makassar',
    csPhone: '6281299887766',
  },
  {
    id: '22222222-2222-2222-2222-222222222223',
    shortName: 'Jakarta Selatan — Pondok Indah',
    name: 'Cabang Jakarta Selatan — Pondok Indah',
    address: 'Jl. Metro Pondok Indah Blok BA No. 12, Jakarta Selatan',
    csPhone: '6281299887766',
  },
  {
    id: '22222222-2222-2222-2222-222222222224',
    shortName: 'Jakarta Barat — Kebon Jeruk',
    name: 'Cabang Jakarta Barat — Kebon Jeruk',
    address: 'Jl. Arjuna Utara No. 9, Kebon Jeruk, Jakarta Barat',
    csPhone: '6281299887766',
  },
];

const PAYMENT_CHANNELS: PaymentChannel[] = [
  { id: 'QRIS', label: 'QRIS Instan', type: 'QR', bankName: 'QRIS Nasional (Semua E-Wallet & M-Banking)' },
  { id: 'VA_BCA', label: 'BCA Virtual Account', type: 'VA', bankName: 'Bank Central Asia (BCA)', vaPrefix: '88010' },
  { id: 'VA_MANDIRI', label: 'Mandiri VA', type: 'VA', bankName: 'Bank Mandiri (Livin)', vaPrefix: '89022' },
  { id: 'VA_BRI', label: 'BRI Virtual Account', type: 'VA', bankName: 'Bank Rakyat Indonesia (BRIVA)', vaPrefix: '77088' },
  { id: 'EWALLET', label: 'GoPay / OVO / DANA', type: 'VA', bankName: 'Transfer E-Wallet / Top-Up VA', vaPrefix: '08991' },
];

const PROMO_VOUCHERS = [
  {
    code: 'HEMAT20K',
    title: 'Potongan Langsung Rp 20.000',
    subtitle: 'Minimal transaksi Rp 50.000 untuk semua treatment & produk',
    badge: 'HEMAT 20K',
  },
  {
    code: 'DISKON10',
    title: 'Diskon 10% s/d Rp 15.000',
    subtitle: 'Minimal transaksi Rp 30.000, berlaku di seluruh cabang',
    badge: 'DISC 10%',
  },
];

interface Props {
  onBack?: () => void;
  customerUser?: any;
  onLogout?: () => void;
  onOpenAuth?: (mode: 'LOGIN' | 'REGISTER') => void;
}

export default function PublicBooking({ customerUser, onLogout, onOpenAuth }: Props) {
  // 1. STATE NAVIGASI BOTTOM BAR (BERANDA, PESAN, PROFIL)
  const [activeTab, setActiveTab] = useState<'HOME' | 'ORDER' | 'PROFILE'>('HOME');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'ACTIVE' | 'DONE'>('ALL');
  const [selectedOutlet, setSelectedOutlet] = useState<OutletOption>(OUTLET_BRANCHES[0]);
  const [showOutletModal, setShowOutletModal] = useState<boolean>(false);
  const [showVoucherModal, setShowVoucherModal] = useState<boolean>(false);
  const [showCSModal, setShowCSModal] = useState<boolean>(false);
  const [copiedPromoCode, setCopiedPromoCode] = useState<string | null>(null);

  // State Katalog & Seleksi
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [productCart, setProductCart] = useState<Record<string, number>>({});
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [barberOffNotice, setBarberOffNotice] = useState<string | null>(null);

  // State Profil & Poin Member
  const [customerName, setCustomerName] = useState<string>(
    String(customerUser?.name || customerUser?.full_name || '')
  );
  const [customerPhone, setCustomerPhone] = useState<string>(
    String(customerUser?.phone || '')
  );
  const [haircutNotes, setHaircutNotes] = useState<string>(
    String(customerUser?.haircut_notes || '')
  );
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(
    Number(customerUser?.loyalty_points || 0)
  );

  // State Pembayaran 10 Menit, Voucher, & Poin
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState<boolean>(false);
  const [pendingBooking, setPendingBooking] = useState<any>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);
  const [paymentMethod, setPaymentMethod] = useState<string>('QRIS');
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // State Voucher Promo
  const [voucherInput, setVoucherInput] = useState<string>('');
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [voucherMsg, setVoucherMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isCheckingVoucher, setIsCheckingVoucher] = useState<boolean>(false);

  // State Copy Nomor VA & Riwayat
  const [copiedVA, setCopiedVA] = useState<boolean>(false);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [expiredNotice, setExpiredNotice] = useState<string | null>(null);
  const [bookingSuccessData, setBookingSuccessData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const slotRollRef = useRef<HTMLDivElement | null>(null);
  const productsSectionRef = useRef<HTMLDivElement | null>(null);
  const topScrollRef = useRef<HTMLDivElement | null>(null);

  // Sinkronisasi Profil & Poin Member
  const syncMemberProfile = async () => {
    if (!customerUser?.id) return;
    try {
      const res = await fetch(`${API_BASE}/auth/customer/profile?id=${customerUser.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setLoyaltyPoints(Number(json.data.loyalty_points || 0));
        if (json.data.name) setCustomerName(String(json.data.name));
        if (json.data.phone) setCustomerPhone(String(json.data.phone));
        if (json.data.haircut_notes) setHaircutNotes(String(json.data.haircut_notes));
        localStorage.setItem(
          'barber_auth_user',
          JSON.stringify({ ...customerUser, ...json.data })
        );
      }
    } catch (err) {
      console.error('Sync profile error:', err);
    }
  };

  // Ambil Riwayat Pemesanan Pelanggan
  const fetchCustomerHistory = async () => {
    if (!customerUser?.id) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/bookings/customer-history?customerId=${customerUser.id}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBookingHistory(json.data);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!customerUser) {
      setLoyaltyPoints(0);
      setBookingHistory([]);
      return;
    }
    setCustomerName(String(customerUser.name || customerUser.full_name || ''));
    if (customerUser.phone) setCustomerPhone(String(customerUser.phone));
    if (customerUser.haircut_notes) setHaircutNotes(String(customerUser.haircut_notes));
    setLoyaltyPoints(Number(customerUser.loyalty_points || 0));

    syncMemberProfile();
    fetchCustomerHistory();
    window.addEventListener('focus', syncMemberProfile);
    return () => window.removeEventListener('focus', syncMemberProfile);
  }, [customerUser?.id]);

  // Pulihkan Draft Pilihan setelah Login (Langsung buka tab Pesan)
  useEffect(() => {
    const savedDraft = sessionStorage.getItem('barber_booking_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (Array.isArray(parsed.serviceIds) && parsed.serviceIds.length > 0) {
          setSelectedServiceIds(parsed.serviceIds);
        }
        if (parsed.productCart) setProductCart(parsed.productCart);
        if (parsed.barberId) setSelectedBarberId(String(parsed.barberId));
        if (parsed.date) setSelectedDate(String(parsed.date));
        if (parsed.slot) setSelectedSlot(String(parsed.slot));
        setActiveTab('ORDER');
        sessionStorage.removeItem('barber_booking_draft');
      } catch {}
    }
  }, [customerUser]);

  // Ambil Katalog Layanan, Produk Ritel, & Kapster
  useEffect(() => {
    let isMounted = true;
    setIsLoadingCatalog(true);
    setErrorMsg('');

    fetch(`${API_BASE}/test-catalog`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.data) {
          const srvList: Service[] = data.data.services || [];
          const prdList: Product[] = data.data.products || [];
          const brbList: Barber[] = data.data.barbers || [];

          setServices(srvList);
          setProducts(prdList);
          setBarbers(brbList);

          if (srvList.length > 0) {
            setSelectedServiceIds((prev) => (prev.length > 0 ? prev : [srvList[0].id]));
          }
          if (brbList.length > 0) {
            setSelectedBarberId((prev) => prev || brbList[0].id);
          }
        } else {
          setErrorMsg('Katalog layanan tidak berhasil dimuat dari server.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Fetch catalog error:', err);
        setErrorMsg('Gagal terhubung ke server backend.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingCatalog(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Kalkulasi Total Layanan, Produk, & Durasi
  const selectedServicesList = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalServicePrice = selectedServicesList.reduce(
    (sum, s) => sum + Number(s.base_price || 0),
    0
  );
  const totalDurationMinutes = selectedServicesList.reduce(
    (sum, s) => sum + Number(s.duration_minutes || 45),
    0
  );

  const selectedProductsList = products
    .filter((p) => (productCart[p.id] || 0) > 0)
    .map((p) => ({
      ...p,
      qty: productCart[p.id],
      lineTotal: Number(p.selling_price || 0) * productCart[p.id],
    }));

  const totalProductPrice = selectedProductsList.reduce((sum, p) => sum + p.lineTotal, 0);
  const estimatedSubtotal = totalServicePrice + totalProductPrice;

  const pendingHistoryItem = bookingHistory.find(
    (b) => String(b.status || '').toUpperCase() === 'PENDING_PAYMENT'
  );
  const activeOrdersCount = bookingHistory.filter((b) =>
    ['PENDING_PAYMENT', 'CONFIRMED'].includes(String(b.status || '').toUpperCase())
  ).length;

  // Navigasi ke Tab dengan Auto-Scroll ke Atas
  const switchTab = (tab: 'HOME' | 'ORDER' | 'PROFILE', focusProducts = false) => {
    setActiveTab(tab);
    if (tab === 'PROFILE' && customerUser?.id) {
      fetchCustomerHistory();
      syncMemberProfile();
    }
    setTimeout(() => {
      if (focusProducts && productsSectionRef.current) {
        productsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (topScrollRef.current) {
        topScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 60);
  };

  // Toggle Pilih Multi-Layanan
  const toggleServiceSelection = (id: string) => {
    setSelectedServiceIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  // Ubah Kuantitas Produk Ritel
  const updateProductQty = (productId: string, delta: number) => {
    setProductCart((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[productId];
      } else {
        updated[productId] = next;
      }
      return updated;
    });
  };

  // Ambil Slot Jam Berdasarkan Total Durasi Layanan
  const fetchSlots = async () => {
    if (!selectedBarberId || !selectedDate || selectedServiceIds.length === 0) return;
    setIsLoadingSlots(true);
    setBarberOffNotice(null);

    try {
      const rosterRes = await fetch(
        `${API_BASE}/roster/check-availability?barberId=${selectedBarberId}&date=${selectedDate}`
      );
      const rosterData = await rosterRes.json();

      if (rosterData.success && !rosterData.isAvailable) {
        setBarberOffNotice(String(rosterData.reason || 'Kapster sedang tidak bertugas.'));
        setAvailableSlots([]);
        setIsLoadingSlots(false);
        return;
      }

      const duration = totalDurationMinutes || 45;
      const primaryServiceId = selectedServiceIds[0];

      const slotRes = await fetch(
        `${API_BASE}/bookings/availability?barberId=${selectedBarberId}&date=${selectedDate}&serviceId=${primaryServiceId}&duration=${duration}`
      );
      const slotData = await slotRes.json();

      if (slotData.success && Array.isArray(slotData.data)) {
        setAvailableSlots(slotData.data);
        const stillAvailable = slotData.data.find(
          (s: TimeSlot) => s.startTime === selectedSlot && s.available
        );
        if (!stillAvailable) {
          const firstAvailable = slotData.data.find((s: TimeSlot) => s.available);
          setSelectedSlot(firstAvailable ? String(firstAvailable.startTime) : '');
        }
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      console.error('Fetch availability error:', err);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [selectedBarberId, selectedDate, selectedServiceIds.join(','), services]);

  // Countdown Timer 10 Menit
  useEffect(() => {
    if (!pendingBooking) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingBooking]);

  useEffect(() => {
    if (!pendingBooking || remainingSeconds > 0) return;
    const targetId = pendingBooking.bookingId || pendingBooking.bookingCode;
    fetch(`${API_BASE}/bookings/${targetId}/cancel`, { method: 'POST' })
      .catch(() => {})
      .finally(() => {
        setPendingBooking(null);
        setPointsToRedeem(0);
        setAppliedVoucher(null);
        setExpiredNotice(
          'Batas waktu pembayaran 10 menit telah habis. Pesanan Anda otomatis hangus dan slot jam telah dibuka kembali.'
        );
        fetchSlots();
        fetchCustomerHistory();
      });
  }, [remainingSeconds, pendingBooking]);

  const formatCountdown = (totalSecs: number) => {
    const safeSecs = Math.max(0, Number(totalSecs) || 0);
    const mins = Math.floor(safeSecs / 60);
    const secs = safeSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Lanjutkan Pembayaran dari Riwayat / Banner
  const openResumePayment = (item: any) => {
    const expMs = item.expires_at
      ? new Date(item.expires_at).getTime() - Date.now()
      : 300000;
    setRemainingSeconds(Math.max(30, Math.floor(expMs / 1000)));
    setPointsToRedeem(0);
    setAppliedVoucher(null);
    setVoucherMsg(null);
    setPendingBooking({
      bookingId: String(item.id),
      bookingCode: String(item.booking_code),
      outletName: String(item.outlet_name || selectedOutlet.name),
      date: String(item.booking_date).slice(0, 10),
      startTime: String(item.start_time).slice(0, 5),
      price: Number(item.subtotal_price || item.final_price || 0),
      customerName: customerName || 'Pelanggan',
      serviceName: String(item.items_summary || 'Layanan Cukur'),
      barberName: String(item.barber_name || 'Kapster'),
    });
  };

  // Validasi Voucher Promo di Layar Pembayaran
  const handleValidateVoucher = async () => {
    if (!voucherInput.trim() || !pendingBooking) return;
    setIsCheckingVoucher(true);
    setVoucherMsg(null);
    try {
      const res = await fetch(`${API_BASE}/pos/vouchers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: voucherInput.trim().toUpperCase(),
          subtotal: Number(pendingBooking.price || 0),
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAppliedVoucher({
          code: json.data.code,
          discountAmount: Number(json.data.discountAmount || 0),
        });
        setVoucherMsg({
          text: `Voucher ${json.data.code} berhasil dipasang (-Rp ${Number(json.data.discountAmount).toLocaleString('id-ID')})`,
          isError: false,
        });
      } else {
        setAppliedVoucher(null);
        setVoucherMsg({
          text: json.message || 'Voucher tidak valid atau minimal belanja belum terpenuhi',
          isError: true,
        });
      }
    } catch {
      setVoucherMsg({ text: 'Gagal memeriksa voucher ke server', isError: true });
    } finally {
      setIsCheckingVoucher(false);
    }
  };

  // Submit Pemesanan Baru
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpiredNotice(null);

    if (!customerUser || !customerUser.id) {
      sessionStorage.setItem(
        'barber_booking_draft',
        JSON.stringify({
          serviceIds: selectedServiceIds,
          productCart,
          barberId: selectedBarberId,
          date: selectedDate,
          slot: selectedSlot,
        })
      );
      if (onOpenAuth) onOpenAuth('LOGIN');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Mohon lengkapi nama dan nomor WhatsApp Anda!');
      return;
    }

    if (selectedServiceIds.length === 0) {
      alert('Pilih minimal 1 layanan treatment!');
      return;
    }

    if (!selectedSlot) {
      alert('Pilih jam kedatangan yang tersedia!');
      return;
    }

    setIsSubmitting(true);
    try {
      const productPayload = selectedProductsList.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.selling_price,
        qty: p.qty,
      }));

      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletId: selectedOutlet.id,
          outletName: selectedOutlet.name,
          customerId: customerUser.id,
          customerName,
          customerPhone,
          barberId: selectedBarberId,
          serviceId: selectedServiceIds[0],
          serviceIds: selectedServiceIds,
          productItems: productPayload,
          date: selectedDate,
          startTime: selectedSlot,
          haircutNotes,
        }),
      });

      const result = await res.json();
      if (result.success) {
        const selectedBrb = barbers.find((b) => b.id === selectedBarberId);
        const summaryFallback = [
          ...selectedServicesList.map((s) => s.name),
          ...selectedProductsList.map((p) => `${p.name} (${p.qty}x)`),
        ].join(', ');

        setPointsToRedeem(0);
        setAppliedVoucher(null);
        setVoucherMsg(null);
        setRemainingSeconds(600);
        setPendingBooking({
          bookingId: String(result.data?.bookingId || result.data?.id || result.data?.bookingCode || ''),
          bookingCode: String(result.data?.bookingCode || 'BRB-ONLINE'),
          outletName: String(result.data?.outletName || selectedOutlet.name),
          date: String(result.data?.date || selectedDate).slice(0, 10),
          startTime: String(result.data?.startTime || selectedSlot).slice(0, 5),
          price: Number(result.data?.price || estimatedSubtotal || 0),
          customerName: String(customerName),
          serviceName: String(result.data?.serviceName || summaryFallback),
          barberName: String(selectedBrb?.nickname || 'Kapster'),
        });
        fetchCustomerHistory();
      } else {
        alert('Gagal reservasi: ' + (result.message || 'Slot tidak tersedia'));
        fetchSlots();
      }
    } catch (err: any) {
      alert('Terjadi kesalahan koneksi: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Konfirmasi Pembayaran (Lunas)
  const handleConfirmPayment = async () => {
    const targetId = pendingBooking?.bookingId || pendingBooking?.bookingCode;
    if (!targetId) return;

    setIsConfirmingPayment(true);
    try {
      const basePrice = Number(pendingBooking.price || 0);
      const vDisc = Number(appliedVoucher?.discountAmount || 0);
      const afterVoucher = Math.max(0, basePrice - vDisc);
      const maxPts = Math.min(loyaltyPoints, Math.floor(afterVoucher / 1000));
      const validPoints = Math.max(0, Math.min(pointsToRedeem, maxPts));
      const pointDiscount = validPoints * 1000;
      const finalPaid = Math.max(0, afterVoucher - pointDiscount);

      const res = await fetch(`${API_BASE}/bookings/${targetId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          pointsRedeemed: validPoints,
          voucherCode: appliedVoucher?.code || null,
        }),
      });
      const result = await res.json();

      if (result.success) {
        if (result.data?.remainingPoints !== undefined) {
          setLoyaltyPoints(Number(result.data.remainingPoints));
        }
        syncMemberProfile();
        fetchCustomerHistory();

        setBookingSuccessData({
          ...pendingBooking,
          paymentMethod,
          originalPrice: basePrice,
          voucherCode: appliedVoucher?.code || null,
          voucherDiscount: vDisc,
          pointsRedeemed: validPoints,
          discountAmount: vDisc + pointDiscount,
          finalPrice: result.data?.finalPrice ?? finalPaid,
        });
        setPendingBooking(null);
        setPointsToRedeem(0);
        setAppliedVoucher(null);
        setVoucherInput('');
        setProductCart({});
      } else {
        setPendingBooking(null);
        setExpiredNotice(String(result.message || 'Waktu pembayaran habis, pesanan hangus.'));
        fetchSlots();
        fetchCustomerHistory();
      }
    } catch (err: any) {
      alert('Gagal memverifikasi pembayaran: ' + err.message);
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  // Batalkan Pesanan Sebelum Bayar
  const handleCancelPending = async () => {
    const targetId = pendingBooking?.bookingId || pendingBooking?.bookingCode;
    if (targetId) {
      await fetch(`${API_BASE}/bookings/${targetId}/cancel`, { method: 'POST' }).catch(() => {});
    }
    setPendingBooking(null);
    setPointsToRedeem(0);
    setAppliedVoucher(null);
    fetchSlots();
    fetchCustomerHistory();
  };

  if (isLoadingCatalog) {
    return (
      <div className="flex-1 min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-gold-500" />
        <p className="text-xs font-mono">Memuat Barbershop OS...</p>
      </div>
    );
  }

  if (errorMsg && services.length === 0) {
    return (
      <div className="flex-1 min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-300 gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <div className="space-y-1">
          <h3 className="font-bold text-sm text-zinc-100">Portal Belum Dapat Diakses</h3>
          <p className="text-xs text-zinc-400 font-mono">{errorMsg}</p>
        </div>
      </div>
    );
  }

  // ==================== LAYAR PEMBAYARAN FULLSCREEN (QRIS, VA, VOUCHER, POIN) ====================
  if (pendingBooking) {
    const originalPrice = Number(pendingBooking.price || 0);
    const voucherDiscRp = Number(appliedVoucher?.discountAmount || 0);
    const priceAfterVoucher = Math.max(0, originalPrice - voucherDiscRp);
    const maxRedeemablePoints = Math.min(loyaltyPoints, Math.floor(priceAfterVoucher / 1000));
    const appliedPoints = Math.max(0, Math.min(pointsToRedeem, maxRedeemablePoints));
    const pointsDiscountRp = appliedPoints * 1000;
    const finalBillRp = Math.max(0, priceAfterVoucher - pointsDiscountRp);

    const activeChannel =
      PAYMENT_CHANNELS.find((c) => c.id === paymentMethod) || PAYMENT_CHANNELS[0];
    const cleanUserPhone = (customerPhone || '081299887766').replace(/\D/g, '').slice(-8);
    const virtualAccountNumber = `${activeChannel.vaPrefix || '88010'}${cleanUserPhone}`;
    const qrisPayload = `00020101021226610016ID.CO.BARBERSHOP.WWW01189360091431234567890215${pendingBooking.bookingCode}520458125303360540${finalBillRp}5802ID5913BARBERSHOP OS6008MAKASSAR6304A1B2`;
    const qrisImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(
      qrisPayload
    )}`;

    return (
      <div
        className="flex-1 min-h-[100dvh] bg-zinc-950 flex items-center justify-center p-4 text-zinc-100 select-none overflow-y-auto"
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="w-full max-w-lg bg-zinc-900 border border-gold-500/40 rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl my-auto overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black text-zinc-100 truncate">Selesaikan Pembayaran</h2>
                <p className="text-[11px] text-zinc-400 truncate">Slot kapster sedang dikunci untuk Anda</p>
              </div>
            </div>
            <div className="text-right bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-xl shrink-0">
              <div className="text-[9px] text-red-300 uppercase font-bold">Sisa Waktu</div>
              <div className="text-base font-mono font-black text-red-400">
                {formatCountdown(remainingSeconds)}
              </div>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 font-mono text-xs space-y-2">
            <div className="flex justify-between gap-2">
              <span className="text-zinc-500 font-sans shrink-0">Kode & Lokasi</span>
              <span className="text-gold-400 font-bold text-right truncate">
                {pendingBooking.bookingCode} • {pendingBooking.outletName}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-zinc-500 font-sans shrink-0">Item Pesanan</span>
              <span className="text-zinc-200 text-right">{pendingBooking.serviceName}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-zinc-500 font-sans shrink-0">Kapster & Jadwal</span>
              <span className="text-emerald-400 font-bold text-right">
                {pendingBooking.barberName} • {pendingBooking.date} ({pendingBooking.startTime})
              </span>
            </div>

            <div className="border-t border-zinc-800/80 pt-2 space-y-1.5">
              <div className="flex justify-between text-zinc-400">
                <span className="font-sans">Subtotal Pesanan</span>
                <span>Rp {originalPrice.toLocaleString('id-ID')}</span>
              </div>
              {appliedVoucher && (
                <div className="flex justify-between text-emerald-400">
                  <span className="font-sans">Voucher ({appliedVoucher.code})</span>
                  <span>- Rp {voucherDiscRp.toLocaleString('id-ID')}</span>
                </div>
              )}
              {appliedPoints > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span className="font-sans">Tukar Poin ({appliedPoints} Pts)</span>
                  <span>- Rp {pointsDiscountRp.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-zinc-800 pt-2 text-sm">
                <span className="text-zinc-100 font-sans font-bold">Total Tagihan Bersih</span>
                <span className="text-gold-400 font-black">
                  Rp {finalBillRp.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Klaim Voucher Promo */}
          <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
            <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-gold-400" /> Pakai Kode Voucher Promo:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Contoh: HEMAT20K atau DISKON10"
                value={voucherInput}
                onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 uppercase focus:outline-none focus:border-gold-500"
              />
              {appliedVoucher ? (
                <button
                  type="button"
                  onClick={() => {
                    setAppliedVoucher(null);
                    setVoucherInput('');
                    setVoucherMsg(null);
                  }}
                  className="px-3 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold shrink-0"
                >
                  Hapus
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isCheckingVoucher || !voucherInput.trim()}
                  onClick={handleValidateVoucher}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-zinc-950 rounded-xl text-xs font-black shrink-0"
                >
                  {isCheckingVoucher ? '...' : 'Pakai'}
                </button>
              )}
            </div>
            {voucherMsg && (
              <p className={`text-[11px] font-mono ${voucherMsg.isError ? 'text-red-400' : 'text-emerald-400'}`}>
                {voucherMsg.text}
              </p>
            )}
          </div>

          {/* Tukar Poin Member */}
          <div className="p-3.5 bg-zinc-950 border border-gold-500/30 rounded-2xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Gift className="w-4 h-4 text-gold-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-100">Tukar Poin Member</div>
                  <div className="text-[10px] text-zinc-400 font-mono truncate">
                    Saldo: <span className="text-gold-400 font-bold">{loyaltyPoints} Pts</span> (1 Pts = Rp 1.000)
                  </div>
                </div>
              </div>
              {maxRedeemablePoints > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    setPointsToRedeem(appliedPoints === maxRedeemablePoints ? 0 : maxRedeemablePoints)
                  }
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-zinc-900 text-gold-400 border border-gold-500/40 shrink-0"
                >
                  {appliedPoints === maxRedeemablePoints ? 'Reset Poin' : 'Pakai Semua'}
                </button>
              ) : (
                <span className="text-[10px] text-zinc-500 font-mono shrink-0">Saldo 0 Pts</span>
              )}
            </div>
            {maxRedeemablePoints > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                <span className="text-[11px] text-zinc-400">Jumlah Poin:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPointsToRedeem(Math.max(0, appliedPoints - 1))}
                    className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-12 text-center font-mono text-xs font-bold text-gold-400">
                    {appliedPoints}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPointsToRedeem(Math.min(maxRedeemablePoints, appliedPoints + 1))}
                    className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Metode Pembayaran */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase block">
              Pilih Metode Pembayaran:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {PAYMENT_CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setPaymentMethod(ch.id)}
                  className={`p-2 rounded-xl border text-[11px] font-bold transition-all ${
                    paymentMethod === ch.id
                      ? 'bg-gold-500/15 border-gold-500 text-gold-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>

            {activeChannel.type === 'QR' ? (
              <div className="p-4 bg-white text-zinc-950 rounded-2xl text-center space-y-2 shadow-inner">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2 text-[10px] sm:text-xs font-black">
                  <span>QRIS PEMBAYARAN NASIONAL</span>
                  <span className="text-emerald-700 font-mono">NMID: ID1026008812</span>
                </div>
                <img
                  src={qrisImageUrl}
                  alt="QRIS Barbershop OS"
                  className="w-44 h-44 mx-auto rounded-lg border border-zinc-200 p-1"
                />
                <div className="text-xs font-bold text-zinc-800">
                  BARBERSHOP OS • Rp {finalBillRp.toLocaleString('id-ID')}
                </div>
                <p className="text-[10px] text-zinc-600">
                  Scan QRIS menggunakan M-Banking atau E-Wallet sebelum waktu 10 menit berakhir.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-300 truncate">{activeChannel.bankName}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-gold-500/10 text-gold-400 rounded shrink-0">
                    Dicek Otomatis
                  </span>
                </div>
                <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] text-zinc-400">Nomor Virtual Account:</div>
                    <div className="text-sm sm:text-base font-mono font-black text-gold-400 tracking-wider truncate">
                      {virtualAccountNumber}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(virtualAccountNumber);
                      setCopiedVA(true);
                      setTimeout(() => setCopiedVA(false), 2000);
                    }}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold rounded-lg flex items-center gap-1.5 text-zinc-200 shrink-0"
                  >
                    {copiedVA ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedVA ? 'Tersalin' : 'Salin VA'}</span>
                  </button>
                </div>
                <div className="text-[11px] text-zinc-400 space-y-1">
                  <div>• Nominal Transfer: <b className="text-zinc-100 font-mono">Rp {finalBillRp.toLocaleString('id-ID')}</b></div>
                  <div>• Merchant: <b className="text-zinc-100">BARBERSHOP OS ({pendingBooking.bookingCode})</b></div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={isConfirmingPayment}
              onClick={handleConfirmPayment}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isConfirmingPayment ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-4 h-4" /> SAYA SUDAH BAYAR (KONFIRMASI SEKARANG)
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancelPending}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4" /> Batalkan Pesanan & Ganti Jadwal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== LAYAR E-TICKET SUKSES ====================
  if (bookingSuccessData) {
    return (
      <div
        className="flex-1 min-h-[100dvh] bg-zinc-950 flex items-center justify-center p-4 text-zinc-100 select-none"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 text-center shadow-2xl">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-black text-zinc-100">Pembayaran & Reservasi Berhasil!</h2>
            <p className="text-xs text-zinc-400">
              Jadwal kapster telah dikunci dan e-ticket dikirim ke WhatsApp Anda.
            </p>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 font-mono text-left space-y-2 text-xs">
            <div className="flex justify-between border-b border-zinc-800/80 pb-2">
              <span className="text-zinc-500 font-sans">Kode Booking</span>
              <span className="text-gold-400 font-bold">{bookingSuccessData.bookingCode}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-zinc-500 font-sans shrink-0">Lokasi Cabang</span>
              <span className="text-zinc-200 text-right">{bookingSuccessData.outletName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500 font-sans shrink-0">Pesanan</span>
              <span className="text-zinc-200 text-right">{bookingSuccessData.serviceName}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-zinc-500 font-sans shrink-0">Kapster & Jadwal</span>
              <span className="text-emerald-400 font-bold text-right">
                {bookingSuccessData.barberName} • {bookingSuccessData.date} ({bookingSuccessData.startTime})
              </span>
            </div>
            {Number(bookingSuccessData.discountAmount) > 0 && (
              <div className="flex justify-between text-emerald-400 border-t border-zinc-800/80 pt-2">
                <span className="font-sans">Total Diskon (Voucher/Poin)</span>
                <span>- Rp {Number(bookingSuccessData.discountAmount).toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-800/80 pt-2 font-bold">
              <span className="text-zinc-400 font-sans">Total Lunas ({bookingSuccessData.paymentMethod})</span>
              <span className="text-gold-400">
                Rp {Number(bookingSuccessData.finalPrice ?? 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => {
                setBookingSuccessData(null);
                switchTab('PROFILE');
              }}
              className="py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs rounded-xl"
            >
              LIHAT RIWAYAT
            </button>
            <button
              onClick={() => {
                setBookingSuccessData(null);
                switchTab('HOME');
                fetchSlots();
              }}
              className="py-3 bg-gold-500 hover:bg-gold-400 text-zinc-950 font-black text-xs rounded-xl"
            >
              KE BERANDA
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredHistory = bookingHistory.filter((item) => {
    const st = String(item.status || '').toUpperCase();
    if (historyFilter === 'ACTIVE') return st === 'CONFIRMED' || st === 'PENDING_PAYMENT';
    if (historyFilter === 'DONE') return st === 'COMPLETED' || st === 'EXPIRED' || st === 'CANCELLED';
    return true;
  });

  // ==================== TAMPILAN UTAMA PORTAL PELANGGAN (3 TAB BOTTOM NAV) ====================
  return (
    <div
      ref={topScrollRef}
      className="flex-1 min-h-[100dvh] w-full max-w-[100vw] bg-zinc-950 text-zinc-100 flex flex-col overflow-x-hidden overflow-y-auto no-scrollbar select-none relative"
    >
      {/* KONTEN SCROLLABLE (padding bawah lega agar tidak tertutup Bottom Nav Bar) */}
      <main
        className="flex-1 w-full max-w-2xl mx-auto px-4 pb-28 space-y-5"
        style={{ paddingTop: 'max(0.85rem, env(safe-area-inset-top))' }}
      >
        {expiredNotice && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-300 flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="flex-1">{expiredNotice}</span>
            <button
              type="button"
              onClick={() => setExpiredNotice(null)}
              className="text-red-400 font-bold text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* ==================== TAB 1: BERANDA (HOME) ==================== */}
        {activeTab === 'HOME' && (
          <div className="space-y-5">
            {/* Baris Atas: Tier VIP & Poin di Kiri + Aksi Cepat di Kanan */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => (customerUser ? switchTab('PROFILE') : onOpenAuth?.('LOGIN'))}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 border border-gold-500/30 rounded-full text-xs font-bold text-gold-400 shrink-0"
                >
                  <Award className="w-3.5 h-3.5 text-gold-400" />
                  <span>{customerUser ? 'VIP Member' : 'Barbershop OS'}</span>
                </button>
                {customerUser && (
                  <button
                    type="button"
                    onClick={() => switchTab('PROFILE')}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-gold-500/10 border border-gold-500/25 rounded-full text-xs font-mono font-black text-gold-400 truncate"
                  >
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>{loyaltyPoints.toLocaleString('id-ID')} Pts</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCSModal(true)}
                  className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 flex items-center justify-center text-emerald-400"
                  title="Customer Service"
                >
                  <Headphones className="w-4 h-4" />
                </button>
                {!customerUser && onOpenAuth && (
                  <button
                    type="button"
                    onClick={() => onOpenAuth('LOGIN')}
                    className="px-3.5 py-1.5 bg-gold-500 hover:bg-gold-400 text-zinc-950 font-black text-xs rounded-full"
                  >
                    Masuk
                  </button>
                )}
              </div>
            </div>

            {/* Kartu Pemilih Lokasi Cabang (Gaya Pill Modern) */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowOutletModal(true)}
                className="w-full p-3.5 bg-zinc-900 hover:bg-zinc-900/80 border border-zinc-800 hover:border-gold-500/40 rounded-2xl flex items-center justify-between gap-3 text-left transition-all shadow-lg"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/30 text-gold-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-black text-zinc-100 truncate">
                      {selectedOutlet.shortName}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {selectedOutlet.address}
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-gold-400 shrink-0">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              <div className="flex items-center gap-3 px-1 text-[11px] text-zinc-400">
                <span>Melayani:</span>
                <span className="flex items-center gap-1 text-zinc-200 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Booking Cukur
                </span>
                <span className="flex items-center gap-1 text-zinc-200 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-gold-400" /> Produk Ritel
                </span>
              </div>
            </div>

            {/* Peringatan Jika Ada Pesanan Menunggu Pembayaran */}
            {pendingHistoryItem && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 animate-pulse" /> Menunggu Pembayaran
                  </div>
                  <div className="text-[11px] text-zinc-300 truncate mt-0.5">
                    {pendingHistoryItem.booking_code} • {pendingHistoryItem.items_summary}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openResumePayment(pendingHistoryItem)}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-[11px] rounded-xl shrink-0"
                >
                  Bayar
                </button>
              </div>
            )}

            {/* Banner Promo Utama (Dark-Gold Luxury) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/50 border border-gold-500/35 p-5 shadow-2xl">
              <div className="relative z-10 space-y-2.5 max-w-[85%]">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold-500/20 border border-gold-500/40 text-[10px] font-mono font-bold text-gold-400 uppercase">
                  <Sparkles className="w-3 h-3" /> Promo Member Eksklusif
                </span>
                <h1 className="text-lg sm:text-xl font-black text-zinc-100 leading-snug">
                  Potongan <span className="text-gold-400">Rp 20.000</span> & Kunci Slot Antrean Instan!
                </h1>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Gunakan kode <b className="text-gold-400 font-mono">HEMAT20K</b> saat checkout booking online. Tanpa antre lama di lokasi.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVoucherInput('HEMAT20K');
                      switchTab('ORDER');
                    }}
                    className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-gold-500/20 active:scale-95 transition-all"
                  >
                    Booking Sekarang
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVoucherModal(true)}
                    className="px-3.5 py-2 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-xs rounded-xl"
                  >
                    Lihat Promo
                  </button>
                </div>
              </div>
              <Scissors className="w-28 h-28 text-gold-500/10 absolute -right-4 -bottom-4 -rotate-12 pointer-events-none" />
            </div>

            {/* 4 Pintasan Cepat (Mirip Grid 4 Ikon Referensi) */}
            <div className="grid grid-cols-4 gap-2.5">
              {[
                {
                  label: 'Booking',
                  badge: 'INSTAN',
                  icon: Scissors,
                  accent: 'text-gold-400 bg-gold-500/10 border-gold-500/25',
                  action: () => switchTab('ORDER', false),
                },
                {
                  label: 'Produk',
                  badge: `${products.length} ITEM`,
                  icon: ShoppingBag,
                  accent: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
                  action: () => switchTab('ORDER', true),
                },
                {
                  label: 'Voucher',
                  badge: 'DISC',
                  icon: Ticket,
                  accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
                  action: () => setShowVoucherModal(true),
                },
                {
                  label: 'Bantuan CS',
                  badge: 'WA',
                  icon: Headphones,
                  accent: 'text-sky-400 bg-sky-500/10 border-sky-500/25',
                  action: () => setShowCSModal(true),
                },
              ].map((item, idx) => {
                const IconComp = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={item.action}
                    className="p-2.5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 relative"
                  >
                    <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-gold-400">
                      {item.badge}
                    </span>
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${item.accent}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-200 truncate w-full text-center">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Section: Pesan Lagi (Jika Punya Riwayat) / Paket Cepat */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-zinc-100 flex items-center gap-1.5">
                  {bookingHistory.length > 0 ? 'Pesan Lagi' : 'Layanan Favorit'}
                  <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                </h2>
                <button
                  type="button"
                  onClick={() => switchTab(bookingHistory.length > 0 ? 'PROFILE' : 'ORDER')}
                  className="text-xs font-bold text-gold-400 flex items-center gap-0.5"
                >
                  <span>Lihat Semua</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {bookingHistory.length > 0
                  ? bookingHistory.slice(0, 4).map((hist) => (
                      <div
                        key={hist.id}
                        className="min-w-[235px] max-w-[250px] p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between gap-3 shrink-0"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-zinc-400 truncate">
                              {hist.outlet_name || selectedOutlet.shortName}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-gold-400 shrink-0">
                              {hist.barber_name}
                            </span>
                          </div>
                          <div className="text-xs font-black text-zinc-100 line-clamp-2">
                            {hist.items_summary}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                          <span className="text-xs font-mono font-black text-gold-400">
                            Rp {Number(hist.final_price || 0).toLocaleString('id-ID')}
                          </span>
                          <button
                            type="button"
                            onClick={() => switchTab('ORDER')}
                            className="px-3.5 py-1.5 bg-zinc-950 hover:bg-gold-500 hover:text-zinc-950 border border-gold-500/40 text-gold-400 font-black text-[11px] rounded-xl transition-all"
                          >
                            Pesan
                          </button>
                        </div>
                      </div>
                    ))
                  : services.map((srv) => (
                      <div
                        key={srv.id}
                        className="min-w-[215px] max-w-[230px] p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between gap-3 shrink-0"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-zinc-400">
                            Durasi {Number(srv.duration_minutes || 45)} Menit
                          </span>
                          <div className="text-xs font-black text-zinc-100">{srv.name}</div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                          <span className="text-xs font-mono font-black text-gold-400">
                            Rp {Number(srv.base_price).toLocaleString('id-ID')}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedServiceIds([srv.id]);
                              switchTab('ORDER');
                            }}
                            className="px-3.5 py-1.5 bg-zinc-950 hover:bg-gold-500 hover:text-zinc-950 border border-gold-500/40 text-gold-400 font-black text-[11px] rounded-xl transition-all"
                          >
                            Pesan
                          </button>
                        </div>
                      </div>
                    ))}
              </div>
            </div>

            {/* Strip Banner Tukar Poin / Voucher */}
            <div className="p-3.5 bg-zinc-900 border border-gold-500/30 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/30 text-gold-400 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-zinc-100 truncate">
                    {customerUser
                      ? `Poin Anda bernilai Rp ${(loyaltyPoints * 1000).toLocaleString('id-ID')}!`
                      : 'Kumpulkan Poin & Klaim Voucher!'}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    1 Poin = potongan Rp 1.000 saat pembayaran
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => (customerUser ? switchTab('ORDER') : onOpenAuth?.('LOGIN'))}
                className="px-3.5 py-2 bg-gold-500 hover:bg-gold-400 text-zinc-950 font-black text-xs rounded-xl shrink-0"
              >
                {customerUser ? 'Pakai' : 'Login'}
              </button>
            </div>

            {/* Section: Spesial Hari Ini (Produk Grooming & Treatment) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-zinc-100">Spesial Hari Ini</h2>
                <button
                  type="button"
                  onClick={() => switchTab('ORDER', true)}
                  className="text-xs font-bold text-gold-400 flex items-center gap-0.5"
                >
                  <span>Katalog</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {products.slice(0, 4).map((prd) => (
                  <div
                    key={prd.id}
                    className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                        GROOMING RETAIL
                      </span>
                      <div className="font-bold text-xs text-zinc-100 mt-1.5 line-clamp-2">
                        {prd.name}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <span className="text-xs font-mono font-black text-gold-400">
                        Rp {Number(prd.selling_price).toLocaleString('id-ID')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          updateProductQty(prd.id, 1);
                          switchTab('ORDER', true);
                        }}
                        className="w-7 h-7 rounded-lg bg-gold-500/15 border border-gold-500/40 text-gold-400 hover:bg-gold-500 hover:text-zinc-950 flex items-center justify-center transition-all"
                        title="Tambah ke pesanan"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: PESAN (ORDER / BOOKING) ==================== */}
        {activeTab === 'ORDER' && (
          <form onSubmit={handleSubmitBooking} className="space-y-5">
            {/* Header Lokasi Cabang Ringkas di Tab Pesan */}
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-zinc-800/80">
              <div className="min-w-0">
                <h1 className="text-base font-black text-zinc-100">Buat Reservasi</h1>
                <button
                  type="button"
                  onClick={() => setShowOutletModal(true)}
                  className="text-xs text-gold-400 font-semibold flex items-center gap-1 mt-0.5 truncate"
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{selectedOutlet.shortName}</span>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowOutletModal(true)}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-gold-500/40 rounded-xl text-[11px] font-bold text-zinc-300 shrink-0"
              >
                Ganti Cabang
              </button>
            </div>

            {/* Langkah 1: Pilih Layanan Treatment */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                  <span>1. Pilih Treatment (Bisa &gt; 1)</span>
                </label>
                <span className="text-[10px] font-mono text-gold-400 bg-gold-500/10 border border-gold-500/20 px-2 py-0.5 rounded-lg">
                  {selectedServiceIds.length} layanan • {totalDurationMinutes} Mnt
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {services.map((srv) => {
                  const isSelected = selectedServiceIds.includes(srv.id);
                  return (
                    <div
                      key={srv.id}
                      onClick={() => toggleServiceSelection(srv.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gold-500/15 border-gold-500 shadow-md shadow-gold-500/10'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-zinc-100">{srv.name}</span>
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                            isSelected ? 'bg-gold-500 text-zinc-950' : 'border border-zinc-700'
                          }`}
                        >
                          {isSelected ? '✓' : ''}
                        </div>
                      </div>
                      <div className="mt-2.5 flex justify-between items-center text-[11px] font-mono">
                        <span className="text-zinc-400">{Number(srv.duration_minutes || 45)} Mnt</span>
                        <span className="font-bold text-gold-400">
                          Rp {Number(srv.base_price).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Langkah 2: Tambah Produk Ritel */}
            {products.length > 0 && (
              <div ref={productsSectionRef} className="space-y-2 scroll-mt-4">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                  <span>2. Produk Grooming / Ritel (Opsional)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {products.map((prd) => {
                    const qty = productCart[prd.id] || 0;
                    return (
                      <div
                        key={prd.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                          qty > 0
                            ? 'bg-gold-500/10 border-gold-500/50'
                            : 'bg-zinc-900 border-zinc-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-zinc-100 truncate">{prd.name}</div>
                          <div className="text-[11px] font-mono text-gold-400 font-bold">
                            Rp {Number(prd.selling_price).toLocaleString('id-ID')}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateProductQty(prd.id, -1)}
                            className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-700 hover:border-gold-500 flex items-center justify-center text-zinc-200"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-mono text-xs font-bold text-zinc-100">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateProductQty(prd.id, 1)}
                            className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-700 hover:border-gold-500 flex items-center justify-center text-zinc-200"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Langkah 3: Pilih Kapster */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                <span>3. Pilih Barber / Kapster</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {barbers.map((brb) => (
                  <div
                    key={brb.id}
                    onClick={() => setSelectedBarberId(brb.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all text-center ${
                      selectedBarberId === brb.id
                        ? 'bg-gold-500/10 border-gold-500 shadow-md shadow-gold-500/10'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-zinc-100">{brb.nickname}</div>
                    <span className="text-[9px] font-mono text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded mt-1 inline-block">
                      {brb.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Langkah 4: Tanggal & Jam Kunjungan */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                <span>4. Tanggal & Jam Kunjungan</span>
              </label>
              <input
                type="date"
                required
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-gold-500 font-mono cursor-pointer"
              />

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-zinc-400 font-bold block">PILIH JAM:</span>

                {barberOffNotice ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center space-y-1">
                    <div className="text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Kapster Tidak Bertugas
                    </div>
                    <p className="text-[11px] text-zinc-200">{barberOffNotice}</p>
                  </div>
                ) : isLoadingSlots ? (
                  <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-center text-xs text-zinc-500 flex items-center justify-center gap-2 font-mono">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-gold-400" /> Menghitung slot tersedia...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-center text-xs text-zinc-500 font-mono">
                    Tidak ada slot tersedia pada tanggal ini.
                  </div>
                ) : (
                  <div className="relative rounded-2xl border border-zinc-800/90 bg-zinc-950 overflow-hidden">
                    <div
                      ref={slotRollRef}
                      className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-40 overflow-y-auto no-scrollbar p-2"
                    >
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.startTime}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot.startTime)}
                          className={`p-2 rounded-lg text-xs font-mono font-bold transition-all text-center ${
                            !slot.available
                              ? 'bg-zinc-900/40 text-zinc-600 cursor-not-allowed line-through'
                              : selectedSlot === slot.startTime
                              ? 'bg-gold-500 text-zinc-950 shadow-md shadow-gold-500/20'
                              : 'bg-zinc-900 text-zinc-300 hover:border-zinc-700 border border-zinc-800'
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Langkah 5: Data Kontak & Barber Notes */}
            {customerUser && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                  <span>5. Data Kontak & Barber Notes</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Nama Lengkap"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-zinc-100 focus:outline-none focus:border-gold-500"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="No. WhatsApp (08xx)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-zinc-100 font-mono focus:outline-none focus:border-gold-500"
                    />
                  </div>
                </div>

                <textarea
                  rows={2}
                  placeholder="Catatan preferensi gaya rambut (contoh: Low taper fade, atas dirapikan 1-2 cm)..."
                  value={haircutNotes}
                  onChange={(e) => setHaircutNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-gold-500 resize-none"
                />
              </div>
            )}

            {/* Ringkasan & Tombol Lanjut Bayar */}
            <div className="p-4 bg-zinc-900 border border-gold-500/30 rounded-2xl space-y-3 shadow-lg">
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between gap-2 text-zinc-400">
                  <span className="font-sans shrink-0">Cabang</span>
                  <span className="text-zinc-200 text-right truncate">{selectedOutlet.shortName}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span className="font-sans">Treatment ({selectedServicesList.length} item)</span>
                  <span>Rp {totalServicePrice.toLocaleString('id-ID')}</span>
                </div>
                {selectedProductsList.length > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span className="font-sans">Produk ({selectedProductsList.length} item)</span>
                    <span>Rp {totalProductPrice.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-800">
                  <span className="text-zinc-100 font-sans font-bold">Total Estimasi</span>
                  <span className="font-mono font-black text-gold-400">
                    Rp {estimatedSubtotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selectedSlot || !!barberOffNotice}
                className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-gold-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : !customerUser ? (
                  <>
                    <Lock className="w-4 h-4" /> LOGIN / DAFTAR UNTUK MEMESAN
                  </>
                ) : (
                  'LANJUT BAYAR & VOUCHER (KUNCI 10 MENIT)'
                )}
              </button>
            </div>
          </form>
        )}

        {/* ==================== TAB 3: PROFIL & RIWAYAT PEMESANAN ==================== */}
        {activeTab === 'PROFILE' && (
          <div className="space-y-5">
            <h1 className="text-base font-black text-zinc-100">Profil & Pesanan Saya</h1>

            {/* Kartu Member atau Ajakan Login */}
            {customerUser ? (
              <div className="p-4 bg-gradient-to-br from-zinc-900 to-zinc-900/70 border border-gold-500/35 rounded-3xl space-y-4 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-500/40 text-gold-400 flex items-center justify-center font-black text-base shrink-0">
                      {String(customerName || customerUser.name || 'MB')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-black text-zinc-100 truncate">
                          {customerName || customerUser.name}
                        </h3>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold-500/15 text-gold-400 font-mono font-bold uppercase shrink-0">
                          VIP
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-mono truncate">
                        {customerPhone || customerUser.phone || customerUser.email}
                      </p>
                    </div>
                  </div>

                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="px-3 py-2 bg-zinc-950 hover:bg-red-500/15 text-zinc-300 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  )}
                </div>

                {/* Ringkasan Poin & Nilai Rupiah */}
                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-zinc-800/80">
                  <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Award className="w-3 h-3 text-gold-400" /> Saldo Poin
                    </div>
                    <div className="text-base font-mono font-black text-gold-400 mt-0.5">
                      {loyaltyPoints} Pts
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Gift className="w-3 h-3 text-emerald-400" /> Nilai Potongan
                    </div>
                    <div className="text-base font-mono font-black text-emerald-400 mt-0.5">
                      Rp {(loyaltyPoints * 1000).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {/* Catatan Gaya Rambut Tersimpan */}
                {haircutNotes && (
                  <div className="p-3 bg-zinc-950/90 border border-zinc-800 rounded-2xl text-xs">
                    <span className="text-[10px] font-bold uppercase text-gold-400 block mb-1">
                      ✂️ Barber Notes Tersimpan
                    </span>
                    <p className="text-zinc-300 italic">{haircutNotes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 bg-zinc-900 border border-gold-500/30 rounded-3xl text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gold-500/15 border border-gold-500/30 text-gold-400 flex items-center justify-center mx-auto">
                  <User className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-zinc-100">Belum Masuk ke Akun Member</h3>
                  <p className="text-xs text-zinc-400">
                    Login atau daftar akun untuk melihat poin loyalitas, riwayat booking, dan catatan model rambut Anda.
                  </p>
                </div>
                {onOpenAuth && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenAuth('REGISTER')}
                      className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs rounded-xl"
                    >
                      Daftar Akun
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAuth('LOGIN')}
                      className="py-2.5 bg-gold-500 hover:bg-gold-400 text-zinc-950 font-black text-xs rounded-xl"
                    >
                      Masuk / Login
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Menu Pintasan Bantuan & Voucher */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowVoucherModal(true)}
                className="p-3.5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 rounded-2xl flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Ticket className="w-4 h-4 text-gold-400 shrink-0" />
                  <span className="text-xs font-bold text-zinc-200 truncate">Promo Voucher</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => setShowCSModal(true)}
                className="p-3.5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 rounded-2xl flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Headphones className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-zinc-200 truncate">Customer Service</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
              </button>
            </div>

            {/* Bagian Riwayat Pemesanan Pelanggan */}
            {customerUser && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-black uppercase tracking-wider text-gold-400 flex items-center gap-1.5">
                    <History className="w-4 h-4" /> Riwayat Pemesanan ({bookingHistory.length})
                  </h2>
                  <button
                    type="button"
                    onClick={fetchCustomerHistory}
                    className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] font-bold flex items-center gap-1 text-zinc-300"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* Filter Status Riwayat */}
                <div className="flex gap-1.5">
                  {[
                    { id: 'ALL', label: 'Semua' },
                    { id: 'ACTIVE', label: 'Aktif / Bayar' },
                    { id: 'DONE', label: 'Selesai / Batal' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setHistoryFilter(f.id as 'ALL' | 'ACTIVE' | 'DONE')}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                        historyFilter === f.id
                          ? 'bg-gold-500/15 border-gold-500 text-gold-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {isLoadingHistory ? (
                  <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center text-xs text-zinc-400 font-mono">
                    Memuat riwayat pesanan...
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center space-y-2.5">
                    <Calendar className="w-7 h-7 text-zinc-600 mx-auto" />
                    <div className="text-xs text-zinc-400">Belum ada pesanan pada kategori ini.</div>
                    <button
                      type="button"
                      onClick={() => switchTab('ORDER')}
                      className="px-4 py-2 bg-gold-500 text-zinc-950 font-black text-xs rounded-xl"
                    >
                      Buat Reservasi Sekarang
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredHistory.map((item) => {
                      const st = String(item.status || '').toUpperCase();
                      const badgeStyle =
                        st === 'CONFIRMED' || st === 'COMPLETED' || st === 'PAID'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : st === 'PENDING_PAYMENT'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-red-500/15 text-red-400 border-red-500/30';

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                            <div className="min-w-0">
                              <span className="font-mono font-black text-xs text-gold-400 block">
                                {item.booking_code}
                              </span>
                              <span className="text-[10px] text-zinc-400 block truncate">
                                {item.outlet_name}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border shrink-0 ${badgeStyle}`}>
                              {st === 'CONFIRMED'
                                ? 'AKTIF (LUNAS)'
                                : st === 'COMPLETED'
                                ? 'SELESAI'
                                : st === 'PENDING_PAYMENT'
                                ? 'BELUM BAYAR'
                                : 'HANGUS'}
                            </span>
                          </div>

                          <div className="text-xs space-y-1">
                            <div className="font-bold text-zinc-200">{item.items_summary}</div>
                            <div className="text-[11px] font-mono text-emerald-400">
                              {item.barber_name} • {String(item.booking_date).slice(0, 10)} ({String(item.start_time).slice(0, 5)} WITA)
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
                            <span className="text-[11px] text-zinc-400 font-mono">
                              {item.payment_method}
                              {item.voucher_code ? ` • ${item.voucher_code}` : ''}
                            </span>
                            <span className="font-mono font-black text-gold-400">
                              Rp {Number(item.final_price || 0).toLocaleString('id-ID')}
                            </span>
                          </div>

                          {st === 'PENDING_PAYMENT' && (
                            <button
                              type="button"
                              onClick={() => openResumePayment(item)}
                              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs rounded-xl"
                            >
                              LANJUTKAN PEMBAYARAN
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ==================== BOTTOM NAVIGATION BAR (3 TAB: BERANDA, PESAN, PROFIL) ==================== */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-800"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-2xl mx-auto grid grid-cols-3 pt-2 px-2">
          {[
            { id: 'HOME', label: 'Beranda', icon: Home },
            { id: 'ORDER', label: 'Pesan', icon: Scissors },
            { id: 'PROFILE', label: 'Profil', icon: User, badge: activeOrdersCount },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id as 'HOME' | 'ORDER' | 'PROFILE')}
                className="flex flex-col items-center justify-center gap-1 py-1 transition-all active:scale-95 relative"
              >
                <div
                  className={`relative px-4 py-1.5 rounded-2xl transition-all ${
                    isActive
                      ? 'bg-gold-500/15 text-gold-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <IconComp className="w-5 h-5" />
                  {tab.badge && tab.badge > 0 ? (
                    <span className="absolute -top-0.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-gold-500 text-zinc-950 font-mono font-black text-[9px] flex items-center justify-center">
                      {tab.badge}
                    </span>
                  ) : null}
                </div>
                <span
                  className={`text-[10px] font-bold ${
                    isActive ? 'text-gold-400' : 'text-zinc-500'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ==================== MODAL PILIH LOKASI CABANG ==================== */}
      {showOutletModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-gold-400" />
                <h3 className="text-sm font-black text-zinc-100">Pilih Cabang Barbershop</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOutletModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕ Tutup
              </button>
            </div>
            <div className="space-y-2.5">
              {OUTLET_BRANCHES.map((branch) => {
                const isSelected = selectedOutlet.id === branch.id;
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => {
                      setSelectedOutlet(branch);
                      setShowOutletModal(false);
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-gold-500/15 border-gold-500'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black text-zinc-100">{branch.name}</div>
                      <div className="text-[11px] text-zinc-400 mt-1">{branch.address}</div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL DAFTAR VOUCHER PROMO ==================== */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-gold-400" />
                <h3 className="text-sm font-black text-zinc-100">Voucher Promo Tersedia</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVoucherModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕ Tutup
              </button>
            </div>
            <div className="space-y-2.5">
              {PROMO_VOUCHERS.map((v) => (
                <div
                  key={v.code}
                  className="p-3.5 bg-zinc-950 border border-gold-500/30 rounded-2xl space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-gold-500/15 text-gold-400">
                        {v.badge}
                      </span>
                      <div className="text-xs font-black text-zinc-100 mt-1.5">{v.title}</div>
                      <div className="text-[11px] text-zinc-400">{v.subtitle}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <span className="font-mono font-black text-xs text-gold-400">{v.code}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(v.code);
                          setCopiedPromoCode(v.code);
                          setTimeout(() => setCopiedPromoCode(null), 1800);
                        }}
                        className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-[11px] font-bold text-zinc-300 flex items-center gap-1"
                      >
                        {copiedPromoCode === v.code ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedPromoCode === v.code ? 'Disalin' : 'Salin'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVoucherInput(v.code);
                          setShowVoucherModal(false);
                          switchTab('ORDER');
                        }}
                        className="px-3 py-1 bg-gold-500 text-zinc-950 font-black text-[11px] rounded-lg"
                      >
                        Pakai
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL CUSTOMER SERVICE ==================== */}
      {showCSModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-zinc-100">Pusat Bantuan & Customer Service</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCSModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕ Tutup
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Terhubung langsung via WhatsApp dengan Admin CS{' '}
              <b className="text-zinc-200">{selectedOutlet.shortName}</b>:
            </p>

            <div className="space-y-2">
              {[
                {
                  title: 'Konfirmasi & Kendala Pembayaran QRIS / VA',
                  msg: `Halo CS Barbershop OS (${selectedOutlet.name}), saya butuh bantuan terkait pembayaran reservasi saya.`,
                },
                {
                  title: 'Ubah Jadwal Kunjungan (Reschedule Booking)',
                  msg: `Halo CS Barbershop OS (${selectedOutlet.name}), saya ingin mengubah jadwal kunjungan (reschedule) booking saya.`,
                },
                {
                  title: 'Konsultasi Gaya Rambut & Produk Grooming',
                  msg: `Halo CS Barbershop OS (${selectedOutlet.name}), saya ingin berkonsultasi mengenai layanan treatment dan produk rambut.`,
                },
                {
                  title: 'Keluhan Layanan / Saran Pelanggan',
                  msg: `Halo CS Barbershop OS (${selectedOutlet.name}), saya ingin menyampaikan masukan terkait layanan barbershop.`,
                },
              ].map((topic, idx) => (
                <a
                  key={idx}
                  href={`https://wa.me/${selectedOutlet.csPhone}?text=${encodeURIComponent(topic.msg)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-emerald-500/40 rounded-xl flex items-center justify-between text-xs font-bold text-zinc-200 transition-all"
                >
                  <span>{topic.title}</span>
                  <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}