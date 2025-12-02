import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Package, Trash2, Archive, Plus, ChevronRight, AlertCircle, ScanLine, Search, Download, CheckCircle, AlertTriangle, Play, SkipForward, MapPin, Hash, ClipboardList, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, Order, OrderItem } from '../types';
import BarcodeScanner from './BarcodeScanner';

interface OrderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  orders: Order[];
  onSaveOrder: (order: Omit<Order, 'id'>) => void;
  onDeleteOrder: (id: string) => void;
  onUpdateOrderStatus: (id: string, status: 'COMPLETED') => void;
}

const OrderManagerModal: React.FC<OrderManagerModalProps> = ({ isOpen, onClose, products, orders, onSaveOrder, onDeleteOrder, onUpdateOrderStatus }) => {
  const [view, setView] = useState<'LIST' | 'CREATE' | 'DETAIL' | 'GUIDED' | 'GLOBAL_REPORT'>('LIST');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [newOrderName, setNewOrderName] = useState('');
  const [importedItems, setImportedItems] = useState<OrderItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [pickedCounts, setPickedCounts] = useState<Record<string, number>>({});
  const [scanMessage, setScanMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
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

  const playSound = (type: 'success' | 'error') => {
      try {
          const src = type === 'success' ? 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' : 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3';
          new Audio(src).play().catch(() => {});
      } catch (e) {}
  };

  const handleDownloadTemplate = () => {
    const data = [{ "Parça Kodu": "P-00003", "Miktar": 10, "Grup": "Ön Montaj" }];
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
        const arrayBuffer = evt.target?.result;
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        if (wb.SheetNames.length === 0) { alert("Excel boş."); return; }
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) { alert("Veri yok."); return; }
        
        const items: OrderItem[] = [];
        data.forEach((row: any) => {
            const getVal = (keys: string[]) => {
                for (const k of keys) {
                    if (row[k] !== undefined) return row[k];
                    const keyLower = k.toLowerCase();
                    const foundKey = Object.keys(row).find(rk => rk.toLowerCase().trim() === keyLower);
                    if (foundKey) return row[foundKey];
                }
                return undefined;
            };

            const partCodeRaw = getVal(['ParcaKodu', 'Parça Kodu', 'PartCode', 'Kod']);
            const qtyRaw = getVal(['Adet', 'Miktar', 'Qty']);
            const nameRaw = getVal(['Urun', 'Ürün', 'Aciklama', 'Ürün Adı']);
            const groupRaw = getVal(['Grubu', 'Grup', 'Group']);
            
            if (!qtyRaw) return;

            let finalName = nameRaw;
            let finalUnit = getVal(['Birim']) || 'Adet';
            let finalLocation = getVal(['Reyon', 'Raf', 'Location']);
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
        setImportedItems(items);
      } catch (e) { alert("Excel okuma hatası."); } finally { if(fileInputRef.current) fileInputRef.current.value = ''; e.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCreateOrder = () => {
      if (!newOrderName || importedItems.length === 0) return;
      const newOrder: Omit<Order, 'id'> = { name: newOrderName, status: 'PENDING', items: importedItems, created_at: new Date().toISOString() };
      onSaveOrder(newOrder);
      setNewOrderName('');
      setImportedItems([]);
      setView('LIST');
  };

  const calculateShortages = (items: OrderItem[]) => {
      let missingCount = 0;
      const details = items.map(item => {
          const match = products.find(p => (item.part_code && p.part_code === item.part_code) || p.product_name.toLowerCase().trim() === item.product_name.toLowerCase().trim());
          const currentStock = match ? match.current_stock : 0;
          const missing = Math.max(0, item.required_qty - currentStock);
          if (missing > 0) missingCount++;
          return { ...item, match, missing };
      });
      return { missingCount, details };
  };

  const startGuidedPicking = () => {
      if (!activeOrder) return;
      const pendingItems = activeOrder.items.filter(item => (pickedCounts[item.product_name] || 0) < item.required_qty);
      if (pendingItems.length === 0) { alert("Sipariş tamamlanmış!"); return; }
      const sortedItems = [...pendingItems].sort((a, b) => {
          if (a.group && !b.group) return -1; if (!a.group && b.group) return 1; if (a.group !== b.group) return (a.group || '').localeCompare(b.group || '');
          if (a.location && !b.location) return -1; if (!a.location && b.location) return 1; return (a.location || '').localeCompare(b.location || '', undefined, { numeric: true });
      });
      setGuidedItems(sortedItems); setGuidedIndex(0); setView('GUIDED'); setShowScanner(true);
  };

  const handleGuidedScan = (code: string) => {
      if (view !== 'GUIDED') return;
      const currentTarget = guidedItems[guidedIndex];
      const cleanCode = code.trim();
      const product = products.find(p => String(p.short_id) === cleanCode || p.barcode === cleanCode || p.part_code === cleanCode);
      if (!product) { playSound('error'); setScanMessage({ type: 'error', text: `Tanımsız: ${cleanCode}` }); return; }
      const isMatch = (currentTarget.part_code === product.part_code) || (currentTarget.product_name.toLowerCase().trim() === product.product_name.toLowerCase().trim());
      if (isMatch) {
          playSound('success');
          setPickedCounts(prev => {
              const current = prev[currentTarget.product_name] || 0;
              const newVal = current + 1;
              setScanMessage({ type: 'success', text: `DOĞRU: ${product.product_name}` });
              if (newVal >= currentTarget.required_qty) {
                  setTimeout(() => {
                      if (guidedIndex < guidedItems.length - 1) { setGuidedIndex(p => p + 1); setScanMessage(null); } else { alert("Rota tamamlandı."); setView('DETAIL'); setShowScanner(false); }
                  }, 1000);
              }
              return { ...prev, [currentTarget.product_name]: newVal };
          });
      } else { playSound('error'); setScanMessage({ type: 'error', text: `YANLIŞ ÜRÜN!` }); }
  };

  const GlobalReportView = () => {
      const pendingOrders = orders.filter(o => o.status === 'PENDING');
      const aggregatedItems: Record<string, { qty: number, unit: string, name: string, partCode?: string, sources: { orderName: string, qty: number }[] }> = {};

      pendingOrders.forEach(o => {
          o.items.forEach(item => {
              const key = item.part_code || item.product_name;
              if (!aggregatedItems[key]) {
                  aggregatedItems[key] = { qty: 0, unit: item.unit || 'Adet', name: item.product_name, partCode: item.part_code, sources: [] };
              }
              aggregatedItems[key].qty += item.required_qty;
              aggregatedItems[key].sources.push({ orderName: o.name, qty: item.required_qty });
          });
      });

      const report = Object.values(aggregatedItems).map(item => {
          const product = products.find(p => p.part_code === item.partCode || p.product_name === item.name);
          const currentStock = product ? product.current_stock : 0;
          const missing = Math.max(0, item.qty - currentStock);
          return { ...item, currentStock, missing };
      }).sort((a, b) => b.missing - a.missing);

      return (
          <div className="p-4 bg-white dark:bg-slate-900 h-full overflow-y-auto">
              <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => setView('LIST')} className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
                      <ArrowLeft size={18} /> Geri Dön
                  </button>
                  <h3 className="text-xl font-bold dark:text-white">Genel İhtiyaç Raporu</h3>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                  <table className="w-full text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          <tr>
                              <th className="p-3 text-left">Ürün / Parça</th>
                              <th className="p-3 text-center">Eldeki Stok</th>
                              <th className="p-3 text-center">Toplam İhtiyaç</th>
                              <th className="p-3 text-center">Eksik</th>
                              <th className="p-3 text-left w-1/3">Talep Eden Projeler / Kaynak</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {report.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                  <td className="p-3">
                                      <div className="font-bold text-slate-800 dark:text-white">{row.name}</div>
                                      <div className="text-xs text-slate-500 font-mono">{row.partCode || '-'}</div>
                                  </td>
                                  <td className="p-3 text-center text-slate-500 dark:text-slate-400 font-medium">{row.currentStock} {row.unit}</td>
                                  <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">{row.qty}</td>
                                  <td className="p-3 text-center">
                                      {row.missing > 0 ? (
                                          <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold shadow-sm inline-block">
                                              -{row.missing} EKSİK
                                          </span>
                                      ) : (
                                          <span className="text-green-600 dark:text-green-400 font-bold text-xs flex items-center justify-center gap-1">
                                              <CheckCircle size={14}/> Stok Var
                                          </span>
                                      )}
                                  </td>
                                  <td className="p-3">
                                      <div className="flex flex-wrap gap-1">
                                          {row.sources.map((src, i) => (
                                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                                                  {src.orderName}: <span className="ml-1 font-bold">{src.qty}</span>
                                              </span>
                                          ))}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {report.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Bekleyen sipariş veya ihtiyaç bulunamadı.</td></tr>}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  };

  return (
    <>
    {showScanner && (
        <div className="fixed inset-0 z-[110]">
            <BarcodeScanner onScanSuccess={view === 'GUIDED' ? handleGuidedScan : () => {}} onClose={() => setShowScanner(false)} />
            {scanMessage && <div className={`absolute bottom-24 left-4 right-4 p-4 text-center font-bold text-white rounded-xl ${scanMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{scanMessage.text}</div>}
        </div>
    )}
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {view !== 'GUIDED' && view !== 'GLOBAL_REPORT' && (
            <div className="flex items-center justify-between p-4 border-b dark:border-slate-700 bg-orange-50 dark:bg-orange-900/20">
                <h2 className="text-lg font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2"><Package size={24}/> Sipariş Yönetimi</h2>
                <button onClick={onClose}><X size={24} className="text-slate-400"/></button>
            </div>
        )}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
            {view === 'LIST' && (
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setView('CREATE')} className="p-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-orange-500 hover:text-orange-500 flex flex-col items-center gap-2 bg-white dark:bg-slate-800 dark:border-slate-600"><Plus size={24}/><span>Yeni Sipariş</span></button>
                        <button onClick={() => setView('GLOBAL_REPORT')} className="p-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-500 hover:text-blue-500 flex flex-col items-center gap-2 bg-white dark:bg-slate-800 dark:border-slate-600"><ClipboardList size={24}/><span>Genel İhtiyaç Raporu</span></button>
                    </div>
                    <div className="space-y-2">
                        {orders.length === 0 ? <div className="text-center py-10 text-slate-400">Henüz sipariş yok.</div> : orders.map(order => {
                            const { missingCount } = calculateShortages(order.items);
                            return (
                                <div key={order.id} onClick={() => { setActiveOrder(order); setView('DETAIL'); }} className="bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 hover:border-orange-400 cursor-pointer flex justify-between items-center transition-all shadow-sm">
                                    <div><h4 className="font-bold dark:text-white">{order.name}</h4><p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString()} • {order.items.length} Kalem</p></div>
                                    {order.status === 'COMPLETED' ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Tamamlandı</span> : missingCount > 0 ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold flex gap-1"><AlertTriangle size={12}/> {missingCount} Eksik</span> : <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Hazır</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {view === 'GLOBAL_REPORT' && <GlobalReportView />}
            {view === 'CREATE' && (
                <div className="p-6 max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-xl m-4 shadow-sm border dark:border-slate-700">
                    <h3 className="font-bold text-lg mb-4 dark:text-white">Yeni Sipariş Yükle</h3>
                    <input type="text" value={newOrderName} onChange={(e) => setNewOrderName(e.target.value)} className="w-full p-3 border rounded-lg mb-4 dark:bg-slate-700 dark:text-white dark:border-slate-600" placeholder="Sipariş Adı / Proje İsmi" />
                    <button onClick={handleDownloadTemplate} className="text-xs text-blue-500 mb-4 block hover:underline flex items-center gap-1"><Download size={12}/> Şablon İndir</button>
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 mb-4 rounded-xl transition-colors"><input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx"/><Upload className="mx-auto mb-2 text-slate-400"/><p className="text-sm dark:text-slate-300">{importedItems.length > 0 ? `${importedItems.length} kalem yüklendi` : 'Excel Dosyası Seç'}</p></div>
                    <div className="flex gap-2"><button onClick={() => setView('LIST')} className="flex-1 py-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">İptal</button><button onClick={handleCreateOrder} disabled={!newOrderName || importedItems.length === 0} className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50">Kaydet</button></div>
                </div>
            )}
            {view === 'DETAIL' && activeOrder && (
                <div className="p-4 space-y-4">
                    <div className="flex justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 shadow-sm">
                        <div><button onClick={() => setView('LIST')} className="text-xs font-bold text-slate-500 mb-1 hover:underline">← Geri</button><h3 className="font-bold text-lg dark:text-white">{activeOrder.name}</h3></div>
                        <div className="flex gap-2">
                            {activeOrder.status !== 'COMPLETED' && <button onClick={startGuidedPicking} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex gap-1 items-center shadow-sm"><Play size={16}/> Toplamaya Başla</button>}
                            {activeOrder.status !== 'COMPLETED' && <button onClick={() => { onUpdateOrderStatus(activeOrder.id, 'COMPLETED'); setView('LIST'); }} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-sm flex gap-1 items-center"><Archive size={16}/> Tamamla</button>}
                            <button onClick={() => { if(confirm('Siparişi silmek istediğinize emin misiniz?')) { onDeleteOrder(activeOrder.id); setView('LIST'); } }} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors"><Trash2 size={16}/></button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border dark:border-slate-700 shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-b dark:border-slate-600"><tr><th className="p-3 text-left">Ürün</th><th className="p-3 text-center">İstenen</th><th className="p-3 text-center">Toplanan</th><th className="p-3 text-center">Durum</th></tr></thead>
                            <tbody className="divide-y dark:divide-slate-700">
                                {calculateShortages(activeOrder.items).details.map((item, idx) => {
                                    const picked = pickedCounts[item.product_name] || 0;
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="p-3 dark:text-white"><div>{item.product_name}</div><div className="text-xs text-slate-500 font-mono">{item.part_code} | {item.location || '-'}</div></td>
                                            <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">{item.required_qty}</td>
                                            <td className="p-3 text-center font-bold text-blue-600 dark:text-blue-400">{picked}</td>
                                            <td className="p-3 text-center">{item.missing > 0 ? <span className="text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">-{item.missing}</span> : <span className="text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">OK</span>}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {view === 'GUIDED' && guidedItems.length > 0 && (
                <div className="h-full flex flex-col bg-slate-900 text-white text-center p-6 items-center justify-center">
                    <div className="bg-blue-600 p-6 rounded-2xl mb-8 w-full max-w-sm border-4 border-blue-400 animate-pulse shadow-2xl shadow-blue-900/50">
                        <div className="text-sm font-bold uppercase opacity-80 mb-1 tracking-widest">HEDEF REYON</div>
                        <div className="text-5xl font-black">{guidedItems[guidedIndex].location || "BELİRSİZ"}</div>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{guidedItems[guidedIndex].product_name}</h3>
                    <div className="font-mono text-orange-400 font-bold mb-8 text-xl tracking-wider">{guidedItems[guidedIndex].part_code}</div>
                    <div className="flex items-end gap-2 mb-8">
                        <span className="text-6xl font-black text-green-400">{pickedCounts[guidedItems[guidedIndex].product_name] || 0}</span>
                        <span className="text-2xl text-slate-500">/</span>
                        <span className="text-4xl font-bold text-slate-300">{guidedItems[guidedIndex].required_qty}</span>
                    </div>
                    <div className="flex gap-4 w-full max-w-sm">
                        <button onClick={() => { if(guidedIndex < guidedItems.length - 1) setGuidedIndex(p => p+1); else { alert("Tüm ürünler gezildi."); setView('DETAIL'); setShowScanner(false); } }} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors">Atla</button>
                        <button onClick={() => setShowScanner(true)} className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg transition-colors flex items-center justify-center gap-2"><ScanLine/> OKUT</button>
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