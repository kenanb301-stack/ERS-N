
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Package, Trash2, Archive, Plus, ChevronRight, AlertCircle, ScanLine, Search, Download, CheckCircle, AlertTriangle, Play, SkipForward, ArrowRight, MapPin, Hash } from 'lucide-react';
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
  const [view, setView] = useState<'LIST' | 'CREATE' | 'DETAIL' | 'GUIDED'>('LIST');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  
  // Create State
  const [newOrderName, setNewOrderName] = useState('');
  const [importedItems, setImportedItems] = useState<OrderItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scan Picking State
  const [showScanner, setShowScanner] = useState(false);
  const [pickedCounts, setPickedCounts] = useState<Record<string, number>>({});
  const [scanMessage, setScanMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  // GUIDED PICKING STATE
  const [guidedItems, setGuidedItems] = useState<OrderItem[]>([]);
  const [guidedIndex, setGuidedIndex] = useState(0);

  useEffect(() => {
      if (!isOpen) {
          setPickedCounts({});
          setScanMessage(null);
          setGuidedItems([]);
          setGuidedIndex(0);
          setView('LIST');
      }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- AUDIO FEEDBACK ---
  const playSound = (type: 'success' | 'error') => {
      try {
          const src = type === 'success' 
            ? 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
            : 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3';
          new Audio(src).play().catch(() => {});
      } catch (e) {}
  };

  // --- HANDLERS ---

  const handleDownloadTemplate = () => {
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
            const partCodeRaw = row['ParcaKodu'] || row['Parça Kodu'] || row['PartCode'] || row['Kod'];
            const qtyRaw = row['Adet'] || row['Miktar'] || row['Qty'];
            const nameRaw = row['Urun'] || row['Ürün'] || row['Aciklama'] || row['Ürün Adı'];
            const groupRaw = row['Grubu'] || row['Grup'] || row['Group'];
            
            if (!qtyRaw) return;

            let finalName = nameRaw;
            let finalUnit = row['Birim'] || 'Adet';
            let finalLocation = row['Reyon'] || row['Raf'] || row['Location'];
            let finalPartCode = partCodeRaw ? String(partCodeRaw).trim() : undefined;

            if (finalPartCode) {
                const systemProduct = products.find(p => p.part_code === finalPartCode);
                if (systemProduct) {
                    if (!finalName) finalName = systemProduct.product_name;
                    finalUnit = systemProduct.unit;
                    if (!finalLocation) finalLocation = systemProduct.location;
                }
            } else if (nameRaw) {
                const systemProduct = products.find(p => p.product_name.toLowerCase() === String(nameRaw).toLowerCase());
                if (systemProduct) {
                    finalPartCode = systemProduct.part_code;
                    finalUnit = systemProduct.unit;
                    if (!finalLocation) finalLocation = systemProduct.location;
                }
            }

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
          const match = products.find(p => 
              (item.part_code && p.part_code?.toLowerCase().trim() === item.part_code.toLowerCase().trim()) ||
              p.product_name.toLowerCase().trim() === item.product_name.toLowerCase().trim()
          );
          
          const currentStock = match ? match.current_stock : 0;
          const missing = Math.max(0, item.required_qty - currentStock);
          if (missing > 0) missingCount++;

          return { ...item, match, missing };
      });
      return { missingCount, details };
  };

  // --- GUIDED PICKING LOGIC ---

  const startGuidedPicking = () => {
      if (!activeOrder) return;

      // 1. Filter items that are not fully picked yet
      const pendingItems = activeOrder.items.filter(item => {
          const picked = pickedCounts[item.product_name] || 0;
          return picked < item.required_qty;
      });

      if (pendingItems.length === 0) {
          alert("Bu siparişin tüm kalemleri zaten toplanmış!");
          return;
      }

      // 2. Sort items: Group -> Location (Numeric Sort) -> Name
      const sortedItems = [...pendingItems].sort((a, b) => {
          // Group Sort
          if (a.group && b.group && a.group !== b.group) {
              return a.group.localeCompare(b.group);
          }
          if (a.group && !b.group) return -1;
          if (!a.group && b.group) return 1;

          // Location Sort (Natural: A1, A2, A10)
          if (a.location && b.location) {
              return a.location.localeCompare(b.location, undefined, { numeric: true, sensitivity: 'base' });
          }
          if (a.location && !b.location) return -1;
          if (!a.location && b.location) return 1;

          return a.product_name.localeCompare(b.product_name);
      });

      setGuidedItems(sortedItems);
      setGuidedIndex(0);
      setView('GUIDED');
      setShowScanner(true);
  };

  const skipCurrentItem = () => {
      if (guidedIndex < guidedItems.length - 1) {
          setGuidedIndex(prev => prev + 1);
          setScanMessage(null);
      } else {
          alert("Liste sonuna ulaşıldı.");
          setView('DETAIL');
          setShowScanner(false);
      }
  };

  const handleGuidedScan = (code: string) => {
      if (view !== 'GUIDED') {
          handleLegacyScan(code);
          return;
      }

      const currentTarget = guidedItems[guidedIndex];
      const cleanCode = code.trim();

      // Find system product from scanned code
      const product = products.find(p => 
          String(p.short_id) === cleanCode || p.barcode === cleanCode || p.part_code === cleanCode
      );

      if (!product) {
          playSound('error');
          setScanMessage({ type: 'error', text: `Sistemde Tanımsız: ${cleanCode}` });
          return;
      }

      // STRICT CHECK: Does this product match the current target?
      const isMatch = (currentTarget.part_code && currentTarget.part_code === product.part_code) ||
                      (currentTarget.product_name.toLowerCase().trim() === product.product_name.toLowerCase().trim());

      if (isMatch) {
          playSound('success');
          
          setPickedCounts(prev => {
              const current = prev[currentTarget.product_name] || 0;
              const newVal = current + 1;
              
              setScanMessage({ type: 'success', text: `DOĞRU: ${product.product_name}` });

              // If fully picked, auto advance
              if (newVal >= currentTarget.required_qty) {
                  setTimeout(() => {
                      if (guidedIndex < guidedItems.length - 1) {
                          setGuidedIndex(prev => prev + 1);
                          setScanMessage(null); // Clear message for next item
                      } else {
                          // Finished
                          alert("Tebrikler! Rota tamamlandı.");
                          setView('DETAIL');
                          setShowScanner(false);
                      }
                  }, 1000);
              }
              
              return { ...prev, [currentTarget.product_name]: newVal };
          });

      } else {
          playSound('error');
          setScanMessage({ 
              type: 'error', 
              text: `HATALI ÜRÜN! \nOkunan: ${product.product_name} (${product.location || '?'}) \nHedef: ${currentTarget.product_name}` 
          });
      }
  };

  // Legacy Scan (Free Mode)
  const handleLegacyScan = (code: string) => {
      if (!activeOrder) return;
      const cleanCode = code.trim();
      const product = products.find(p => String(p.short_id) === cleanCode || p.barcode === cleanCode || p.part_code === cleanCode);

      if (!product) {
          setScanMessage({ type: 'error', text: `Tanımsız: ${cleanCode}` });
          return;
      }

      const orderItem = activeOrder.items.find(item => 
          (item.part_code && item.part_code === product.part_code) ||
          item.product_name.toLowerCase().trim() === product.product_name.toLowerCase().trim()
      );

      if (orderItem) {
          playSound('success');
          setPickedCounts(prev => {
              const current = prev[orderItem.product_name] || 0;
              if (current >= orderItem.required_qty) {
                  setScanMessage({ type: 'success', text: `Tamamlandı: ${product.product_name}` });
                  return prev;
              }
              setScanMessage({ type: 'success', text: `Eklendi: ${product.product_name}` });
              return { ...prev, [orderItem.product_name]: current + 1 };
          });
      } else {
          playSound('error');
          setScanMessage({ type: 'error', text: `Siparişte YOK: ${product.product_name}` });
      }
  };

  return (
    <>
    {showScanner && (
        <div className="fixed inset-0 z-[110]">
            <BarcodeScanner 
                onScanSuccess={view === 'GUIDED' ? handleGuidedScan : handleLegacyScan} 
                onClose={() => setShowScanner(false)} 
            />
            {scanMessage && (
                <div className={`absolute bottom-24 left-4 right-4 p-6 rounded-2xl shadow-2xl z-[120] text-center font-black text-lg animate-bounce border-4 ${scanMessage.type === 'success' ? 'bg-green-600 text-white border-green-400' : 'bg-red-600 text-white border-red-400'}`}>
                    <div className="flex items-center justify-center gap-2 mb-1">
                        {scanMessage.type === 'success' ? <CheckCircle size={32}/> : <AlertTriangle size={32}/>}
                        <span>{scanMessage.type === 'success' ? 'BAŞARILI' : 'HATA'}</span>
                    </div>
                    <div className="whitespace-pre-wrap font-medium text-base opacity-90">{scanMessage.text}</div>
                </div>
            )}
        </div>
    )}

    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden transition-colors">
        
        {/* HEADER */}
        {view !== 'GUIDED' && (
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-orange-50 dark:bg-orange-900/20">
            <h2 className="text-lg font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2">
                <Package size={24} /> Sipariş Yönetimi
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={24} /></button>
            </div>
        )}

        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
            
            {view === 'LIST' && (
                <div className="p-4 space-y-4">
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
                <div className="p-6 max-w-lg mx-auto">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
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
                            <div className="flex gap-2">
                                <button onClick={() => setView('LIST')} className="flex-1 py-3 text-slate-500 font-bold">İptal</button>
                                <button onClick={handleCreateOrder} disabled={!newOrderName || importedItems.length === 0} className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50">Kaydet</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {view === 'DETAIL' && activeOrder && (
                <div className="p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700">
                        <div>
                            <button onClick={() => setView('LIST')} className="text-xs font-bold text-slate-500 hover:text-slate-800 mb-1">← Listeye Dön</button>
                            <h3 className="font-bold text-lg dark:text-white">{activeOrder.name}</h3>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 self-stretch sm:self-auto">
                            {activeOrder.status !== 'COMPLETED' && (
                                <button 
                                    onClick={startGuidedPicking}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none animate-pulse"
                                >
                                    <Play size={18} /> Sıralı Toplama Başlat
                                </button>
                            )}
                            
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

            {/* --- GUIDED PICKING MODE VIEW --- */}
            {view === 'GUIDED' && guidedItems.length > 0 && (
                <div className="h-full flex flex-col bg-slate-900 text-white">
                    <div className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-blue-400"><Play size={24} fill="currentColor"/> Toplama Modu</h2>
                        <button onClick={() => { setShowScanner(false); setView('DETAIL'); }} className="px-3 py-1 bg-slate-700 rounded text-sm hover:bg-slate-600">Çıkış</button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="mb-2 text-slate-400 uppercase text-xs font-bold tracking-widest">Şu Anki Hedef</div>
                        
                        {/* HUGE LOCATION CARD */}
                        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-xl shadow-blue-900/50 mb-8 w-full max-w-sm border-4 border-blue-400">
                            <div className="flex items-center justify-center gap-2 mb-1 opacity-80">
                                <MapPin size={20}/>
                                <span className="text-sm font-bold uppercase">Reyon / Raf</span>
                            </div>
                            <div className="text-5xl font-black tracking-tighter">
                                {guidedItems[guidedIndex].location || "BELİRSİZ"}
                            </div>
                            {guidedItems[guidedIndex].group && (
                                <div className="mt-2 inline-block bg-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                                    Grup: {guidedItems[guidedIndex].group}
                                </div>
                            )}
                        </div>

                        {/* PRODUCT INFO */}
                        <div className="space-y-2 mb-8">
                            <h3 className="text-2xl font-bold text-white leading-tight">
                                {guidedItems[guidedIndex].product_name}
                            </h3>
                            <div className="flex items-center justify-center gap-2">
                                <div className="bg-slate-800 px-3 py-1 rounded text-sm font-mono text-orange-400 font-bold border border-slate-700 flex items-center gap-2">
                                    <Hash size={14}/>
                                    {guidedItems[guidedIndex].part_code || 'Kodsuz'}
                                </div>
                            </div>
                        </div>

                        {/* COUNTER */}
                        <div className="flex items-end gap-2 mb-8">
                            <span className="text-6xl font-black text-green-400">
                                {pickedCounts[guidedItems[guidedIndex].product_name] || 0}
                            </span>
                            <span className="text-2xl font-bold text-slate-500 mb-2">/</span>
                            <span className="text-4xl font-bold text-slate-300 mb-1">
                                {guidedItems[guidedIndex].required_qty}
                            </span>
                            <span className="text-sm text-slate-500 mb-2 ml-1">{guidedItems[guidedIndex].unit}</span>
                        </div>

                        {/* PROGRESS */}
                        <div className="w-full max-w-sm bg-slate-800 h-2 rounded-full overflow-hidden mb-6">
                            <div 
                                className="h-full bg-green-500 transition-all duration-300"
                                style={{ width: `${((guidedIndex) / guidedItems.length) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-slate-500 mb-6">
                            İlerleme: {guidedIndex + 1} / {guidedItems.length}
                        </p>

                        <div className="flex gap-4 w-full max-w-sm">
                            <button 
                                onClick={skipCurrentItem}
                                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300 flex items-center justify-center gap-2"
                            >
                                <SkipForward size={20}/> Atla
                            </button>
                            <button 
                                onClick={() => setShowScanner(true)}
                                className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 animate-pulse"
                            >
                                <ScanLine size={20}/> OKUT
                            </button>
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
