import React, { useEffect, useState } from 'react';
import { X, Printer, CheckSquare, Square } from 'lucide-react';
import { Product } from '../types';

// We need to declare JsBarcode because it's loaded from CDN
declare var JsBarcode: any;

interface BarcodePrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

const BarcodePrinterModal: React.FC<BarcodePrinterModalProps> = ({ isOpen, onClose, products }) => {
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // Products that have a barcode value
  const validProducts = products.filter(p => p.barcode && p.barcode.trim().length > 0);

  useEffect(() => {
    if (isOpen) {
      // Select all by default when opened
      setSelectedProductIds(new Set(validProducts.map(p => p.id)));
    }
  }, [isOpen, products]);

  useEffect(() => {
    if (isOpen && selectedProductIds.size > 0) {
        // Wait for DOM render
        setTimeout(() => {
            selectedProductIds.forEach(id => {
                const product = validProducts.find(p => p.id === id);
                if (product) {
                    try {
                        JsBarcode(`#barcode-${id}`, product.barcode, {
                            format: "CODE128",
                            width: 2,
                            height: 50,
                            displayValue: true,
                            fontSize: 14,
                            margin: 10
                        });
                    } catch (e) {
                        console.error("Barcode generation error", e);
                    }
                }
            });
        }, 100);
    }
  }, [isOpen, selectedProductIds]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedProductIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedProductIds(newSet);
  };

  const toggleAll = () => {
    if (selectedProductIds.size === validProducts.length) {
        setSelectedProductIds(new Set());
    } else {
        setSelectedProductIds(new Set(validProducts.map(p => p.id)));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Printer size={24} className="text-blue-600 dark:text-blue-400" />
            Barkod Yazdır (Etiket)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-white dark:bg-slate-700 border-b border-slate-100 dark:border-slate-600 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <button 
                    onClick={toggleAll}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                    {selectedProductIds.size === validProducts.length ? <CheckSquare size={18} /> : <Square size={18} />}
                    Tümünü Seç / Kaldır
                </button>
                <span className="text-sm text-slate-400">
                    {selectedProductIds.size} ürün seçildi
                </span>
            </div>
            <button 
                onClick={handlePrint}
                disabled={selectedProductIds.size === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Printer size={18} />
                YAZDIR
            </button>
        </div>

        {/* Preview Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 dark:bg-slate-900">
            
            {/* Warning for products without barcodes */}
            {validProducts.length < products.length && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm rounded-lg border border-amber-100 dark:border-amber-900/30">
                    <strong>Bilgi:</strong> {products.length - validProducts.length} adet ürünün barkodu tanımlı olmadığı için listede görünmüyor. Önce ürün düzenlemeden barkod ekleyiniz.
                </div>
            )}

            {/* Print Layout Grid */}
            <div id="print-area" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3 print:gap-4">
                {validProducts.filter(p => selectedProductIds.has(p.id)).map(product => (
                    <div 
                        key={product.id} 
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center print:border print:border-black print:shadow-none break-inside-avoid h-[180px]"
                    >
                        <p className="text-sm font-bold text-black mb-2 line-clamp-2 h-10 flex items-center justify-center">
                            {product.product_name}
                        </p>
                        <svg id={`barcode-${product.id}`} className="w-full h-auto"></svg>
                        <p className="text-xs text-slate-500 mt-1 print:text-black">
                            {product.category}
                        </p>
                    </div>
                ))}
            </div>

            {selectedProductIds.size === 0 && (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500">
                    <Printer size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Yazdırılacak ürün seçiniz.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default BarcodePrinterModal;