import { useState, useEffect } from 'react';
import { Calendar, Clock, X, Check, Trash2, RefreshCw, AlertCircle } from 'lucide-react';

const API_BASE = `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api/v1`}/roster`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  barbers: Array<{ id: string; nickname: string; level: string }>;
}

const DAYS = [
  { id: 1, name: 'Senin' },
  { id: 2, name: 'Selasa' },
  { id: 3, name: 'Rabu' },
  { id: 4, name: 'Kamis' },
  { id: 5, name: 'Jumat' },
  { id: 6, name: 'Sabtu' },
  { id: 0, name: 'Minggu' },
];

export default function BarberRosterModal({ isOpen, onClose, barbers }: Props) {
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [weeklyOff, setWeeklyOff] = useState<number[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [newLeaveDate, setNewLeaveDate] = useState('');
  const [newLeaveReason, setNewLeaveReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingOff, setIsSavingOff] = useState(false);

  useEffect(() => {
    if (barbers.length > 0 && !selectedBarberId) {
      setSelectedBarberId(barbers[0].id);
    }
  }, [barbers, selectedBarberId]);

  const fetchRoster = async (barberId: string) => {
    if (!barberId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${barberId}`);
      const json = await res.json();
      if (json.success) {
        setWeeklyOff(json.data.weeklyOff);
        setLeaves(json.data.leaves);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedBarberId) {
      fetchRoster(selectedBarberId);
    }
  }, [isOpen, selectedBarberId]);

  const toggleDayOff = (dayId: number) => {
    setWeeklyOff((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const handleSaveWeeklyOff = async () => {
    setIsSavingOff(true);
    try {
      const res = await fetch(`${API_BASE}/${selectedBarberId}/weekly-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysOff: weeklyOff }),
      });
      const json = await res.json();
      if (json.success) {
        alert('Hari libur rutin kapster berhasil disimpan!');
      } else {
        alert(json.message);
      }
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setIsSavingOff(false);
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeaveDate) return;

    try {
      const res = await fetch(`${API_BASE}/${selectedBarberId}/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveDate: newLeaveDate, reason: newLeaveReason }),
      });
      const json = await res.json();
      if (json.success) {
        setNewLeaveDate('');
        setNewLeaveReason('');
        fetchRoster(selectedBarberId);
      } else {
        alert(json.message);
      }
    } catch (err: any) {
      alert('Gagal mencatat cuti: ' + err.message);
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    if (!confirm('Batalkan jadwal cuti ini?')) return;
    try {
      const res = await fetch(`${API_BASE}/leaves/${leaveId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchRoster(selectedBarberId);
      }
    } catch (err: any) {
      alert('Gagal membatalkan cuti: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/90 shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold-400" />
            <div>
              <h3 className="text-sm font-black text-zinc-100 uppercase">Jadwal Kerja & Roster Kapster</h3>
              <p className="text-[10px] text-zinc-400">Atur hari libur mingguan dan cuti khusus staf</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pilih Kapster */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/60 flex items-center gap-3">
          <label className="text-xs font-bold text-zinc-400 shrink-0">Pilih Kapster:</label>
          <select
            value={selectedBarberId}
            onChange={(e) => setSelectedBarberId(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs font-bold text-gold-400 focus:outline-none"
          >
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nickname} ({b.level})
              </option>
            ))}
          </select>
        </div>

        {/* Isi Modal */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <div className="py-12 flex justify-center items-center text-zinc-500 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-gold-500" />
              <span className="text-xs">Memuat jadwal...</span>
            </div>
          ) : (
            <>
              {/* Bagian 1: Hari Libur Rutin Mingguan */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200">1. Hari Libur Rutin Mingguan</h4>
                    <p className="text-[10px] text-zinc-500">Pilih hari di mana kapster rutin tidak masuk</p>
                  </div>
                  <button
                    onClick={handleSaveWeeklyOff}
                    disabled={isSavingOff}
                    className="px-3 py-1.5 bg-gold-500 hover:bg-gold-400 text-zinc-950 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" /> Simpan Libur
                  </button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {DAYS.map((day) => {
                    const isOff = weeklyOff.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDayOff(day.id)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          isOff
                            ? 'bg-red-500/20 border-red-500/40 text-red-400 shadow-sm'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div>{day.name}</div>
                        <div className="text-[9px] font-mono mt-0.5 opacity-80">
                          {isOff ? 'LIBUR' : 'KERJA'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bagian 2: Cuti & Izin Tanggal Khusus */}
              <div className="space-y-3 pt-3 border-t border-zinc-800">
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">2. Cuti / Izin Tanggal Spesifik</h4>
                  <p className="text-[10px] text-zinc-500">Jadwal cuti otomatis mengunci slot booking online</p>
                </div>

                {/* Form Tambah Cuti */}
                <form onSubmit={handleAddLeave} className="flex gap-2">
                  <input
                    type="date"
                    required
                    value={newLeaveDate}
                    onChange={(e) => setNewLeaveDate(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-gold-500"
                  />
                  <input
                    type="text"
                    placeholder="Alasan cuti (misal: Sakit, Acara keluarga)"
                    value={newLeaveReason}
                    onChange={(e) => setNewLeaveReason(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-gold-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl text-xs font-bold shrink-0"
                  >
                    + Tambah
                  </button>
                </form>

                {/* List Cuti Mendatang */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {leaves.length === 0 ? (
                    <div className="p-3 bg-zinc-950/60 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-500 text-[11px]">
                      Belum ada jadwal cuti mendatang untuk kapster ini.
                    </div>
                  ) : (
                    leaves.map((l) => (
                      <div
                        key={l.id}
                        className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl flex justify-between items-center"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-gold-400">{l.leave_date}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-xs text-zinc-300">{l.reason || 'Cuti'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteLeave(l.id)}
                          className="p-1 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                          title="Batalkan Cuti"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}