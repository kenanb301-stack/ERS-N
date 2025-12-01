
import React, { useMemo, useState } from 'react';
import { Product, Transaction, TransactionType } from '../types';
import { TrendingUp, BarChart3, Hexagon, Archive, Map, Activity, Zap } from 'lucide-react';

interface AnalyticsProps {
  products: Product[];
  transactions: Transaction[];
}

const Analytics: React.FC<AnalyticsProps> = ({ products, transactions }) => {
  const [trendRange, setTrendRange] = useState<7 | 14 | 30>(7);

  // --- 1. KPI ---
  const criticalStockCount = products.filter(p => p.current_stock <= p.min_stock_level).length;
  const healthScore = Math.max(0, 100 - (criticalStockCount * 2)); 

  // --- 2. TRENDS ---
  const trendData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = trendRange - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayTrans = transactions.filter(t => t.date.startsWith(dateStr));
        data.push({
            date: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
            in: dayTrans.filter(t => t.type === TransactionType.IN).length,
            out: dayTrans.filter(t => t.type === TransactionType.OUT).length,
        });
    }
    return data;
  }, [transactions, trendRange]);
  
  const maxChartValue = Math.max(...trendData.map(d => Math.max(d.in, d.out)), 1);

  // --- 3. DEAD STOCK ---
  const deadStock = useMemo(() => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeProductIds = new Set(transactions.filter(t => new Date(t.date) > thirtyDaysAgo).map(t => t.product_id));
      return products
        .filter(p => p.current_stock > 0 && !activeProductIds.has(p.id))
        .sort((a, b) => b.current_stock - a.current_stock)
        .slice(0, 5);
  }, [products, transactions]);

  // --- 4. ABC ANALİZİ (POPÜLARİTE BAZLI) ---
  const abcAnalysis = useMemo(() => {
      const counts: Record<string, number> = {};
      transactions.forEach(t => { counts[t.product_id] = (counts[t.product_id] || 0) + 1; });

      // En çok işlem görenleri sırala
      const sortedProducts = products.map(p => ({ ...p, count: counts[p.id] || 0 })).sort((a, b) => b.count - a.count);
      
      const totalOps = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
      let accum = 0;
      let countA = 0, countB = 0, countC = 0;

      // Kümülatif toplama göre sınıflandır
      sortedProducts.forEach(p => {
          accum += p.count;
          const pct = (accum / totalOps) * 100;
          if (pct <= 80) countA++; // İşlemlerin %80'ini oluşturanlar (A)
          else if (pct <= 95) countB++; // Sonraki %15 (B)
          else countC++; // Son %5 (C) - Çok nadir işlem görenler
      });

      return { countA, countB, countC };
  }, [products, transactions]);

  // --- 5. LOCATION HEATMAP ---
  const locationStats = useMemo(() => {
      const stats: Record<string, number> = {};
      products.forEach(p => {
          if (!p.location) return;
          const zone = p.location.split('-')[0] || 'Diğer';
          stats[zone] = (stats[zone] || 0) + 1;
      });
      return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [products]);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
        
        {/* Header KPI */}
        <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800">
            <div>
                <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-300">Depo Analizi</h2>
                <p className="text-xs text-indigo-700 dark:text-indigo-400 opacity-80">Verimlilik ve Sağlık Raporu</p>
            </div>
            <div className="text-right">
                <span className="block text-xs font-bold uppercase opacity-70">Sağlık Puanı</span>
                <div className="flex items-center gap-2 justify-end text-emerald-600 dark:text-emerald-400">
                    <Activity size={20} />
                    <span className="text-2xl font-black">{healthScore}</span>
                </div>
            </div>
        </div>

        {/* 1. HAREKET GRAFİĞİ */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <TrendingUp className="text-blue-500" size={18} /> Hareket Trendi
                </h3>
                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 text-[10px] font-bold">
                    {[7, 14, 30].map(d => (
                        <button key={d} onClick={() => setTrendRange(d as any)} className={`px-2 py-1 rounded transition-colors ${trendRange === d ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white' : 'text-slate-500'}`}>{d} Gün</button>
                    ))}
                </div>
            </div>
            <div className="h-40 flex items-end justify-between gap-1">
                {trendData.map((d, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="w-full flex gap-0.5 items-end justify-center h-32">
                            <div style={{ height: `${(d.in / maxChartValue) * 100}%` }} className="w-2 sm:w-4 bg-emerald-400 rounded-t-sm"></div>
                            <div style={{ height: `${(d.out / maxChartValue) * 100}%` }} className="w-2 sm:w-4 bg-rose-400 rounded-t-sm"></div>
                        </div>
                        <span className="text-[9px] text-slate-400 rotate-90 sm:rotate-0 mt-2 sm:mt-0 origin-left truncate w-full text-center">{d.date}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* GRID: ABC & DEAD STOCK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* ABC */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Hexagon className="text-purple-500" size={18} /> ABC Analizi (Popülarite)
                </h3>
                <div className="flex gap-1 h-3 mb-4 rounded-full overflow-hidden">
                    <div style={{width: `${(abcAnalysis.countA / products.length) * 100}%`}} className="bg-emerald-500"></div>
                    <div style={{width: `${(abcAnalysis.countB / products.length) * 100}%`}} className="bg-blue-500"></div>
                    <div style={{width: `${(abcAnalysis.countC / products.length) * 100}%`}} className="bg-slate-300 dark:bg-slate-600"></div>
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-2 rounded bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300">A Grubu (Çok Hareketli)</span>
                        <span className="font-black text-emerald-600">{abcAnalysis.countA}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                        <span className="font-bold text-blue-800 dark:text-blue-300">B Grubu (Orta)</span>
                        <span className="font-black text-blue-600">{abcAnalysis.countB}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                        <span className="font-bold text-slate-600 dark:text-slate-400">C Grubu (Az/Nadir)</span>
                        <span className="font-black text-slate-600 dark:text-slate-300">{abcAnalysis.countC}</span>
                    </div>
                </div>
            </div>

            {/* ATIL STOK */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Archive className="text-orange-500" size={18} /> Atıl Stok (Top 5)
                </h3>
                {deadStock.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">Tüm stoklar aktif.</div>
                ) : (
                    <div className="space-y-2">
                        {deadStock.map((p, idx) => (
                            <div key={p.id} className="flex justify-between items-center p-2 rounded bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800 text-xs">
                                <div>
                                    <span className="font-bold text-slate-800 dark:text-white block">{p.product_name}</span>
                                    <span className="text-slate-500">{p.part_code}</span>
                                </div>
                                <span className="font-bold text-orange-600">{p.current_stock} {p.unit}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* REYON HARİTASI */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Map className="text-slate-400" size={18} /> Reyon Yoğunluk Haritası
            </h3>
            <div className="flex flex-wrap gap-2">
                {locationStats.map(([zone, count]) => (
                    <div key={zone} className="flex-1 min-w-[80px] bg-slate-50 dark:bg-slate-700 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-600">
                        <div className="text-lg font-black text-slate-800 dark:text-white">{zone}</div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-bold">{count} Ürün</div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default Analytics;
