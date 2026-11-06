import { useState, useEffect } from 'react';
import { 
  Award, CheckCircle, Printer, X, RefreshCw, 
  Scissors, ChevronRight, Search, ArrowLeft 
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api/v1`;

interface BarberSummary {
  barber_id: string;
  nickname: string;
  level: string;
  pending_item_count: string;
  pending_commission: string;
  total_paid_commission: string;
}

interface CommissionDetail {
  id: string;
  commission_amount: string;
  rate_applied: string;
  calculation_base: string;
  created_at: string;
  invoice_number: string;
  item_name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export default function CommissionPayoutModal({ isOpen, onClose, currentUser }: Props) {
  const [summaryList, setSummaryList] = useState<BarberSummary[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<BarberSummary | null>(null);
  const [details, setDetails] = useState<CommissionDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/commissions/summary?outletId=22222222-2222-2222-2222-222222222222`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSummaryList(json.data);
      } else {
        setSummaryList([]);
      }
    } catch (err) {
      console.error('Gagal mengambil ringkasan komisi:', err);
      setSummaryList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDetails = async (barber: BarberSummary) => {
    setSelectedBarber(barber);
    try {
      const res = await fetch(`${API_BASE}/commissions/details/${barber.barber_id}?outletId=22222222-2222-2222-2222-222222222222`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDetails(json.data);
      } else {
        setDetails([]);
      }
    } catch (err) {
      console.error('Gagal mengambil rincian komisi:', err);
      setDetails([]);
    }
  };

  const handlePayout = async () => {
    if (!selectedBarber || Number(selectedBarber.pending_commission) <= 0) return;

    const confirmPayout = window.confirm(
      `Cairkan komisi ${selectedBarber.nickname} sebesar Rp ${Number(selectedBarber.pending_commission).toLocaleString('id-ID')}?`
    );
    if (!confirmPayout) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/commissions/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletId: '22222222-2222-2222-2222-222222222222',
          barberId: selectedBarber.barber_id,
        })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message || 'Pencairan komisi berhasil diproses!');
        setSelectedBarber(null);
        setDetails([]);
        fetchSummary();
      } else {
        alert('Gagal: ' + json.message);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
      setSelectedBarber(null);
      setDetails([]);
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredBarbers = summaryList.filter(b => 
    b.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 select-none">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl p-4 sm:p-6 space-y-4 shadow-2xl flex flex-col h-[90vh] max-h-[850px] overflow-hidden">
        
        {/* Header Modal */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-gold-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base text-zinc-100">Rekap & Pencairan Komisi Kapster</h3>
              <p className="text-[10px] sm:text-xs text-zinc-400">Kelola dan cetak slip pembagian komisi layanan & retail</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout (Responsif Mobile & Desktop) */}
        <div className="flex flex-col md:grid md:grid-cols-5 gap-3 flex-1 overflow-hidden">
          
          {/* Kolom Kiri: Pencarian & Daftar Kapster */}
          <div className={`md:col-span-2 border-r-0 md:border-r border-zinc-800 md:pr-4 flex-col gap-2 overflow-hidden ${
            selectedBarber ? 'hidden md:flex' : 'flex flex-1'
          }`}>
            {/* Input Pencarian Kapster */}
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama kapster..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-8 pr-3 text-xs text-zinc-200 focus:outline-none focus:border-gold-500"
              />
            </div>

            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mt-1 shrink-0">
              Daftar Kapster ({filteredBarbers.length})
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isLoading ? (
                <div className="text-xs text-zinc-500 py-8 text-center flex flex-col items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-gold-400" />
                  <span>Memuat data komisi kapster...</span>
                </div>
              ) : filteredBarbers.length === 0 ? (
                <div className="text-xs text-zinc-500 py-8 text-center">
                  Tidak ada kapster ditemukan.
                </div>
              ) : (
                filteredBarbers.map((b) => (
                  <div
                    key={b.barber_id}
                    onClick={() => fetchDetails(b)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between active:scale-[0.99] ${
                      selectedBarber?.barber_id === b.barber_id
                        ? 'bg-gold-500/10 border-gold-500 text-gold-400'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5 text-zinc-100">
                        <Scissors className="w-3 h-3 text-gold-500" />
                        {b.nickname}
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-normal">
                          {b.level}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-gold-400 font-bold mt-1">
                        Rp {Number(b.pending_commission).toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-zinc-500">{b.pending_item_count} item belum dicairkan</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Kolom Kanan: Rincian Tiket & Slip Cetak */}
          <div className={`md:col-span-3 flex-col justify-between overflow-hidden md:pl-2 ${
            selectedBarber ? 'flex flex-1' : 'hidden md:flex'
          }`}>
            {selectedBarber ? (
              <div className="flex flex-col h-full space-y-3 overflow-hidden">
                {/* Tombol Back khusus tampilan layar HP */}
                <button
                  onClick={() => setSelectedBarber(null)}
                  className="md:hidden flex items-center gap-1.5 text-xs text-gold-400 font-bold py-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Kapster
                </button>

                {/* Banner Status Komisi */}
                <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800 shrink-0">
                  <div>
                    <div className="text-xs font-bold text-zinc-100">Rincian Komisi: {selectedBarber.nickname}</div>
                    <div className="text-[10px] text-zinc-400">Total Siap Cair:</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm sm:text-base font-black text-gold-400 font-mono">
                      Rp {Number(selectedBarber.pending_commission).toLocaleString('id-ID')}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-bold">Status: SIAP CAIR</div>
                  </div>
                </div>

                {/* Slip Komisi */}
                <div
                  id="thermal-receipt"
                  className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-2 flex-1 overflow-y-auto"
                >
                  <div className="text-center pb-2 border-b border-dashed border-zinc-700">
                    <div className="font-bold text-sm text-zinc-100">SLIP KOMISI KAPSTER</div>
                    <div className="text-[10px] text-zinc-400">BARBERSHOP OS - CABANG MAKASSAR</div>
                    <div className="text-[10px] text-zinc-400">Tanggal: {new Date().toLocaleDateString('id-ID')}</div>
                  </div>

                  <div className="text-[10px] border-b border-dashed border-zinc-700 pb-2 space-y-0.5 text-zinc-400">
                    <div className="flex justify-between">
                      <span>Kapster: {selectedBarber.nickname}</span>
                      <span>Level: {selectedBarber.level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Diproses Oleh: {currentUser?.name || 'Kasir'}</span>
                      <span>Item: {details.length} transaksi</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 py-1 border-b border-dashed border-zinc-700">
                    {details.length === 0 ? (
                      <div className="text-center py-4 text-zinc-500 text-xs">
                        Tidak ada detail item yang ditemukan.
                      </div>
                    ) : (
                      details.map((item) => (
                        <div key={item.id} className="space-y-0.5">
                          <div className="flex justify-between font-bold text-zinc-200">
                            <span className="truncate max-w-[180px]">{item.item_name}</span>
                            <span className="text-gold-400">Rp {Number(item.commission_amount).toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-zinc-500">
                            <span>{item.invoice_number}</span>
                            <span>Base: Rp {Number(item.calculation_base).toLocaleString('id-ID')} ({item.rate_applied}%)</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 text-center text-[9px] text-zinc-500 space-y-0.5">
                    <div>Slip resmi pencairan komisi operasional barbershop.</div>
                    <div>Harap simpan slip ini sebagai bukti penggajian.</div>
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="flex gap-2 pt-1 shrink-0">
                  <button
                    onClick={() => window.print()}
                    disabled={details.length === 0}
                    className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5 text-gold-400" /> Cetak Slip
                  </button>
                  <button
                    onClick={handlePayout}
                    disabled={isProcessing || Number(selectedBarber.pending_commission) <= 0}
                    className="flex-1 py-2.5 bg-gold-500 hover:bg-gold-400 text-zinc-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-gold-500/20 active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Cairkan Komisi
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs gap-2 p-6 text-center">
                <Award className="w-8 h-8 opacity-20" />
                <p>Pilih kapster di sisi kiri untuk meninjau rincian komisi & mencetak slip.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}