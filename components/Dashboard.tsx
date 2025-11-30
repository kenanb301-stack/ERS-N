
import React, { useState } from 'react';
import { AlertTriangle, Package, ArrowDownLeft, ArrowUpRight, CloudOff, Download, Mail, ScanLine, ClipboardList, ListChecks, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Product, Transaction, TransactionType, User } from '../types';

interface DashboardProps {
  products: Product[];
  transactions: Transaction[];
  onQuickAction: (type: TransactionType) => void;
  onProductClick: (product: Product) => void;
  onBulkAction: () => void;
  onViewNegativeStock: () => void;
  onOrderManager: () => void;
  onScan: () => void;
  onCycleCount: () => void;
  onReportSent: (productIds: string[]) => void;
  onOpenProductDetail: () => void; // New prop
  currentUser: User;
  isCloudEnabled?: boolean;
  onOpenCloudSetup?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ products, transactions, onQuickAction, onProductClick, onBulkAction, onViewNegativeStock, onOrderManager, onScan, onCycleCount, onReportSent, onOpenProductDetail, currentUser, isCloudEnabled, onOpenCloudSetup }) => {
  const [showAllCritical, setShowAllCritical] = useState(false);
  
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.current_stock <= p.min_stock_level && p.current_stock >= 0);
  const negativeStockProducts = products.filter(p => p.current_stock < 0);
  
  const transactionsThisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const displayedCriticalProducts = showAllCritical ? lowStockProducts : lowStockProducts.slice(0, 3);

  const handleExportCriticalStock = () => {
    if (lowStockProducts.length === 0) return;
    const headers = ["Ürün Adı", "Mevcut Stok", "Birim", "Min. Seviye", "Durum"];
    const rows = lowStockProducts.map(p => [
        `"${p.product_name}"`,
        p.current_stock.toString(),
        p.unit,
        p.min_stock_level.toString(),
        p.last_alert_sent_at ? "Raporlandı" : "Raporlanmadı"
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "kritik_stok_listesi.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEmailReport = () => {
      const unreportedCriticals = lowStockProducts.filter(p => !p.last_alert_sent_at);
      if (unreportedCriticals.length === 0) {
          if (!confirm("Tüm kritik ürünler için zaten rapor oluşturulmuş. Yine de tüm listeyi tekrar göndermek ister misiniz?")) return;
      }
      const productsToReport = unreportedCriticals.length > 0 ? unreportedCriticals : lowStockProducts;
      const subject = `Kritik Stok Raporu - ${new Date().toLocaleDateString('tr-TR')}`;
      let body = `Tarih: ${new Date().toLocaleString('tr-TR')}%0D%0A`;
      body += `Aşağıdaki ürünler kritik stok seviyesinin altındadır:%0D%0A%0D%0A`;
      productsToReport.forEach(p => {
          body += `- ${p.product_name} (${p.part_code || 'Kodsuz'}): ${p.current_stock} ${p.unit} (Min: ${p.min_stock_level})%0D%0A`;
      });
      setTimeout(() => { onReportSent(productsToReport.map(p => p.id)); }, 500);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Cloud Warning */}
      {currentUser.role === 'ADMIN' && isCloudEnabled === false && (
         <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-3 rounded-xl flex items-center gap-3 text-xs">
            <CloudOff className="text-amber-600 dark:text-amber-500" size={20} />
            <div className="flex-1 text-amber-800 dark:text-amber-300">
                Bulut kapalı. Veriler sadece bu cihazda.
                {onOpenCloudSetup && (
                    <button onClick={onOpenCloudSetup} className="ml-2 underline font-bold hover:text-amber-900">Kurulum Yap</button>
                )}
            </div>
         </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-500 uppercase font-bold">Toplam Stok</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalProducts}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-500 uppercase font-bold">Aylık Hareket</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{transactionsThisMonth}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <p className="text-xs text-amber-500 uppercase font-bold">Kritik Stok</p>
            <h3 className={`text-2xl font-black mt-1 ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-slate-800 dark:text-white'}`}>{lowStockProducts.length}</h3>
        </div>
        <div onClick={onViewNegativeStock} className={`p-4 rounded-xl shadow-sm border cursor-pointer ${negativeStockProducts.length > 0 ? 'bg-red-50 border-red-100 dark:bg-red-900/20' : 'bg-white border-slate-100 dark:bg-slate-800'}`}>
            <p className={`text-xs uppercase font-bold ${negativeStockProducts.length > 0 ? 'text-red-600' : 'text-slate-500'}`}>Eksi Bakiye</p>
            <h3 className={`text-2xl font-black mt-1 ${negativeStockProducts.length > 0 ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}>{negativeStockProducts.length}</h3>
        </div>
      </div>

      {/* Quick Actions Grid */}
      {currentUser.role === 'ADMIN' && (
        <>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Hızlı İşlemler</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <button onClick={onScan} className="flex flex-col items-center justify-center p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-transform aspect-square">
              <ScanLine size={24} className="mb-1" />
              <span className="text-[10px] font-bold">QR TARA</span>
            </button>
            <button onClick={() => onQuickAction(TransactionType.IN)} className="flex flex-col items-center justify-center p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none active:scale-95 transition-transform aspect-square">
              <ArrowDownLeft size={24} className="mb-1" />
              <span className="text-[10px] font-bold">GİRİŞ</span>
            </button>
            <button onClick={() => onQuickAction(TransactionType.OUT)} className="flex flex-col items-center justify-center p-3 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-200 dark:shadow-none active:scale-95 transition-transform aspect-square">
              <ArrowUpRight size={24} className="mb-1" />
              <span className="text-[10px] font-bold">ÇIKIŞ</span>
            </button>
            
            <button onClick={onOrderManager} className="flex flex-col items-center justify-center p-3 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 dark:shadow-none active:scale-95 transition-transform aspect-square text-center">
              <ClipboardList size={24} className="mb-1" />
              <span className="text-[10px] font-bold leading-tight">SİPARİŞ<br/>YÖNETİMİ</span>
            </button>

            <button onClick={onCycleCount} className="flex flex-col items-center justify-center p-3 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 transition-transform aspect-square text-center">
              <ListChecks size={24} className="mb-1" />
              <span className="text-[10px] font-bold leading-tight">DÜZENLİ<br/>SAYIM</span>
            </button>

            {/* Info / Query Button */}
            <button onClick={onOpenProductDetail} className="flex flex-col items-center justify-center p-3 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-200 dark:shadow-none active:scale-95 transition-transform aspect-square text-center">
               <Info size={24} className="mb-1" />
               <span className="text-[10px] font-bold leading-tight">SORGULA</span>
            </button>
          </div>
        </>
      )}

      {/* COMPACT Critical Stock List */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mt-4">
          <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-900/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600 dark:text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Kritik Stok ({lowStockProducts.length})</h3>
            </div>
            <div className="flex gap-2">
                <button onClick={handleEmailReport} className="p-1.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-blue-600">
                    <Mail size={14} />
                </button>
                <button onClick={handleExportCriticalStock} className="p-1.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-amber-600">
                    <Download size={14} />
                </button>
            </div>
          </div>
          
          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {displayedCriticalProducts.map(product => (
              <div key={product.id} className="p-3 flex justify-between items-center text-sm">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 dark:text-white">{product.product_name}</span>
                  <span className="text-xs text-slate-400 font-mono">{product.part_code || '-'}</span>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-amber-600">{product.current_stock} {product.unit}</span>
                  <span className="text-[10px] text-slate-400">Min: {product.min_stock_level}</span>
                </div>
              </div>
            ))}
          </div>
          
          {lowStockProducts.length > 3 && (
              <button 
                onClick={() => setShowAllCritical(!showAllCritical)}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
              >
                  {showAllCritical ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showAllCritical ? 'Listeyi Daralt' : `Tümünü Gör (${lowStockProducts.length - 3} daha)`}
              </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
