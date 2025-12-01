
import React, { useState, useEffect, useRef, Suspense, lazy, useCallback } from 'react';
import { LayoutDashboard, Package, History, Plus, Menu, X, FileSpreadsheet, AlertTriangle, Moon, Sun, Printer, ScanLine, LogOut, BarChart3, Database as DatabaseIcon, Cloud, UploadCloud, DownloadCloud, RefreshCw, CheckCircle2, Loader2, WifiOff, Info, MoreHorizontal, Settings } from 'lucide-react';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import TransactionHistory from './components/TransactionHistory';
import TransactionModal from './components/TransactionModal';
import ProductModal from './components/ProductModal';
import BulkTransactionModal from './components/BulkTransactionModal';
import NegativeStockList from './components/NegativeStockList';
import OrderManagerModal from './components/OrderManagerModal';
import BarcodeScanner from './components/BarcodeScanner';
import Login from './components/Login';
import DataBackupModal from './components/DataBackupModal';
import CloudSetupModal from './components/CloudSetupModal';
import CycleCountModal from './components/CycleCountModal'; 
import ProductDetailModal from './components/ProductDetailModal';
import { saveToSupabase, loadFromSupabase, clearDatabase } from './services/supabase';
import { INITIAL_PRODUCTS, INITIAL_TRANSACTIONS } from './constants';
import { Product, Transaction, TransactionType, ViewState, User, CloudConfig, Order } from './types';

// Lazy Load Heavy Components
const Analytics = lazy(() => import('./components/Analytics'));
const BarcodePrinterModal = lazy(() => import('./components/BarcodePrinterModal'));

// Utility to generate simple ID
const generateId = () => Math.random().toString(36).substring(2, 11);
const generateShortId = () => Math.floor(100000 + Math.random() * 900000).toString();

const APP_VERSION = "2.1.0"; // Major Update: Product Details

