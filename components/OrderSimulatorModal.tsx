import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Download, ClipboardCheck, AlertCircle, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product } from '../types';

interface OrderSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

interface SimulationResult {
  productName: string;
  requiredQty: number;
  currentStock: number;
  missingQty: number;
  unit: string;
  status: 'OK' | 'SHORTAGE' | 'NOT_FOUND';
}

const OrderSimulatorModal: React.FC<OrderSimulatorModalProps> = ({ isOpen, onClose, products }) => {
  const [step, setStep] = useState<'UPLOAD' | 'RESULT'>('UPLOAD');
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('UPLOAD');
    setResults([]);
    setFileName('');
    setError('');
  };

  const handleDownloadTemplate = () => {
    const data = [
      { "Urun": "A4 Fotokopi Kağıdı", "GerekliMiktar": 50 },
      { "Urun": "USB-C Kablo", "GerekliMiktar": 120 },
      { "Urun": "Olmayan Ürün Örneği", "GerekliMiktar": 5 }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SiparisListesi");
    XLSX.writeFile(wb, "sablon_siparis_listesi.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          setError('Excel dosyası boş.');
          return;
        }

        processSimulation(data);
      } catch (err) {
        setError('Dosya okunamadı.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const processSimulation = (data: any[]) => {
    const simResults: SimulationResult[] = [];
    let hasError = false;

    data.forEach((row: any) => {
      const nameRaw = row['Urun'] || row['Ürün'];
      const qtyRaw = row['GerekliMiktar'] || row['Miktar'] || row['Adet'];

      if (!nameRaw || !qtyRaw) return; // Skip bad rows

      const requiredQty = Number(qtyRaw);
      const product = products.find(p => p.product_name.toLowerCase() === nameRaw.toString().trim().toLowerCase());

      if (!product) {
        simResults.push({
          productName: nameRaw,
          requiredQty,
          currentStock: 0,
          missingQty: requiredQty, // Fully missing
          unit: '-',
          status: 'NOT_FOUND'
        });
      } else {
        const missing = requiredQty - product.current_stock;
        simResults.push({
          productName: product.product_name,
          requiredQty,
          currentStock: product.current_stock,
          missingQty: missing > 0 ? missing : 0,
          unit: product.unit,
          status: missing > 0 ? 'SHORTAGE' : 'OK'
        });
      }
    });

    if (simResults.length === 0) {
        setError('Listede geçerli ürün verisi bulunamadı.');
        return;
    }

    // Sort: Not Found -> Shortage -> OK
    simResults.sort((a, b) => {
        const score = (status: string) => {
            if (status === 'NOT_FOUND') return 0;
            if (status === 'SHORTAGE') return 1;
            return 2;
        }
        return score(a.status) - score(b.status);
    });

    setResults(simResults);
    setStep('RESULT');
  };

  const shortageCount = results.filter(r => r.status === 'SHORTAGE').length;
  const notFoundCount = results.filter(r => r.status === 'NOT_FOUND').length;
  const okCount = results.filter(r => r.status === 'OK').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-orange-50 dark:bg-orange-900/20">
          <h2 className="text-lg font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2">
            <ClipboardCheck size={24} />
            Sipariş Kontrol Simülasyonu
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {step === 'UPLOAD' && (
            <div className="space-y-6">
               <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/40 text-sm text-blue-800 dark:text-blue-300">
                  <h3 className="font-bold mb-1">Nasıl Çalışır?</h3>
                  <p>Hazırlamayı planladığınız sipariş listesini Excel olarak yükleyin. Sistem, eldeki stokla listenizi karşılaştırarak eksikleri anında raporlar.</p>
               </div>

               <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors relative">
                  <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".xlsx, .xls, .csv"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="mx-auto text-orange-400 mb-4" size={48} />
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Listenizi buraya sürükleyin veya seçin</h3>
                  <p className="text-slate-400 mt-1 text-sm">.xlsx veya .csv dosyası</p>
               </div>

               <div className="text-center">
                 <button onClick={handleDownloadTemplate} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center justify-center gap-1">
                   <Download size={14} /> Örnek Şablonu İndir
                 </button>
               </div>

               {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                    <AlertTriangle size={16} /> {error}
                </div>
               )}
            </div>
          )}

          {step === 'RESULT' && (
            <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg text-center">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{okCount}</div>
                        <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">Stok Yeterli</div>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{shortageCount}</div>
                        <div className="text-xs font-bold text-red-800 dark:text-red-300 uppercase">Eksik Stok</div>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-center">
                        <div className="text-2xl font-bold text-slate-600 dark:text-slate-300">{notFoundCount}</div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase">Bilinmeyen</div>
                    </div>
                </div>

                <h3 className="font-bold text-slate-800 dark:text-white mt-2">Detaylı Rapor</h3>
                <div className="border dark:border-slate-600 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-medium border-b dark:border-slate-600">
                            <tr>
                                <th className="p-3 text-left">Ürün</th>
                                <th className="p-3 text-center">İstenen</th>
                                <th className="p-3 text-center">Eldeki</th>
                                <th className="p-3 text-center">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-600">
                            {results.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="p-3">
                                        <div className="font-medium text-slate-800 dark:text-slate-200">{row.productName}</div>
                                        {row.status === 'SHORTAGE' && (
                                            <div className="text-xs text-red-600 dark:text-red-400 font-bold mt-0.5">
                                                {row.missingQty} {row.unit} EKSİK
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3 text-center font-medium text-slate-600 dark:text-slate-300">{row.requiredQty}</td>
                                    <td className="p-3 text-center text-slate-400 dark:text-slate-500">{row.currentStock}</td>
                                    <td className="p-3 text-center">
                                        {row.status === 'OK' && (
                                            <span className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">HAZIR</span>
                                        )}
                                        {row.status === 'SHORTAGE' && (
                                            <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold">YETERSİZ</span>
                                        )}
                                        {row.status === 'NOT_FOUND' && (
                                            <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold">BULUNAMADI</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
            {step === 'RESULT' ? (
                <>
                    <button onClick={handleReset} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-medium">
                        Yeni Sorgu
                    </button>
                    <button 
                        onClick={onClose}
                        className="bg-slate-800 dark:bg-slate-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-slate-900 dark:hover:bg-slate-600 active:scale-95 transition-transform"
                    >
                        Tamam
                    </button>
                </>
            ) : (
                <div className="w-full flex justify-end">
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium">
                        İptal
                    </button>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default OrderSimulatorModal;