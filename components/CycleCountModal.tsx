
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, CheckCircle, Search, MapPin, Eye, EyeOff, ClipboardList, ScanLine, AlertTriangle, ArrowRight, Package, ArrowLeft, Check, QrCode } from 'lucide-react';
import { Product } from '../types';
import BarcodeScanner from './BarcodeScanner';

interface CycleCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSubmitCount: (productId: string, countedQty: number) => void;
}

const CycleCountModal: React.FC<CycleCountModalProps> = ({ isOpen, onClose, products, onSubmitCount }) => {
  const [step, setStep] = useState<'LOCATION' | 'COUNT'>('LOCATION');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [blindMode, setBlindMode] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [countedProducts, setCountedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Refs for scrolling to item
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Location Sorting Logic (Numeric Aware: A1, A2, A10)
  const locations = useMemo(() => {
      const locs = Array.from(new Set(products.map(p => p.location ? p.location.split('-')[0] : 'Belirsiz').filter(Boolean) as string[]));
      return locs.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [products]);

  // Products in Selected Location
  const locationProducts = useMemo(() => {
      if (!selectedLocation) return [];
      let filtered = products
        .filter(p => p.location && p.location.startsWith(selectedLocation))
        .sort((a, b) => (a.location || '').localeCompare(b.location || '', undefined, { numeric: true }));
      
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          filtered = filtered.filter(p => 
              p.product_name.toLowerCase().includes(lower) || 
              p.part_code?.toLowerCase().includes(lower) ||
              p.barcode?.includes(lower) ||
              p.short_id?.includes(lower)
          );
      }
      return filtered;
  }, [products, selectedLocation, searchTerm]);

  const progress = locationProducts.length > 0 ? (countedProducts.size / locationProducts.length) * 100 : 0;

  // Handle Count Submission
  const handleCountSubmit = (product: Product, qty: number) => {
      onSubmitCount(product.id, qty);
      setCountedProducts(prev => new Set(prev).add(product.id));
  };

  const handleScan = (code: string) => {
      // Find product in the CURRENT location list
      const cleanCode = code.trim();
      const product = locationProducts.find(p => 
          p.short_id === cleanCode || 
          p.barcode === cleanCode || 
          p.part_code === cleanCode
      );

      if (product) {
          setShowScanner(false);
          // Scroll to item
          const el = itemRefs.current[product.id];
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('ring-4', 'ring-blue-500', 'ring-offset-2');
              setTimeout(() => el.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-2'), 2000);
          }
          // Focus input
          const inp = inputRefs.current[product.id];
          if (inp) {
              setTimeout(() => inp.focus(), 500);
          }
      } else {
          // Maybe search in ALL products?
          const globalProduct = products.find(p => p.short_id === cleanCode || p.barcode === cleanCode || p.part_code === cleanCode);
          if (globalProduct) {
              alert(`Bu ürün (${globalProduct.product_name}) şu anki reyon listesinde yok. Reyonu: ${globalProduct.location}`);
          } else {
              alert("Ürün bulunamadı!");
          }
      }
  };

  if (!isOpen) return null;

  return (
    <>
    {showScanner && (
        <BarcodeScanner 
            onScanSuccess={handleScan} 
            onClose={() => setShowScanner(false)} 
        />
    )}
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden transition-colors">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900/20">
          <div className="flex items-center gap-3">
              {step === 'COUNT' && (
                  <button onClick={() => { setStep('LOCATION'); setSearchTerm(''); }} className="p-1 rounded-full hover:bg-black/10 transition-colors">
                      <ArrowLeft size={20} className="text-indigo-800 dark:text-indigo-300" />
                  </button>
              )}
              <div>
                <h2 className="text-lg font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                    <ClipboardList size={24} />
                    {step === 'LOCATION' ? 'Sayım Başlat' : `${selectedLocation} Reyonu`}
                </h2>
                {step === 'COUNT' && <p className="text-xs text-indigo-600 dark:text-indigo-400">{countedProducts.size} / {locationProducts.length} Sayıldı</p>}
              </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4">
            
            {/* STEP 1: LOCATION SELECTION */}
            {step === 'LOCATION' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {locations.map(loc => {
                        const count = products.filter(p => p.location?.startsWith(loc)).length;
                        return (
                            <button 
                                key={loc}
                                onClick={() => { setSelectedLocation(loc); setStep('COUNT'); }}
                                className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-500 hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group"
                            >
                                <span className="text-2xl font-black text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{loc}</span>
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">{count} Ürün</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* STEP 2: COUNTING (CARD VIEW) */}
            {step === 'COUNT' && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm sticky top-0 z-20 flex flex-wrap gap-2 items-center">
                        <div className="relative flex-1 min-w-[150px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Ürün ara..."
                                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                        
                        <button 
                            onClick={() => setShowScanner(true)}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
                            title="Barkod ile Bul"
                        >
                            <ScanLine size={20} />
                        </button>

                        <button 
                            onClick={() => setBlindMode(!blindMode)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${blindMode ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-700'}`}
                        >
                            {blindMode ? <EyeOff size={16} /> : <Eye size={16} />}
                            {blindMode ? 'Kör' : 'Açık'}
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-12">
                        {locationProducts.length === 0 ? (
                            <div className="col-span-full text-center py-10 text-slate-400">Ürün bulunamadı.</div>
                        ) : (
                            locationProducts.map(product => {
                                const isCounted = countedProducts.has(product.id);
                                return (
                                    <div ref={(el) => { itemRefs.current[product.id] = el; }} key={product.id}>
                                        <CountCard 
                                            product={product} 
                                            blindMode={blindMode} 
                                            isCounted={isCounted}
                                            onCount={handleCountSubmit}
                                            inputRef={(el) => { inputRefs.current[product.id] = el; }}
                                        />
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
        
        {/* Bottom Status Bar */}
        {step === 'COUNT' && (
            <div className="bg-slate-900 text-white p-2 px-4 flex justify-between items-center text-xs font-medium">
                <div className="flex gap-4">
                    <span>Sayılan: <span className="font-bold text-blue-400">{countedProducts.size}</span></span>
                    <span>Kalan: <span className="font-bold text-orange-400">{locationProducts.length - countedProducts.size}</span></span>
                </div>
                <div className="flex items-center gap-1 opacity-70">
                    <CheckCircle size={14} />
                    <span>Otomatik Kaydedilir</span>
                </div>
            </div>
        )}
      </div>
    </div>
    </>
  );
};

interface CountCardProps {
    product: Product;
    blindMode: boolean;
    isCounted: boolean;
    onCount: (p: Product, q: number) => void;
    inputRef: React.LegacyRef<HTMLInputElement>;
}

// Sub-Component for Individual Count Card
const CountCard: React.FC<CountCardProps> = ({ product, blindMode, isCounted, onCount, inputRef }) => {
    const [val, setVal] = useState('');
    
    return (
        <div className={`p-4 rounded-xl border transition-all duration-300 ${isCounted ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm hover:border-indigo-300'}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-bold text-slate-800 dark:text-white truncate">{product.product_name}</h4>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400 font-bold">{product.part_code}</p>
                </div>
                {isCounted && <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />}
            </div>

            <div className="flex gap-3 items-center">
                <div className={`text-center px-2 py-1 rounded min-w-[3rem] ${blindMode ? 'bg-slate-100 dark:bg-slate-700' : 'bg-transparent'}`}>
                    <span className="block text-[9px] text-slate-400 uppercase font-bold">Stok</span>
                    <span className={`text-lg font-bold ${blindMode ? 'text-transparent blur-sm select-none' : 'text-slate-600 dark:text-slate-300'}`}>
                        {product.current_stock}
                    </span>
                </div>
                
                <div className="flex-1 flex gap-2">
                    <input 
                        ref={inputRef}
                        type="number" 
                        inputMode="numeric"
                        placeholder="?"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && val !== '') {
                                onCount(product, Number(val));
                            }
                        }}
                        disabled={isCounted}
                        className="w-full p-2 text-center font-bold text-lg rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white disabled:opacity-50 transition-all"
                    />
                    <button 
                        onClick={() => onCount(product, Number(val))}
                        disabled={val === '' || isCounted}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:dark:bg-slate-700 text-white p-2 rounded-lg transition-colors shadow-sm active:scale-95"
                    >
                        <Check size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CycleCountModal;
