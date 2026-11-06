import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Trash2, X, AlertCircle } from 'lucide-react';
import { API_BASE } from '../config/api';

interface ExpenseItem {
  id: string;
  category: string;
  amount: string;
  notes: string;
  created_by_name: string;
  created_at: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

const CATEGORIES = [
  { id: 'LISTRIK', label: '⚡ Token Listrik' },
  { id: 'LAUNDRY', label: '🧺 Laundry Handuk' },
  { id: 'PERLENGKAPAN', label: '✂️ Perlengkapan / Silet' },
  { id: 'AIR_MINERAL', label: '💧 Air Galon / Minum' },
  { id: 'LAINNYA', label: '📦 Biaya Lainnya' },
];

export default function ExpenseModal({ isOpen, onClose, currentUser }: Props) {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/expenses?outletId=22222222-2222-2222-2222-222222222222`);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.data);
        setTotalExpense(data.summary.totalExpense);
      }
    } catch (err) {
      console.error('Gagal mengambil pengeluaran:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExpenses();
      setAmount('');
      setNotes('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletId: '22222222-2222-2222-2222-222222222222',
          shiftId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          category,
          amount: Number(amount),
          notes,
          createdByName: currentUser?.name || 'Kasir',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAmount('');
        setNotes('');
        fetchExpenses();
      } else {
        alert('Gagal mencatat biaya: ' + data.message);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus catatan pengeluaran ini?')) return;
    try {
      const res = await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchExpenses();
      } else {
        alert('Gagal: ' + data.message);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl p-6 space-y-4 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-gold-400" />
            <div>
              <h3 className="font-bold text-base text-zinc-100">Pencatatan Biaya Operasional Toko</h3>
              <p className="text-xs text-zinc-400">Input pengeluaran harian kasir & beban operasional cabang</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 text-xs font-mono">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Ringkasan */}
        <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 flex justify-between items-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total Beban Operasional Tercatat</div>
            <div className="text-xs text-zinc-500">Mempengaruhi kalkulasi laba bersih outlet</div>
          </div>
          <div className="text-xl font-black text-red-400 font-mono">
            Rp {Number(totalExpense).toLocaleString('id-ID')}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 flex-1 overflow-hidden">
          {/* Form Input Sisi Kiri */}
          <form onSubmit={handleSubmit} className="col-span-2 space-y-3 border-r border-zinc-800 pr-4">
            <div className="text-xs font-bold text-zinc-200">Catat Pengeluaran Baru</div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-gold-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Nominal Biaya (Rp)</label>
              <input
                type="number"
                required
                min="1000"
                placeholder="Contoh: 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-gold-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Keterangan / Rincian</label>
              <textarea
                rows={2}
                placeholder="Contoh: Beli token listrik 50rb"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-gold-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-gold-500 hover:bg-gold-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-gold-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" /> SIMPAN BIAYA
            </button>
          </form>

          {/* Daftar Riwayat Pengeluaran Sisi Kanan */}
          <div className="col-span-3 space-y-2 overflow-y-auto pl-1">
            <div className="text-xs font-bold text-zinc-200">Riwayat Pengeluaran Terakhir</div>
            {isLoading ? (
              <div className="text-xs text-zinc-500 text-center py-8">Memuat data...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs flex flex-col items-center gap-1">
                <AlertCircle className="w-6 h-6 opacity-30" />
                <span>Belum ada pengeluaran operasional yang dicatat.</span>
              </div>
            ) : (
              expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between group hover:border-zinc-700 transition-all"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-200">
                        {CATEGORIES.find((c) => c.id === exp.category)?.label || exp.category}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(exp.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {exp.notes && <div className="text-[11px] text-zinc-400 italic">{exp.notes}</div>}
                    <div className="text-[9px] text-zinc-500 font-mono">Oleh: {exp.created_by_name}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-red-400">
                      -Rp {Number(exp.amount).toLocaleString('id-ID')}
                    </span>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                      title="Hapus Catatan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}