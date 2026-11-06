import React, { useState, useEffect } from 'react';
import { Search, UserPlus, X, Phone, Award, FileText, Check } from 'lucide-react';
import { API_BASE } from '../config/api';

export interface CustomerData {
  id: string;
  full_name: string;
  phone: string;
  loyalty_points: number;
  total_visits: number;
  haircut_notes?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: CustomerData) => void;
}

export default function CustomerModal({ isOpen, onClose, onSelectCustomer }: Props) {
  const [activeTab, setActiveTab] = useState<'SEARCH' | 'CREATE'>('SEARCH');
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<CustomerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form input pelanggan baru
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const handleSearch = async (query: string) => {
    setSearchTerm(query);
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customers/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setResults(data.data);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Gagal mencari pelanggan:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleSearch('');
    }
  }, [isOpen]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newName,
          phone: newPhone,
          haircutNotes: newNotes,
        })
      });
      const data = await res.json();
      if (data.success) {
        onSelectCustomer(data.data);
        onClose();
        setNewName('');
        setNewPhone('');
        setNewNotes('');
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('SEARCH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'SEARCH' ? 'bg-gold-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <Search className="w-3.5 h-3.5" /> Cari Member
            </button>
            <button
              onClick={() => setActiveTab('CREATE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'CREATE' ? 'bg-gold-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Member Baru
            </button>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {activeTab === 'SEARCH' ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama atau no WhatsApp..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-3 text-xs focus:outline-none focus:border-gold-500 text-zinc-100"
              />
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {results.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500">
                  {isLoading ? 'Mencari...' : 'Pelanggan tidak ditemukan. Silakan tambah member baru.'}
                </div>
              ) : (
                results.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer(c);
                      onClose();
                    }}
                    className="p-3 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-gold-500/50 rounded-xl cursor-pointer transition-all flex justify-between items-center group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-zinc-100 group-hover:text-gold-400 transition-colors">
                          {c.full_name}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-zinc-500" /> {c.phone}
                        </span>
                      </div>
                      {c.haircut_notes && (
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 italic">
                          <FileText className="w-3 h-3 text-gold-500 shrink-0" />
                          <span className="truncate max-w-xs">{c.haircut_notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] font-bold text-gold-400 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" /> {c.loyalty_points} Pts
                      </div>
                      <div className="text-[10px] text-zinc-500">{c.total_visits}x Kunjungan</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateCustomer} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Nama Lengkap</label>
              <input
                type="text"
                required
                placeholder="Contoh: Rendy Pratama"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:outline-none focus:border-gold-500 text-zinc-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Nomor WhatsApp / HP</label>
              <input
                type="text"
                required
                placeholder="Contoh: 081234567890"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:outline-none focus:border-gold-500 font-mono text-zinc-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Catatan Model Rambut / Barber Notes (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Fade 1.5 taper, jambul disisir ke kanan, tidak suka pomade minyak"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs focus:outline-none focus:border-gold-500 text-zinc-100"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gold-500 hover:bg-gold-400 text-zinc-950 font-black text-xs rounded-xl transition-all shadow-lg shadow-gold-500/20 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> SIMPAN & PILIH PELANGGAN
            </button>
          </form>
        )}
      </div>
    </div>
  );
}