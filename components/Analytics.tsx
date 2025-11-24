
import React, { useMemo } from 'react';
import { Product, Transaction, TransactionType } from '../types';
import { PieChart, TrendingUp, AlertTriangle, Package, CheckCircle, BarChart3, ArrowDown, ArrowUp, Hexagon } from 'lucide-react';

interface AnalyticsProps {
  products: Product[];
  transactions: Transaction[];
}

const Analytics: React.FC<AnalyticsProps> = ({ products, transactions }) => {
  // 1. Hammadde Bazlı Dağılım
  const materialStats = useMemo(() => {
    const stats: Record<string, number> = {};
    let totalItems = 0;
    
    products.forEach(p => {
        const mat = p.material || 'Diğer';
        stats[mat] = (stats[mat] || 0) + 1;
        totalItems++;
    });

    return Object.entries(stats)
        .map(([name, count]) => ({ name, count, percentage: Math.round((count / totalItems) * 100) }))
        .sort((a, b) => b.count - a.count);
  }, [products]);

  // 2. Kritik Stok Oranı
  const criticalStockCount = products.filter(p => p.current_stock <= p.min_stock_level).length;
  const criticalRatio = products.length > 0 ? Math.round((criticalStockCount / products.length) * 100) : 0;

  // 3. En Çok Hareketi Olan Ürünler (Top 5)
  const topMovers = useMemo(() => {
     const moveCounts: Record<string, number> = {};
     transactions.forEach(t => {
         moveCounts[t.product_id] = (moveCounts[t.product_id] || 0) + 1;
     });
     
     return Object.entries(moveCounts)
        .map(([id, count]) => {
            const product = products.find(p => p.id === id);
            return {
                id,
                name: product?.product_name || 'Bilinmeyen Ürün',
                code: product?.part_code,
                count
            };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
  }, [transactions, products]);

  // 4. Tahmini Stok Değeri (Adet bazlı basit toplam - Mock logic)
  // Gerçek hayatta maliyet ile çarpılır, burada sadece toplam stok adedi gösteriyoruz
  const totalStockItems = products.reduce((acc, p) => acc + p.current_stock, 0);
  
  // Renk paleti
  const COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500', 'bg-slate-500'];

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                <BarChart3 className="text-indigo-600 dark:text-indigo-400" size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Depo Analizi</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Stok durumu ve hareketlerin görsel özeti</p>
            </div>
        </div>

        {/* Özet Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Toplam Stok Adedi</p>
                        <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{totalStockItems}</h3>
                    </div>
                    <Package className="text-blue-500 opacity-20" size={48} />
                </div>
                <div className="mt-4 flex items-center text-xs text-slate-400">
                    <CheckCircle size={14} className="mr-1 text-green-500" /> 
                    {products.length} farklı kalem ürün
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Kritik Stok Oranı</p>
                        <h3 className={`text-3xl font-bold ${criticalRatio > 20 ? 'text-red-500' : 'text-emerald-500'}`}>%{criticalRatio}</h3>
                    </div>
                    <AlertTriangle className={`opacity-20 ${criticalRatio > 20 ? 'text-red-500' : 'text-emerald-500'}`} size={48} />
                </div>
                <div className="mt-4 w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full ${criticalRatio > 20 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${criticalRatio}%` }}
                    ></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">{criticalStockCount} ürün kritik seviyenin altında</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Hareket Yoğunluğu</p>
                        <h3 className="text-3xl font-bold text-purple-600 dark:text-purple-400">{transactions.length}</h3>
                    </div>
                    <TrendingUp className="text-purple-500 opacity-20" size={48} />
                </div>
                <div className="mt-4 flex gap-3 text-xs">
                    <span className="flex items-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded font-bold">
                        <ArrowDown size={12} className="mr-1" />
                        {transactions.filter(t => t.type === TransactionType.IN).length} Giriş
                    </span>
                    <span className="flex items-center text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded font-bold">
                        <ArrowUp size={12} className="mr-1" />
                        {transactions.filter(t => t.type === TransactionType.OUT).length} Çıkış
                    </span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Hammadde Dağılımı Grafiği */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <Hexagon size={20} className="text-slate-400" />
                    Hammadde Dağılımı
                </h3>
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {materialStats.map((mat, index) => (
                        <div key={mat.name}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium text-slate-700 dark:text-slate-200">{mat.name}</span>
                                <span className="text-slate-500 dark:text-slate-400">{mat.count} Ürün (%{mat.percentage})</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full ${COLORS[index % COLORS.length]}`} 
                                    style={{ width: `${mat.percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                    {materialStats.length === 0 && (
                        <p className="text-slate-400 text-center py-4">Veri bulunamadı.</p>
                    )}
                </div>
            </div>

            {/* En Çok Hareket Görenler */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <TrendingUp size={20} className="text-slate-400" />
                    En Çok İşlem Görenler
                </h3>
                <div className="space-y-3">
                    {topMovers.map((item, idx) => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-white text-sm ${idx < 3 ? 'bg-amber-400 shadow-md shadow-amber-200 dark:shadow-none' : 'bg-slate-400'}`}>
                                    {idx + 1}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{item.code || 'Kodsuz'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-blue-600 dark:text-blue-400">{item.count}</span>
                                <span className="text-[10px] text-slate-400 uppercase">İşlem</span>
                            </div>
                        </div>
                    ))}
                    {topMovers.length === 0 && (
                         <p className="text-slate-400 text-center py-4">Henüz işlem kaydı yok.</p>
                    )}
                </div>
            </div>

        </div>
    </div>
  );
};

export default Analytics;
