
import React, { useEffect, useState } from 'react';
import { X, Printer, CheckSquare, Square, AlertCircle } from 'lucide-react';
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

  // Products that have a barcode value
  const validProducts = products.filter(p => (p.barcode && p.barcode.trim().length > 0) || (p.part_code && p.part_code.trim().length > 0));

  useEffect(() => {
    if (isOpen) {
      // Reset selection when opening
      setSelectedProductIds(new Set());
      
      // Generate barcodes for ALL valid products immediately using an in-memory canvas
      // This ensures images are ready for both preview and printing
      setIsGenerating(true);
      
      // Use setTimeout to allow UI to render modal first
      const timer = setTimeout(() => {
          const newImages: Record<string, string> = {};
          const canvas = document.createElement('canvas'); // Off-screen canvas
          
          validProducts.forEach(product => {
              try {
                  const codeToUse = product.barcode || product.part_code;
                  if (codeToUse) {
                      JsBarcode(canvas, codeToUse, {
                          format: "CODE128",
                          lineColor: "#000",
                          width: 2,
                          height: 50,
                          displayValue: true,
                          fontSize: 14,
                          textMargin: 2,
                          margin: 0,
                          background: "#ffffff" // Ensure white background for transparency safety
                      });
                      newImages[product.id] = canvas.toDataURL("image/png");
                  }
              } catch (e) {
                  console.error(`Barcode generation failed for ${product.product_name}`, e);
              }
          });
          
          setBarcodeImages(newImages);
          setIsGenerating(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen, products]); // Re-run if products change or modal opens

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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      {/* Termal Yazıcı İçin Özel Stil Tanımları */}
      <style>{`
        @media print {
            @page {
                size: 56mm 40mm;
                margin: 0;
            }
            /* Kaydırma çubuklarını gizle - Siyah şerit sorununu çözer */
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
            /* Her etiket ayrı bir sayfadır */
            .label-container {
                width: 56mm;
                height: 40mm;
                page-break-after: always;
                page-break-inside: avoid;
                position: relative;
                padding: 2mm 3mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                background: white;
                color: black;
                overflow: hidden;
                border: none !important; /* Kenarlık olmamasını garanti et */
                align-items: center;
                justify-content: flex-start;
            }
            /* Resimlerin net çıkması için */
            img {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                image-rendering: pixelated;
            }
        }
        /* Ekran Önizleme Stilleri */
        .screen-preview .label-container {
            width: 56mm;
            height: 40mm;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 2mm 3mm;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            align-items: center;
            justify-content: flex-start;
        }
      `}</style>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden transition-colors no-print">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Printer size={24} className="text-blue-600 dark:text-blue-400" />
            Barkod Yazdır (56x40mm)
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
                    disabled={isGenerating}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                >
                    {selectedProductIds.size === validProducts.length ? <CheckSquare size={18} /> : <Square size={18} />}
                    Tümünü Seç / Kaldır
                </button>
                <span className="text-sm text-slate-400">
                    {selectedProductIds.size} ürün seçildi
                </span>
            </div>
            
            <div className="flex items-center gap-3">
                 <div className="hidden lg:flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded border border-orange-100 dark:border-orange-900/40">
                    <AlertCircle size={14} />
                    <span>Kağıt boyutu: 56mm x 40mm</span>
                </div>
                <button 
                    onClick={handlePrint}
                    disabled={selectedProductIds.size === 0 || isGenerating}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Printer size={18} />
                    {isGenerating ? 'Hazırlanıyor...' : 'YAZDIR'}
                </button>
            </div>
        </div>

        {/* Preview Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 dark:bg-slate-900 screen-preview">
            
            {isGenerating ? (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500">Barkodlar oluşturuluyor...</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                    {validProducts.map(product => {
                        const isSelected = selectedProductIds.has(product.id);
                        const opacityClass = isSelected ? 'opacity-100 ring-2 ring-blue-500' : 'opacity-50 hover:opacity-80';
                        const imgSrc = barcodeImages[product.id];

                        return (
                            <div 
                                key={product.id} 
                                className={`relative group cursor-pointer transition-all duration-200 ${opacityClass}`} 
                                onClick={() => toggleSelection(product.id)}
                            >
                                {/* EKRAN ÖNİZLEME */}
                                <div className="label-container bg-white shadow-sm">
                                    <div className="w-full flex justify-between items-center mb-2">
                                        <div className="text-[18px] font-black font-mono text-slate-800 tracking-tighter leading-none">
                                            {product.part_code || 'KODSUZ'}
                                        </div>
                                        <div className="text-[12px] font-bold border-2 border-black px-1.5 py-0.5 rounded text-black">
                                            {product.location || '-'}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
                                        {imgSrc ? (
                                            <img src={imgSrc} alt="barcode" className="max-w-full h-auto" />
                                        ) : (
                                            <span className="text-[8px] text-red-500">Hata</span>
                                        )}
                                    </div>
                                </div>

                                {isSelected && (
                                    <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-md">
                                        <CheckSquare size={16} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {!isGenerating && validProducts.length === 0 && (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500">
                    <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Barkod basılabilecek ürün bulunamadı.</p>
                </div>
            )}
        </div>
      </div>

      {/* PRINT AREA (Gizli, sadece yazdırırken görünür) */}
      <div id="print-area">
        {validProducts.filter(p => selectedProductIds.has(p.id)).map(product => (
            <div key={`print-${product.id}`} className="label-container">
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2mm' }}>
                    <span style={{ fontSize: '20pt', fontWeight: '900', fontFamily: 'monospace', letterSpacing: '-1.5px', lineHeight: '0.9' }}>
                        {product.part_code || ''}
                    </span>
                    <span style={{ fontSize: '11pt', fontWeight: 'bold', border: '2px solid black', padding: '1px 4px', borderRadius: '4px' }}>
                        {product.location || ''}
                    </span>
                </div>
                
                {/* DOĞRUDAN IMG KULLANIMI (Canvas değil) */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', flex: 1 }}>
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
