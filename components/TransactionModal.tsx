import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Search, ChevronDown, AlertTriangle, Lock, RefreshCw, Trash2 } from 'lucide-react';
import { Product, Transaction, TransactionType } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { id?: string; productId: string; quantity: number; description: string; type: TransactionType }) => void;
  onDelete?: (id: string) => void;
  initialType: TransactionType;
  products: Product[];
  transactionToEdit?: Transaction | null;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSubmit, onDelete, initialType, products, transactionToEdit }) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Searchable Dropdown States
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        // Edit Mode
        setType(transactionToEdit.type);
        setProductId(transactionToEdit.product_id);
        setQuantity(transactionToEdit.quantity);
        setDescription(transactionToEdit.description);
        setSearchTerm(transactionToEdit.product_name || '');
        setError('');
        setIsDropdownOpen(false);
      } else {
        // Create Mode
        setType(initialType);
        setProductId('');
        setQuantity('');
        setDescription('');
        setError('');
        setSearchTerm('');
        setIsDropdownOpen(false);
      }
    }
  }, [isOpen, initialType, transactionToEdit]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const selectedProduct = products.find(p => p.id === productId);

  // Calculate potential negative stock logic
  const willBeNegative = !transactionToEdit && type === TransactionType.OUT && selectedProduct && quantity && (selectedProduct.current_stock - Number(quantity) < 0);

  const filteredProducts = products.filter(p => 
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProductSelect = (product: Product) => {
    setProductId(product.id);
    setSearchTerm(product.product_name);
    setIsDropdownOpen(false);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productId) {
      setError('Lütfen listeden bir ürün seçin.');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      setError('Geçerli bir miktar girin.');
      return;
    }
    
    onSubmit({
      id: transactionToEdit?.id,
      productId,
      quantity: Number(quantity),
      description,
      type
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
             {transactionToEdit ? (
                <>
                    <RefreshCw size={20} className="text-blue-600 dark:text-blue-400" />
                    İşlemi Düzenle
                </>
             ) : (
                type === TransactionType.IN ? 'Yeni Mal Girişi' : 'Mal Çıkışı'
             )}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-visible">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form id="transactionForm" onSubmit={handleSubmit} className="space-y-4">
            {/* Type Switcher */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <button
                type="button"
                onClick={() => setType(TransactionType.IN)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === TransactionType.IN ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >
                GİRİŞ
              </button>
              <button
                type="button"
                onClick={() => setType(TransactionType.OUT)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === TransactionType.OUT ? 'bg-white dark:bg-slate-600 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >
                ÇIKIŞ
              </button>
            </div>

            {/* Searchable Product Input */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ürün</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (transactionToEdit && searchTerm !== e.target.value) {
                    }
                    setProductId(''); 
                    setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Ürün adı yazın..."
                className={`w-full pl-10 pr-10 py-3 rounded-lg border outline-none transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-white ${productId ? 'border-green-500 bg-green-50 dark:bg-green-900/10 dark:border-green-600' : 'border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20'}`}
                />
                {productId && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400" size={18} />
                )}
                {!productId && (
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                )}
              </div>

              {/* Dropdown List */}
              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500 dark:text-slate-400 text-center">Ürün bulunamadı.</div>
                  ) : (
                    filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProductSelect(p)}
                        className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-600 border-b border-slate-50 dark:border-slate-600 last:border-0 transition-colors flex justify-between items-center group"
                      >
                        <div>
                            <div className="font-medium text-slate-800 dark:text-white group-hover:text-primary dark:group-hover:text-blue-400">{p.product_name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{p.category}</div>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded ${p.current_stock <= p.min_stock_level ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                            {p.current_stock} {p.unit}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Miktar</label>
              <div className="relative">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
                {selectedProduct ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 text-sm font-medium bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded">
                        {selectedProduct.unit}
                    </span>
                ) : (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                       Birim
                    </span>
                )}
              </div>
              {/* Negative Stock Warning */}
              {willBeNegative && selectedProduct && (
                  <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 text-xs rounded flex items-start gap-2">
                      <AlertTriangle size={14} className="mt-0.5 min-w-[14px]" />
                      <span>
                          <strong>Dikkat:</strong> Bu işlem sonrası stok eksiye düşecektir. 
                          <br />(Yeni Stok: {selectedProduct.current_stock - Number(quantity)} {selectedProduct.unit})
                      </span>
                  </div>
              )}
              {/* Edit Mode Info */}
              {transactionToEdit && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs rounded">
                      Bu değişiklik stok bakiyesine otomatik yansıtılacaktır.
                  </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Açıklama</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === TransactionType.IN ? "Örn: Toptancı teslimatı" : "Örn: Üretim hattına sevk"}
                rows={3}
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 mt-auto flex gap-3">
          {transactionToEdit && (
            <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if(onDelete) onDelete(transactionToEdit.id);
                }}
                className="p-3.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors shadow-sm active:scale-95"
                title="İşlemi Sil"
            >
                <Trash2 size={20} />
            </button>
          )}
          <button
            type="submit"
            form="transactionForm"
            className={`flex-1 py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-transform transform active:scale-95 shadow-lg dark:shadow-none ${type === TransactionType.IN ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'}`}
          >
            {transactionToEdit ? (
                <>
                    <RefreshCw size={20} />
                    Güncelle
                </>
            ) : (
                <>
                    <CheckCircle size={20} />
                    {type === TransactionType.IN ? 'Girişi Onayla' : 'Çıkışı Onayla'}
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;