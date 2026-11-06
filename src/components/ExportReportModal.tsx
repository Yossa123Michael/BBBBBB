import { useState } from 'react';
import { FileSpreadsheet, Download, Calendar, X, FileText, CheckCircle2 } from 'lucide-react';

const API_BASE = `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api/v1`}/reports`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportReportModal({ isOpen, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [isDownloading, setIsDownloading] = useState<'SALES' | 'COMMISSIONS' | null>(null);

  if (!isOpen) return null;

  const handleDownload = async (type: 'SALES' | 'COMMISSIONS') => {
    setIsDownloading(type);
    try {
      const endpoint = type === 'SALES' ? 'sales/csv' : 'commissions/csv';
      const url = `${API_BASE}/${endpoint}?startDate=${startDate}&endDate=${endDate}`;

      // Buat tautan virtual untuk memicu unduhan file dari browser
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Gagal mengunduh laporan: ' + err.message);
    } finally {
      setTimeout(() => setIsDownloading(null), 800);
    }
  };

  const setPresetToday = () => {
    setStartDate(today);
    setEndDate(today);
  };

  const setPresetMonth = () => {
    setStartDate(firstDayOfMonth);
    setEndDate(today);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
        {/* Header Modal */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wide">
                Ekspor Laporan Ke Excel
              </h3>
              <p className="text-[10px] text-zinc-400">Unduh data pembukuan format CSV (.xlsx support)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pemilihan Rentang Tanggal */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gold-400" /> Rentang Periode
            </label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={setPresetToday}
                className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={setPresetMonth}
                className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono"
              >
                Bulan Ini
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-zinc-500 font-mono">DARI TANGGAL</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 font-mono">SAMPAI TANGGAL</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>
        </div>

        {/* Pilihan Tombol Unduh */}
        <div className="space-y-2.5 pt-2">
          {/* Card Download 1: Penjualan */}
          <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between hover:border-zinc-700 transition-all">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" /> Laporan Penjualan Kasir
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight">
                Rekap invoice, omzet kotor, diskon voucher/manual, alasan audit, & pembayaran.
              </p>
            </div>
            <button
              onClick={() => handleDownload('SALES')}
              disabled={isDownloading !== null}
              className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              {isDownloading === 'SALES' ? (
                <CheckCircle2 className="w-3.5 h-3.5 animate-bounce" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Unduh CSV
            </button>
          </div>

          {/* Card Download 2: Payroll Komisi */}
          <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between hover:border-zinc-700 transition-all">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-gold-400" /> Rekap Komisi Kapster
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight">
                Rekap jumlah treatment & hak bagi hasil per kapster untuk payroll.
              </p>
            </div>
            <button
              onClick={() => handleDownload('COMMISSIONS')}
              disabled={isDownloading !== null}
              className="px-3 py-2 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 text-gold-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              {isDownloading === 'COMMISSIONS' ? (
                <CheckCircle2 className="w-3.5 h-3.5 animate-bounce" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Unduh CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}