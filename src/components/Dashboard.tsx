import { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Wallet, Award, 
  RefreshCw, Layers, ArrowUpRight, PieChart, Download, FileSpreadsheet, AlertCircle, Ticket, Database, Trash2
} from 'lucide-react';

import { API_BASE } from '../config/api';

interface ExpenseCategoryItem {
  category: string;
  totalAmount: number;
  itemCount: number;
}

interface DiscountAuditItem {
  id: string;
  invoice_number: string;
  trx_time: string;
  customer_name: string;
  subtotal: number;
  discount_total: number;
  grand_total: number;
  voucher_code: string;
  discount_reason: string;
}

interface DashboardMetrics {
  totalRevenue: number;
  totalDiscounts?: number;
  discountAuditLogs?: DiscountAuditItem[];
  totalTrx: number;
  totalCommissions: number;
  totalCogs: number;
  totalExpenses: number;
  netProfit: number;
  expenseBreakdown: ExpenseCategoryItem[];
}

const CATEGORY_LABELS: Record<string, string> = {
  LISTRIK: '⚡ Token Listrik',
  LAUNDRY: '🧺 Laundry Handuk',
  PERLENGKAPAN: '✂️ Silet & Alat Cukur',
  AIR_MINERAL: '💧 Air Galon Minum',
  LAINNYA: '📦 Biaya Lainnya',
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // State Panel Database Bahasa Indonesia (Untuk Pemilik Proyek)
  const [showDbModal, setShowDbModal] = useState(false);
  const [dbOverview, setDbOverview] = useState<any>(null);
  const [activeDbTab, setActiveDbTab] = useState<'katalog' | 'transaksi' | 'komisi' | 'pelanggan'>('katalog');

  const handleOpenDbModal = async () => {
    setShowDbModal(true);
    try {
      const res = await fetch(`${API_BASE}/admin/db-overview`);
      const json = await res.json();
      if (json.success) setDbOverview(json.data);
    } catch (err) {
      console.error('Gagal memuat ringkasan database:', err);
    }
  };

  const handleResetDummyTransactions = async () => {
    const confirmText = prompt(
      'PERINGATAN: Seluruh riwayat transaksi percobaan, komisi, dan pengeluaran akan dihapus kembali ke Rp 0 (Data Layanan, Produk, Kapster, & Voucher TETAP AMAN).\n\nKetik RESET untuk melanjutkan:'
    );
    if (confirmText !== 'RESET') return;

    try {
      const res = await fetch(`${API_BASE}/admin/reset-transactions`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        setShowDbModal(false);
        fetchDashboardData();
      } else {
        alert('Gagal reset: ' + json.message);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/dashboard/summary?outletId=22222222-2222-2222-2222-222222222222`);
      
      if (!res.ok) {
        throw new Error(`Server merespons dengan status HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setMetrics(json.data);
      } else {
        setErrorMsg(json.message || 'Gagal mengambil data analitik dari server');
      }
    } catch (err: any) {
      console.error('Gagal mengambil ringkasan analitik:', err);
      setErrorMsg(err.message || 'Gagal terhubung ke endpoint dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDownloadReport = (type: 'sales' | 'expenses' | 'commissions') => {
    const url = `${API_BASE}/reports/${type}/csv?outletId=22222222-2222-2222-2222-222222222222`;
    window.open(url, '_blank');
  };

  // 1. Kondisi Sedang Memuat
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 gap-3 p-4">
        <RefreshCw className="w-8 h-8 animate-spin text-gold-400" />
        <span className="text-xs font-mono">Menghitung laba rugi dan analitik outlet...</span>
      </div>
    );
  }

  // 2. Kondisi Terjadi Kendala Koneksi / Data Kosong (Tidak lagi mengunci layar berputar terus)
  if (errorMsg || !metrics) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-300 p-6 space-y-4 text-center">
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
          <AlertCircle className="w-8 h-8 mx-auto" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-sm text-zinc-100">Gagal Memuat Analitik Dashboard</h3>
          <p className="text-xs text-zinc-400 font-mono max-w-sm">{errorMsg || 'Data analitik belum tersedia'}</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-gold-500/20"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Coba Muat Ulang
        </button>
      </div>
    );
  }

  // 3. Tampilan Utama Dashboard (Responsif Mobile & Desktop)
  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-4 sm:p-6 space-y-5 select-none">
      {/* Header Dashboard & Export Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-100 flex items-center gap-2">
            📊 DASHBOARD PERFORMA & KEUANGAN OWNER
          </h2>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
            Ikhtisar omzet kasir, beban pengeluaran riil, dan margin profit bersih cabang
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end overflow-x-auto">
          {/* Tombol Ekspor CSV */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => handleDownloadReport('sales')}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-zinc-300 hover:text-gold-400 hover:bg-zinc-800 transition-all flex items-center gap-1"
              title="Unduh Rekap Penjualan Kasir"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Sales
            </button>
            <span className="text-zinc-700">|</span>
            <button
              onClick={() => handleDownloadReport('expenses')}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-zinc-300 hover:text-gold-400 hover:bg-zinc-800 transition-all flex items-center gap-1"
              title="Unduh Rekap Pengeluaran Operasional"
            >
              <Download className="w-3.5 h-3.5 text-red-400" /> Beban
            </button>
            <span className="text-zinc-700">|</span>
            <button
              onClick={() => handleDownloadReport('commissions')}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-zinc-300 hover:text-gold-400 hover:bg-zinc-800 transition-all flex items-center gap-1"
              title="Unduh Rekap Komisi Kapster"
            >
              <Award className="w-3.5 h-3.5 text-blue-400" /> Komisi
            </button>
          </div>

          <button
            onClick={fetchDashboardData}
            className="p-2 sm:p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-gold-500/50 text-xs font-bold text-zinc-300 flex items-center gap-2 transition-all active:scale-95 shrink-0"
            title="Muat Ulang Data"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gold-400" />
          </button>
          <button
          onClick={handleOpenDbModal}
          className="px-3 py-2 rounded-xl bg-gold-500/10 border border-gold-500/30 hover:bg-gold-500/20 text-xs font-bold text-gold-400 flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
          title="Lihat Tabel Database Bahasa Indonesia & Reset Data Uji Coba"
        >
          <Database className="w-3.5 h-3.5" /> Database Toko
        </button>
        </div>
      </div>

      {/* 4 Kartu Metrik Utama (Mobile: 1/2 Kolom, Desktop: 4 Kolom) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Omzet */}
        <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-zinc-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Total Omzet Kasir</span>
            <div className="p-2 rounded-xl bg-gold-500/10 text-gold-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-100 font-mono">
            Rp {(metrics.totalRevenue || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>{metrics.totalTrx || 0} transaksi berhasil</span>
          </div>
        </div>

        {/* Total Komisi Kapster */}
        <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-zinc-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Komisi Kapster</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-400 font-mono">
            -Rp {(metrics.totalCommissions || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            Beban bagi hasil jasa & produk
          </div>
        </div>

        {/* Biaya Operasional */}
        <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-zinc-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Beban Operasional</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-400 font-mono">
            -Rp {(metrics.totalExpenses || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            Beban utilitas, silet, laundry, dll.
          </div>
        </div>

        {/* Laba Bersih Riil */}
        <div className={`p-4 rounded-2xl border space-y-2 ${
          (metrics.netProfit || 0) >= 0 
            ? 'bg-emerald-950/20 border-emerald-500/30' 
            : 'bg-red-950/20 border-red-500/30'
        }`}>
          <div className="flex justify-between items-center text-zinc-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-emerald-400">Laba Bersih Riil</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono ${
            (metrics.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            Rp {(metrics.netProfit || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            Omzet dikurangi HPP, komisi, & beban
          </div>
        </div>
      </div>

      {/* Grid Rincian Keuangan & Pengeluaran */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Rincian Struktur Beban & HPP */}
        <div className="lg:col-span-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Layers className="w-4 h-4 text-gold-400" />
            <h3 className="font-bold text-xs sm:text-sm text-zinc-100">Struktur Rekonsiliasi Laba Rugi</h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400 font-sans">Gross Revenue (Omzet Kasir)</span>
              <span className="font-bold text-zinc-200">+Rp {(metrics.totalRevenue || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400 font-sans">Total Diskon & Promo Diberikan (Info Audit)</span>
              <span className="font-bold text-amber-400">Rp {(metrics.totalDiscounts || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400 font-sans">Harga Pokok Penjualan (HPP)</span>
              <span className="font-bold text-red-400">-Rp {(metrics.totalCogs || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400 font-sans">Alokasi Komisi Kapster</span>
              <span className="font-bold text-red-400">-Rp {(metrics.totalCommissions || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400 font-sans">Total Beban Operasional</span>
              <span className="font-bold text-red-400">-Rp {(metrics.totalExpenses || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between pt-2 text-xs sm:text-sm font-bold">
              <span className="text-zinc-100 font-sans">Estimasi Keuntungan Bersih</span>
              <span className={(metrics.netProfit || 0) >= 0 ? 'text-emerald-400 font-black' : 'text-red-400 font-black'}>
                Rp {(metrics.netProfit || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Panel Log Audit Diskon & Voucher Kasir */}
    <div className="lg:col-span-5 order-last bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-gold-400" />
          <h3 className="font-bold text-xs sm:text-sm text-zinc-100">
            Log Audit Diskon Kasir & Klaim Voucher (10 Terakhir)
          </h3>
        </div>
        <span className="text-[11px] font-mono text-amber-400 font-bold">
          Total Potongan: Rp {(metrics.totalDiscounts || 0).toLocaleString('id-ID')}
        </span>
      </div>

      {(!metrics.discountAuditLogs || metrics.discountAuditLogs.length === 0) ? (
        <div className="text-xs text-zinc-500 py-6 text-center">
          Belum ada transaksi yang menggunakan diskon atau kode voucher.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-[10px] uppercase">
                <th className="pb-2">Invoice & Waktu</th>
                <th className="pb-2">Pelanggan</th>
                <th className="pb-2">Voucher</th>
                <th className="pb-2">Alasan Audit Diskon</th>
                <th className="pb-2 text-right">Potongan</th>
                <th className="pb-2 text-right">Bayar Bersih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
              {metrics.discountAuditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-2.5">
                    <div className="font-bold text-gold-400">{log.invoice_number}</div>
                    <div className="text-[10px] text-zinc-500">{log.trx_time}</div>
                  </td>
                  <td className="py-2.5 font-sans text-zinc-200">{log.customer_name}</td>
                  <td className="py-2.5">
                    {log.voucher_code !== '-' ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                        {log.voucher_code}
                      </span>
                    ) : (
                      <span className="text-zinc-500">-</span>
                    )}
                  </td>
                  <td className="py-2.5 font-sans text-amber-300">{log.discount_reason}</td>
                  <td className="py-2.5 text-right font-bold text-red-400">
                    -Rp {Number(log.discount_total).toLocaleString('id-ID')}
                  </td>
                  <td className="py-2.5 text-right font-bold text-zinc-100">
                    Rp {Number(log.grand_total).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

        {/* Distribusi Pengeluaran Operasional */}
        <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <PieChart className="w-4 h-4 text-gold-400" />
            <h3 className="font-bold text-xs sm:text-sm text-zinc-100">Rincian Beban Operasional</h3>
          </div>

          <div className="space-y-3">
            {(!metrics.expenseBreakdown || metrics.expenseBreakdown.length === 0) ? (
              <div className="text-xs text-zinc-500 py-8 text-center">
                Belum ada data pengeluaran operasional yang dicatat.
              </div>
            ) : (
              metrics.expenseBreakdown.map((exp) => {
                const percentage = (metrics.totalExpenses || 0) > 0
                  ? Math.round((exp.totalAmount / metrics.totalExpenses) * 100)
                  : 0;

                return (
                  <div key={exp.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-zinc-300">
                        {CATEGORY_LABELS[exp.category] || exp.category}
                      </span>
                      <span className="font-mono font-bold text-zinc-200">
                        Rp {Number(exp.totalAmount || 0).toLocaleString('id-ID')} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gold-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    {/* Modal Peninjau Database Bahasa Indonesia & Reset Data Percobaan */}
    {showDbModal && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex flex-wrap justify-between items-center gap-2 bg-zinc-950">
            <div>
              <h3 className="text-sm font-black text-gold-400 flex items-center gap-2">
                <Database className="w-4 h-4" /> RINGKASAN DATABASE TOKO (FORMAT MUDAH DIPAHAMI)
              </h3>
              <p className="text-[11px] text-zinc-400">
                Tampilan langsung dari SQL Views berbahasa Indonesia tanpa kode UUID teknis
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetDummyTransactions}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Reset Transaksi Uji Coba
              </button>
              <button
                onClick={() => setShowDbModal(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold"
              >
                ✕ Tutup
              </button>
            </div>
          </div>

          <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex gap-2 overflow-x-auto">
            {[
              { key: 'katalog', label: '1. Tabel Katalog & Stok (vw_katalog_toko)' },
              { key: 'transaksi', label: '2. Tabel Transaksi Kasir (vw_laporan_transaksi_kasir)' },
              { key: 'komisi', label: '3. Tabel Komisi Kapster (vw_rekap_komisi_kapster)' },
              { key: 'pelanggan', label: '4. Tabel Pelanggan CRM (vw_data_pelanggan_crm)' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveDbTab(t.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeDbTab === t.key ? 'bg-gold-500 text-zinc-950' : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {!dbOverview || !dbOverview[activeDbTab] || dbOverview[activeDbTab].length === 0 ? (
              <div className="text-center py-12 text-xs text-zinc-500 font-mono">
                Tabel ini masih kosong atau belum ada data transaksi.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-gold-400 text-[10px] uppercase font-mono bg-zinc-950/60">
                    {Object.keys(dbOverview[activeDbTab][0]).map((col) => (
                      <th key={col} className="p-2.5">{col.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                  {dbOverview[activeDbTab].map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-zinc-800/30">
                      {Object.values(row).map((val: any, j: number) => (
                        <td key={j} className="p-2.5 text-zinc-200">{String(val ?? '-')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    )}
    </div>
  );
}