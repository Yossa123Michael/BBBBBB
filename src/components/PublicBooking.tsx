import { useState, useEffect, useRef } from 'react';
import {
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
  QrCode,
  XCircle,
  Lock,
  Gift,
  Minus,
  Plus,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api/v1`;

interface Service {
  id: string;
  name: string;
  base_price: number;
  duration_minutes: number;
  description?: string;
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

interface Props {
  onBack?: () => void;
  customerUser?: any;
  onLogout?: () => void;
  onOpenAuth?: (mode: 'LOGIN' | 'REGISTER') => void;
}

export default function PublicBooking({ onBack, customerUser, onLogout, onOpenAuth }: Props) {
  // 1. SEMUA HOOK WAJIB BERADA DI ATAS SEBELUM CONDITIONAL RETURN (Mencegah Black Screen React Error #310)
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [barberOffNotice, setBarberOffNotice] = useState<string | null>(null);

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

  // State Pembayaran 10 Menit & Tukar Poin
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState<boolean>(false);
  const [pendingBooking, setPendingBooking] = useState<any>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'VA_BCA' | 'EWALLET'>('QRIS');
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [expiredNotice, setExpiredNotice] = useState<string | null>(null);
  const [bookingSuccessData, setBookingSuccessData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const slotRollRef = useRef<HTMLDivElement | null>(null);

  // Sinkronisasi Poin & Profil Terbaru dari Server
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

  useEffect(() => {
    if (!customerUser) {
      setLoyaltyPoints(0);
      return;
    }
    setCustomerName(String(customerUser.name || customerUser.full_name || ''));
    if (customerUser.phone) setCustomerPhone(String(customerUser.phone));
    if (customerUser.haircut_notes) setHaircutNotes(String(customerUser.haircut_notes));
    setLoyaltyPoints(Number(customerUser.loyalty_points || 0));

    syncMemberProfile();
    window.addEventListener('focus', syncMemberProfile);
    return () => window.removeEventListener('focus', syncMemberProfile);
  }, [customerUser?.id]);

  // Pulihkan pilihan jadwal jika user baru saja selesai Login
  useEffect(() => {
    const savedDraft = sessionStorage.getItem('barber_booking_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.serviceId) setSelectedServiceId(String(parsed.serviceId));
        if (parsed.barberId) setSelectedBarberId(String(parsed.barberId));
        if (parsed.date) setSelectedDate(String(parsed.date));
        if (parsed.slot) setSelectedSlot(String(parsed.slot));
        sessionStorage.removeItem('barber_booking_draft');
      } catch {}
    }
  }, [customerUser]);

  // Ambil Katalog Layanan & Barber
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
          const brbList: Barber[] = data.data.barbers || [];

          setServices(srvList);
          setBarbers(brbList);

          setSelectedServiceId((prev) => prev || (srvList[0]?.id ?? ''));
          setSelectedBarberId((prev) => prev || (brbList[0]?.id ?? ''));
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

  // Fungsi Muat Ulang Slot Jam Ketersediaan
  const fetchSlots = async () => {
    if (!selectedBarberId || !selectedDate || !selectedServiceId) return;
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

      const targetService = services.find((s) => s.id === selectedServiceId);
      const duration = targetService?.duration_minutes || 45;

      const slotRes = await fetch(
        `${API_BASE}/bookings/availability?barberId=${selectedBarberId}&date=${selectedDate}&serviceId=${selectedServiceId}&duration=${duration}`
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
  }, [selectedBarberId, selectedDate, selectedServiceId, services]);

  // Countdown Timer 10 Menit (Berjalan Mundur Setiap Detik Tanpa Freeze)
  useEffect(() => {
    if (!pendingBooking) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingBooking]);

  // Otomatis Hanguskan Pesanan Saat Timer Mencapai 00:00
  useEffect(() => {
    if (!pendingBooking || remainingSeconds > 0) return;

    const targetId = pendingBooking.bookingId || pendingBooking.bookingCode;
    fetch(`${API_BASE}/bookings/${targetId}/cancel`, {
      method: 'POST',
    })
      .catch(() => {})
      .finally(() => {
        setPendingBooking(null);
        setPointsToRedeem(0);
        setExpiredNotice(
          'Batas waktu pembayaran 10 menit telah habis. Pesanan Anda otomatis hangus dan slot jam telah dibuka kembali.'
        );
        fetchSlots();
      });
  }, [remainingSeconds, pendingBooking]);

  const formatCountdown = (totalSecs: number) => {
    const safeSecs = Math.max(0, Number(totalSecs) || 0);
    const mins = Math.floor(safeSecs / 60);
    const secs = safeSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Proses Submit Reservasi (Wajib Login)
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpiredNotice(null);

    if (!customerUser || !customerUser.id) {
      sessionStorage.setItem(
        'barber_booking_draft',
        JSON.stringify({
          serviceId: selectedServiceId,
          barberId: selectedBarberId,
          date: selectedDate,
          slot: selectedSlot,
        })
      );
      if (onOpenAuth) {
        onOpenAuth('LOGIN');
      } else {
        alert('Silakan masuk (login) atau buat akun terlebih dahulu untuk memesan jadwal!');
      }
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Mohon lengkapi nama dan nomor WhatsApp Anda!');
      return;
    }

    if (barberOffNotice) {
      alert(`Peringatan: ${barberOffNotice}. Silakan pilih kapster lain atau ganti tanggal kunjungan.`);
      return;
    }

    if (!selectedSlot) {
      alert('Pilih jam kedatangan yang tersedia!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletId: '22222222-2222-2222-2222-222222222222',
          customerId: customerUser.id,
          customerName,
          customerPhone,
          barberId: selectedBarberId,
          serviceId: selectedServiceId,
          date: selectedDate,
          startTime: selectedSlot,
          haircutNotes,
        }),
      });

      const result = await res.json();
      if (result.success) {
        const selectedSrv = services.find((s) => s.id === selectedServiceId);
        const selectedBrb = barbers.find((b) => b.id === selectedBarberId);
        const safePrice = Number(result.data?.price || selectedSrv?.base_price || 0);

        setPointsToRedeem(0);
        setRemainingSeconds(600);
        setPendingBooking({
          bookingId: String(result.data?.bookingId || result.data?.id || result.data?.bookingCode || ''),
          bookingCode: String(result.data?.bookingCode || 'BRB-ONLINE'),
          date: String(result.data?.date || selectedDate).slice(0, 10),
          startTime: String(result.data?.startTime || selectedSlot).slice(0, 5),
          price: safePrice,
          customerName: String(customerName),
          serviceName: String(result.data?.serviceName || selectedSrv?.name || 'Treatment'),
          barberName: String(selectedBrb?.nickname || 'Kapster'),
        });
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

  // Konfirmasi Pembayaran + Tukar Poin
  const handleConfirmPayment = async () => {
    const targetId = pendingBooking?.bookingId || pendingBooking?.bookingCode;
    if (!targetId) return;

    setIsConfirmingPayment(true);
    try {
      const basePrice = Number(pendingBooking.price || 0);
      const maxPts = Math.min(loyaltyPoints, Math.floor(basePrice / 1000));
      const validPoints = Math.max(0, Math.min(pointsToRedeem, maxPts));
      const pointDiscount = validPoints * 1000;
      const finalPaid = Math.max(0, basePrice - pointDiscount);

      const res = await fetch(`${API_BASE}/bookings/${targetId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          pointsRedeemed: validPoints,
        }),
      });
      const result = await res.json();

      if (result.success) {
        // Update saldo poin lokal secara langsung
        const newPts =
          result.data?.remainingPoints !== undefined
            ? Number(result.data.remainingPoints)
            : Math.max(0, loyaltyPoints - validPoints);
        setLoyaltyPoints(newPts);
        syncMemberProfile();

        setBookingSuccessData({
          ...pendingBooking,
          paymentMethod,
          originalPrice: basePrice,
          pointsRedeemed: validPoints,
          discountAmount: pointDiscount,
          finalPrice: finalPaid,
        });
        setPendingBooking(null);
        setPointsToRedeem(0);
      } else {
        setPendingBooking(null);
        setPointsToRedeem(0);
        setExpiredNotice(String(result.message || 'Waktu pembayaran habis, pesanan hangus.'));
        fetchSlots();
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
      await fetch(`${API_BASE}/bookings/${targetId}/cancel`, {
        method: 'POST',
      }).catch(() => {});
    }
    setPendingBooking(null);
    setPointsToRedeem(0);
    fetchSlots();
  };

  // ==================== CONDITIONAL VIEWS ====================

  if (isLoadingCatalog) {
    return (
      <div className="flex-1 min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-gold-500" />
        <p className="text-xs font-mono">Memuat portal reservasi online...</p>
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

  // LAYAR MENUNGGU PEMBAYARAN (COUNTDOWN 10 MENIT + TUKAR POIN MEMBER)
  if (pendingBooking) {
    const originalPrice = Number(pendingBooking.price || 0);
    const maxRedeemablePoints = Math.min(loyaltyPoints, Math.floor(originalPrice / 1000));
    const appliedPoints = Math.max(0, Math.min(pointsToRedeem, maxRedeemablePoints));
    const pointsDiscountRp = appliedPoints * 1000;
    const finalBillRp = Math.max(0, originalPrice - pointsDiscountRp);

    return (
      <div className="flex-1 min-h-[100dvh] bg-zinc-950 flex items-center justify-center p-4 text-zinc-100 select-none overflow-y-auto">
        <div className="w-full max-w-md bg-zinc-900 border border-gold-500/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl my-auto">
          {/* Header & Sisa Waktu */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-black text-zinc-100">Selesaikan Pembayaran</h2>
                <p className="text-[11px] text-zinc-400">Slot jam sedang dikunci untuk Anda</p>
              </div>
            </div>
            <div className="text-right bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-xl">
              <div className="text-[9px] text-red-300 uppercase font-bold">Sisa Waktu</div>
              <div className="text-base font-mono font-black text-red-400">
                {formatCountdown(remainingSeconds)}
              </div>
            </div>
          </div>

          {/* Detail Ringkasan Booking & Potongan Poin */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Kode Booking</span>
              <span className="text-gold-400 font-bold">{String(pendingBooking.bookingCode)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Pelanggan</span>
              <span className="text-zinc-200">{String(pendingBooking.customerName)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Treatment & Kapster</span>
              <span className="text-zinc-200">
                {String(pendingBooking.serviceName)} • {String(pendingBooking.barberName)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Jadwal Dikunci</span>
              <span className="text-emerald-400 font-bold">
                {String(pendingBooking.date)} • {String(pendingBooking.startTime)} WITA
              </span>
            </div>

            <div className="border-t border-zinc-800/80 pt-2 space-y-1.5">
              <div className="flex justify-between text-zinc-400">
                <span className="font-sans">Harga Layanan</span>
                <span>Rp {originalPrice.toLocaleString('id-ID')}</span>
              </div>
              {appliedPoints > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span className="font-sans">Tukar Poin ({appliedPoints} Pts)</span>
                  <span>- Rp {pointsDiscountRp.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-zinc-800 pt-2 text-sm">
                <span className="text-zinc-200 font-sans font-bold">Total Tagihan</span>
                <span className="text-gold-400 font-black">
                  Rp {finalBillRp.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* FITUR TUKAR POIN MEMBER (1 Poin = Rp 1.000) */}
          <div className="p-3.5 bg-zinc-950 border border-gold-500/30 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-gold-400" />
                <div>
                  <div className="text-xs font-bold text-zinc-100">Tukar Poin Member</div>
                  <div className="text-[10px] text-zinc-400 font-mono">
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
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all border ${
                    appliedPoints > 0
                      ? 'bg-gold-500 text-zinc-950 border-gold-400'
                      : 'bg-zinc-900 text-gold-400 border-gold-500/40 hover:bg-zinc-800'
                  }`}
                >
                  {appliedPoints === maxRedeemablePoints ? 'Batalkan Poin' : 'Pakai Semua'}
                </button>
              ) : (
                <span className="text-[10px] text-zinc-500 font-mono">Belum ada poin</span>
              )}
            </div>

            {maxRedeemablePoints > 0 && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
                <span className="text-[11px] text-zinc-400">Jumlah Poin Ditukar:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPointsToRedeem(Math.max(0, appliedPoints - 1))}
                    className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-gold-500 flex items-center justify-center text-zinc-200"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={maxRedeemablePoints}
                    value={appliedPoints}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(maxRedeemablePoints, Number(e.target.value) || 0));
                      setPointsToRedeem(val);
                    }}
                    className="w-14 bg-zinc-900 border border-zinc-700 rounded-lg py-1 text-center font-mono text-xs font-bold text-gold-400 focus:outline-none focus:border-gold-500"
                  />
                  <button
                    type="button"
                    onClick={() => setPointsToRedeem(Math.min(maxRedeemablePoints, appliedPoints + 1))}
                    className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-gold-500 flex items-center justify-center text-zinc-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pilihan Metode Pembayaran */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase">
              Pilih Metode Pembayaran:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['QRIS', 'VA_BCA', 'EWALLET'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    paymentMethod === method
                      ? 'bg-gold-500/15 border-gold-500 text-gold-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {method === 'QRIS' ? 'QRIS Instan' : method === 'VA_BCA' ? 'BCA Virtual' : 'GoPay / OVO'}
                </button>
              ))}
            </div>

            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-center space-y-1.5">
              <QrCode className="w-16 h-16 text-zinc-200 mx-auto" />
              <p className="text-[11px] text-zinc-400">
                Scan QRIS atau selesaikan pembayaran <b>Rp {finalBillRp.toLocaleString('id-ID')}</b> sebelum waktu <b>10 menit</b> habis.
              </p>
            </div>
          </div>

          <div className="space-y-2">
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
                  <CreditCard className="w-4 h-4" /> SAYA SUDAH BAYAR (KONFIRMASI)
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancelPending}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4" /> Batalkan Pesanan & Ganti Jam
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LAYAR TIKET SUKSES RESERVASI (SETELAH LUNAS)
  if (bookingSuccessData) {
    return (
      <div className="flex-1 min-h-[100dvh] bg-zinc-950 flex items-center justify-center p-4 text-zinc-100 select-none">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 text-center shadow-2xl">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-black text-zinc-100">
              Pembayaran & Reservasi Berhasil!
            </h2>
            <p className="text-xs text-zinc-400">
              Jadwal kapster telah dikunci untuk Anda dan e-ticket dikirim via WhatsApp.
            </p>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 font-mono text-left space-y-2 text-xs">
            <div className="flex justify-between border-b border-zinc-800/80 pb-2">
              <span className="text-zinc-500 font-sans">Kode Booking</span>
              <span className="text-gold-400 font-bold">{String(bookingSuccessData.bookingCode)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Status Bayar</span>
              <span className="text-emerald-400 font-bold">
                LUNAS ({String(bookingSuccessData.paymentMethod)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Pelanggan</span>
              <span className="text-zinc-200">{String(bookingSuccessData.customerName)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Treatment</span>
              <span className="text-zinc-200">{String(bookingSuccessData.serviceName)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Kapster</span>
              <span className="text-zinc-200">{String(bookingSuccessData.barberName)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Jadwal</span>
              <span className="text-emerald-400 font-bold">
                {String(bookingSuccessData.date)} • {String(bookingSuccessData.startTime)} WITA
              </span>
            </div>
            {Number(bookingSuccessData.pointsRedeemed) > 0 && (
              <div className="flex justify-between text-emerald-400 border-t border-zinc-800/80 pt-2">
                <span className="font-sans">Potongan Poin ({bookingSuccessData.pointsRedeemed} Pts)</span>
                <span>- Rp {Number(bookingSuccessData.discountAmount || 0).toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-800/80 pt-2 font-bold">
              <span className="text-zinc-400 font-sans">Total Dibayar</span>
              <span className="text-gold-400">
                Rp {Number(bookingSuccessData.finalPrice ?? bookingSuccessData.price ?? 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                setBookingSuccessData(null);
                fetchSlots();
              }}
              className="w-full py-3 bg-gold-500 hover:bg-gold-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-gold-500/20 transition-all active:scale-95"
            >
              BUAT RESERVASI LAIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeService = services.find((s) => s.id === selectedServiceId);

  return (
    <div className="flex-1 min-h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col justify-between overflow-y-auto no-scrollbar select-none">
      {/* Top Navbar */}
      <header className="p-4 bg-zinc-900/80 border-b border-zinc-800 sticky top-0 z-20 backdrop-blur-md flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="font-black text-xs sm:text-sm tracking-wider text-gold-400 flex items-center gap-1.5">
            💈 PORTAL MEMBER & RESERVASI
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          <span className="text-[10px] text-zinc-400 font-mono hidden md:inline">
            Cabang Makassar
          </span>

          {customerUser ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/90 border border-zinc-700 rounded-xl text-xs font-bold text-zinc-100">
                <User className="w-3.5 h-3.5 text-gold-400" />
                <span>{customerName || customerUser.name || customerUser.full_name}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 bg-gold-500/10 border border-gold-500/30 rounded-xl text-xs font-mono font-bold text-gold-400">
                <Award className="w-3.5 h-3.5 text-gold-400" />
                <span>Poin Member: {loyaltyPoints} Pts</span>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-red-400 border border-zinc-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              )}
            </div>
          ) : (
            onOpenAuth && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenAuth('REGISTER')}
                  className="text-xs sm:text-sm font-bold text-zinc-300 hover:text-white transition-colors"
                >
                  Daftar Akun
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('LOGIN')}
                  className="bg-gold-500 hover:bg-gold-400 text-zinc-950 font-black text-xs px-4 py-1.5 rounded-full transition-all active:scale-95"
                >
                  Masuk / Login
                </button>
              </div>
            )
          )}
        </div>
      </header>

      {/* Konten Form */}
      <main className="p-4 sm:p-6 max-w-xl mx-auto w-full space-y-5">
        {expiredNotice && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-300 flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{expiredNotice}</span>
          </div>
        )}

        {/* Kartu Profil Member */}
        {customerUser ? (
          <div className="p-4 bg-zinc-900/90 border border-gold-500/30 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gold-500/20 border border-gold-500/40 text-gold-400 flex items-center justify-center font-black text-sm shrink-0">
                {String(customerName || customerUser.name || 'MB')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-black text-zinc-100">
                    {customerName || customerUser.name || customerUser.full_name}
                  </h3>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-gold-400 font-mono font-bold uppercase">
                    Member VIP
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {customerPhone || customerUser.phone || customerUser.email}
                </p>
              </div>
            </div>

            <div className="text-right bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800 shrink-0">
              <div className="text-[9px] text-zinc-400 uppercase font-bold flex items-center justify-end gap-1">
                <Award className="w-3 h-3 text-gold-400" /> Poin Member
              </div>
              <div className="text-sm font-black text-gold-400 font-mono">
                {loyaltyPoints} Pts
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-300">
              <span className="font-bold text-gold-400">Info Pemesanan:</span> Pilih jadwal Anda terlebih dahulu. Saat menekan tombol pesan, Anda wajib login/membuat akun.
            </div>
            {onOpenAuth && (
              <button
                type="button"
                onClick={() => onOpenAuth('LOGIN')}
                className="shrink-0 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-gold-400 font-bold text-xs rounded-xl border border-zinc-700"
              >
                Login
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmitBooking} className="space-y-5">
          {/* Langkah 1: Pilih Layanan */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-gold-400" /> 1. Pilih Treatment
            </label>
            <div className="grid grid-cols-2 gap-2">
              {services.map((srv) => (
                <div
                  key={srv.id}
                  onClick={() => setSelectedServiceId(srv.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    selectedServiceId === srv.id
                      ? 'bg-gold-500/10 border-gold-500 shadow-md shadow-gold-500/10'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-bold text-xs text-zinc-100">{srv.name}</div>
                  <div className="mt-2 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-400">{srv.duration_minutes} Mnt</span>
                    <span className="font-bold text-gold-400">
                      Rp {Number(srv.base_price).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Langkah 2: Pilih Kapster */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gold-400" /> 2. Pilih Barber / Kapster
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

          {/* Langkah 3: Pilih Tanggal & Jam */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gold-400" /> 3. Tanggal & Jam Kunjungan
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
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-gold-400" /> Menghitung ketersediaan slot...
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-center text-xs text-zinc-500 font-mono">
                  Tidak ada slot tersedia pada tanggal ini.
                </div>
              ) : (
                <div className="relative rounded-2xl border border-zinc-800/90 bg-zinc-950 overflow-hidden">
                  <div
                    ref={slotRollRef}
                    className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto no-scrollbar overscroll-contain touch-pan-y snap-y snap-mandatory p-2"
                  >
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot.startTime)}
                        className={`snap-start p-2 rounded-lg text-xs font-mono font-bold transition-all text-center ${
                          !slot.available
                            ? 'bg-zinc-900/40 text-zinc-600 border border-transparent cursor-not-allowed line-through'
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

          {/* Langkah 4: Data Kontak */}
          {customerUser && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gold-400" /> 4. Data Kontak & Preferensi
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

          {/* Ringkasan Biaya & Tombol Submit */}
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Estimasi Total Biaya (Wajib Bayar &le; 10 Menit)</span>
              <span className="font-mono font-black text-sm text-gold-400">
                Rp {Number(activeService?.base_price || 0).toLocaleString('id-ID')}
              </span>
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
                  <Lock className="w-4 h-4" /> LOGIN / DAFTAR AKUN UNTUK MEMESAN
                </>
              ) : (
                'PESAN & LANJUT KE PEMBAYARAN (KUNCI SLOT 10 MENIT)'
              )}
            </button>
          </div>
        </form>
      </main>

      <footer className="p-4 text-center text-[10px] text-zinc-600 border-t border-zinc-900">
        Barbershop OS • Slot Booking Dilindungi Sistem Lock 10 Menit
      </footer>
    </div>
  );
}