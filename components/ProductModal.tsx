import React, { useState, useEffect } from 'react';
import { X, PackagePlus, AlertCircle, Save, Lock, Trash2 } from 'lucide-react';
import { CATEGORIES, UNITS } from '../constants';
import { Product } from '../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onDelete?: (id: string) => void;
  productToEdit?: Product | null;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSubmit, onDelete, productToEdit }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [unit, setUnit] = useState(UNITS[0]);
  const [minStock, setMinStock] = useState<number>(10);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [error, setError] = useState('');

  // Form alanlarını duruma göre doldur veya sıfırla
  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        // Düzenleme Modu
        setName(productToEdit.product_name);
        setCategory(productToEdit.category);
        setUnit(productToEdit.unit);
        setMinStock(productToEdit.min_stock_level);
        setInitialStock(productToEdit.current_stock); 
      } else {
        // Yeni Ekleme Modu
        setName('');
        setCategory(CATEGORIES[0]);
        setUnit(UNITS[0]);
        setMinStock(10);
        setInitialStock(0);
      }
      setError('');
    }
  }, [isOpen, productToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ürün adı zorunludur.');
      return;
    }

    const formData = {
      product_name: name,
      category,
      unit,
      min_stock_level: Number(minStock),
      current_stock: Number(initialStock) 
    };

    onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            {productToEdit ? (
                <>
                    <Save size={20} className="text-blue-600 dark:text-blue-400" />
                    Ürün Düzenle
                </>
            ) : (
                <>
                    <PackagePlus size={20} className="text-green-600 dark:text-green-400" />
                    Yeni Ürün Ekle
                </>
            )}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 pb-0">
          <form id="productForm" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ürün Adı</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: 9V Pil"
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Birim</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Min. Stok Uyarısı</label>
                <input
                  type="number"
                  value={minStock}
                  onChange={(e) => setMinStock(Number(e.target.value))}
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {productToEdit ? 'Mevcut Stok' : 'Açılış Stoğu'}
                </label>
                <div className="relative">
                  <input
                      type="number"
                      value={initialStock}
                      onChange={(e) => setInitialStock(Number(e.target.value))}
                      disabled={!!productToEdit}
                      className={`w-full p-3 rounded-lg border outline-none ${productToEdit ? 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 cursor-not-allowed' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20'}`}
                  />
                  {productToEdit && (
                      <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  )}
                </div>
              </div>
            </div>
             {productToEdit && (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-tight">
                      Güvenlik nedeniyle stok değişimi sadece "Giriş/Çıkış" veya "Hareket Geçmişi" üzerinden yapılabilir.
                  </div>
              )}
          </form>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 mt-6 flex gap-3">
             {productToEdit && onDelete && (
                <button
                    type="button"
                    onClick={() => onDelete(productToEdit.id)}
                    className="p-3.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors shadow-sm active:scale-95"
                    title="Ürünü Sil"
                >
                    <Trash2 size={20} />
                </button>
            )}
            <button
              type="submit"
              form="productForm"
              className={`flex-1 py-3.5 rounded-xl text-white font-bold shadow-lg dark:shadow-none transition-transform transform active:scale-95 ${productToEdit ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}`}
            >
              {productToEdit ? 'Değişiklikleri Kaydet' : 'Ürünü Oluştur'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;