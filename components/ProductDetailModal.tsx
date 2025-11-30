
import React, { useState, useEffect } from 'react';
import { X, Package, Calendar, ArrowRightLeft, ArrowDownLeft, ArrowUpRight, MapPin, Hash, Barcode, History, AlertTriangle, Search } from 'lucide-react';
import { Product, Transaction, TransactionType } from '../types';
import BarcodeScanner from './BarcodeScanner';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  transactions: Transaction[];
  initialProductId?: string;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ isOpen, onClose, products, transactions, initialProductId }) => {
  const [showScanner, setShowScanner] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [manualSearch, setManualSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
        if (initialProductId) {
            const p = products.find(p => p.id === initialProductId);
            if (p) {
                setSelectedProduct(p);
                setShowScanner(false);
            }
        } else {
            setShowScanner(true);
            setSelectedProduct(null);
        }
        setError('');
        setManualSearch('');
    }
  }, [isOpen, initialProductId, products]);

  if (!isOpen) return null;

  const handleScan = (code: string) => {
      const cleanCode = code.trim();
      // Search by Short ID, Barcode, or Part Code
      const product = products.find(p => 
          String(p.short_id) === cleanCode || 
          p.barcode === cleanCode || 
          p.part_code === cleanCode
      );

      if (product) {
          setSelectedProduct(product);
          setShowScanner(false);
          setError('');
      } else {
          setError(`Ürün bulunamadı: ${cleanCode}`);
      }
  };

  const handleManualSearch = (e: React.FormEvent) => {
      e.preventDefault();
      handleScan(manualSearch);
  };

  const productTransactions = selectedProduct 
    ? transactions
        .filter(t => t.product_id === selectedProduct.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5) // Last 5 transactions
    : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        {showScanner && !selectedProduct && (
            <div className="absolute inset-0 z-[110]">
                <BarcodeScanner 
                    onScanSuccess={handleScan} 
                    onClose={onClose} 
                />
                
                {/* Overlay UI for Scanner */}
                <div className="absolute top-20 left-4 right-4 flex flex-col items-center gap-4 pointer-events-none">
                    {error && (
                        <div className="bg-red-600 text-white px-6 py-3 rounded-xl shadow-xl font-bold animate-bounce flex items-center gap-2 pointer-events-auto">
                            <AlertTriangle size={20} />
                            {error}
                        </div>
                    )}
                </div>

                <div className="absolute bottom-10 left-4 right-4 z-[120] pointer-events-auto">
                    <form onSubmit={handleManualSearch} className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-lg flex gap-2">
                        <input 
                            type="text" 
                            value={manualSearch}
                            onChange={(e) => setManualSearch(e.target.value)}
                            placeholder="Kod ile ara..."
                            className="flex-1 bg-transparent px-3 py-2 outline-none dark:text-white"
                        />
                        <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg">
                            <Search size={20} />
                        </button>
                    </form>
                </div>
            </div>
        )}

        {selectedProduct && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] z-[130]">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                        <Package size={24} /> Ürün Detayı
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    
                    {/* Main Info Card */}
                    <div className="flex gap-4 items-start">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center border dark:border-slate-600 flex-shrink-0">
                            <Package size={32} className="text-slate-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{selectedProduct.product_name}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono font-bold text-slate-600 dark:text-slate-300 border dark:border-slate-600">
                                    <Hash size={12}/> {selectedProduct.part_code || '-'}
                                </span>
                                {selectedProduct.location && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 dark:bg-orange-900/20 rounded text-xs font-bold text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-800">
                                        <MapPin size={12}/> {selectedProduct.location}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stock Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                            <span className="text-xs text-slate-500 uppercase font-bold">Mevcut Stok</span>
                            <div className={`text-3xl font-black mt-1 ${selectedProduct.current_stock <= selectedProduct.min_stock_level ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}>
                                {selectedProduct.current_stock} <span className="text-sm font-medium text-slate-400">{selectedProduct.unit}</span>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                            <span className="text-xs text-slate-500 uppercase font-bold">Barkod ID</span>
                            <div className="text-xl font-mono font-bold mt-2 text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1">
                                <Barcode size={16} />
                                {selectedProduct.short_id}
                            </div>
                        </div>
                    </div>

                    {/* History */}
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2 text-sm">
                            <History size={16} className="text-blue-500"/> Son Hareketler
                        </h4>
                        <div className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                            {productTransactions.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400">Henüz işlem kaydı yok.</div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {productTransactions.map(t => (
                                        <div key={t.id} className="p-3 flex justify-between items-center text-sm bg-white dark:bg-slate-800">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-lg ${t.type === TransactionType.IN ? 'bg-emerald-100 text-emerald-700' : t.type === TransactionType.OUT ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {t.type === TransactionType.IN ? <ArrowDownLeft size={16}/> : t.type === TransactionType.OUT ? <ArrowUpRight size={16}/> : <ArrowRightLeft size={16}/>}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-700 dark:text-slate-200">
                                                        {t.type === TransactionType.IN ? 'Giriş' : t.type === TransactionType.OUT ? 'Çıkış' : 'Düzeltme'}
                                                    </div>
                                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Calendar size={10}/> {new Date(t.date).toLocaleDateString('tr-TR')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="font-bold text-slate-800 dark:text-white">
                                                {t.type === TransactionType.IN ? '+' : t.type === TransactionType.OUT ? '-' : ''}{t.quantity}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button 
                        onClick={() => { setSelectedProduct(null); setShowScanner(true); setManualSearch(''); }}
                        className="w-full py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                    >
                        <ArrowRightLeft size={18} /> Başka Ürün Sorgula
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default ProductDetailModal;
