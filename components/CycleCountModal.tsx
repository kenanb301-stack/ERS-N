import React, { useState, useMemo } from 'react';
import { X, CheckCircle, Search, MapPin, Eye, EyeOff, ClipboardList, ScanLine, AlertTriangle, ArrowRight, Package, ArrowLeft, Check } from 'lucide-react';
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

  // Location Sorting Logic (Numeric Aware: A1, A2, A10)
  const locations = useMemo(() => {
      const locs = Array.from(new Set(products.map(p => p.location ? p.location.split('-')[0] : 'Belirsiz').filter(Boolean) as string[]));
      return locs.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [products]);

  // Products in Selected Location
  const locationProducts = useMemo(() => {
      if (!selectedLocation) return [];
      return products
        .filter(p => p.location && p.location.startsWith(selectedLocation))
        .sort((a, b) => (a.location || '').localeCompare(b.location || '', undefined, { numeric: true }));
  }, [products, selectedLocation]);

  // Handle Count Submission
  const handleCountSubmit = (product: Product, qty: number) => {
      onSubmitCount(product.id, qty);
      setCountedProducts(prev => new Set(prev).add(product.id));
  };

  if (!isOpen) return null;

  return (
    <>
    {showScanner && (
        <BarcodeScanner 
            onScanSuccess={(code) => {
                // Basit tarama mantığı eklenebilir, şimdilik sadece kapatıyoruz
                setShowScanner(false);
                alert(`Barkod: ${code} (Bu ekranda henüz otomatik bulma aktif değil, listeden seçiniz)`);
            }} 
            onClose={() => setShowScanner(false)} 
        />
    )}
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden transition-colors">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900/20">
          <div className="flex items-center gap-3">
              {step === 'COUNT' && (
                  <button onClick={() => setStep('LOCATION')} className="p-1 rounded-full hover:bg-black/10 transition-colors">
                      <ArrowLeft size={20} className="text-indigo-800 dark:text-indigo-300" />
                  </button>
              )}
              <h2 className="text-lg font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                <ClipboardList size={24} />
                {step === 'LOCATION' ? 'Sayım Başlat: Reyon Seç' : `Sayım: ${selectedLocation} Reyonu`}
              </h2>
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
                    <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm sticky top-0 z-10">
                        <div className="text-sm font-bold text-slate-600 dark:text-slate-300">
                            {countedProducts.size} / {locationProducts.length} Sayıldı
                        </div>
                        <button 
                            onClick={() => setBlindMode(!blindMode)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${blindMode ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-700'}`}
                        >
                            {blindMode ? <EyeOff size={14} /> : <Eye size={14} />}
                            {blindMode ? 'Kör Modu (Güvenli)' : 'Stok Açık'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {locationProducts.map(product => {
                            const isCounted = countedProducts.has(product.id);
                            return (
                                <CountCard 
                                    key={product.id} 
                                    product={product} 
                                    blindMode={blindMode} 
                                    isCounted={isCounted}
                                    onCount={handleCountSubmit} 
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
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
}

// Sub-Component for Individual Count Card
const CountCard: React.FC<CountCardProps> = ({ product, blindMode, isCounted, onCount }) => {
    const [val, setVal] = useState('');
    
    return (
        <div className={`p-4 rounded-xl border transition-all ${isCounted ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800 opacity-70' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">{product.product_name}</h4>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{product.part_code}</p>
                </div>
                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                    {product.location}
                </span>
            </div>

            <div className="flex gap-3 items-center">
                {!blindMode && (
                    <div className="text-center px-3">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">Sistem</span>
                        <span className="text-lg font-bold text-slate-600 dark:text-slate-300">{product.current_stock}</span>
                    </div>
                )}
                
                <div className="flex-1 flex gap-2">
                    <input 
                        type="number" 
                        placeholder="Sayım"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        disabled={isCounted}
                        className="w-full p-2 text-center font-bold text-lg rounded-lg border border-indigo-200 focus:border-indigo-500 outline-none bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                    />
                    <button 
                        onClick={() => onCount(product, Number(val))}
                        disabled={val === '' || isCounted}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white p-2 rounded-lg transition-colors"
                    >
                        <Check size={24} />
                    </button>
                </div>
            </div>
            {isCounted && <div className="mt-2 text-xs text-center text-emerald-600 font-bold flex items-center justify-center gap-1"><CheckCircle size={12}/> Tamamlandı</div>}
        </div>
    );
};

export default CycleCountModal;