
import React, { useState, useRef, useMemo } from 'react';
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Package, Trash2, Archive, Plus, ChevronRight, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, Order, OrderItem } from '../types';

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

  if (!isOpen) return null;

  // --- HANDLERS ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);

      const items: OrderItem[] = [];
      data.forEach((row: any) => {
          const name = row['Urun'] || row['Ürün'] || row['Aciklama'];
          const qty = row['Adet'] || row['Miktar'] || row['Qty'];
          if (name && qty) {
              items.push({ product_name: name, required_qty: Number(qty), unit: row['Birim'] || 'Adet' });
          }
      });
      setImportedItems(items);
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
          const match = products.find(p => 
              p.product_name.toLowerCase().trim() === item.product_name.toLowerCase().trim() || 
              p.part_code?.toLowerCase().trim() === item.product_name.toLowerCase().trim()
          );
          
          const currentStock = match ? match.current_stock : 0;
          const missing = Math.max(0, item.required_qty - currentStock);
          if (missing > 0) missingCount++;

          return { ...item, match, missing };
      });
      return { missingCount, details };
  };

  return (
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
                        {orders.map(order => {
                            const { missingCount } = calculateShortages(order.items);
                            return (
                                <div key={order.id} onClick={() => { setActiveOrder(order); setView('DETAIL'); }} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-orange-400 cursor-pointer transition-all group">
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <button onClick={() => setView('LIST')} className="text-sm font-bold text-slate-500 hover:text-slate-800 self-start">← Listeye Dön</button>
                        <div className="flex gap-2 self-end">
                            {activeOrder.status !== 'COMPLETED' && (
                                <button onClick={() => { onUpdateOrderStatus(activeOrder.id, 'COMPLETED'); setView('LIST'); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"><Archive size={16}/> <span className="hidden sm:inline">Arşivle / Tamamla</span></button>
                            )}
                            <button onClick={() => { if(confirm("Silinsin mi?")) { onDeleteOrder(activeOrder.id); setView('LIST'); } }} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-bold"><Trash2 size={16}/></button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-lg dark:text-white">{activeOrder.name}</h3>
                            <p className="text-xs text-slate-500">Oluşturulma: {new Date(activeOrder.created_at).toLocaleString()}</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {calculateShortages(activeOrder.items).details.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800 dark:text-white">{item.product_name}</div>
                                                <div className="text-xs text-slate-500 flex gap-2">
                                                    {item.match ? <span className="text-green-600 flex items-center gap-1"><CheckCircle size={10}/> Eşleşti: {item.match.part_code}</span> : <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10}/> Eşleşmedi</span>}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">İstenen: {item.required_qty}</div>
                                                {item.missing > 0 ? (
                                                    <div className="text-red-600 font-bold text-sm">Eksik: {item.missing}</div>
                                                ) : (
                                                    <div className="text-green-600 font-bold text-xs">Stok Var</div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default OrderManagerModal;
