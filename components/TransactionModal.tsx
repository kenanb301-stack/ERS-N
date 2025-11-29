
import React, { useState, useEffect, useRef, useDeferredValue } from 'react';
import { X, CheckCircle, AlertCircle, Search, AlertTriangle, RefreshCw, Trash2, ScanLine, Hash, Zap, Barcode } from 'lucide-react';
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
  
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // --- NEW: DUAL FIELDS STATE ---
  const [barcodeInput, setBarcodeInput] = useState('');
  const [partCodeInput, setPartCodeInput] = useState('');
  
  // Performans için arama terimini geciktir
  const deferredPartCodeInput = useDeferredValue(partCodeInput);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // SCAN BUFFER REFS
  const lastKeyTime = useRef<number>(0);
  const barcodeBuffer = useRef<string>('');

  // 1. GLOBAL KEY LISTENER FOR SCANNER (BUFFER LOGIC)
  useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
          const activeId = document.activeElement?.id;
          if (activeId === 'quantityInput' || activeId === 'descInput') {
              return;
          }

          const now = Date.now();
          const isScannerInput = now - lastKeyTime.current < 50;
          lastKeyTime.current = now;

          if (e.key === 'Enter') {
              if (barcodeBuffer.current.length > 0) {
                  e.preventDefault();
                  processScannedCode(barcodeBuffer.current);
                  barcodeBuffer.current = '';
              }
          } else if (e.key.length === 1) {
              if (isScannerInput) {
                  barcodeBuffer.current += e.key;
              } else {
                  if (now - lastKeyTime.current > 100) {
                      barcodeBuffer.current = ''; 
                  }
              }
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, products]);

  useEffect(() => {
    if (isOpen && defaultBarcode) {
        processScannedCode(defaultBarcode);
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
        if (product) {
            setProductId(product.id);
            setFoundProduct(product);
            setPartCodeInput(product.part_code || product.product_name || '');
            setBarcodeInput(product.short_id || product.barcode || '');
        }
        
        setError('');
        setIsDropdownOpen(false);
      } else {
        setType(initialType);
        if (!defaultBarcode) {
            resetForm();
        }
      }
    }
  }, [isOpen, initialType, transactionToEdit, products]);

  const resetForm = () => {
      setProductId('');
      setQuantity('');
      setDescription('');
      setError('');
      setBarcodeInput('');
      setPartCodeInput('');
      setIsDropdownOpen(false);
      setFoundProduct(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const processScannedCode = (code: string) => {
      const cleanCode = code.trim();
      setBarcodeInput(cleanCode); // Barkod alanına yaz
      
      // Ürünü bul
      let product = products.find(p => String(p.short_id).trim() === cleanCode);
      if (!product) product = products.find(p => p.barcode === cleanCode);
      if (!product) product = products.find(p => p.part_code === cleanCode);
      if (!product) product = products.find(p => p.location === cleanCode);

      if (product) {
          selectProduct(product);
      } else {
          // Bulunamadıysa sadece barkod alanı dolu kalsın, diğerlerini temizle
          setProductId('');
          setFoundProduct(null);
          setPartCodeInput('');
          setError(`Kod bulunamadı: ${cleanCode}`);
      }
  };

  const selectProduct = (product: Product) => {
    setProductId(product.id);
    setFoundProduct(product);
    
    // Fill Fields
    setPartCodeInput(product.part_code || product.product_name);
    setBarcodeInput(product.short_id || product.barcode || '');
    
    setIsDropdownOpen(false);
    setError('');
    
    // Focus quantity
    setTimeout(() => {
        document.getElementById('quantityInput')?.focus();
        (document.getElementById('quantityInput') as HTMLInputElement)?.select();
    }, 100);
  };

  // Barkod Elle Girilirse
  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setBarcodeInput(val);

      if (val.length >= 1) {
          const product = products.find(p => String(p.short_id) === val);
          if (product) {
              selectProduct(product);
          } else {
              // Eşleşme bozulursa seçimi kaldır
              setProductId('');
              setFoundProduct(null);
              setPartCodeInput('');
          }
      } else {
          resetForm();
      }
  };

  // Parça Kodu Elle Girilirse (Arama)
  const handlePartCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setPartCodeInput(val);
      setIsDropdownOpen(true);

      if (val === '') {
          setBarcodeInput('');
          setProductId('');
          setFoundProduct(null);
      }
  };

  const handleScanSuccess = (decodedText: string) => {
      setShowScanner(false);
      processScannedCode(decodedText);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      setError('Lütfen listeden geçerli bir parça seçin veya barkod okutun.');
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

  if (!isOpen) return null;

  const selectedProduct = products.find(p => p.id === productId);
  const willBeNegative = !transactionToEdit && type === TransactionType.OUT && selectedProduct && quantity && (selectedProduct.current_stock - Number(quantity) < 0);

  // Filter products based on Part Code Input
  const filteredProducts = products.filter(p => 
    (p.part_code && p.part_code.toLowerCase().includes(deferredPartCodeInput.toLowerCase())) ||
    p.product_name.toLowerCase().includes(deferredPartCodeInput.toLowerCase()) || 
    (p.location && p.location.toLowerCase().includes(deferredPartCodeInput.toLowerCase()))
  );

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

            {/* --- DUAL INPUT SYSTEM --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" ref={dropdownRef}>
                
                {/* 1. Barkod Kodu Alanı */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Barkod Kodu (6 Hane)</label>
                    <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={barcodeInput}
                            onChange={handleBarcodeInput}
                            placeholder="Okutunuz..."
                            autoFocus={!defaultBarcode && !transactionToEdit}
                            className={`w-full pl-9 pr-2 py-3 rounded-lg border outline-none transition-all font-mono font-bold text-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white ${productId ? 'border-green-500 bg-green-50 dark:bg-green-900/10 dark:border-green-600' : 'border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20'}`}
                        />
                    </div>
                </div>

                {/* 2. Parça Kodu Alanı (Dropdown) */}
                <div className="relative">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Parça Kodu / Ara</label>
                    <div className="relative flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={partCodeInput}
                                onChange={handlePartCodeInput}
                                onFocus={() => setIsDropdownOpen(true)}
                                placeholder="Parça Kodu..."
                                className={`w-full pl-9 pr-8 py-3 rounded-lg border outline-none transition-all font-bold text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white ${productId ? 'border-green-500 bg-green-50 dark:bg-green-900/10 dark:border-green-600' : 'border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20'}`}
                            />
                            {productId && (
                                <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400" size={16} />
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

                    {/* Dropdown List */}
                    {isDropdownOpen && partCodeInput.length > 0 && !foundProduct && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg max-h-60 overflow-y-auto right-0 min-w-[250px]">
                        {filteredProducts.length === 0 ? (
                            <div className="p-3 text-sm text-slate-500 dark:text-slate-400 text-center">Sonuç yok.</div>
                        ) : (
                            filteredProducts.map(p => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => selectProduct(p)}
                                className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-600 border-b border-slate-50 dark:border-slate-600 last:border-0 transition-colors flex justify-between items-center group"
                            >
                                <div>
                                    <span className="font-bold font-mono text-slate-800 dark:text-white text-sm group-hover:text-primary dark:group-hover:text-blue-400 block">
                                        {p.part_code || 'KODSUZ'}
                                    </span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500">
                                        {p.product_name}
                                    </span>
                                </div>
                                <div className={`text-xs font-bold px-2 py-1 rounded ${p.current_stock <= p.min_stock_level ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                                    {p.current_stock}
                                </div>
                            </button>
                            ))
                        )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Found Product Info (Yeşil Kutu) */}
            {foundProduct && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-sm rounded-lg flex items-center gap-2 border border-green-200 dark:border-green-800 animate-fade-in">
                    <CheckCircle size={18} className="flex-shrink-0" />
                    <div>
                        <div className="font-bold">{foundProduct.product_name}</div>
                        <div className="text-xs opacity-80 flex gap-2">
                            <span>Stok: {foundProduct.current_stock} {foundProduct.unit}</span>
                            <span>|</span>
                            <span>Reyon: {foundProduct.location}</span>
                        </div>
                    </div>
                </div>
            )}

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
                id="descInput"
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
