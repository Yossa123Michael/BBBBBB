import React, { useState, useEffect } from 'react';
import { PackagePlus, X, RefreshCw, Layers } from 'lucide-react';

import { API_BASE } from '../config/api';

interface ProductStock {
  product_id: string;
  sku: string;
  name: string;
  current_stock: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InventoryRestockModal({ isOpen, onClose, onSuccess }: Props) {
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStocks = async () => {
    setIsLoading(true);
    try {
      // 1. Ambil data stok terkini dari endpoint inventori
      const res = await fetch(`${API_BASE}/inventory/stocks?outletId=22222222-2222-2222-2222-222222222222`);
      const data = await res.json();

      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        const mapped: ProductStock[] = data.data.map((p: any) => ({
          product_id: p.product_id || p.id,
          sku: p.sku || 'SKU',
          name: p.name,
          current_stock: Number(p.current_stock ?? p.stock ?? 0),
        }));
        setProducts(mapped);
        setSelectedProduct(mapped[0].product_id);
      } else {
        // 2. Fallback otomatis ke katalog produk jika endpoint stok utama belum terisi
        const fallbackRes = await fetch(`${API_BASE}/test-catalog`);
        const fallbackData = await fallbackRes.json();
        if (fallbackData.success && fallbackData.data.products) {
          const fallbackMapped: ProductStock[] = fallbackData.data.products.map((p: any) => ({
            product_id: p.id,
            sku: p.sku || 'SKU',
            name: p.name,
            current_stock: Number(p.stock || 0),
          }));
          setProducts(fallbackMapped);
          if (fallbackMapped.length > 0) {
            setSelectedProduct(fallbackMapped[0].product_id);
          }
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data stok:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStocks();
      setQuantity('');
      setCostPrice('');
      setSupplierName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentItem = products.find((p) => p.product_id === selectedProduct);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || Number(quantity) <= 0) {
      alert('Pilih produk dan masukkan jumlah stok yang valid.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/inventory/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletId: '22222222-2222-2222-2222-222222222222',
          supplierName: supplierName || 'Supplier Mitra',
          items: [
            {
              productId: selectedProduct,
              quantityAdded: Number(quantity),
              costPrice: Number(costPrice) || 0,
            },
          ],
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert('Restock berhasil dicatat! Stok fisik telah diperbarui.');
        setQuantity('');
        setCostPrice('');
        setSupplierName('');
        onSuccess();
        onClose();
      } else {
        alert('Gagal restock: ' + result.message);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 select-none">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-gold-400" />
            <h3 className="font-bold text-sm sm:text-base text-zinc-100">Restock & Barang Masuk</h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Dropdown Produk */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Pilih Produk Retail
            </label>
            {isLoading ? (
              <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-500 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-gold-400" />
                <span>Mengambil daftar produk...</span>
              </div>
            ) : (
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-gold-500 text-zinc-100 cursor-pointer"
              >
                {products.length === 0 ? (
                  <option value="">Tidak ada produk ditemukan</option>
                ) : (
                  products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.name} (Stok: {p.current_stock} pcs)
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Kartu Status Stok Fisik Produk Terpilih */}
          {currentItem && (
            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex justify-between items-center text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5 font-mono">
                <Layers className="w-3.5 h-3.5 text-gold-500" /> SKU: {currentItem.sku}
              </span>
              <span className="font-bold text-zinc-200">
                Sisa di Toko: <span className="text-gold-400">{currentItem.current_stock} pcs</span>
              </span>
            </div>
          )}

          {/* Form Input Jumlah & Harga Modal */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Jumlah Masuk (Pcs)
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="Contoh: 12"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 sm:p-3 text-xs focus:outline-none focus:border-gold-500 font-mono text-zinc-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Harga Modal / Beli (Rp)
              </label>
              <input
                type="number"
                placeholder="Contoh: 45000"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 sm:p-3 text-xs focus:outline-none focus:border-gold-500 font-mono text-zinc-100"
              />
            </div>
          </div>

          {/* Supplier */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Nama Supplier / Faktur
            </label>
            <input
              type="text"
              placeholder="Contoh: Distributor Pomade Indo / PO-8821"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 sm:p-3 text-xs focus:outline-none focus:border-gold-500 text-zinc-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || products.length === 0}
            className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-zinc-950 font-black text-xs rounded-xl transition-all shadow-lg shadow-gold-500/20 flex items-center justify-center gap-2 active:scale-[0.98] mt-1"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              'SIMPAN PENERIMAAN BARANG'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}