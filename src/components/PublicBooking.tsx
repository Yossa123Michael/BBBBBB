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
  // State Katalog & Seleksi
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

  // State Formulir Pelanggan (Otomatis terisi jika customerUser tersedia)
  const [customerName, setCustomerName] = useState(
    customerUser?.name || customerUser?.full_name || ''
  );
  const [customerPhone, setCustomerPhone] = useState(
    customerUser?.phone || ''
  );
  const [haircutNotes, setHaircutNotes] = useState(
    customerUser?.haircut_notes || ''
  );
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(
  Number(customerUser?.loyalty_points || 0)
);

useEffect(() => {
  if (!customerUser?.id) return;
  const syncProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/customer/profile?id=${customerUser.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setLoyaltyPoints(Number(json.data.loyalty_points || 0));
        if (json.data.phone) setCustomerPhone(json.data.phone);
        if (json.data.haircut_notes) setHaircutNotes(json.data.haircut_notes);
        localStorage.setItem('barber_auth_user', JSON.stringify({ ...customerUser, ...json.data }));
      }
    } catch {}
  };
  syncProfile();
  window.addEventListener('focus', syncProfile);
  return () => window.removeEventListener('focus', syncProfile);
}, [customerUser?.id]);

  useEffect(() => {
    if (customerUser) {
      setCustomerName(customerUser.name || customerUser.full_name || '');
      setCustomerPhone(customerUser.phone || '');
      setHaircutNotes(customerUser.haircut_notes || '');
    }
  }, [customerUser]);

  // State Status & Loading
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Ref & State untuk Roll / Swipe Kotak Jam (Scroll Lock di PC & Swipe di Mobile tanpa Scrollbar)
  const slotRollRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragScrollTopRef = useRef(0);

  useEffect(() => {
    const el = slotRollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Kunci scroll halaman utama saat kursor berada di dalam kotak PILIH JAM
      e.preventDefault();
      e.stopPropagation();
      el.scrollBy({
        top: e.deltaY * 0.65,
        behavior: 'smooth',
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [availableSlots, isLoadingSlots, barberOffNotice]);

  // 1. Ambil Katalog Layanan & Barber dari Backend
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

          if (srvList.length > 0) setSelectedServiceId(srvList[0].id);
          if (brbList.length > 0) setSelectedBarberId(brbList[0].id);
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

  // 2. Ambil Slot Jam Ketersediaan & Validasi Roster Libur Otomatis
  useEffect(() => {
    if (!selectedBarberId || !selectedDate || !selectedServiceId) return;

    let isMounted = true;
    setIsLoadingSlots(true);
    setSelectedSlot('');
    setBarberOffNotice(null);

    const checkRosterAndSlots = async () => {
      try {
        // Cek apakah kapster libur rutin atau sedang cuti pada tanggal ini
        const rosterRes = await fetch(
          `${API_BASE}/roster/check-availability?barberId=${selectedBarberId}&date=${selectedDate}`
        );
        const rosterData = await rosterRes.json();

        if (!isMounted) return;

        // Jika kapster libur/cuti, tampilkan notifikasi dan kunci slot
        if (rosterData.success && !rosterData.isAvailable) {
          setBarberOffNotice(
            rosterData.reason || 'Kapster sedang tidak bertugas.'
          );
          setAvailableSlots([]);
          setIsLoadingSlots(false);
          return;
        }

        // Jika kapster masuk bertugas, hitung ketersediaan slot jam
        const targetService = services.find((s) => s.id === selectedServiceId);
        const duration = targetService?.duration_minutes || 45;

        const slotRes = await fetch(
          `${API_BASE}/bookings/availability?barberId=${selectedBarberId}&date=${selectedDate}&serviceId=${selectedServiceId}&duration=${duration}`
        );
        const slotData = await slotRes.json();

        if (!isMounted) return;

        if (slotData.success && Array.isArray(slotData.data)) {
          setAvailableSlots(slotData.data);
          const firstAvailable = slotData.data.find(
            (s: TimeSlot) => s.available
          );
          if (firstAvailable) setSelectedSlot(firstAvailable.startTime);
        } else {
          setAvailableSlots([]);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Fetch availability error:', err);
        setAvailableSlots([]);
      } finally {
        if (isMounted) setIsLoadingSlots(false);
      }
    };

    checkRosterAndSlots();

    return () => {
      isMounted = false;
    };
  }, [selectedBarberId, selectedDate, selectedServiceId, services]);

  // 3. Proses Submit Reservasi
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Mohon lengkapi nama dan nomor WhatsApp Anda!');
      return;
    }

    if (barberOffNotice) {
      alert(
        `Peringatan: ${barberOffNotice}. Silakan pilih kapster lain atau ganti tanggal kunjungan.`
      );
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
          customerId: customerUser?.id || null,
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
        setBookingSuccessData({
          ...result.data,
          customerName,
          serviceName: services.find((s) => s.id === selectedServiceId)?.name,
          barberName: barbers.find((b) => b.id === selectedBarberId)?.nickname,
        });
      } else {
        alert('Gagal reservasi: ' + result.message);
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Layar Loading Awal
  if (isLoadingCatalog) {
    return (
      <div className="flex-1 min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-gold-500" />
        <p className="text-xs font-mono">Memuat portal reservasi online...</p>
      </div>
    );
  }

  // Layar Jika Katalog Gagal Dimuat
  if (errorMsg && services.length === 0) {
    return (
      <div className="flex-1 min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-300 gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <div className="space-y-1">
          <h3 className="font-bold text-sm text-zinc-100">
            Portal Belum Dapat Diakses
          </h3>
          <p className="text-xs text-zinc-400 font-mono">{errorMsg}</p>
        </div>
        {(onBack || onLogout) && (
          <button
            onClick={onBack || onLogout}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold rounded-xl text-zinc-200"
          >
            Kembali ke Halaman Login
          </button>
        )}
      </div>
    );
  }

  // Layar Tiket Sukses Reservasi
  if (bookingSuccessData) {
    return (
      <div className="flex-1 min-h-[100dvh] bg-zinc-950 flex items-center justify-center p-4 text-zinc-100 select-none">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 text-center shadow-2xl">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-black text-zinc-100">
              Reservasi Berhasil!
            </h2>
            <p className="text-xs text-zinc-400">
              Konfirmasi booking otomatis dikirimkan via WhatsApp.
            </p>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 font-mono text-left space-y-2 text-xs">
            <div className="flex justify-between border-b border-zinc-800/80 pb-2">
              <span className="text-zinc-500 font-sans">Kode Booking</span>
              <span className="text-gold-400 font-bold">
                {bookingSuccessData.bookingCode}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Pelanggan</span>
              <span className="text-zinc-200">
                {bookingSuccessData.customerName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Treatment</span>
              <span className="text-zinc-200">
                {bookingSuccessData.serviceName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Kapster</span>
              <span className="text-zinc-200">
                {bookingSuccessData.barberName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Jadwal</span>
              <span className="text-emerald-400 font-bold">
                {bookingSuccessData.date} • {bookingSuccessData.startTime} WITA
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                setBookingSuccessData(null);
                if (!customerUser) {
                  setCustomerName('');
                  setCustomerPhone('');
                  setHaircutNotes('');
                }
              }}
              className="w-full py-3 bg-gold-500 hover:bg-gold-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-gold-500/20 transition-all active:scale-95"
            >
              BUAT RESERVASI LAIN
            </button>
            {(onBack || onLogout) && (
              <button
                onClick={onBack || onLogout}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-all"
              >
                {onLogout ? 'Keluar dari Akun Member' : 'Kembali ke Halaman Utama'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Tampilan Formulir Reservasi Utama
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
                <span>{customerUser.name || customerUser.full_name}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 bg-gold-500/10 border border-gold-500/30 rounded-xl text-xs font-mono font-bold text-gold-400">
                <Award className="w-3.5 h-3.5 text-gold-400" />
                <span>
                  Poin Member: {loyaltyPoints} Pts
                </span>
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
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => onOpenAuth('REGISTER')}
                  className="text-xs sm:text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  Daftar
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('LOGIN')}
                  className="bg-white hover:bg-zinc-200 text-black font-bold text-xs sm:text-sm px-5 py-1.5 rounded-full transition-all active:scale-95"
                >
                  Masuk
                </button>
              </div>
            )
          )}
        </div>
      </header>

      {/* Konten Form */}
      <main className="p-4 sm:p-6 max-w-xl mx-auto w-full space-y-5">
        {/* Kartu Profil Member (Muncul jika Pelanggan Login via Google/Facebook/No HP/ID) */}
        {customerUser && (
          <div className="p-4 bg-zinc-900/90 border border-gold-500/30 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gold-500/20 border border-gold-500/40 text-gold-400 flex items-center justify-center font-black text-sm shrink-0">
                {(customerUser.name || customerUser.full_name || 'MB')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-black text-zinc-100">
                    {customerUser.name || customerUser.full_name}
                  </h3>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-gold-400 font-mono font-bold uppercase">
                    {customerUser.authProvider === 'GOOGLE'
                      ? 'Google Account'
                      : customerUser.authProvider === 'FACEBOOK'
                      ? 'Facebook Account'
                      : 'Member VIP'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {customerUser.phone || customerUser.email}
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
                  <div className="font-bold text-xs text-zinc-100">
                    {srv.name}
                  </div>
                  <div className="mt-2 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-400">
                      {srv.duration_minutes} Mnt
                    </span>
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
              <User className="w-3.5 h-3.5 text-gold-400" /> 2. Pilih Barber /
              Kapster
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
                  <div className="font-bold text-xs text-zinc-100">
                    {brb.nickname}
                  </div>
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
              <Calendar className="w-3.5 h-3.5 text-gold-400" /> 3. Tanggal & Jam
              Kunjungan
            </label>
            <input
              type="date"
              required
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-gold-500 font-mono cursor-pointer"
            />

            {/* Pilihan Slot Jam & Peringatan Libur */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-zinc-400 font-bold block">
                PILIH JAM:
              </span>

              {barberOffNotice ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center space-y-1">
                  <div className="text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Kapster Tidak Bertugas
                  </div>
                  <p className="text-[11px] text-zinc-200">{barberOffNotice}</p>
                  <p className="text-[10px] text-zinc-500">
                    Silakan pilih kapster lain atau tentukan tanggal kunjungan
                    yang berbeda.
                  </p>
                </div>
              ) : isLoadingSlots ? (
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-center text-xs text-zinc-500 flex items-center justify-center gap-2 font-mono">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-gold-400" />{' '}
                  Menghitung ketersediaan slot...
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-center text-xs text-zinc-500 font-mono">
                  Tidak ada slot tersedia pada tanggal ini.
                </div>
              ) : (
                <div className="relative rounded-2xl border border-zinc-800/90 bg-zinc-950 overflow-hidden">
                  {/* Efek Bayangan Roll Atas & Bawah */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-zinc-950 to-transparent z-10" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-zinc-950 to-transparent z-10" />

                  <div
                    ref={slotRollRef}
                    onMouseDown={(e) => {
                      if (!slotRollRef.current) return;
                      isDraggingRef.current = true;
                      dragStartYRef.current = e.clientY;
                      dragScrollTopRef.current = slotRollRef.current.scrollTop;
                    }}
                    onMouseMove={(e) => {
                      if (!isDraggingRef.current || !slotRollRef.current) return;
                      const delta = e.clientY - dragStartYRef.current;
                      slotRollRef.current.scrollTop = dragScrollTopRef.current - delta;
                    }}
                    onMouseUp={() => {
                      isDraggingRef.current = false;
                    }}
                    onMouseLeave={() => {
                      isDraggingRef.current = false;
                    }}
                    className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto no-scrollbar overscroll-contain touch-pan-y snap-y snap-mandatory p-2 cursor-grab active:cursor-grabbing"
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

          {/* Langkah 4: Data Pelanggan */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold-400" /> 4. Data Kontak
              & Preferensi
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
              placeholder="Catatan preferensi gaya rambut (contoh: Fade tipis samping, jangan potong atas)..."
              value={haircutNotes}
              onChange={(e) => setHaircutNotes(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-gold-500 resize-none"
            />
          </div>

          {/* Ringkasan Biaya & Tombol Submit */}
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Estimasi Total Biaya</span>
              <span className="font-mono font-black text-sm text-gold-400">
                Rp{' '}
                {Number(activeService?.base_price || 0).toLocaleString('id-ID')}
              </span>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !selectedSlot || !!barberOffNotice}
              className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-gold-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                'KONFIRMASI BOOKING SEKARANG'
              )}
            </button>
          </div>
        </form>
      </main>

      <footer className="p-4 text-center text-[10px] text-zinc-600 border-t border-zinc-900">
        Barbershop OS • Powered by Automated WhatsApp Gateway
      </footer>
    </div>
  );
}