function App() {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('depopro_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // STATE MANAGEMENT
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('depopro_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch (e) { return INITIAL_PRODUCTS; }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('depopro_transactions');
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch (e) { return INITIAL_TRANSACTIONS; }
  });

  // ORDERS STATE
  const [orders, setOrders] = useState<Order[]>(() => {
      try {
          const saved = localStorage.getItem('depopro_orders');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });

  const [cloudConfig, setCloudConfig] = useState<CloudConfig | null>(() => {
      const saved = localStorage.getItem('depopro_cloud_config');
      return saved ? JSON.parse(saved) : null;
  });

  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>(TransactionType.IN);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [preSelectedBarcode, setPreSelectedBarcode] = useState<string>('');
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null); 
  
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkModalMode, setBulkModalMode] = useState<'TRANSACTION' | 'PRODUCT'>('TRANSACTION');

  const [isOrderManagerOpen, setIsOrderManagerOpen] = useState(false);
  const [isBarcodePrinterOpen, setIsBarcodePrinterOpen] = useState(false);
  const [isDataBackupOpen, setIsDataBackupOpen] = useState(false);
  const [isCloudSetupOpen, setIsCloudSetupOpen] = useState(false);
  const [isCycleCountOpen, setIsCycleCountOpen] = useState(false);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);

  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Menu State

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    if (currentUser) localStorage.setItem('depopro_user', JSON.stringify(currentUser));
    else localStorage.removeItem('depopro_user');
  }, [currentUser]);

  // UPDATED SAVE DATA
  const saveData = useCallback((newProducts: Product[], newTransactions: Transaction[], newOrders?: Order[], silent: boolean = false) => {
      try {
        setProducts(newProducts);
        setTransactions(newTransactions);
        if (newOrders) setOrders(newOrders);

        localStorage.setItem('depopro_products', JSON.stringify(newProducts));
        localStorage.setItem('depopro_transactions', JSON.stringify(newTransactions));
        if (newOrders) localStorage.setItem('depopro_orders', JSON.stringify(newOrders));

      } catch (err: any) {
        if (err.name === 'QuotaExceededError') alert("HATA: Tarayıcı hafızası dolu!");
        return;
      }

      if (cloudConfig?.supabaseUrl && cloudConfig?.supabaseKey) {
          performCloudSave(newProducts, newTransactions, newOrders || orders, silent);
      }
  }, [cloudConfig, orders]);

  const performCloudSave = async (prods: Product[], txs: Transaction[], ords: Order[], silent: boolean = false) => {
      if (!cloudConfig?.supabaseUrl || !cloudConfig?.supabaseKey) return;
      if (!silent) setSyncStatus('SYNCING');
      try {
          const result = await saveToSupabase(cloudConfig.supabaseUrl, cloudConfig.supabaseKey, prods, txs, ords);
          if (result.success) {
              if (!silent) {
                  setSyncStatus('SUCCESS');
                  setLastSyncTime(new Date().toLocaleTimeString());
                  setTimeout(() => setSyncStatus('IDLE'), 3000);
              }
          } else {
              if (!silent) setSyncStatus('ERROR');
          }
      } catch (e) {
          if (!silent) setSyncStatus('ERROR');
      }
  };

  // AUTO-REPAIR Logic
  useEffect(() => {
    if (products.length === 0 && !isFirstLoad.current) return;
    let needsUpdate = false;
    const existingShortIds = new Set(products.map(p => p.short_id).filter(Boolean));
    const updatedProducts = products.map(p => {
      let productChanged = false;
      const newProduct = { ...p };
      if (!newProduct.short_id) {
        let newId: string;
        do { newId = generateShortId(); } while (existingShortIds.has(newId));
        existingShortIds.add(newId);
        newProduct.short_id = newId;
        productChanged = true;
      }
      if (newProduct.barcode !== newProduct.short_id) {
        newProduct.barcode = newProduct.short_id;
        productChanged = true;
      }
      if(productChanged) needsUpdate = true;
      return newProduct;
    });

    if (needsUpdate) {
      setProducts(updatedProducts);
      localStorage.setItem('depopro_products', JSON.stringify(updatedProducts));
      if (cloudConfig?.supabaseUrl) saveData(updatedProducts, transactions, orders, true);
    }
  }, [products, transactions, orders, saveData, cloudConfig]);

  const performCloudLoad = useCallback(async (silent: boolean = false, force: boolean = false) => {
       if (!cloudConfig?.supabaseUrl || !cloudConfig?.supabaseKey) return;
       if (!silent) setSyncStatus('SYNCING');

       try {
           const result = await loadFromSupabase(cloudConfig.supabaseUrl, cloudConfig.supabaseKey);
           
           if (result.success && result.data) {
               const cloudProducts = result.data.products || [];
               const cloudTransactions = result.data.transactions || [];
               const cloudOrders = result.data.orders || [];

               const mergedProducts = cloudProducts.map(cp => {
                   const localMatch = products.find(lp => lp.id === cp.id);
                   if (localMatch && localMatch.short_id && !cp.short_id) {
                       return { ...cp, short_id: localMatch.short_id, barcode: localMatch.short_id };
                   }
                   return cp;
               });

               const isVolumeMismatch = mergedProducts.length > products.length + 5;
               if (!force && !isVolumeMismatch) {
                   if (JSON.stringify(mergedProducts) === JSON.stringify(products) && 
                       JSON.stringify(cloudTransactions) === JSON.stringify(transactions) &&
                       JSON.stringify(cloudOrders) === JSON.stringify(orders)) {
                       if (!silent) setSyncStatus('IDLE');
                       return;
                   }
               }
               
               saveData(mergedProducts, cloudTransactions, cloudOrders, true);
               
               if (!silent) setSyncStatus('SUCCESS');
               setLastSyncTime(new Date().toLocaleTimeString());
               if (!silent && !isFirstLoad.current) alert("Veriler buluttan güncellendi.");
               setTimeout(() => setSyncStatus('IDLE'), 3000);
           } else {
               setSyncStatus('ERROR');
           }
       } catch (e) {
           setSyncStatus('ERROR');
       }
  }, [cloudConfig, products, transactions, orders, saveData]);

  useEffect(() => {
      if (cloudConfig?.supabaseUrl && cloudConfig?.supabaseKey && currentUser) {
          if (isFirstLoad.current) {
              performCloudLoad(true); 
              isFirstLoad.current = false;
          }
          const intervalId = setInterval(() => performCloudLoad(true), 60000);
          return () => clearInterval(intervalId);
      }
  }, [cloudConfig, currentUser, performCloudLoad]);

  const handleLogin = (user: User) => setCurrentUser(user);
  const handleLogout = () => { setCurrentUser(null); setCurrentView('DASHBOARD'); setIsMobileMenuOpen(false); };
  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleSaveCloudConfig = (url: string, key: string) => {
      const newConfig = { supabaseUrl: url, supabaseKey: key };
      setCloudConfig(newConfig);
      localStorage.setItem('depopro_cloud_config', JSON.stringify(newConfig));
      setTimeout(() => performCloudLoad(false), 500);
  };

  const handleBackupData = () => {
    const data = {
        products,
        transactions,
        orders,
        version: "2.0",
        date: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `depopro_yedek_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreData = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target?.result as string);
            if (data.products && Array.isArray(data.products)) {
                const restoredOrders = data.orders || [];
                saveData(data.products, data.transactions || [], restoredOrders);
                alert('Yedek başarıyla yüklendi!');
                setIsDataBackupOpen(false);
            } else {
                alert('Geçersiz yedek dosyası!');
            }
        } catch (error) {
            alert('Dosya okuma hatası!');
        }
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
      if (confirm("DİKKAT: Tüm veriler (Ürünler, Hareketler, Siparişler) silinecek! Onaylıyor musunuz?")) {
          if (confirm("SON ONAY: Bu işlem geri alınamaz. Emin misiniz?")) {
              if (cloudConfig?.supabaseUrl && cloudConfig?.supabaseKey) {
                  await clearDatabase(cloudConfig.supabaseUrl, cloudConfig.supabaseKey);
              }
              localStorage.removeItem('depopro_products');
              localStorage.removeItem('depopro_transactions');
              localStorage.removeItem('depopro_orders');
              window.location.reload();
          }
      }
  };

  const handleSaveOrder = (newOrder: Order) => {
      const updatedOrders = [...orders, newOrder];
      saveData(products, transactions, updatedOrders);
  };
  const handleDeleteOrder = (id: string) => {
      const updatedOrders = orders.filter(o => o.id !== id);
      saveData(products, transactions, updatedOrders);
  };
  const handleUpdateOrderStatus = (id: string, status: 'COMPLETED') => {
      const updatedOrders = orders.map(o => o.id === id ? { ...o, status } : o);
      saveData(products, transactions, updatedOrders);
  };

  const navItems = [
    { id: 'DASHBOARD', label: 'Özet', icon: LayoutDashboard },
    { id: 'ANALYTICS', label: 'Analiz', icon: BarChart3 }, 
    { id: 'INVENTORY', label: 'Stok', icon: Package },
    { id: 'HISTORY', label: 'Geçmiş', icon: History },
  ];

  if (!currentUser) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row transition-colors duration-300">
      
      {isGlobalScannerOpen && (
          <BarcodeScanner 
            onScanSuccess={(code) => {
                setIsGlobalScannerOpen(false);
                // Check if code corresponds to a product for opening detail view
                const product = products.find(p => String(p.short_id) === code.trim() || p.barcode === code.trim() || p.part_code === code.trim());
                if (product) {
                    // Option to view details or proceed to transaction
                    if (confirm(`Ürün Bulundu: ${product.product_name}\n\nTamam: İşlem Yap\nİptal: Detay Gör`)) {
                        setEditingTransaction(null);
                        setPreSelectedBarcode(code);
                        setModalType(TransactionType.IN);
                        setIsModalOpen(true);
                    } else {
                        // Open Detail View
                        // Needs state management for detail modal
                        // For now, we can just open the modal directly if we had the prop, but let's assume we want detail modal to open
                        // Since we can't easily pass product to the new modal from here without state, 
                        // let's just open the modal and let it handle the code if passed, or just open scanner
                        // Actually, better logic: 
                        // Scan -> Modal Opens -> Modal finds product.
                        setIsProductDetailOpen(true);
                        // Ideally pass the code to pre-load, but the new modal has scanner too.
                    }
                } else {
                    alert("Ürün bulunamadı. Yeni giriş yapabilirsiniz.");
                    setEditingTransaction(null);
                    setPreSelectedBarcode(code);
                    setModalType(TransactionType.IN);
                    setIsModalOpen(true);
                }
            }}
            onClose={() => setIsGlobalScannerOpen(false)}
          />
      )}

      {/* --- MOBILE HEADER --- */}
      <div className="md:hidden fixed top-0 w-full z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                  <Package className="text-white" size={20} />
              </div>
              <div>
                  <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-none">DepoPro</h1>
                  <span className="text-[10px] text-slate-400 font-mono">v{APP_VERSION}</span>
              </div>
          </div>
          <div className="flex items-center gap-3">
              {/* Cloud Status Icon */}
              {cloudConfig?.supabaseUrl ? (
                  syncStatus === 'SYNCING' ? <RefreshCw size={18} className="animate-spin text-blue-500" /> :
                  syncStatus === 'SUCCESS' ? <Cloud size={18} className="text-green-500" /> :
                  <Cloud size={18} className="text-red-500" />
              ) : (
                  <WifiOff size={18} className="text-slate-300" />
              )}
              
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -mr-2 text-slate-600 dark:text-slate-300">
                  <Menu size={24} />
              </button>
          </div>
      </div>

      {/* --- MOBILE MENU OVERLAY --- */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm md:hidden animate-fade-in" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-800 shadow-xl p-4 flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                      <span className="font-bold text-lg dark:text-white">Ayarlar</span>
                      <button onClick={() => setIsMobileMenuOpen(false)}><X size={24} className="text-slate-400" /></button>
                  </div>
                  
                  <div className="space-y-2 flex-1">
                      <button onClick={() => { setIsCloudSetupOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium">
                          <Cloud size={20} /> Bulut Ayarları
                      </button>
                      <button onClick={() => { setIsDataBackupOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium">
                          <DatabaseIcon size={20} /> Yedekle / Geri Yükle
                      </button>
                      <button onClick={toggleDarkMode} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium">
                          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                          {isDarkMode ? 'Aydınlık Mod' : 'Karanlık Mod'}
                      </button>
                  </div>

                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold mt-4">
                      <LogOut size={20} /> Çıkış Yap
                  </button>
              </div>
          </div>
      )}

      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-screen sticky top-0 transition-colors duration-300">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                <Package className="fill-blue-600 text-white" size={28} />
                <span className="dark:text-white text-slate-800">DepoPro</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 pl-1">v{APP_VERSION} Pro</p>
        </div>

        <div className="p-4">
            <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-3 flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-lg">
                    {currentUser.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser.role === 'ADMIN' ? 'Yönetici' : 'İzleyici'}</p>
                </div>
            </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
            {navItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as ViewState)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        currentView === item.id 
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                    <item.icon size={20} />
                    {item.label}
                </button>
            ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
            {/* Sync Status Desktop */}
            {cloudConfig?.supabaseUrl && (
                <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2">
                        {syncStatus === 'SYNCING' ? <RefreshCw size={14} className="animate-spin text-blue-500" /> :
                         syncStatus === 'SUCCESS' ? <Cloud size={14} className="text-green-500" /> :
                         <Cloud size={14} className="text-red-500" />}
                        <span>{syncStatus === 'SYNCING' ? 'Eşitleniyor...' : syncStatus === 'SUCCESS' ? 'Eşitlendi' : 'Bağlantı Yok'}</span>
                    </div>
                    {/* Force Sync Button */}
                    <button onClick={() => performCloudLoad(false, true)} className="hover:text-blue-500" title="Zorla İndir"><DownloadCloud size={14}/></button>
                </div>
            )}

            <div className="grid grid-cols-4 gap-1">
                <button onClick={() => setIsCloudSetupOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex justify-center" title="Bulut Ayarları"><Cloud size={18}/></button>
                <button onClick={() => setIsDataBackupOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex justify-center" title="Yedekle"><DatabaseIcon size={18}/></button>
                <button onClick={toggleDarkMode} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex justify-center" title="Tema">{isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
                <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex justify-center" title="Çıkış"><LogOut size={18}/></button>
            </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-auto min-h-screen pt-20 pb-24 md:pt-8 md:pb-8">
        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin"/></div>}>
            <div className="max-w-5xl mx-auto">
                {/* View Switcher */}
                {currentView === 'DASHBOARD' && (
                    <Dashboard 
                        products={products} 
                        transactions={transactions} 
                        onQuickAction={(type) => { setModalType(type); setIsModalOpen(true); }}
                        onProductClick={() => setCurrentView('INVENTORY')}
                        onBulkAction={() => { setBulkModalMode('TRANSACTION'); setIsBulkModalOpen(true); }}
                        onViewNegativeStock={() => setCurrentView('NEGATIVE_STOCK')}
                        onOrderManager={() => setIsOrderManagerOpen(true)}
                        onScan={() => setIsGlobalScannerOpen(true)}
                        onCycleCount={() => setIsCycleCountOpen(true)}
                        onReportSent={(ids) => {
                            const now = new Date().toISOString();
                            const updated = products.map(p => ids.includes(p.id) ? { ...p, last_alert_sent_at: now } : p);
                            saveData(updated, transactions, orders);
                        }}
                        onOpenProductDetail={() => setIsProductDetailOpen(true)}
                        currentUser={currentUser}
                        isCloudEnabled={!!cloudConfig?.supabaseUrl}
                        onOpenCloudSetup={() => setIsCloudSetupOpen(true)}
                    />
                )}
                {/* ... Other Views ... */}
                {currentView === 'ANALYTICS' && <Analytics products={products} transactions={transactions} />}
                {currentView === 'INVENTORY' && (
                    <InventoryList 
                        products={products} 
                        onDelete={(id) => {
                            const updated = products.filter(p => p.id !== id);
                            const updatedTx = transactions.filter(t => t.product_id !== id);
                            saveData(updated, updatedTx, orders);
                        }}
                        onEdit={(p) => { setEditingProduct(p); setIsProductModalOpen(true); }}
                        onAddProduct={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
                        onBulkAdd={() => { setBulkModalMode('PRODUCT'); setIsBulkModalOpen(true); }}
                        onPrintBarcodes={() => setIsBarcodePrinterOpen(true)}
                        currentUser={currentUser}
                    />
                )}
                {currentView === 'HISTORY' && (
                    <TransactionHistory 
                        transactions={transactions} 
                        onEdit={(t) => { setEditingTransaction(t); setIsModalOpen(true); }}
                        onDelete={(id) => {
                             const tx = transactions.find(t => t.id === id);
                             if(tx) {
                                const upProds = products.map(p => p.id === tx.product_id ? {...p, current_stock: p.current_stock - (tx.type === 'IN' ? tx.quantity : -tx.quantity)} : p);
                                const upTx = transactions.filter(t => t.id !== id);
                                saveData(upProds, upTx, orders);
                             }
                        }}
                        currentUser={currentUser}
                    />
                )}
                {currentView === 'NEGATIVE_STOCK' && (
                    <NegativeStockList products={products} onBack={() => setCurrentView('DASHBOARD')} />
                )}
            </div>
        </Suspense>
      </main>

      {/* --- MOBILE BOTTOM NAV --- */}
      <div className="md:hidden fixed bottom-0 w-full bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-around items-center py-2 px-2 z-30 pb-safe">
          {navItems.map(item => (
              <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as ViewState)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${currentView === item.id ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-700' : 'text-slate-400 dark:text-slate-500'}`}
              >
                  <item.icon size={20} />
                  <span className="text-[10px] font-medium">{item.label}</span>
              </button>
          ))}
          {/* Floating Scan Button in Bottom Nav */}
          <button 
            onClick={() => setIsGlobalScannerOpen(true)}
            className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white p-3 rounded-full shadow-lg shadow-blue-300 dark:shadow-blue-900 border-4 border-slate-50 dark:border-slate-900 active:scale-95 transition-transform"
          >
              <ScanLine size={24} />
          </button>
      </div>

      {/* Modals */}
      {currentUser.role === 'ADMIN' && (
        <>
            <TransactionModal 
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }}
                onSubmit={(data) => {
                    const prod = products.find(p => p.id === data.productId);
                    if(prod) {
                        const change = data.type === 'IN' ? data.quantity : -data.quantity;
                        const newStock = prod.current_stock + change;
                        const upProds = products.map(p => p.id === data.productId ? {...p, current_stock: newStock} : p);
                        const newTx = {
                            id: data.id || `t-${generateId()}`,
                            product_id: data.productId,
                            product_name: prod.product_name,
                            type: data.type,
                            quantity: data.quantity,
                            date: new Date().toISOString(),
                            description: data.description,
                            created_by: currentUser.name,
                            previous_stock: prod.current_stock,
                            new_stock: newStock
                        };
                        const upTx = data.id ? transactions.map(t => t.id === data.id ? newTx : t) : [newTx, ...transactions];
                        saveData(upProds, upTx, orders);
                        setIsModalOpen(false);
                    }
                }}
                initialType={modalType}
                products={products}
                transactionToEdit={editingTransaction}
                defaultBarcode={preSelectedBarcode}
            />

            <OrderManagerModal 
                isOpen={isOrderManagerOpen}
                onClose={() => setIsOrderManagerOpen(false)}
                products={products}
                orders={orders}
                onSaveOrder={handleSaveOrder}
                onDeleteOrder={handleDeleteOrder}
                onUpdateOrderStatus={handleUpdateOrderStatus}
            />

            <CycleCountModal
                isOpen={isCycleCountOpen}
                onClose={() => setIsCycleCountOpen(false)}
                products={products}
                onSubmitCount={(pid, qty) => {
                    const product = products.find(p => p.id === pid);
                    if (!product) return;
                    const diff = qty - product.current_stock;
                    const now = new Date().toISOString();
                    const updatedProducts = products.map(p => p.id === pid ? { ...p, current_stock: qty, last_counted_at: now } : p);
                    let updatedTransactions = [...transactions];
                    if (diff !== 0) {
                        updatedTransactions = [{
                            id: `t-${generateId()}`,
                            product_id: pid,
                            product_name: product.product_name,
                            type: TransactionType.CORRECTION,
                            quantity: Math.abs(diff),
                            date: now,
                            description: `SAYIM FARKI: Sistem ${product.current_stock}, Sayılan ${qty}`,
                            created_by: currentUser?.name || 'Sistem',
                            previous_stock: product.current_stock,
                            new_stock: qty
                        }, ...transactions];
                    }
                    saveData(updatedProducts, updatedTransactions, orders);
                }}
            />
            
            <ProductModal
                isOpen={isProductModalOpen}
                onClose={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
                onSubmit={(data) => {
                    if (editingProduct) {
                        const updated = products.map(p => p.id === editingProduct.id ? { ...p, ...data } : p);
                        saveData(updated, transactions, orders);
                    } else {
                        const newId = `p-${generateId()}`;
                        let shortId: string;
                        do { shortId = generateShortId(); } while (products.some(p => p.short_id === shortId));
                        
                        const newProduct = { ...data, id: newId, short_id: shortId, barcode: shortId, created_at: new Date().toISOString() };
                        saveData([...products, newProduct], transactions, orders);
                    }
                }}
                onDelete={(id) => {
                    const updated = products.filter(p => p.id !== id);
                    saveData(updated, transactions, orders);
                    setIsProductModalOpen(false);
                }}
                productToEdit={editingProduct}
            />

            <BulkTransactionModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                initialMode={bulkModalMode}
                products={products}
                onProcessTransactions={(newTxs) => {
                    let currentProducts = [...products];
                    let currentTxs = [...transactions];
                    
                    newTxs.forEach(txItem => {
                        const prod = currentProducts.find(p => p.id === txItem.productId);
                        if(prod) {
                            const change = txItem.type === TransactionType.IN ? txItem.quantity : -txItem.quantity;
                            const newStock = prod.current_stock + change;
                            currentProducts = currentProducts.map(p => p.id === txItem.productId ? {...p, current_stock: newStock} : p);
                            currentTxs = [{
                                id: `t-${generateId()}-${Math.random().toString(36).substr(2,5)}`,
                                product_id: txItem.productId,
                                product_name: prod.product_name,
                                type: txItem.type,
                                quantity: txItem.quantity,
                                date: new Date().toISOString(),
                                description: txItem.description,
                                created_by: currentUser.name,
                                previous_stock: prod.current_stock,
                                new_stock: newStock
                            }, ...currentTxs];
                        }
                    });
                    saveData(currentProducts, currentTxs, orders);
                }}
                onProcessProducts={(newProds) => {
                    const processedProds = newProds.map(p => {
                        let shortId: string;
                        do { shortId = generateShortId(); } while (products.some(prod => prod.short_id === shortId));
                        return { 
                            ...p, 
                            id: `p-${generateId()}-${Math.random().toString(36).substr(2,5)}`, 
                            short_id: shortId, 
                            barcode: shortId,
                            created_at: new Date().toISOString() 
                        };
                    });
                    saveData([...products, ...processedProds], transactions, orders);
                }}
            />

             <CloudSetupModal 
                isOpen={isCloudSetupOpen}
                onClose={() => setIsCloudSetupOpen(false)}
                onSave={handleSaveCloudConfig}
                currentConfig={cloudConfig}
            />

            <DataBackupModal
                isOpen={isDataBackupOpen}
                onClose={() => setIsDataBackupOpen(false)}
                onBackup={handleBackupData}
                onRestore={handleRestoreData}
            />

            <ProductDetailModal
                isOpen={isProductDetailOpen}
                onClose={() => setIsProductDetailOpen(false)}
                products={products}
                transactions={transactions}
            />

            <Suspense>
                {isBarcodePrinterOpen && (
                    <BarcodePrinterModal 
                        isOpen={isBarcodePrinterOpen} 
                        onClose={() => setIsBarcodePrinterOpen(false)} 
                        products={products} 
                    />
                )}
            </Suspense>
        </>
      )}
    </div>
  );
}

export default App;
