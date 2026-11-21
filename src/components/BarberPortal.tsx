import { useState, useEffect } from 'react';
import { 
  Scissors, Calendar, Coins, Clock, User,
  CheckCircle2, RefreshCw, LogOut, Award, FileText 
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api/v1`;

interface Props {
  currentUser: any;
  onLogout: () => void;
}

export default function BarberPortal({ currentUser, onLogout }: Props) {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'COMMISSIONS' | 'SCHEDULE'>('QUEUE');
  const [isLoading, setIsLoading] = useState(true);

  // Ambil ID kapster dari akun login atau gunakan ID Andi sebagai acuan default
  const barberId = currentUser?.barber_id || currentUser?.id || '44444444-4444-4444-4444-444444444444';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/barbers/portal?barberId=${barberId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Gagal mengambil data portal kapster:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [barberId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 gap-3 p-4">
        <RefreshCw className="w-8 h-8 animate-spin text-gold-400" />
        <span className="text-xs font-mono">Memuat jadwal & bagi hasil kapster...</span>
      </div>
    );
  }

  const barber = data?.barber || { nickname: currentUser.name || 'Kapster', level: 'SENIOR' };
  const stats = data?.stats || {};
  const queue = data?.queue || [];
  const history = data?.history || [];

  return (
    <div className="flex-1 bg-zinc-950 text-zinc-100 flex flex-col h-[100dvh] overflow-hidden select-none">
      {/* Header Khusus Kapster */}
      <header
        className="px-4 pb-3 border-b border-zinc-800 bg-zinc-900/90 flex justify-between items-center shrink-0"
        style={{ paddingTop: 'max(0.85rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 font-bold">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-black text-zinc-100">{barber.nickname}</h2>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-gold-400 font-mono font-bold">
                {barber.level}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">Portal Kerja & Komisi Mandiri</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-gold-400" />
          </button>
          <button
            onClick={onLogout}
            title="Keluar"
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 rounded-xl active:scale-95"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Konten Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Kartu Metrik Pendapatan Kapster */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-1">
            <div className="flex justify-between items-center text-zinc-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Komisi Siap Cair</span>
              <Coins className="w-4 h-4 text-gold-400" />
            </div>
            <div className="text-lg font-black text-gold-400 font-mono">
              Rp {Number(stats.pending_commission || 0).toLocaleString('id-ID')}
            </div>
            <p className="text-[9px] text-zinc-500">Menunggu pencairan kasir</p>
          </div>

          <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-1">
            <div className="flex justify-between items-center text-zinc-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Telah Dicairkan</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-black text-emerald-400 font-mono">
              Rp {Number(stats.paid_commission || 0).toLocaleString('id-ID')}
            </div>
            <p className="text-[9px] text-zinc-500">Total komisi diterima</p>
          </div>
        </div>

        {/* Tampilan Tab Antrean Klien */}
        {activeTab === 'QUEUE' && (
          <div className="space-y-3">
            {queue.length === 0 ? (
              <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 space-y-2">
                <Calendar className="w-8 h-8 opacity-30 mx-auto" />
                <p className="text-xs font-medium">Belum ada antrean klien aktif saat ini.</p>
                <p className="text-[10px] text-zinc-600">Booking baru akan otomatis muncul di sini.</p>
              </div>
            ) : (
              queue.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-4 space-y-3 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-100">{item.customer_name}</span>
                        <span className="text-[9px] font-mono text-gold-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                          {item.booking_code}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {item.service_name} ({item.duration_minutes} Menit)
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-gold-400 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" /> {item.start_time?.slice(0, 5)} WITA
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {item.booking_date}
                      </div>
                    </div>
                  </div>

                  {/* Barber Notes Preview */}
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-[11px] space-y-1">
                    <span className="font-bold uppercase tracking-wider text-[9px] text-gold-400 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Model / Preferensi Klien:
                    </span>
                    <p className="text-zinc-300 italic text-xs leading-relaxed">
                      "{item.haircut_notes || 'Tidak ada catatan preferensi khusus.'}"
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tampilan Tab Riwayat Bagi Hasil */}
        {activeTab === 'COMMISSIONS' && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
                <Coins className="w-8 h-8 opacity-30 mx-auto mb-2" />
                <p className="text-xs">Belum ada riwayat transaksi komisi.</p>
              </div>
            ) : (
              history.map((h: any) => (
                <div
                  key={h.id}
                  className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex justify-between items-center text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-zinc-200">{h.item_name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {h.invoice_number || 'TRX'} • Bagi Hasil {h.rate_applied}%
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-gold-400 font-mono">
                      +Rp {Number(h.commission_amount).toLocaleString('id-ID')}
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        h.status === 'PAID_OUT'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-gold-500/10 text-gold-400'
                      }`}
                    >
                      {h.status === 'PAID_OUT' ? 'LUNAS' : 'PENDING'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tampilan Tab Jadwal & Profil Kapster */}
        {activeTab === 'SCHEDULE' && (
          <div className="space-y-3">
            <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-400 font-black">
                  {barber.nickname?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-100">{barber.nickname}</h3>
                  <p className="text-[11px] text-gold-400 font-mono uppercase">Level: {barber.level}</p>
                </div>
              </div>
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Jam Operasional Default</span>
                  <span className="font-mono text-zinc-200 font-bold">09:00 - 21:00 WITA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Status Roster & Cuti</span>
                  <span className="font-mono text-emerald-400 font-bold">Dikelola oleh Owner</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Keluar dari Akun Kapster
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar Kapster (3 Tab: Antrean, Komisi, Jadwal) */}
      <nav
        className="border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-md px-2 pt-2 grid grid-cols-3 shrink-0"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {[
          { id: 'QUEUE', label: 'Antrean', icon: Calendar, badge: queue.length },
          { id: 'COMMISSIONS', label: 'Komisi', icon: Coins, badge: 0 },
          { id: 'SCHEDULE', label: 'Jadwal', icon: User, badge: 0 },
        ].map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as 'QUEUE' | 'COMMISSIONS' | 'SCHEDULE')}
              className="flex flex-col items-center gap-1 py-1 active:scale-95 transition-all"
            >
              <div className={`relative px-4 py-1 rounded-2xl ${isActive ? 'bg-gold-500/15 text-gold-400' : 'text-zinc-500'}`}>
                <IconComp className="w-5 h-5" />
                {tab.badge > 0 && (
                  <span className="absolute -top-0.5 right-1 min-w-[16px] h-4 px-1 rounded-full bg-gold-500 text-zinc-950 font-mono font-black text-[9px] flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'text-gold-400' : 'text-zinc-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}