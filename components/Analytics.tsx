
import React, { useMemo, useState } from 'react';
import { Product, Transaction, TransactionType } from '../types';
import { 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  CheckCircle, 
  BarChart3, 
  ArrowDown, 
  ArrowUp, 
  Hexagon, 
  Calendar, 
  Zap, 
  Archive, 
  Map,
  Activity
} from 'lucide-react';

interface AnalyticsProps {
  products: Product[];
  transactions: Transaction[];
}

const Analytics: React.FC<AnalyticsProps> = ({ products, transactions }) => {
  const [trendRange, setTrendRange] = useState<7 | 14 | 30>(7);

  // --- 1. KPI: GENEL ÖZETLER ---
  const totalStockItems = products.reduce((acc, p) => acc + p.current_stock, 0);
  const totalStockValue = products.length; // Kalem sayısı
  const criticalStockCount = products.filter(p => p.current_stock <= p.min_stock_level).length;
  
  // Depo Sağlık Puanı (Basit bir algoritma: Kritik stok azlığı ve hareketlilik puanı)
  const healthScore = Math.max(0, 100 - (criticalStockCount * 2)); 

  // --- 2. HAREKET TRENDLERİ (Giriş/Çıkış Grafiği) ---
  const trendData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    for (let i = trendRange - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const dayTrans = transactions.filter(t => t.date.startsWith(dateStr));
        const inCount = dayTrans.filter(t => t.type === TransactionType.IN).length;
        const outCount = dayTrans.filter(t => t.type === TransactionType.OUT).length;
        
        data.push({
            date: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
            in: inCount,
            out: outCount,
            total: inCount + outCount
        });
    }
    return data;
  }, [transactions, trendRange]);

  const maxChartValue = Math.max(...trendData.map(d => Math.max(d.in, d.out)), 1);

  // --- 3. ATIL STOK (DEAD STOCK) ANALİZİ ---
  // Hiç işlem görmemiş veya çok uzun süredir işlem görmemiş ürünler
  const deadStock = useMemo(() => {
      // Son 30 günde işlem gören ürün ID'leri
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activeProductIds = new Set(
          transactions
            .filter(t => new Date(t.date) > thirtyDaysAgo)
            .map(t => t.product_id)
      );

      // Stoğu olan ama hareketi olmayanlar
      return products
        .filter(p => p.current_stock > 0 && !activeProductIds.has(p.id))
        .sort((a, b) => b.current_stock - a.current_stock)
        .slice(0, 5); // Top 5 göster
  }, [products, transactions]);

  // --- 4. ABC ANALİZİ (PARETO) ---
  // İşlem hacmine göre ürünleri sınıflandır
  const abcAnalysis = useMemo(() => {
      const movementCounts: Record<string, number> = {};
      transactions.forEach(t => {
          movementCounts[t.product_id] = (movementCounts[t.product_id] || 0) + 1;
      });

      const sortedProducts = products.map(p => ({
          ...p,
          movement: movementCounts[p.id] || 0
      })).sort((a, b) => b.movement - a.movement);

      const totalMovement = Object.values(movementCounts).reduce((a, b) => a + b, 0) || 1;
      
      let accum = 0;
      let countA = 0, countB = 0, countC = 0;

      sortedProducts.forEach(p => {
          accum += p.movement;
          const percentage = (accum / totalMovement) * 100;
          if (percentage <= 80) countA++; // %80 Hacim -> A Grubu (En önemli)
          else if (percentage <= 95) countB++; // %15 Hacim -> B Grubu
          else countC++; // %5 Hacim -> C Grubu (En az hareketli)
      });

      return { countA, countB, countC };
  }, [products, transactions]);

  // --- 5. REYON YOĞUNLUK HARİTASI ---
  const locationStats = useMemo(() => {
      const stats: Record<string, number> = {};
      products.forEach(p => {
          if (!p.location) return;
          // Reyonun ilk kısmını al (örn: B1-06-06 -> B1)
          const zone = p.location.split('-')[0] || 'Diğer';
          stats[zone] = (stats[zone] || 0) + 1;
      });
      
      return Object.entries(stats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6); // İlk 6 reyon
  }, [products]);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                    <BarChart3 className="text-indigo-600 dark:text-indigo-400" size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gelişmiş Depo Analizi</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Verimlilik, trendler ve stok sağlığı raporu</p>
                </div>
            </div>
            
            {/* Health Score Badge */}
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${healthScore > 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                <Activity size={20} />
                <div>
                    <span className="block text-xs font-bold opacity-80 uppercase">Depo Sağlık Puanı</span>
                    <span className="text-xl font-black">{healthScore}/100</span>
                </div>
            </div>
        </div>

        {/* 1. SECTION: HAREKET GRAFİĞİ */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <TrendingUp className="text-blue-500" size={20} />
                    Hareket Trendi (Giriş vs Çıkış)
                </h3>
                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 text-xs font-medium">
                    <button onClick={() => setTrendRange(7)} className={`px-3 py-1 rounded-md transition-colors ${trendRange === 7 ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>7 Gün</button>
                    <button onClick={() => setTrendRange(14)} className={`px-3 py-1 rounded-md transition-colors ${trendRange === 14 ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>14 Gün</button>
                    <button onClick={() => setTrendRange(30)} className={`px-3 py-1 rounded-md transition-colors ${trendRange === 30 ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>30 Gün</button>
                </div>
            </div>
            
            {/* Custom CSS Chart */}
            <div className="h-64 flex items-end justify-between gap-2 md:gap-4">
                {trendData.map((d, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full flex gap-1 items-end justify-center h-48 relative">
                            {/* Giriş Barı */}
                            <div 
                                style={{ height: `${(d.in / maxChartValue) * 100}%` }} 
                                className="w-3 md:w-6 bg-emerald-400 dark:bg-emerald-500 rounded-t-sm transition-all duration-500 relative group-hover:opacity-80"
                            ></div>
                            {/* Çıkış Barı */}
                            <div 
                                style={{ height: `${(d.out / maxChartValue) * 100}%` }} 
                                className="w-3 md:w-6 bg-rose-400 dark:bg-rose-500 rounded-t-sm transition-all duration-500 relative group-hover:opacity-80"
                            ></div>
                            
                            {/* Tooltip */}
                            <div className="absolute -top-12 bg-slate-800 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap shadow-xl">
                                <div className="font-bold border-b border-slate-600 mb-1 pb-1">{d.date}</div>
                                <div className="text-emerald-300">Giriş: {d.in}</div>
                                <div className="text-rose-300">Çıkış: {d.out}</div>
                            </div>
                        </div>
                        <span className="text-[10px] text-slate-400 transform -rotate-45 origin-left mt-2 md:rotate-0 md:mt-0">{d.date}</span>
                    </div>
                ))}
            </div>
            <div className="mt-4 flex justify-center gap-6 text-xs font-medium">
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-400 rounded-sm"></span> Giriş İşlemleri</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-rose-400 rounded-sm"></span> Çıkış İşlemleri</div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 2. SECTION: ATIL STOK */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Archive className="text-orange-500" size={20} />
                    Atıl Stok (Dead Stock)
                    <span className="text-xs font-normal text-slate-400 ml-auto bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">Son 30 gün hareketsiz</span>
                </h3>
                
                {deadStock.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Harika! Tüm stoklarınız aktif olarak hareket görüyor.</div>
                ) : (
                    <div className="space-y-3">
                        {deadStock.map((p, idx) => (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/20">
                                <div className="flex items-center gap-3">
                                    <span className="text-orange-400 font-bold text-sm">#{idx + 1}</span>
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white text-sm">{p.product_name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{p.part_code}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-orange-600 dark:text-orange-400">{p.current_stock} {p.unit}</div>
                                    <div className="text-[10px] text-orange-400">Hareketsiz</div>
                                </div>
                            </div>
                        ))}
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex gap-2">
                             <Zap size={14} />
                             <strong>Öneri:</strong> Bu ürünler raf işgal ediyor olabilir. Kampanya veya tasfiye düşünebilirsiniz.
                        </div>
                    </div>
                )}
            </div>

            {/* 3. SECTION: ABC ANALİZİ */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Hexagon className="text-purple-500" size={20} />
                    ABC Sınıflandırması
                </h3>
                
                <div className="flex gap-2 h-4 mb-6 rounded-full overflow-hidden">
                    <div style={{width: `${(abcAnalysis.countA / products.length) * 100}%`}} className="bg-emerald-500 h-full"></div>
                    <div style={{width: `${(abcAnalysis.countB / products.length) * 100}%`}} className="bg-blue-500 h-full"></div>
                    <div style={{width: `${(abcAnalysis.countC / products.length) * 100}%`}} className="bg-slate-300 dark:bg-slate-600 h-full"></div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">A</div>
                            <div>
                                <div className="text-sm font-bold text-slate-800 dark:text-white">Yüksek Önem</div>
                                <div className="text-xs text-slate-500">Toplam hareketin %80'i</div>
                            </div>
                        </div>
                        <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{abcAnalysis.countA} Ürün</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold">B</div>
                            <div>
                                <div className="text-sm font-bold text-slate-800 dark:text-white">Orta Önem</div>
                                <div className="text-xs text-slate-500">Toplam hareketin %15'i</div>
                            </div>
                        </div>
                        <span className="font-bold text-lg text-blue-600 dark:text-blue-400">{abcAnalysis.countB} Ürün</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold">C</div>
                            <div>
                                <div className="text-sm font-bold text-slate-800 dark:text-white">Düşük Önem</div>
                                <div className="text-xs text-slate-500">Toplam hareketin %5'i</div>
                            </div>
                        </div>
                        <span className="font-bold text-lg text-slate-600 dark:text-slate-400">{abcAnalysis.countC} Ürün</span>
                    </div>
                </div>
            </div>
        </div>

        {/* 4. SECTION: REYON DOLULUK */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="md:col-span-2 lg:col-span-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <Map className="text-slate-400" size={20} />
                    Reyon Yoğunluk Haritası (Top 6)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {locationStats.map(([zone, count], idx) => (
                        <div key={zone} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            <h4 className="text-2xl font-black text-slate-800 dark:text-white mb-1">{zone}</h4>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Reyon/Bölge</span>
                            <div className="mt-2 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 py-1 rounded-lg">
                                {count} Ürün
                            </div>
                        </div>
                    ))}
                    {locationStats.length === 0 && (
                        <div className="col-span-full text-center text-slate-400 py-4">Reyon bilgisi girilmemiş.</div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default Analytics;
    