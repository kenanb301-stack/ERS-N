import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Download, PackagePlus, ArrowRightLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, TransactionType } from '../types';
import { CATEGORIES, UNITS } from '../constants';

type BulkMode = 'TRANSACTION' | 'PRODUCT';

interface BulkTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessTransactions: (transactions: any[]) => void;
  onProcessProducts: (products: any[]) => void;
  products: Product[];
  initialMode?: BulkMode;
}

const BulkTransactionModal: React.FC<BulkTransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onProcessTransactions, 
  onProcessProducts,
  products,
  initialMode = 'TRANSACTION'
}) => {
  const [mode, setMode] = useState<BulkMode>(initialMode);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setParsedData([]);
      setFileName('');
      setError('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');
    setParsedData([]);

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

        // Basic validation based on mode
        const firstRow = data[0] as any;
        if (mode === 'TRANSACTION') {
             if (!firstRow.hasOwnProperty('Urun') || !firstRow.hasOwnProperty('Miktar')) {
                setError('Hatalı format! Stok Hareketi için "Urun" ve "Miktar" sütunları gereklidir.');
                return;
            }
        } else {
            if (!firstRow.hasOwnProperty('UrunAdi')) {
                setError('Hatalı format! Ürün Listesi için "UrunAdi" sütunu gereklidir.');
                return;
            }
        }
        
        setParsedData(data);
      } catch (err) {
        setError('Dosya okunamadı. Lütfen geçerli bir Excel yükleyin.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadTemplate = () => {
    let data = [];
    let filename = "";

    if (mode === 'TRANSACTION') {
        data = [
            { "Urun": "A4 Fotokopi Kağıdı", "Miktar": 10, "Islem": "GIRIS", "Aciklama": "Toplu Alım" },
            { "Urun": "USB-C Kablo", "Miktar": 5, "Islem": "CIKIS", "Aciklama": "Departman Dağıtımı" }
        ];
        filename = "sablon_stok_hareketi.xlsx";
    } else {
        data = [
            { "UrunAdi": "Yeni Kalem", "Kategori": "Kırtasiye", "Birim": "Adet", "KritikStok": 10, "BaslangicStogu": 100 },
            { "UrunAdi": "Sıvı Sabun", "Kategori": "Temizlik", "Birim": "Litre", "KritikStok": 5, "BaslangicStogu": 20 }
        ];
        filename = "sablon_yeni_urunler.xlsx";
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sablon");
    XLSX.writeFile(wb, filename);
  };

  const handleProcess = () => {
    if (mode === 'TRANSACTION') {
        processTransactions();
    } else {
        processProducts();
    }
  };

  const processTransactions = () => {
    const validTransactions: any[] = [];
    const errors: string[] = [];

    parsedData.forEach((row: any, index) => {
      const productName = row['Urun'] || row['Ürün'];
      const quantity = row['Miktar'];
      const typeRaw = row['Islem'] || row['İşlem'] || 'GIRIS';
      const desc = row['Aciklama'] || row['Açıklama'] || 'Toplu İşlem';

      if (!productName || !quantity) {
        errors.push(`Satır ${index + 2}: Ürün adı veya miktar eksik.`);
        return;
      }

      const product = products.find(p => p.product_name.toLowerCase() === productName.trim().toLowerCase());

      if (!product) {
        errors.push(`Satır ${index + 2}: "${productName}" sistemde bulunamadı. Önce ürünü ekleyin.`);
        return;
      }

      const type = typeRaw.toUpperCase().includes('ÇIK') || typeRaw.toUpperCase().includes('OUT') || typeRaw.toUpperCase() === 'CIKIS' 
        ? TransactionType.OUT 
        : TransactionType.IN;

      validTransactions.push({
        productId: product.id,
        quantity: Number(quantity),
        type: type,
        description: desc
      });
    });

    if (errors.length > 0) {
        alert(`Hatalar bulundu:\n${errors.slice(0, 5).join('\n')}\n...`);
        if (validTransactions.length === 0) return;
        if(!confirm(`Yine de ${validTransactions.length} geçerli işlemi kaydetmek ister misiniz?`)) return;
    }

    onProcessTransactions(validTransactions);
    onClose();
  };

  const processProducts = () => {
    const validProducts: any[] = [];
    const errors: string[] = [];

    parsedData.forEach((row: any, index) => {
        const name = row['UrunAdi'] || row['Ürün Adı'];
        const category = row['Kategori'] || CATEGORIES[0];
        const unit = row['Birim'] || UNITS[0];
        const minStock = row['KritikStok'] || 10;
        const startStock = row['BaslangicStogu'] || 0;

        if (!name) {
            errors.push(`Satır ${index + 2}: Ürün adı eksik.`);
            return;
        }

        // Check duplicates
        if (products.some(p => p.product_name.toLowerCase() === name.trim().toLowerCase())) {
             errors.push(`Satır ${index + 2}: "${name}" zaten sistemde kayıtlı.`);
             return;
        }

        validProducts.push({
            product_name: name,
            category: category,
            unit: unit,
            min_stock_level: Number(minStock),
            current_stock: Number(startStock)
        });
    });

    if (errors.length > 0) {
        alert(`Hatalar bulundu:\n${errors.slice(0, 5).join('\n')}\n...`);
        if (validProducts.length === 0) return;
        if(!confirm(`Yine de ${validProducts.length} yeni ürünü kaydetmek ister misiniz?`)) return;
    }

    onProcessProducts(validProducts);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button 
                onClick={() => setMode('TRANSACTION')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mode === 'TRANSACTION' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
                <ArrowRightLeft size={18} />
                Stok Hareketi Yükle
            </button>
            <button 
                onClick={() => setMode('PRODUCT')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mode === 'PRODUCT' ? 'text-green-600 border-b-2 border-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
                <PackagePlus size={18} />
                Yeni Ürün Yükle
            </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileSpreadsheet size={20} className={mode === 'TRANSACTION' ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"} />
            {mode === 'TRANSACTION' ? 'Excel ile Giriş/Çıkış' : 'Excel ile Ürün Listesi'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Step 1: Download Template */}
          <div className={`${mode === 'TRANSACTION' ? 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/40' : 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900/40'} p-4 rounded-xl border`}>
            <h3 className={`text-sm font-bold ${mode === 'TRANSACTION' ? 'text-blue-800 dark:text-blue-300' : 'text-green-800 dark:text-green-300'} mb-1`}>Adım 1: Şablonu İndirin</h3>
            <p className={`text-xs ${mode === 'TRANSACTION' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'} mb-3`}>
                {mode === 'TRANSACTION' ? 'Giriş ve Çıkış işlemleri için bu formatı kullanın.' : 'Yeni ürünleri topluca eklemek için bu formatı kullanın.'}
            </p>
            <button 
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 text-xs bg-white dark:bg-slate-700 border dark:border-slate-600 px-3 py-2 rounded-lg transition-colors shadow-sm text-slate-800 dark:text-slate-200"
            >
                <Download size={14} />
                Uygun Şablonu İndir
            </button>
          </div>

          {/* Step 2: Upload */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Adım 2: Dosyayı Yükleyin</h3>
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-blue-400 transition-colors cursor-pointer"
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".xlsx, .xls, .csv" 
                    className="hidden" 
                />
                <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {fileName || "Excel dosyasını seçmek için tıklayın"}
                </p>
            </div>
          </div>

          {error && (
             <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-start gap-2 whitespace-pre-line">
               <AlertTriangle size={16} className="mt-0.5 min-w-[16px]" />
               {error}
             </div>
           )}

           {parsedData.length > 0 && !error && (
               <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm rounded-lg flex items-center gap-2">
                   <CheckCircle size={16} />
                   {parsedData.length} satır veri okundu.
               </div>
           )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 mt-auto">
            <button
              onClick={handleProcess}
              disabled={parsedData.length === 0}
              className={`w-full py-3 rounded-xl text-white font-bold shadow-lg dark:shadow-none transition-all active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:dark:bg-slate-700 ${mode === 'TRANSACTION' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}`}
            >
              {mode === 'TRANSACTION' ? 'Hareketleri İşle' : 'Ürünleri Kaydet'}
            </button>
          </div>
      </div>
    </div>
  );
};

export default BulkTransactionModal;