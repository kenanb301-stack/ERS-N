
import React, { useEffect, useState } from 'react';
import { X, Printer, CheckSquare, Square, Search, Filter, Check, ShieldCheck } from 'lucide-react';
import { Product } from '../types';
import JsBarcode from 'jsbarcode';

interface BarcodePrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

const BarcodePrinterModal: React.FC<BarcodePrinterModalProps> = ({ isOpen, onClose, products }) => {
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [barcodeImages, setBarcodeImages] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const validProducts = products;

  const filteredProducts = validProducts.filter(p => 
    searchTerm === '' || 
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.part_code && p.part_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.location && p.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedProductIds(new Set());
      setSearchTerm('');
      regenerateBarcodes();
    }
  }, [isOpen, products]);

  const regenerateBarcodes = () => {
    setIsGenerating(true);
      
    const timer = setTimeout(() => {
        const newImages: Record<string, string> = {};
        const canvas = document.createElement('canvas'); 
        
        validProducts.forEach(product => {
            try {
                // ALWAYS USE SHORT_ID
                const codeToUse = product.short_id || Math.floor(100000 + Math.random() * 900000).toString();

                if (codeToUse) {
                    const ctx = canvas.getContext('2d');
                    ctx?.clearRect(0,0, canvas.width, canvas.height);

                    JsBarcode(canvas, codeToUse, {
                        format: "CODE128", 
                        lineColor: "#000",
                        width: 2,
                        height: 50,
                        displayValue: true, 
                        fontSize: 14,
                        textMargin: 2,
                        margin: 10,
                        background: "#ffffff"
                    });
                    newImages[product.id] = canvas.toDataURL("image/png");
                }
            } catch (e) {
                console.warn(`Barcode error ${product.product_name}:`, e);
            }
        });
        
        setBarcodeImages(newImages);
        setIsGenerating(false);
    }, 100);

    return () => clearTimeout(timer);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedProductIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedProductIds(newSet);
  };

  const toggleAllFiltered = () => {
    const allFilteredSelected = filteredProducts.every(p => selectedProductIds.has(p.id));
    const newSet = new Set(selectedProductIds);

    if (allFilteredSelected) {
        filteredProducts.forEach(p => newSet.delete(p.id));
    } else {
        filteredProducts.forEach(p => newSet.add(p.id));
    }
    setSelectedProductIds(newSet);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <style>{`
        @media print {
            @page {
                size: 56mm 40mm;
                margin: 0;
            }
            ::-webkit-scrollbar {
                display: none !important;
            }
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 56mm;
                background-color: white !important;
            }
            body * {
                visibility: hidden;
            }
            .no-print {
                display: none !important;
            }
            #print-area, #print-area * {
                visibility: visible;
            }
            #print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 56mm;
                margin: 0;
                padding: 0;
            }
            .label-container {
                width: 56mm;
                height: 40mm;
                page-break-after: always;
                page-break-inside: avoid;
                position: relative;
                padding: 1mm 2mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                background: white;
                color: black;
                overflow: hidden;
                border: none !important;
                align-items: center;
                justify-content: flex-start;
            }
            img {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                image-rendering: pixelated;
            }
        }
      `}</style>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden transition-colors no-print">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Printer size={24} className="text-blue-600 dark:text-blue-400" />
                Barkod Yazdır
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Etiket: 56mm x 40mm | Otomatik Kısa Kod</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white dark:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shadow-sm">
            <X size={20} />
          </button>
        </div>

        {/* Info Bar */}
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-800 flex items-center justify-between text-sm">
             <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                 <ShieldCheck size={16} /> 
                 <span>Sistem, bu kısa barkodları okuduğunda otomatik olarak Parça Koduna çevirir.</span>
             </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Parça kodu veya adıyla ara..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all"
                />
            </div>
            
            <div className="flex items-center gap-3">
                <button 
                    onClick={toggleAllFiltered}
                    disabled={isGenerating || filteredProducts.length === 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium disabled:opacity-50 active:scale-95"
                >
                    {filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.has(p.id)) ? <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" /> : <Square size={18} />}
                    <span className="hidden sm:inline">Tümünü Seç</span>
                </button>

                <button 
                    onClick={handlePrint}
                    disabled={selectedProductIds.size === 0 || isGenerating}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                    <Printer size={18} />
                    <span className="hidden sm:inline">YAZDIR</span>
                    {selectedProductIds.size > 0 && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {selectedProductIds.size}
                        </span>
                    )}
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-900">
            {isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p>Barkodlar oluşturuluyor...</p>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-3">
                        <Filter size={32} />
                    </div>
                    <p className="font-medium">Sonuç bulunamadı.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 justify-items-center">
                    {filteredProducts.map(product => {
                        const isSelected = selectedProductIds.has(product.id);
                        const imgSrc = barcodeImages[product.id];

                        return (
                            <div 
                                key={product.id} 
                                onClick={() => toggleSelection(product.id)}
                                className={`
                                    relative w-full aspect-[1.4] bg-white rounded-xl cursor-pointer transition-all duration-200 group
                                    flex flex-col overflow-hidden select-none
                                    ${isSelected 
                                        ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900 shadow-md transform scale-[1.02]' 
                                        : 'hover:shadow-lg border border-slate-200 hover:border-blue-300 dark:border-slate-700'
                                    }
                                `}
                            >
                                <div className={`absolute top-2 right-2 z-10 transition-transform duration-200 ${isSelected ? 'scale-100' : 'scale-0'}`}>
                                    <div className="bg-blue-600 text-white rounded-full p-1 shadow-sm">
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col p-3 items-center justify-center bg-white">
                                    {/* Üstte Büyük Parça Kodu */}
                                    <div className="w-full text-center mb-1">
                                        <span className={`font-mono font-black text-slate-800 leading-none truncate block ${product.part_code && product.part_code.length > 10 ? 'text-sm' : 'text-lg'}`}>
                                            {product.part_code || 'KODSUZ'}
                                        </span>
                                        {product.location && (
                                            <span className="text-[9px] font-bold border border-slate-800 text-slate-800 px-1 rounded mt-1 inline-block">
                                                {product.location}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Ortada Kısa ID Barkodu */}
                                    <div className="flex-1 w-full flex items-center justify-center bg-slate-50 rounded-lg p-1 overflow-hidden">
                                        {imgSrc ? (
                                            <img src={imgSrc} alt="barcode" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                                        ) : (
                                            <span className="text-[10px] text-red-400">Veri Yok</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </div>

      {/* PRINT AREA (Gizli, sadece yazdırırken görünür) */}
      <div id="print-area">
        {validProducts.filter(p => selectedProductIds.has(p.id)).map(product => (
            <div key={`print-${product.id}`} className="label-container">
                {/* 1. Üst Kısım: PARÇA KODU (Büyük ve Okunaklı) */}
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2mm' }}>
                    <span style={{ fontSize: product.part_code && product.part_code.length > 12 ? '16pt' : '22pt', fontWeight: '900', fontFamily: 'monospace', letterSpacing: '-1px', lineHeight: '0.9' }}>
                        {product.part_code || ''}
                    </span>
                    <span style={{ fontSize: '11pt', fontWeight: 'bold', border: '2px solid black', padding: '1px 4px', borderRadius: '4px' }}>
                        {product.location || ''}
                    </span>
                </div>
                
                {/* 2. Orta Kısım: BARKOD (Short ID verisini içerir) */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', flex: 1, overflow: 'hidden' }}>
                    {barcodeImages[product.id] ? (
                         <img 
                            src={barcodeImages[product.id]}
                            style={{ maxWidth: '100%', maxHeight: '25mm' }}
                            alt="barcode"
                        />
                    ) : (
                        <div style={{ fontSize: '8pt' }}>Yükleniyor...</div>
                    )}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default BarcodePrinterModal;
