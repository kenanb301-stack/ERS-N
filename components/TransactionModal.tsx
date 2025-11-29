
import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Search, AlertTriangle, RefreshCw, Trash2, ScanLine, Hash } from 'lucide-react';
import { Product, Transaction, TransactionType } from '../types';
import BarcodeScanner from './BarcodeScanner';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { id?: string; productId: string; quantity: number; description: string; type: TransactionType }) => void;
  onDelete?: (id: string) => void;
  initialType: TransactionType;
  products: Product[];
  transactionToEdit?: Transaction | null;
  defaultBarcode?: string;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSubmit, onDelete, initialType, products, transactionToEdit, defaultBarcode }) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  
  const [scanFeedback, setScanFeedback] = useState(''); 
  const [showScanner, setShowScanner] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && defaultBarcode) {
        handleBarcodeSearch(defaultBarcode);
    }
  }, [isOpen, defaultBarcode]);

  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setType(transactionToEdit.type);
        setProductId(transactionToEdit.product_id);
        setQuantity(transactionToEdit.quantity);
        setDescription(transactionToEdit.description);
        
        const product = products.find(p => p.id === transactionToEdit.product_id);
        setSearchTerm(product?.part_code || product?.product_name || '');
        
        setError('');
        setIsDropdownOpen(false);
        setScanFeedback('');
      } else {
        setType(initialType);
        if (!defaultBarcode) {
            setProductId('');
            setQuantity('');
            setDescription('');
            setError('');
            setSearchTerm('');
            setIsDropdownOpen(false);
            setScanFeedback('');
        }
      }
    }
  }, [isOpen, initialType, transactionToEdit, products]);

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
  const willBeNegative = !transactionToEdit && type === TransactionType.OUT && selectedProduct && quantity && (selectedProduct.current_stock - Number(quantity) < 0);

  const filteredProducts = products.filter(p => 
    (p.part_code && p.part_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm)) ||
    (p.short_id && String(p.short_id).includes(searchTerm)) ||
    (p.location && p.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleProductSelect = (product: Product) => {
    setProductId(product.id);
    setSearchTerm(product.part_code || product.product_name);
    setIsDropdownOpen(false);
    setError('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setScanFeedback(''); // Clear feedback on type

    // 1. Reset selection if user is typing
    if (productId) {
        setProductId('');
        setQuantity('');
    }
    
    // 2. REAL-TIME INTERCEPTOR (Shadow Search)
    // Check if the typed value matches a Short ID exactly
    if (val.trim().length > 0) {
        const searchVal = val.trim();
        const productByShortId = products.find(p => String(p.short_id || '').trim() === searchVal);
        
        if (productByShortId) {
            // MATCH FOUND BY SHORT ID!
            // Instead of showing the short ID numbers, immediately swap to Part Code
            handleProductSelect(productByShortId);
            setQuantity(1);
            setScanFeedback(`✅ Barkod Okundu: ${productByShortId.part_code}`);
            
            // Focus quantity input
            setTimeout(() => document.getElementById('quantityInput')?.focus(), 50);
            return;
        }
    }

    // Normal typing
    setSearchTerm(val);
    setIsDropdownOpen(true);
  };

  const handleBarcodeSearch = (code: string) => {
      const searchCode = code.trim();
      
      const product = products.find(p => 
          (String(p.short_id || '').trim() === searchCode) || 
          (p.barcode === searchCode) || 
          (p.part_code === searchCode) || 
          (p.location === searchCode)
      );
      
      if (product) {
          handleProductSelect(product);
          setQuantity(1);
          setScanFeedback(`✅ Barkod Algılandı: ${product.part_code}`);
          setTimeout(() => document.getElementById('quantityInput')?.focus(), 100);
      } else {
          setError(`"${code}" kodlu ürün bulunamadı.`);
          setProductId('');
          setSearchTerm(code); // Show raw code if not found so user sees what was scanned
          setQuantity('');
          setScanFeedback('');
      }
  };

  const handleScanSuccess = (decodedText: string) => {
      setShowScanner(false);
      handleBarcodeSearch(decodedText);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      setError('Lütfen listeden geçerli bir parça kodu seçin.');
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
    <>
    {showScanner && (
        <BarcodeScanner 
            onScanSuccess={handleScanSuccess} 
            onClose={() => setShowScanner(false)} 
        />
    )}
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

        <div className="p-4 overflow-y-visible">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form id="transactionForm" onSubmit={handleSubmit} className="space-y-4">
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

            {/* PRODUCT INPUT */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Parça Kodu / Barkod</label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Barkod okut veya parça kodu yaz..."
                        autoFocus={!defaultBarcode && !transactionToEdit}
                        className={`w-full pl-10 pr-10 py-3 rounded-lg border outline-none transition-all font-mono font-bold text-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white ${productId ? 'border-green-500 bg-green-50 dark:bg-green-900/10 dark:border-green-600' : 'border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20'}`}
                    />
                    {productId && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400" size={18} />
                    )}
                    {!productId && (
                        <Hash className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    )}
                </div>
                <button 
                    type="button" 
                    onClick={() => setShowScanner(true)}
                    className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-transform"
                >
                    <ScanLine size={20} />
                </button>
              </div>
              
              {/* Scan Feedback Message */}
              {scanFeedback && (
                  <div className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in flex items-center gap-1">
                      {scanFeedback}
                  </div>
              )}

              {/* Dropdown List */}
              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500 dark:text-slate-400 text-center">Kayıt bulunamadı.</div>
                  ) : (
                    filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProductSelect(p)}
                        className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-600 border-b border-slate-50 dark:border-slate-600 last:border-0 transition-colors flex justify-between items-center group"
                      >
                        <div className="flex items-center gap-3">
                             <div className="flex flex-col">
                                <span className="font-bold font-mono text-slate-800 dark:text-white text-lg group-hover:text-primary dark:group-hover:text-blue-400">
                                    {p.part_code || 'KODSUZ'}
                                </span>
                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                    {p.product_name}
                                </span>
                             </div>
                        </div>
                        <div className="text-right">
                             <div className={`text-xs font-bold px-2 py-1 rounded ${p.current_stock <= p.min_stock_level ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                                {p.current_stock} {p.unit}
                            </div>
                             {p.location && <div className="text-[10px] text-slate-500 mt-1 bg-orange-50 dark:bg-orange-900/10 px-1 rounded inline-block">{p.location}</div>}
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
                  id="quantityInput"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg"
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
              {willBeNegative && selectedProduct && (
                  <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 text-xs rounded flex items-start gap-2">
                      <AlertTriangle size={14} className="mt-0.5 min-w-[14px]" />
                      <span>
                          <strong>Dikkat:</strong> Bu işlem sonrası stok eksiye düşecektir. 
                          <br />(Yeni Stok: {selectedProduct.current_stock - Number(quantity)} {selectedProduct.unit})
                      </span>
                  </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Açıklama / Not</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === TransactionType.IN ? "Örn: Toptancı teslimatı" : "Örn: Üretim hattına sevk"}
                rows={2}
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
            </div>
          </form>
        </div>

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
    </>
  );
};

export default TransactionModal;
