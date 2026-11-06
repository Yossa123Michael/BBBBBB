import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api/v1`;

export interface DiscountMeta {
  voucherId: string | null;
  voucherCode: string | null;
  voucherDiscount: number;
  manualDiscount: number;
  discountReason: string | null;
}

export const DiscountSection: React.FC<{
  subtotal: number;
  onDiscountChange: (totalDiscount: number, meta: DiscountMeta) => void;
}> = ({ subtotal, onDiscountChange }) => {
  const [voucherInput, setVoucherInput] = useState('');
  const [isLoadingVoucher, setIsLoadingVoucher] = useState(false);
  const [voucherData, setVoucherData] = useState<{
    id: string;
    code: string;
    amount: number;
  } | null>(null);
  const [voucherError, setVoucherError] = useState('');

  // State Diskon Manual Kasir
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualType, setManualType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [manualValue, setManualValue] = useState<number>(0);
  const [manualReason, setManualReason] = useState('');
  const [appliedManual, setAppliedManual] = useState<{
    type: 'FIXED' | 'PERCENTAGE';
    rawValue: number;
    amount: number;
    reason: string;
  } | null>(null);

  // Otomatis reset atau hitung ulang diskon saat isi keranjang (subtotal) berubah
  useEffect(() => {
    if (subtotal <= 0) {
      if (voucherData || appliedManual || voucherError) {
        setVoucherData(null);
        setVoucherInput('');
        setVoucherError('');
        setAppliedManual(null);
        setManualValue(0);
        setManualReason('');
        onDiscountChange(0, {
          voucherId: null,
          voucherCode: null,
          voucherDiscount: 0,
          manualDiscount: 0,
          discountReason: null,
        });
      }
      return;
    }

    let currentManualAmt = appliedManual?.amount || 0;
    if (appliedManual && appliedManual.type === 'PERCENTAGE') {
      currentManualAmt = Math.min(
        subtotal,
        Math.round((subtotal * appliedManual.rawValue) / 100)
      );
      if (currentManualAmt !== appliedManual.amount) {
        setAppliedManual({ ...appliedManual, amount: currentManualAmt });
      }
    }

    const currentVoucherAmt = voucherData ? Math.min(subtotal, voucherData.amount) : 0;
    const combined = Math.min(subtotal, currentVoucherAmt + currentManualAmt);

    onDiscountChange(combined, {
      voucherId: voucherData?.id || null,
      voucherCode: voucherData?.code || null,
      voucherDiscount: currentVoucherAmt,
      manualDiscount: currentManualAmt,
      discountReason:
        appliedManual?.reason || (voucherData ? `Voucher ${voucherData.code}` : null),
    });
  }, [subtotal]);

  // 1. Terapkan Voucher
  const handleApplyVoucher = async () => {
    setVoucherError('');
    if (!voucherInput.trim()) return;

    if (subtotal <= 0) {
      setVoucherError('Pilih layanan atau produk ke keranjang terlebih dahulu.');
      return;
    }

    setIsLoadingVoucher(true);
    try {
      const res = await fetch(`${API_BASE}/master/pos/vouchers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucherInput.trim(), subtotal }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setVoucherError(data.message || 'Gagal memvalidasi voucher');
        return;
      }

      const vAmt = Number(data.data.discountAmount) || 0;
      const newVoucher = {
        id: data.data.voucherId,
        code: data.data.code,
        amount: vAmt,
      };
      setVoucherData(newVoucher);

      // Hitung ulang total diskon gabungan
      const manualAmt = appliedManual?.amount || 0;
      const combined = Math.min(subtotal, vAmt + manualAmt);

      onDiscountChange(combined, {
        voucherId: newVoucher.id,
        voucherCode: newVoucher.code,
        voucherDiscount: vAmt,
        manualDiscount: manualAmt,
        discountReason: appliedManual?.reason || `Voucher ${newVoucher.code}`,
      });
    } catch (err: any) {
      console.error('Error validasi voucher:', err);
      setVoucherError('Gagal memvalidasi voucher (Cek koneksi server)');
    } finally {
      setIsLoadingVoucher(false);
    }
  };

  // 2. Hapus Voucher
  const handleRemoveVoucher = () => {
    setVoucherData(null);
    setVoucherInput('');
    setVoucherError('');
    const manualAmt = appliedManual?.amount || 0;
    onDiscountChange(manualAmt, {
      voucherId: null,
      voucherCode: null,
      voucherDiscount: 0,
      manualDiscount: manualAmt,
      discountReason: appliedManual?.reason || null,
    });
  };

  // 3. Terapkan Diskon Manual
  const handleApplyManualDiscount = () => {
    if (!manualReason.trim()) {
      alert('Alasan diskon manual wajib diisi untuk audit kasir!');
      return;
    }

    if (manualValue <= 0) {
      alert('Nominal atau persentase diskon harus lebih dari 0!');
      return;
    }

    let calculatedAmt = 0;
    if (manualType === 'PERCENTAGE') {
      const pct = Math.min(100, Math.max(0, manualValue));
      calculatedAmt = Math.round((subtotal * pct) / 100);
    } else {
      calculatedAmt = Number(manualValue);
    }

    if (calculatedAmt > subtotal) calculatedAmt = subtotal;

    const newManual = {
      type: manualType,
      rawValue: manualValue,
      amount: calculatedAmt,
      reason: manualReason.trim(),
    };

    setAppliedManual(newManual);
    setShowManualModal(false);

    const vAmt = voucherData?.amount || 0;
    const combined = Math.min(subtotal, vAmt + calculatedAmt);

    onDiscountChange(combined, {
      voucherId: voucherData?.id || null,
      voucherCode: voucherData?.code || null,
      voucherDiscount: vAmt,
      manualDiscount: calculatedAmt,
      discountReason: newManual.reason,
    });
  };

  return (
    <div className="space-y-3 bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-white">
      <h3 className="font-semibold text-sm text-zinc-300">Voucher & Diskon Kasir</h3>

      {/* Input Voucher */}
      <div className="space-y-1">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Kode Voucher (Contoh: HEMAT20K)"
            value={voucherInput}
            onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
            disabled={!!voucherData || isLoadingVoucher}
            className="flex-1 bg-zinc-800 border border-zinc-700 px-3 py-2 rounded-lg text-sm uppercase focus:outline-none focus:border-amber-500 disabled:opacity-50"
          />
          {voucherData ? (
            <button
              type="button"
              onClick={handleRemoveVoucher}
              className="px-3 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium hover:bg-red-600/30"
            >
              Hapus
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyVoucher}
              disabled={isLoadingVoucher}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-semibold rounded-lg text-xs transition"
            >
              {isLoadingVoucher ? '...' : 'Klaim'}
            </button>
          )}
        </div>
        {voucherError && <p className="text-xs text-red-400 mt-1">{voucherError}</p>}
        {voucherData && (
          <p className="text-xs text-emerald-400 mt-1">
            Voucher <b>{voucherData.code}</b> aktif: -Rp {voucherData.amount.toLocaleString('id-ID')}
          </p>
        )}
      </div>

      {/* Tombol Diskon Manual Kasir */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
        <span className="text-xs text-zinc-400">Diskon Khusus / Manual Kasir:</span>
        {appliedManual ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-400 font-medium">
              -Rp {appliedManual.amount.toLocaleString('id-ID')} ({appliedManual.reason})
            </span>
            <button
              type="button"
              onClick={() => {
                setAppliedManual(null);
                const vAmt = voucherData?.amount || 0;
                onDiscountChange(vAmt, {
                  voucherId: voucherData?.id || null,
                  voucherCode: voucherData?.code || null,
                  voucherDiscount: vAmt,
                  manualDiscount: 0,
                  discountReason: voucherData ? `Voucher ${voucherData.code}` : null,
                });
              }}
              className="text-xs text-zinc-500 hover:text-red-400"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            className="text-xs text-amber-400 hover:underline font-medium"
          >
            + Tambah Diskon Manual
          </button>
        )}
      </div>

      {/* Modal Diskon Manual Kasir */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 p-5 rounded-2xl w-full max-w-sm space-y-4">
            <h4 className="font-bold text-base text-zinc-100">Diskon Manual Kasir</h4>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setManualType('FIXED')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${
                  manualType === 'FIXED'
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
              >
                Nominal (Rp)
              </button>
              <button
                type="button"
                onClick={() => setManualType('PERCENTAGE')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${
                  manualType === 'PERCENTAGE'
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
              >
                Persen (%)
              </button>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">
                {manualType === 'FIXED' ? 'Nominal Potongan (Rp)' : 'Persentase Diskon (%)'}
              </label>
              <input
                type="number"
                value={manualValue || ''}
                onChange={(e) => setManualValue(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">
                Alasan Diskon (Wajib Audit):
              </label>
              <input
                type="text"
                placeholder="Contoh: Kompensasi antre lama / Relasi owner"
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyManualDiscount}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-lg"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};