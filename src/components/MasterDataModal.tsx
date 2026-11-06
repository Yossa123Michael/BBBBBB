import { useState, useEffect } from 'react';
import { Scissors, ShoppingBag, User, Ticket, X, Check, Pencil, RefreshCw } from 'lucide-react';

import { API_BASE as ROOT_API_BASE } from '../config/api';
const API_BASE = `${ROOT_API_BASE}/master`;

interface MasterDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function MasterDataModal({ isOpen, onClose, onUpdated }: MasterDataModalProps) {
  const [activeTab, setActiveTab] = useState<'SERVICES' | 'PRODUCTS' | 'BARBERS' | 'VOUCHERS'>('SERVICES');
  
  // Data State
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields - Services
  const [serviceCode, setServiceCode] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceCommission, setServiceCommission] = useState('');

  // Form Fields - Products
  const [productSku, setProductSku] = useState('');
  const [productName, setProductName] = useState('');
  const [productCostPrice, setProductCostPrice] = useState('');
  const [productSellPrice, setProductSellPrice] = useState('');
  const [productCommission, setProductCommission] = useState('');

  // Form Fields - Barbers
  const [barberNickname, setBarberNickname] = useState('');
  const [barberLevel, setBarberLevel] = useState('SENIOR');
  const [vouchersList, setVouchersList] = useState<any[]>([]);
  const [newVoucher, setNewVoucher] = useState({
  code: '',
  discountType: 'FIXED',
  discountValue: '',
  minSpend: '',
  maxDiscount: '',
  usageLimit: '',
  endDate: '',
});

  // Bersihkan nilai angka dari format koma/titik desimal bawaan database
  const cleanNumberInput = (val: any): string => {
    if (val === null || val === undefined || val === '') return '';
    const str = val.toString().replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? '' : Math.round(num).toString();
  };

  const cleanPercentInput = (val: any): string => {
    if (val === null || val === undefined || val === '') return '';
    const str = val.toString().replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? '' : num.toString();
  };

  const resetForm = () => {
    setEditingId(null);
    setServiceCode('');
    setServiceName('');
    setServicePrice('');
    setServiceCommission('');
    setProductSku('');
    setProductName('');
    setProductCostPrice('');
    setProductSellPrice('');
    setProductCommission('');
    setBarberNickname('');
    setBarberLevel('SENIOR');
    setNewVoucher({
      code: '',
      discountType: 'FIXED',
      discountValue: '',
      minSpend: '',
      maxDiscount: '',
      usageLimit: '',
      endDate: '',
    });
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resSrv, resPrd, resBrb] = await Promise.all([
        fetch(`${API_BASE}/services`),
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/barbers`),
      ]);
      const dataSrv = await resSrv.json();
      const dataPrd = await resPrd.json();
      const dataBrb = await resBrb.json();

      if (dataSrv.success) setServices(dataSrv.data);
      if (dataPrd.success) setProducts(dataPrd.data);
      if (dataBrb.success) setBarbers(dataBrb.data);
    } catch (err) {
      console.error('Gagal mengambil data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
      fetchVouchers();
      resetForm();
    }
  }, [isOpen]);

  // Handler Klik Edit Item
  const handleEditService = (srv: any) => {
    setEditingId(srv.id);
    setServiceCode(srv.code || '');
    setServiceName(srv.name || '');
    setServicePrice(cleanNumberInput(srv.base_price));
    setServiceCommission(cleanPercentInput(srv.default_commission_percent));
  };

  const handleEditProduct = (prd: any) => {
    setEditingId(prd.id);
    setProductSku(prd.sku || '');
    setProductName(prd.name || '');
    setProductCostPrice(cleanNumberInput(prd.cost_price));
    setProductSellPrice(cleanNumberInput(prd.selling_price));
    setProductCommission(cleanPercentInput(prd.default_commission_percent));
  };

  const handleEditBarber = (brb: any) => {
    setEditingId(brb.id);
    setBarberNickname(brb.nickname || '');
    setBarberLevel(brb.level || 'SENIOR');
  };

  const fetchVouchers = async () => {
  try {
    const res = await fetch(`http://${window.location.hostname}:5000/api/v1/master/vouchers`);
    const data = await res.json();
    if (data.success) setVouchersList(data.data);
  } catch (err) {
    console.error('Gagal memuat voucher:', err);
  }
 };
 const handleToggleVoucher = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/vouchers/${id}/toggle`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (data.success) {
        fetchVouchers();
      } else {
        alert('Gagal mengubah status: ' + data.message);
      }
    } catch (err: any) {
      alert('Error toggle voucher: ' + err.message);
    }
  };

  // Submit Handler (Simpan Tambah / Simpan Perubahan)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let endpoint = '';
      let payload: any = {};

      if (activeTab === 'SERVICES') {
        endpoint = 'services';
        payload = {
          code: serviceCode,
          name: serviceName,
          basePrice: parseFloat(servicePrice.replace(',', '.')) || 0,
          defaultCommissionPercent: parseFloat(serviceCommission.replace(',', '.')) || 0,
        };
      } else if (activeTab === 'PRODUCTS') {
        endpoint = 'products';
        payload = {
          sku: productSku,
          name: productName,
          costPrice: parseFloat(productCostPrice.replace(',', '.')) || 0,
          sellingPrice: parseFloat(productSellPrice.replace(',', '.')) || 0,
          defaultCommissionPercent: parseFloat(productCommission.replace(',', '.')) || 0,
        };
      } else if (activeTab === 'BARBERS') {
      endpoint = 'barbers';
      payload = {
        nickname: barberNickname,
        level: barberLevel,
      };
    } else if (activeTab === 'VOUCHERS') {
      endpoint = 'vouchers';
      payload = newVoucher;
    }

      const url = editingId ? `${API_BASE}/${endpoint}/${editingId}` : `${API_BASE}/${endpoint}`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        alert(result.message);
        resetForm();
        fetchData();
        fetchVouchers();
        if (onUpdated) onUpdated();
      } else {
        alert('Gagal: ' + result.message);
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/90 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-gold-400">⚙️ Master Data & Katalog Toko</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => { setActiveTab('SERVICES'); resetForm(); }}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'SERVICES' ? 'bg-gold-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" /> Layanan Cukur
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('PRODUCTS'); resetForm(); }}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'PRODUCTS' ? 'bg-gold-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Produk Retail
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('BARBERS'); resetForm(); }}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'BARBERS' ? 'bg-gold-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Data Kapster
              </button>
              <button
              type="button"
              onClick={() => { setActiveTab('VOUCHERS'); resetForm(); }}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'VOUCHERS' ? 'bg-gold-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" /> Voucher
            </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body (2 Kolom) */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Kolom Kiri: Form Input */}
          <div className="md:col-span-5 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-gold-400">
                {editingId ? 'EDIT DATA' : 'TAMBAH BARU'}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[10px] text-zinc-400 hover:text-red-400 underline font-semibold"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Form Layanan */}
              {activeTab === 'SERVICES' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Kode Layanan</label>
                    <input
                      type="text"
                      required
                      placeholder="Misal: SRV-003"
                      value={serviceCode}
                      onChange={(e) => setServiceCode(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Nama Treatment</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama layanan treatment"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Harga Dasar (Rp)</label>
                    <input
                      type="number"
                      required
                      placeholder="50000"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Bagi Hasil Komisi (%)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="35"
                      value={serviceCommission}
                      onChange={(e) => setServiceCommission(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                </>
              )}

              {/* Form Produk */}
              {activeTab === 'PRODUCTS' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">SKU Produk</label>
                    <input
                      type="text"
                      required
                      placeholder="Misal: PRD-002"
                      value={productSku}
                      onChange={(e) => setProductSku(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Nama Produk Retail</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama produk"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400">HPP Modal (Rp)</label>
                      <input
                        type="number"
                        placeholder="35000"
                        value={productCostPrice}
                        onChange={(e) => setProductCostPrice(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400">Harga Jual (Rp)</label>
                      <input
                        type="number"
                        required
                        placeholder="70000"
                        value={productSellPrice}
                        onChange={(e) => setProductSellPrice(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Komisi Penjualan (%)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="10"
                      value={productCommission}
                      onChange={(e) => setProductCommission(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                </>
              )}

              {/* Form Kapster */}
              {activeTab === 'BARBERS' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Nama Panggilan / Nickname</label>
                    <input
                      type="text"
                      required
                      placeholder="Misal: Budi"
                      value={barberNickname}
                      onChange={(e) => setBarberNickname(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Level Skill</label>
                    <select
                      value={barberLevel}
                      onChange={(e) => setBarberLevel(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 cursor-pointer"
                    >
                      <option value="JUNIOR">JUNIOR</option>
                      <option value="SENIOR">SENIOR</option>
                      <option value="MASTER">MASTER</option>
                    </select>
                  </div>
                </>
              )}

              {/* Form Voucher */}
            {activeTab === 'VOUCHERS' && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400">Kode Promo</label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: HEMAT20K"
                    value={newVoucher.code}
                    onChange={(e) => setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Tipe Diskon</label>
                    <select
                      value={newVoucher.discountType}
                      onChange={(e) => setNewVoucher({ ...newVoucher, discountType: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 cursor-pointer"
                    >
                      <option value="FIXED">Nominal (Rp)</option>
                      <option value="PERCENTAGE">Persen (%)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Nilai Potongan</label>
                    <input
                      type="number"
                      required
                      placeholder="20000 atau 10"
                      value={newVoucher.discountValue}
                      onChange={(e) => setNewVoucher({ ...newVoucher, discountValue: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Min. Belanja (Rp)</label>
                    <input
                      type="number"
                      placeholder="50000"
                      value={newVoucher.minSpend}
                      onChange={(e) => setNewVoucher({ ...newVoucher, minSpend: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Kuota Pakai</label>
                    <input
                      type="number"
                      placeholder="50"
                      value={newVoucher.usageLimit}
                      onChange={(e) => setNewVoucher({ ...newVoucher, usageLimit: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400">Berlaku Sampai</label>
                  <input
                    type="date"
                    required
                    value={newVoucher.endDate}
                    onChange={(e) => setNewVoucher({ ...newVoucher, endDate: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono"
                  />
                </div>
              </>
            )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gold-500 hover:bg-gold-400 active:scale-[0.98] text-zinc-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-gold-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingId ? 'SIMPAN PERUBAHAN' : 'TAMBAHKAN KE SISTEM'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Kolom Kanan: List Data */}
          <div className="md:col-span-7 flex flex-col space-y-3">
            <span className="text-xs font-bold text-zinc-400">
              {activeTab === 'SERVICES' && 'Daftar Layanan'}
              {activeTab === 'PRODUCTS' && 'Daftar Produk'}
              {activeTab === 'BARBERS' && 'Daftar Kapster'}
              {activeTab === 'VOUCHERS' && 'Daftar Voucher Promo'}
            </span>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[55vh]">
              {isLoading ? (
                <div className="py-12 flex justify-center items-center text-zinc-500 gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-gold-500" />
                  <span className="text-xs">Memuat data...</span>
                </div>
              ) : activeTab === 'SERVICES' ? (
                services.map((srv) => (
                  <div
                    key={srv.id}
                    className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex justify-between items-center hover:border-zinc-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-gold-400 font-bold">{srv.code}</span>
                        <span className="text-xs font-bold text-zinc-100">{srv.name}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Rp {Number(srv.base_price).toLocaleString('id-ID')} • Komisi: {Number(srv.default_commission_percent).toFixed(2)}%
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditService(srv)}
                      className="p-2 border border-zinc-700/80 hover:border-gold-500 text-zinc-400 hover:text-gold-400 rounded-xl transition-all"
                      title="Edit Layanan"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : activeTab === 'PRODUCTS' ? (
                products.map((prd) => (
                  <div
                    key={prd.id}
                    className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex justify-between items-center hover:border-zinc-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-gold-400 font-bold">{prd.sku}</span>
                        <span className="text-xs font-bold text-zinc-100">{prd.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          Stok: {prd.stock_quantity ?? 0}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Jual: Rp {Number(prd.selling_price).toLocaleString('id-ID')} • Modal: Rp {Number(prd.cost_price || 0).toLocaleString('id-ID')} • Kms: {Number(prd.default_commission_percent).toFixed(2)}%
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditProduct(prd)}
                      className="p-2 border border-zinc-700/80 hover:border-gold-500 text-zinc-400 hover:text-gold-400 rounded-xl transition-all"
                      title="Edit Produk"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : activeTab === 'BARBERS' ? (
                barbers.map((brb) => (
                  <div
                    key={brb.id}
                    className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex justify-between items-center hover:border-zinc-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-100">{brb.nickname}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-gold-400 font-mono font-bold">
                          {brb.level}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">Status: Aktif Bertugas</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditBarber(brb)}
                      className="p-2 border border-zinc-700/80 hover:border-gold-500 text-zinc-400 hover:text-gold-400 rounded-xl transition-all"
                      title="Edit Kapster"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                ))
                ) : (
              vouchersList.map((v) => (
                <div
                  key={v.id}
                  className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex justify-between items-center hover:border-zinc-700 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-gold-400">{v.code}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                        {v.discount_type === 'PERCENTAGE'
                          ? `${v.discount_value}%`
                          : `Rp ${Number(v.discount_value).toLocaleString('id-ID')}`}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Min: Rp {Number(v.min_spend || 0).toLocaleString('id-ID')} • Kuota: {v.used_count}/{v.usage_limit ?? '∞'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono text-zinc-500">
                      Exp: {String(v.end_date).slice(0, 10)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleVoucher(v.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                        v.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                      }`}
                      title="Klik untuk mengaktifkan / menonaktifkan voucher"
                    >
                      {v.is_active ? 'AKTIF' : 'NONAKTIF'}
                    </button>
                  </div>
                </div>
              ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}