
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Search, Calendar, MapPin, Eye, EyeOff, ClipboardList, ScanLine, AlertTriangle, Check } from 'lucide-react';
import { Product } from '../types';
import BarcodeScanner from './BarcodeScanner';

interface CycleCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSubmitCount: (productId: string, countedQty: number) => void;
}

const CycleCountModal: React.FC<CycleCountModalProps> = ({ isOpen, onClose, products, onSubmitCount }) => {
  const [activeTab, setActiveTab] = useState<'PLAN' | 'COUNT'>('PLAN');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [blindMode, setBlindMode] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Active counting state
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [countedQty, setCountedQty] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);

  // Filter products that haven't been counted recently (e.g., > 30 days) or never
  const productsDueForCount = products
    .filter(p => {
        if (!p.last_counted_at) return true;
        const lastCount = new Date(p.last_counted_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return lastCount < thirtyDaysAgo;
    })
    .sort((a, b) => {
        // Prioritize never counted, then oldest count
        if (!a.last_counted_at) return -1;
        if (!b.last_counted_at) return 1;
        return new Date(a.last_counted_at).getTime() - new Date(b.last_counted_at).getTime();
    });

  // Unique locations for filter
  const locations = Array.from(new Set(products.map(p => p.location?.split('-')[0]).filter(Boolean)));

  const filteredPlanList = productsDueForCount.filter(p => 
    (!selectedLocation || p.location?.startsWith(selectedLocation)) &&
    (p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.part_code?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleStartCount = (product: Product) => {
      setActiveProduct(product);
      setCountedQty('');
      setActiveTab('COUNT');
  };

  const handleScanSuccess = (code: string) => {
      setShowScanner(false);
      const product = products.find(p => 
          (p.barcode === code) || 
          (p.part_code === code) || 
          (p.id === code) ||
          (p.short_id === code)
      );

      if (product) {
          handleStartCount(product);
      } else {
          alert("Ürün bulunamadı!");
      }
  };

  const submitCount = () => {
      if (!activeProduct || countedQty === '') return;
      
      const qty = Number(countedQty);
      const diff = qty - activeProduct.current_stock;

      if (diff !== 0) {
          if (!confirm(`DİKKAT: Sistem stoğu (${activeProduct.current_stock}) ile sayılan (${qty}) arasında ${diff} fark var. Stok düzeltilsin mi?`)) {
              return;
          }
      }

      onSubmitCount(activeProduct.id, qty);
      setActiveProduct(null);
      setCountedQty('');
      // Go back to plan or stay in count mode? Let's stay in count mode for next item if using scanner, but here we go back to list
      setActiveTab('PLAN'); 
  };

  if (!isOpen) return null;

  return (
    <>
    {showScanner && (
        <BarcodeScanner 
            onScanSuccess={handleScanSuccess} 
            onClose={() => setShowScanner(false)} 
        />
    )}
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900/20">
          <h2 className="text-lg font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
            <ClipboardList size={24} />
            Düzenli Sayım Modülü (Cycle Counting)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        {/* Tabs & Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-800">
            <div className="flex gap-2 w-full sm:w-auto">
                <button 
                    onClick={() => { setActiveTab('PLAN'); setActiveProduct(null); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'PLAN' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                >
                    Planlama Listesi
                </button>
                <button 
                    onClick={() => setActiveTab('COUNT')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'COUNT' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                >
                    Sayım Ekranı
                </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Kör Sayım:</span>
                    <button 
                        onClick={() => setBlindMode(!blindMode)}
                        className={`p-1 rounded ${blindMode ? 'bg-green-500 text-white' : 'bg-slate-300 dark:bg-slate-600 text-slate-500'}`}
                        title={blindMode ? "Sistem stoğu gizli (Önerilen)" : "Sistem stoğu açık"}
                    >
                        {blindMode ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
                <button 
                    onClick={() => setShowScanner(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm active:scale-95 transition-transform"
                >
                    <ScanLine size={18} /> <span className="hidden sm:inline">Barkodla Başla</span>
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4">
            
            {activeTab === 'PLAN' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex gap-2">
                        <select 
                            value={selectedLocation} 
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500"
                        >
                            <option value="">Tüm Reyonlar</option>
                            {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        </select>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Ürün ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                                <tr>
                                    <th className="p-3">Parça Kodu</th>
                                    <th className="p-3">Ürün Adı</th>
                                    <th className="p-3">Reyon</th>
                                    <th className="p-3 text-center">Son Sayım</th>
                                    <th className="p-3 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredPlanList.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{p.part_code || '-'}</td>
                                        <td className="p-3 text-slate-800 dark:text-slate-200">{p.product_name}</td>
                                        <td className="p-3"><span className="bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 px-2 py-0.5 rounded text-xs font-bold">{p.location || '-'}</span></td>
                                        <td className="p-3 text-center text-slate-500 text-xs">
                                            {p.last_counted_at ? new Date(p.last_counted_at).toLocaleDateString() : <span className="text-red-500 font-bold">Hiç Sayılmadı</span>}
                                        </td>
                                        <td className="p-3 text-right">
                                            <button 
                                                onClick={() => handleStartCount(p)}
                                                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Say
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredPlanList.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">Sayılması gereken acil ürün yok.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'COUNT' && (
                <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto">
                    {!activeProduct ? (
                        <div className="text-center text-slate-400">
                            <ClipboardList size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Sayım yapmak için bir ürün seçin</p>
                            <p className="text-sm mt-2">Listeden seçebilir veya barkod okutabilirsiniz.</p>
                            <button onClick={() => setActiveTab('PLAN')} className="mt-4 text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Listeye Dön</button>
                        </div>
                    ) : (
                        <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-6 text-center border-b border-slate-100 dark:border-slate-700">
                                <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold mb-2">
                                    Aktif Sayım
                                </span>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{activeProduct.product_name}</h2>
                                <p className="text-lg font-mono text-slate-500 dark:text-slate-400">{activeProduct.part_code}</p>
                                {activeProduct.location && (
                                    <div className="mt-4 flex justify-center">
                                        <span className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-lg font-bold">
                                            <MapPin size={16} /> {activeProduct.location}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-slate-50 dark:bg-slate-900/50">
                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 text-center">Fiziksel Sayım Adeti</label>
                                    <input 
                                        type="number" 
                                        value={countedQty}
                                        onChange={(e) => setCountedQty(e.target.value)}
                                        placeholder="0"
                                        autoFocus
                                        className="w-full text-center text-4xl font-bold p-4 rounded-xl border-2 border-indigo-200 focus:border-indigo-500 outline-none bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                                    />
                                </div>

                                {!blindMode && (
                                    <div className="text-center mb-6 p-3 bg-slate-200 dark:bg-slate-700 rounded-lg">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold block">Sistem Kaydı</span>
                                        <span className="text-xl font-bold text-slate-700 dark:text-slate-200">{activeProduct.current_stock} {activeProduct.unit}</span>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setActiveProduct(null)}
                                        className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button 
                                        onClick={submitCount}
                                        disabled={countedQty === ''}
                                        className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={20} />
                                        Onayla
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
      </div>
    </div>
    </>
  );
};

export default CycleCountModal;
