
import React from 'react';
import { AlertTriangle, Package, ArrowDownLeft, ArrowUpRight, BarChart3, FileSpreadsheet, Download, ShieldAlert, ClipboardCheck, Mail, ScanLine, Clock, Check, RefreshCw } from 'lucide-react';
import { Product, Transaction, TransactionType, User } from '../types';

interface DashboardProps {
  products: Product[];
  transactions: Transaction[];
  onQuickAction: (type: TransactionType) => void;
  onProductClick: (product: Product) => void;
  onBulkAction: () => void;
  onViewNegativeStock: () => void;
  onOrderSimulation: () => void;
  onScan: () => void;
  onReportSent: (productIds: string[]) => void;
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ products, transactions, onQuickAction, onProductClick, onBulkAction, onViewNegativeStock, onOrderSimulation, onScan, onReportSent, currentUser }) => {
  const totalProducts = products.length;
  
  const lowStockProducts = products.filter(p => p.current_stock <= p.min_stock_level && p.current_stock >= 0);
  const negativeStockProducts = products.filter(p => p.current_stock < 0);
  
  const transactionsThisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

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

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "kritik_stok_listesi.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEmailReport = () => {
      // Sadece HENÜZ RAPORLANMAMIŞ kritik ürünleri filtrele
      const unreportedCriticals = lowStockProducts.filter(p => !p.last_alert_sent_at);
      
      if (unreportedCriticals.length === 0) {
          if (!confirm("Tüm kritik ürünler için zaten rapor oluşturulmuş. Yine de tüm listeyi tekrar göndermek ister misiniz?")) {
              return;
          }
      }

      // Kullanıcı "Evet" derse veya yeni ürünler varsa listeyi hazırla
      const productsToReport = unreportedCriticals.length > 0 ? unreportedCriticals : lowStockProducts;

      const subject = `Kritik Stok Raporu - ${new Date().toLocaleDateString('tr-TR')}`;
      let body = `Tarih: ${new Date().toLocaleString('tr-TR')}%0D%0A`;
      body += `Aşağıdaki ürünler kritik stok seviyesinin altındadır ve sipariş edilmesi önerilir:%0D%0A%0D%0A`;
      
      productsToReport.forEach(p => {
          body += `- ${p.product_name} (${p.part_code || 'Kodsuz'}): ${p.current_stock} ${p.unit} (Min: ${p.min_stock_level})%0D%0A`;
      });

      // State'i güncelle: Bu ürünleri "Raporlandı" olarak işaretle
      // setTimeout kullanarak mail penceresi açıldıktan hemen sonra state'i güncelliyoruz
      setTimeout(() => {
          onReportSent(productsToReport.map(p => p.id));
      }, 500);
      
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Zaman farkını hesaplayan yardımcı fonksiyon
  const getTimeDifference = (dateString?: string) => {
    if (!dateString) return "Yeni";
    const start = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} gün önce`;
    if (diffHours > 0) return `${diffHours} saat önce`;
    return "Az önce";
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Card 1: Total Types */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Toplam Kalem</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{totalProducts}</h3>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">
              <Package size={20} />
            </div>
          </div>
        </div>

        {/* Card 2: Transactions */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
           <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Aylık Hareket</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{transactionsThisMonth}</h3>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full">
              <ArrowUpRight size={20} />
            </div>
          </div>
        </div>

        {/* Card 3: Critical Stock */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
           <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-500 dark:text-amber-400 uppercase font-semibold">Kritik Stok</p>
              <h3 className={`text-2xl font-bold ${lowStockProducts.length > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-slate-800 dark:text-white'}`}>
                {lowStockProducts.length}
              </h3>
            </div>
            <div className={`p-2 rounded-full ${lowStockProducts.length > 0 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>

        {/* Card 4: Negative Stock (Clickable) */}
        <div 
            onClick={onViewNegativeStock}
            className={`p-4 rounded-2xl shadow-sm border cursor-pointer transition-transform active:scale-95 
                ${negativeStockProducts.length > 0 
                    ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' 
                    : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}
        >
           <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs uppercase font-semibold ${negativeStockProducts.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>Eksi Bakiye</p>
              <h3 className={`text-2xl font-bold ${negativeStockProducts.length > 0 ? 'text-red-700 dark:text-red-500' : 'text-slate-800 dark:text-white'}`}>
                {negativeStockProducts.length}
              </h3>
            </div>
            <div className={`p-2 rounded-full ${negativeStockProducts.length > 0 ? 'bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'}`}>
              <ShieldAlert size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions (ONLY ADMIN) */}
      {currentUser.role === 'ADMIN' && (
        <>
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Hızlı İşlemler</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            
            {/* BIG SCAN BUTTON */}
            <button 
              onClick={onScan}
              className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-4 bg-blue-600 active:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none transition-transform transform active:scale-95"
            >
              <ScanLine size={32} className="mb-2" />
              <span className="font-bold text-sm">QR TARA</span>
              <span className="text-[10px] opacity-80">Hızlı İşlem</span>
            </button>

            <button 
              onClick={() => onQuickAction(TransactionType.IN)}
              className="flex flex-col items-center justify-center p-4 bg-emerald-600 active:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none transition-transform transform active:scale-95"
            >
              <ArrowDownLeft size={24} className="mb-1" />
              <span className="font-bold text-sm">GİRİŞ</span>
              <span className="text-[10px] opacity-80 hidden md:block">Mal kabulü</span>
            </button>

            <button 
              onClick={() => onQuickAction(TransactionType.OUT)}
              className="flex flex-col items-center justify-center p-4 bg-rose-600 active:bg-rose-700 text-white rounded-2xl shadow-lg shadow-rose-200 dark:shadow-none transition-transform transform active:scale-95"
            >
              <ArrowUpRight size={24} className="mb-1" />
              <span className="font-bold text-sm">ÇIKIŞ</span>
              <span className="text-[10px] opacity-80 hidden md:block">Sevkiyat</span>
            </button>

            <button 
              onClick={onOrderSimulation}
              className="flex flex-col items-center justify-center p-4 bg-orange-500 active:bg-orange-600 text-white rounded-2xl shadow-lg shadow-orange-200 dark:shadow-none transition-transform transform active:scale-95"
            >
              <ClipboardCheck size={24} className="mb-1" />
              <span className="font-bold text-sm text-center">SİPARİŞ KONTROL</span>
              <span className="text-[10px] opacity-80 hidden md:block">Stok Yeterlilik</span>
            </button>

            <button 
              onClick={onBulkAction}
              className="hidden sm:flex flex-col items-center justify-center p-4 bg-slate-700 active:bg-slate-800 text-white rounded-2xl shadow-lg shadow-slate-300 dark:shadow-none transition-transform transform active:scale-95"
            >
              <FileSpreadsheet size={24} className="mb-1" />
              <span className="font-bold text-sm">EXCEL</span>
              <span className="text-[10px] opacity-80 hidden md:block">Toplu İşlem</span>
            </button>
          </div>
        </>
      )}

      {/* Sipariş Kontrol Button for Viewers */}
      {currentUser.role === 'VIEWER' && (
        <div className="grid grid-cols-1 gap-4">
             <button 
              onClick={onOrderSimulation}
              className="flex items-center justify-center gap-3 p-4 bg-orange-500 active:bg-orange-600 text-white rounded-2xl shadow-lg shadow-orange-200 dark:shadow-none transition-transform transform active:scale-95"
            >
              <ClipboardCheck size={24} />
              <div className="text-left">
                  <span className="block font-bold text-sm">SİPARİŞ KONTROL SİMÜLASYONU</span>
                  <span className="text-[10px] opacity-80">Stok düşmeden yeterlilik kontrolü yapın</span>
              </div>
            </button>
        </div>
      )}

      {/* Low Stock Alert List */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-900/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
                <div className="relative">
                  <AlertTriangle size={18} className="text-amber-600 dark:text-amber-500" />
                  {lowStockProducts.filter(p => !p.last_alert_sent_at).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Kritik Seviyedeki Ürünler</h3>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <button 
                    onClick={handleEmailReport}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-700 border border-blue-200 dark:border-slate-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                >
                    <Mail size={14} />
                    {lowStockProducts.some(p => !p.last_alert_sent_at) ? 'Yeni Rapor (E-Posta)' : 'E-Posta (Tümü)'}
                </button>
                <button 
                    onClick={handleExportCriticalStock}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-white dark:bg-slate-700 border border-amber-200 dark:border-slate-600 px-3 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                >
                    <Download size={14} />
                    Excel
                </button>
            </div>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {lowStockProducts.map(product => (
              <div key={product.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex justify-between items-center relative overflow-hidden group">
                {/* Sol Kenar Çizgisi: Raporlandıysa yeşil, değilse kırmızı */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${product.last_alert_sent_at ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`}></div>
                
                <div className="pl-3">
                  <div className="font-medium text-slate-800 dark:text-white flex items-center gap-2">
                      {product.product_name}
                      {product.last_alert_sent_at ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Check size={10} /> Raporlandı
                          </span>
                      ) : (
                          <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <AlertTriangle size={10} /> Bildirilmedi
                          </span>
                      )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                     <span className="text-sm text-slate-400 dark:text-slate-500">{product.part_code || 'Kodsuz'}</span>
                     
                     {/* Süre Bilgisi */}
                     {product.critical_since && (
                         <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                             <Clock size={10} />
                             {product.last_alert_sent_at 
                                ? `Raporlanalı: ${getTimeDifference(product.last_alert_sent_at)}`
                                : `Kritikleşeli: ${getTimeDifference(product.critical_since)}`
                             }
                         </span>
                     )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-amber-600 dark:text-amber-500">
                    {product.current_stock} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{product.unit}</span>
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">Min: {product.min_stock_level}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;