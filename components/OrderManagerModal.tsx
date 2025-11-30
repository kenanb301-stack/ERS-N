
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Package, Trash2, Archive, Plus, ChevronRight, AlertCircle, ScanLine, Search, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, Order, OrderItem } from '../types';
import BarcodeScanner from './BarcodeScanner';

interface OrderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  orders: Order[];
  onSaveOrder: (order: Order) => void;
  onDeleteOrder: (id: string) => void;
  onUpdateOrderStatus: (id: string, status: 'COMPLETED') => void;
}

const OrderManagerModal: React.FC<OrderManagerModalProps> = ({ isOpen, onClose, products, orders, onSaveOrder, onDeleteOrder, onUpdateOrderStatus }) => {
  const [view, setView] = useState<'LIST' | 'CREATE' | 'DETAIL'>('LIST');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  
  // Create State
  const [newOrderName, setNewOrderName] = useState('');
  const [importedItems, setImportedItems] = useState<OrderItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scan Picking State
  const [showScanner, setShowScanner] = useState(false);
  const [pickedCounts, setPickedCounts] = useState<Record<string, number>>({});
  const [scanMessage, setScanMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
      if (!isOpen) {
          setPickedCounts({});
          setScanMessage(null);
      }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- HANDLERS ---

  const handleDownloadTemplate = () => {
    // Sadeleştirilmiş Şablon: Parça Kodu ve Miktar odaklı
    const data = [
      { "Parça Kodu": "P-00003", "Miktar": 10, "Grup": "Ön Montaj" },
      { "Parça Kodu": "H-20402", "Miktar": 5, "Grup": "Hidrolik" },
      { "Parça Kodu": "C-1240", "Miktar": 100, "Grup": "Hırdavat" }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SiparisSablonu");
    XLSX.writeFile(wb, "siparis_yukleme_sablonu.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        if (wb.SheetNames.length === 0) {
            alert("Excel dosyası boş veya bozuk.");
            return;
        }

        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
            alert("Excel sayfasında veri bulunamadı.");
            return;
        }

        const items: OrderItem[] = [];
        
        data.forEach((row: any) => {
            // Excel Sütunlarını Oku
            const partCodeRaw = row['ParcaKodu'] || row['Parça Kodu'] || row['PartCode'] || row['Kod'];
            const qtyRaw = row['Adet'] || row['Miktar'] || row['Qty'];
            const nameRaw = row['Urun'] || row['Ürün'] || row['Aciklama'] || row['Ürün Adı'];
            const groupRaw = row['Grubu'] || row['Grup'] || row['Group'];
            
            // Miktar yoksa atla
            if (!qtyRaw) return;

            let finalName = nameRaw;
            let finalUnit = row['Birim'] || 'Adet';
            let finalLocation = row['Reyon'] || row['Raf'] || row['Location'];
            let finalPartCode = partCodeRaw ? String(partCodeRaw).trim() : undefined;

            // --- AKILLI DOLDURMA (AUTO-FILL) ---
            // Eğer Parça Kodu varsa, sistemdeki ürünü bul ve eksik bilgileri tamamla
            if (finalPartCode) {
                // Parça Kodu ile tam eşleşme ara
                const systemProduct = products.find(p => p.part_code === finalPartCode);
                
                if (systemProduct) {
                    // Sistemden verileri çek
                    if (!finalName) finalName = systemProduct.product_name;
                    finalUnit = systemProduct.unit;
                    finalLocation = systemProduct.location; // Excel'de reyon yoksa sistemden al
                }
            } else if (nameRaw) {
                // Parça Kodu yoksa İsme göre ara
                const systemProduct = products.find(p => p.product_name.toLowerCase() === String(nameRaw).toLowerCase());
                if (systemProduct) {
                    finalPartCode = systemProduct.part_code;
                    finalUnit = systemProduct.unit;
                    finalLocation = systemProduct.location;
                }
            }

            // Hala isim yoksa Parça Kodunu isim yap veya Bilinmeyen de
            if (!finalName) finalName = finalPartCode || "Bilinmeyen Ürün";

            items.push({ 
                product_name: String(finalName), 
                required_qty: Number(qtyRaw), 
                unit: finalUnit,
                part_code: finalPartCode,
                group: groupRaw ? String(groupRaw) : undefined,
                location: finalLocation ? String(finalLocation) : undefined
            });
        });

        if (items.length === 0) {
            alert("Geçerli sipariş kalemi bulunamadı.");
        } else {
            setImportedItems(items);
        }

      } catch (e) {
          console.error(e);
          alert("Excel okuma hatası! Dosya formatını kontrol edin.");
      } finally {
          // Dosya inputunu sıfırla ki aynı dosya tekrar seçilebilsin
          e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCreateOrder = () => {
      if (!newOrderName || importedItems.length === 0) return;
      const newOrder: Order = {
          id: Math.random().toString(36).substr(2, 9),
          name: newOrderName,
          status: 'PENDING',
          items: importedItems,
          created_at: new Date().toISOString()
      };
      onSaveOrder(newOrder);
      setNewOrderName('');
      setImportedItems([]);
      setView('LIST');
  };

  const calculateShortages = (items: OrderItem[]) => {
      let missingCount = 0;
      const details = items.map(item => {
          // Normalize names for better matching
          // Try to match by Part Code FIRST, then by Name
          const match = products.find(p => 
              (item.part_code && p.part_code?.toLowerCase().trim() === item.part_code.toLowerCase().trim()) ||
              p.product_name.toLowerCase().trim() === item.product_name.toLowerCase().trim() || 
              (p.part_code && p.part_code.toLowerCase().trim() === item.product_name.toLowerCase().trim())
          );
          
          const currentStock = match ? match.current_stock : 0;
          const missing = Math.max(0, item.required_qty - currentStock);
          if (missing > 0) missingCount++;

          return { ...item, match, missing };
      });
      return { missingCount, details };
  };

  // SCAN LOGIC
  const handleScan = (code: string) => {
      if (!activeOrder) return;
      
      const cleanCode = code.trim();
      // Find system product
      const product = products.find(p => 
          String(p.short_id) === cleanCode || p.barcode === cleanCode || p.part_code === cleanCode
      );

      if (!product) {
          setScanMessage({ type: 'error', text: `Tanımsız Ürün: ${cleanCode}` });
          return;
      }

      // Check if product is in order
      // Using flexible matching (Part Code match is prioritized)
      const orderItem = activeOrder.items.find(item => 
          (item.part_code && item.part_code.toLowerCase().trim() === (product.part_code || '').toLowerCase().trim()) ||
          item.product_name.toLowerCase().trim() === product.product_name.toLowerCase().trim()
      );

      if (orderItem) {
          // Found!
          setPickedCounts(prev => {
              const current = prev[orderItem.product_name] || 0;
              if (current >= orderItem.required_qty) {
                  setScanMessage({ type: 'success', text: `Bu ürün zaten tamamlandı: ${product.product_name}` });
                  return prev;
              }
              setScanMessage({ type: 'success', text: `Eklendi: ${product.product_name} (${product.part_code})` });
              return { ...prev, [orderItem.product_name]: current + 1 };
          });
      } else {
          setScanMessage({ type: 'error', text: `Siparişte YOK: ${product.product_name}` });
      }
  };

  return (
    <>
    {showScanner && (
        <div className="fixed inset-0 z-[110]">
            <BarcodeScanner 
                onScanSuccess={handleScan} 
                onClose={() => setShowScanner(false)} 
            />
            {/* Overlay Message on Scanner */}
            {scanMessage && (
                <div className={`absolute bottom-20 left-4 right-4 p-4 rounded-xl shadow-lg z-[120] text-center font-bold animate-bounce ${scanMessage.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-600 text-white'}`}>
                    {scanMessage.type === 'success' ? <CheckCircle className="inline mr-2"/> : <AlertTriangle className="inline mr-2"/>}
                    {scanMessage.text}
                </div>
            )}
        </div>
    )}

    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden transition-colors">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-orange-50 dark:bg-orange-900/20">
          <h2 className="text-lg font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2">
            <Package size={24} /> Sipariş Yönetimi
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4">
            
            {view === 'LIST' && (
                <div className="space-y-4">
                    <button 
                        onClick={() => setView('CREATE')}
                        className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all flex flex-col items-center justify-center gap-2"
                    >
                        <Plus size={32} />
                        <span className="font-bold">Yeni Sipariş Oluştur (Excel)</span>
                    </button>

                    <div className="space-y-2">
                        {orders.length === 0 && <div className="text-center text-slate-400 py-4">Henüz sipariş yok.</div>}
                        {orders.map(order => {
                            const { missingCount } = calculateShortages(order.items);
                            return (
                                <div key={order.id} onClick={() => { setActiveOrder(order); setView('DETAIL'); setPickedCounts({}); }} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-orange-400 cursor-pointer transition-all group">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white">{order.name}</h4>
                                            <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString()} • {order.items.length} Kalem</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {order.status === 'COMPLETED' ? (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Tamamlandı</span>
                                            ) : (
                                                missingCount > 0 ? (
                                                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle size={12}/> {missingCount} Eksik</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Hazır</span>
                                                )
                                            )}
                                            <ChevronRight className="text-slate-300 group-hover:text-orange-500" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {view === 'CREATE' && (
                <div className="max-w-lg mx-auto bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                    <h3 className="font-bold text-lg mb-4 dark:text-white">Yeni Sipariş Yükle</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Sipariş Adı / Müşteri</label>
                            <input 
                                type="text" 
                                value={newOrderName} 
                                onChange={(e) => setNewOrderName(e.target.value)}
                                className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                placeholder="Örn: Proje A - Malzeme Listesi"
                            />
                        </div>
                        
                        <div className="flex justify-center">
                             <button onClick={handleDownloadTemplate} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                 <Download size={14} /> Örnek Şablonu İndir
                             </button>
                        </div>

                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx,.xls" />
                            <Upload className="mx-auto text-slate-400 mb-2" />
                            <p className="text-sm text-slate-600 dark:text-slate-400">{importedItems.length > 0 ? `${importedItems.length} kalem okundu` : 'Excel Listesi Seç'}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button onClick={() => setView('LIST')} className="flex-1 py-3 text-slate-500 font-bold">İptal</button>
                            <button onClick={handleCreateOrder} disabled={!newOrderName || importedItems.length === 0} className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50">Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            {view === 'DETAIL' && activeOrder && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700">
                        <div>
                            <button onClick={() => setView('LIST')} className="text-xs font-bold text-slate-500 hover:text-slate-800 mb-1">← Listeye Dön</button>
                            <h3 className="font-bold text-lg dark:text-white">{activeOrder.name}</h3>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 self-stretch sm:self-auto">
                            <button 
                                onClick={() => setShowScanner(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none animate-pulse"
                            >
                                <ScanLine size={18} /> Toplama Modu
                            </button>
                            
                            {activeOrder.status !== 'COMPLETED' && (
                                <button onClick={() => { onUpdateOrderStatus(activeOrder.id, 'COMPLETED'); setView('LIST'); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"><Archive size={16}/> Tamamla</button>
                            )}
                            <button onClick={() => { if(confirm("Silinsin mi?")) { onDeleteOrder(activeOrder.id); setView('LIST'); } }} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg flex items-center justify-center"><Trash2 size={18}/></button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-medium">
                                    <tr>
                                        <th className="p-3 text-left">Parça / Ürün</th>
                                        <th className="p-3 text-left">Grup / Reyon</th>
                                        <th className="p-3 text-center">İstenen</th>
                                        <th className="p-3 text-center">Toplanan</th>
                                        <th className="p-3 text-center">Stok Durumu</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {calculateShortages(activeOrder.items).details.map((item, idx) => {
                                        const picked = pickedCounts[item.product_name] || 0;
                                        const isFullyPicked = picked >= item.required_qty;
                                        return (
                                            <tr key={idx} className={`transition-colors ${isFullyPicked ? 'bg-green-50 dark:bg-green-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                                                <td className="p-4">
                                                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                        {item.product_name}
                                                        {isFullyPicked && <CheckCircle size={14} className="text-green-600" />}
                                                    </div>
                                                    <div className="text-xs text-slate-500 flex flex-col gap-0.5">
                                                        {item.part_code && <span className="font-mono">Kod: {item.part_code}</span>}
                                                        {item.match ? <span className="text-green-600 flex items-center gap-1">Sistemde Eşleşti</span> : <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10}/> Eşleşmedi</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {item.group && <div className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded inline-block mb-1">{item.group}</div>}
                                                    {item.location && <div className="text-xs font-mono text-orange-600 dark:text-orange-400 flex items-center gap-1"><ScanLine size={10}/> {item.location}</div>}
                                                </td>
                                                <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">{item.required_qty}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${picked > 0 ? (isFullyPicked ? 'bg-green-200 text-green-800' : 'bg-blue-100 text-blue-700') : 'bg-slate-100 text-slate-400'}`}>
                                                        {picked}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {item.missing > 0 ? (
                                                        <div className="text-red-600 font-bold text-xs bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded inline-block">-{item.missing} Eksik</div>
                                                    ) : (
                                                        <div className="text-green-600 font-bold text-xs flex items-center justify-center gap-1"><CheckCircle size={10}/> Stok Var</div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
    </>
  );
};

export default OrderManagerModal;
