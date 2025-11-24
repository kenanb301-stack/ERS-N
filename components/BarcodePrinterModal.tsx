
import React, { useEffect, useState } from 'react';
import { X, Printer, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { Product } from '../types';

// Declare QRCode library variable (loaded from CDN in index.html)
declare var QRCode: any;

interface BarcodePrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

const BarcodePrinterModal: React.FC<BarcodePrinterModalProps> = ({ isOpen, onClose, products }) => {
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // Products that have a barcode value
  const validProducts = products.filter(p => (p.barcode && p.barcode.trim().length > 0) || (p.part_code && p.part_code.trim().length > 0));

  useEffect(() => {
    if (isOpen) {
      // Varsayılan olarak hiçbir şeyi seçme (Kullanıcı kendi seçsin)
      setSelectedProductIds(new Set());
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedProductIds.size > 0) {
        // Wait for DOM render
        setTimeout(() => {
            selectedProductIds.forEach(id => {
                const product = validProducts.find(p => p.id === id);
                if (product) {
                    try {
                        const codeToUse = product.barcode || product.part_code;
                        const canvas = document.getElementById(`qr-canvas-${id}`) as HTMLCanvasElement;
                        if (canvas && codeToUse) {
                            // Clear previous
                            const ctx = canvas.getContext('2d');
                            ctx?.clearRect(0, 0, canvas.width, canvas.height);
                            
                            QRCode.toCanvas(canvas, codeToUse, { 
                                width: 128, // Daha net baskı için çözünürlük artırıldı
                                margin: 0,
                                errorCorrectionLevel: 'L'
                            }, function (error: any) {
                                if (error) console.error(error)
                            })
                        }
                    } catch (e) {
                        console.error("QR Code generation error", e);
                    }
                }
            });
        }, 300);
    }
  }, [isOpen, selectedProductIds, validProducts]);

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
            }
            /* Her etiket ayrı bir sayfadır */
            .label-container {
                width: 56mm;
                height: 40mm;
                page-break-after: always;
                page-break-inside: avoid;
                position: relative;
                padding: 2mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                background: white;
                color: black;
                overflow: hidden;
                border: none;
            }
            /* Yazdırırken arkaplan grafikleri zorla */
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
        /* Ekran Önizleme Stilleri */
        .screen-preview .label-container {
            width: 56mm;
            height: 40mm;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 2mm;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
        }
      `}</style>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden transition-colors no-print">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Printer size={24} className="text-blue-600 dark:text-blue-400" />
            Etiket Yazdır (Argox 56x40mm)
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
            
            <div className="flex items-center gap-3">
                 <div className="hidden lg:flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded border border-orange-100 dark:border-orange-900/40">
                    <AlertCircle size={14} />
                    <span>Yazıcı ayarlarında kağıt boyutu 56mm x 40mm olmalıdır.</span>
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
        </div>

        {/* Preview Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 dark:bg-slate-900 screen-preview">
            
            {/* Önizleme Grid'i (Sadece Ekranda Görünür) */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                {validProducts.map(product => {
                    const isSelected = selectedProductIds.has(product.id);
                    // Seçili değilse biraz silik göster, ama yine de göster ki tıklanabilsin
                    const opacityClass = isSelected ? 'opacity-100 ring-2 ring-blue-500' : 'opacity-50 hover:opacity-80';

                    return (
                        <div 
                            key={product.id} 
                            className={`relative group cursor-pointer transition-all duration-200 ${opacityClass}`} 
                            onClick={() => toggleSelection(product.id)}
                        >
                            {/* EKRAN İÇİN TASARIM */}
                            <div className="label-container bg-white shadow-sm">
                                {/* Satır 1: Parça Kodu ve Reyon */}
                                <div className="flex justify-between items-start mb-1 border-b border-black pb-1">
                                    <div className="font-extrabold text-lg leading-none font-mono text-black uppercase">
                                        {product.part_code || product.barcode}
                                    </div>
                                    <div className="bg-black text-white px-1.5 py-0.5 text-xs font-bold whitespace-nowrap">
                                        {product.location || 'RAF YOK'}
                                    </div>
                                </div>
                                
                                {/* Satır 2: İçerik Bölünmesi */}
                                <div className="flex flex-1 gap-1 overflow-hidden">
                                    {/* Sol: Açıklama (Küçük Yazı) */}
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div className="text-[10px] leading-tight font-bold text-black uppercase break-words line-clamp-4">
                                            {product.product_name}
                                        </div>
                                        <div className="text-[8px] text-slate-600 font-medium uppercase mt-1">
                                            {product.material}
                                        </div>
                                    </div>

                                    {/* Sağ: QR Kod - Ekran Önizleme */}
                                    {/* w-[28mm] yaparak büyüttük */}
                                    <div className="w-[28mm] flex-shrink-0 flex items-end justify-center pr-1">
                                        <canvas id={`qr-canvas-${product.id}`} className="w-full h-auto"></canvas>
                                    </div>
                                </div>
                            </div>

                            {/* Seçim İndikatörü */}
                            {isSelected && (
                                <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-md">
                                    <CheckSquare size={16} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {validProducts.length === 0 && (
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
                {/* 1. ÜST BÖLÜM: PARÇA KODU (Sol) ve REYON (Sağ Kutu) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid black', paddingBottom: '1mm', marginBottom: '1mm' }}>
                    <div style={{ fontSize: '14pt', fontWeight: '900', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                        {product.part_code || product.barcode || '-'}
                    </div>
                    <div style={{ backgroundColor: 'black', color: 'white', padding: '1mm 2mm', fontSize: '10pt', fontWeight: 'bold' }}>
                        {product.location || '-'}
                    </div>
                </div>

                {/* 2. ALT BÖLÜM: AÇIKLAMA (Sol) ve QR (Sağ) */}
                <div style={{ display: 'flex', flex: 1, gap: '2mm' }}>
                    {/* Sol taraf: Açıklama metni */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                         <div style={{ fontSize: '9pt', fontWeight: 'bold', lineHeight: '1.1', textTransform: 'uppercase', marginBottom: 'auto' }}>
                            {product.product_name}
                         </div>
                         {product.material && (
                             <div style={{ fontSize: '7pt', marginTop: '1mm', textTransform: 'uppercase' }}>
                                 {product.material}
                             </div>
                         )}
                    </div>
                    
                    {/* Sağ taraf: QR Code Resmi */}
                    {/* Width 28mm'ye çıkarıldı ve padding-right ile hafif sola çekildi */}
                    <div style={{ width: '28mm', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingRight: '2mm' }}>
                        <img 
                            id={`qr-img-${product.id}`} 
                            src={(document.getElementById(`qr-canvas-${product.id}`) as HTMLCanvasElement)?.toDataURL() || ''} 
                            style={{ width: '100%', height: 'auto', display: 'block' }}
                            alt="qr"
                        />
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default BarcodePrinterModal;
