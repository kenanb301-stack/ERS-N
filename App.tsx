
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Package, History, Plus, Menu, X, FileSpreadsheet, AlertTriangle, Moon, Sun, Printer, ScanLine, LogOut, BarChart3, Database as DatabaseIcon, Cloud, UploadCloud, DownloadCloud, RefreshCw, CheckCircle2, Loader2, WifiOff, Info } from 'lucide-react';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import TransactionHistory from './components/TransactionHistory';
import TransactionModal from './components/TransactionModal';
import ProductModal from './components/ProductModal';
import BulkTransactionModal from './components/BulkTransactionModal';
import NegativeStockList from './components/NegativeStockList';
import OrderSimulatorModal from './components/OrderSimulatorModal';
import BarcodePrinterModal from './components/BarcodePrinterModal';
import BarcodeScanner from './components/BarcodeScanner';
import Analytics from './components/Analytics';
import Login from './components/Login';
import DataBackupModal from './components/DataBackupModal';
import CloudSetupModal from './components/CloudSetupModal';
import { saveToCloud, loadFromCloud } from './services/googleSheets';
import { INITIAL_PRODUCTS, INITIAL_TRANSACTIONS } from './constants';
import { Product, Transaction, TransactionType, ViewState, User, CloudConfig } from './types';

// Utility to generate simple ID
const generateId = () => Math.random().toString(36).substring(2, 11);

const APP_VERSION = "1.1.0";

function App() {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('depopro_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // State Management with LocalStorage persistence
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('depopro_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch (e) {
      console.error("Failed to load products from storage", e);
      return INITIAL_PRODUCTS;
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('depopro_transactions');
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch (e) {
      console.error("Failed to load transactions from storage", e);
      return INITIAL_TRANSACTIONS;
    }
  });

  const [cloudConfig, setCloudConfig] = useState<CloudConfig | null>(() => {
      const saved = localStorage.getItem('depopro_cloud_config');
      return saved ? JSON.parse(saved) : null;
  });

  // SYNC STATES
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>(TransactionType.IN);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [preSelectedBarcode, setPreSelectedBarcode] = useState<string>(''); // For global scan
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null); 
  
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkModalMode, setBulkModalMode] = useState<'TRANSACTION' | 'PRODUCT'>('TRANSACTION');

  const [isOrderSimModalOpen, setIsOrderSimModalOpen] = useState(false);
  const [isBarcodePrinterOpen, setIsBarcodePrinterOpen] = useState(false);
  const [isDataBackupOpen, setIsDataBackupOpen] = useState(false);
  const [isCloudSetupOpen, setIsCloudSetupOpen] = useState(false);

  // Global Scanner State
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState(false);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    // Default to true (Dark Mode) if no preference is saved
    return saved ? JSON.parse(saved) : true;
  });

  // --- APP EFFECTS ---

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Auth Effect
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('depopro_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('depopro_user');
    }
  }, [currentUser]);

  // --- AUTOMATIC CLOUD SYNC EFFECTS ---
  
  // 1. Initial Load & Periodic Polling
  useEffect(() => {
      if (cloudConfig?.scriptUrl && currentUser) {
          // App açılışında otomatik çek
          performCloudLoad(true);

          // Her 60 saniyede bir arka planda kontrol et
          const intervalId = setInterval(() => {
              performCloudLoad(true);
          }, 60000);

          return () => clearInterval(intervalId);
      }
  }, [cloudConfig?.scriptUrl, currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('DASHBOARD');
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Check for negative stock
  const hasNegativeStock = products.some(p => p.current_stock < 0);

  // --- CLOUD OPERATIONS ---

  const handleSaveCloudConfig = (url: string) => {
      const newConfig = { scriptUrl: url };
      setCloudConfig(newConfig);
      localStorage.setItem('depopro_cloud_config', JSON.stringify(newConfig));
      // Config kaydedilince hemen bir çekme işlemi yap
      setTimeout(() => performCloudLoad(false), 500);
  };

  // Centralized Save Function (Write to Local + Trigger Cloud)
  const saveData = (newProducts: Product[], newTransactions: Transaction[]) => {
      const now = new Date().toISOString();
      localStorage.setItem('depopro_last_updated', now); // Update local timestamp immediately

      try {
        // 1. Update React State (Instant UI update)
        setProducts(newProducts);
        setTransactions(newTransactions);

        // 2. Update LocalStorage (Backup)
        localStorage.setItem('depopro_products', JSON.stringify(newProducts));
        localStorage.setItem('depopro_transactions', JSON.stringify(newTransactions));
      } catch (err) {
        console.error("LocalStorage Save Error:", err);
        alert("HATA: Veriler tarayıcı hafızasına yazılamadı. Cihaz hafızası dolmuş olabilir. Lütfen bazı gereksiz uygulamaları kapatın veya temizleyin.");
        return;
      }

      // 3. Trigger Auto Cloud Sync (Fire and forget)
      if (cloudConfig?.scriptUrl) {
          performCloudSave(newProducts, newTransactions, now);
      }
  };

  const performCloudSave = async (currentProducts: Product[], currentTransactions: Transaction[], timestamp: string) => {
      if (!cloudConfig?.scriptUrl) return;

      setSyncStatus('SYNCING');
      try {
          const result = await saveToCloud(cloudConfig.scriptUrl, {
              products: currentProducts,
              transactions: currentTransactions,
              lastUpdated: timestamp
          });

          if (result.success) {
              setSyncStatus('SUCCESS');
              setLastSyncTime(new Date().toLocaleTimeString());
              // 3 saniye sonra success durumunu idle'a çek
              setTimeout(() => setSyncStatus('IDLE'), 3000);
          } else {
              setSyncStatus('ERROR');
          }
      } catch (e) {
          setSyncStatus('ERROR');
          console.error(e);
      }
  };

  const performCloudLoad = async (silent: boolean = false) => {
       if (!cloudConfig?.scriptUrl) return;

       if (!silent) setSyncStatus('SYNCING');

       try {
           const result = await loadFromCloud(cloudConfig.scriptUrl);
           
           if (result.success && result.data) {
               // TIMESTAMP CHECK
               const localLastUpdate = localStorage.getItem('depopro_last_updated');
               const cloudLastUpdate = result.data.lastUpdated;

               // If local data exists and is NEWER than cloud data, DO NOT OVERWRITE
               if (localLastUpdate && cloudLastUpdate && new Date(localLastUpdate) > new Date(cloudLastUpdate)) {
                   console.log("Local data is newer than cloud data. Skipping overwrite to prevent data loss.");
                   if (!silent) setSyncStatus('SUCCESS'); // It's technically success, we just chose not to sync
                   return;
               }

               // Gelen veriyi local state ile güncelle
               setProducts(result.data.products);
               setTransactions(result.data.transactions);
               
               // LocalStorage'ı da güncelle
               localStorage.setItem('depopro_products', JSON.stringify(result.data.products));
               localStorage.setItem('depopro_transactions', JSON.stringify(result.data.transactions));
               // Sync local timestamp to match cloud
               if (cloudLastUpdate) {
                   localStorage.setItem('depopro_last_updated', cloudLastUpdate);
               }
               
               setSyncStatus('SUCCESS');
               setLastSyncTime(new Date().toLocaleTimeString());
               if (!silent) alert("Veriler güncellendi.");
               setTimeout(() => setSyncStatus('IDLE'), 3000);
           } else {
               if (!silent) alert(result.message);
               setSyncStatus('ERROR');
           }
       } catch (e) {
           console.error(e);
           setSyncStatus('ERROR');
       }
  };

  // --- DATA SYNC LOGIC (FILE BACKUP) ---
  const handleBackupData = () => {
    const data = {
        products,
        transactions,
        exportedAt: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `depopro_yedek_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestoreData = async (file: File) => {
      return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const json = JSON.parse(e.target?.result as string);
                  if (json.products && Array.isArray(json.products) && json.transactions && Array.isArray(json.transactions)) {
                      saveData(json.products, json.transactions); // Use centralized save
                      resolve();
                  } else {
                      reject(new Error("Geçersiz yedek dosyası formatı"));
                  }
              } catch (err) {
                  reject(err);
              }
          };
          reader.onerror = () => reject(new Error("Dosya okunamadı"));
          reader.readAsText(file);
      });
  };
  // ----------------------

  // 1. Transaction Logic (Create or Edit)
  const handleTransactionSubmit = (data: { id?: string; productId: string; quantity: number; description: string; type: TransactionType }) => {
    if (currentUser?.role !== 'ADMIN') return; // Security check

    const newProductTarget = products.find(p => p.id === data.productId);
    if (!newProductTarget) return;

    let updatedProducts = [...products];
    let updatedTransactions = [...transactions];

    if (data.id) {
        // EDIT EXISTING TRANSACTION
        const oldTransaction = transactions.find(t => t.id === data.id);
        if (!oldTransaction) return;

        const oldProductId = oldTransaction.product_id;
        const newProductId = data.productId;

        updatedProducts = updatedProducts.map(p => {
            let stock = p.current_stock;
            
            // Revert & Apply Logic
            if (p.id === oldProductId) {
                stock = oldTransaction.type === TransactionType.IN 
                    ? stock - oldTransaction.quantity 
                    : stock + oldTransaction.quantity;
            }
            
            if (p.id === newProductId) {
                 stock = data.type === TransactionType.IN 
                    ? stock + data.quantity 
                    : stock - data.quantity;
            }

            // CRITICAL STOCK DATE LOGIC
            let criticalSince = p.critical_since;
            let lastAlert = p.last_alert_sent_at;
            
            if (stock <= p.min_stock_level) {
                if (!criticalSince) {
                    criticalSince = new Date().toISOString();
                    lastAlert = undefined;
                }
            } else {
                criticalSince = undefined;
                lastAlert = undefined;
            }

            return { 
                ...p, 
                current_stock: stock,
                critical_since: criticalSince,
                last_alert_sent_at: lastAlert
            };
        });

        // Update Transaction Record
        updatedTransactions = updatedTransactions.map(t => {
            if (t.id === data.id) {
                let prevStockSnapshot = t.previous_stock;
                if (oldProductId !== newProductId) prevStockSnapshot = newProductTarget.current_stock;
                
                const change = data.type === TransactionType.IN ? data.quantity : -data.quantity;
                const newStockSnapshot = prevStockSnapshot !== undefined ? prevStockSnapshot + change : undefined;

                return {
                    ...t,
                    product_id: newProductId,
                    product_name: newProductTarget.product_name,
                    type: data.type,
                    quantity: data.quantity,
                    description: data.description,
                    previous_stock: prevStockSnapshot,
                    new_stock: newStockSnapshot
                };
            }
            return t;
        });

    } else {
        // CREATE NEW TRANSACTION
        const currentStock = newProductTarget.current_stock;
        const change = data.type === TransactionType.IN ? data.quantity : -data.quantity;
        const newStockVal = currentStock + change;

        updatedProducts = updatedProducts.map(p => {
            if (p.id === data.productId) {
                let criticalSince = p.critical_since;
                let lastAlert = p.last_alert_sent_at;

                if (newStockVal <= p.min_stock_level) {
                    if (!criticalSince || p.current_stock > p.min_stock_level) {
                        criticalSince = new Date().toISOString();
                        lastAlert = undefined;
                    }
                } else {
                    criticalSince = undefined;
                    lastAlert = undefined;
                }

                return { 
                    ...p, 
                    current_stock: newStockVal,
                    critical_since: criticalSince,
                    last_alert_sent_at: lastAlert
                };
            }
            return p;
        });

        const newTransaction: Transaction = {
            id: `t-${generateId()}`,
            product_id: data.productId,
            product_name: newProductTarget.product_name,
            type: data.type,
            quantity: data.quantity,
            date: new Date().toISOString(),
            description: data.description,
            created_by: currentUser.name,
            previous_stock: currentStock,
            new_stock: newStockVal
        };

        updatedTransactions = [newTransaction, ...updatedTransactions];
    }

    // Save ALL
    saveData(updatedProducts, updatedTransactions);

    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (id: string, onSuccess?: () => void) => {
      if (currentUser?.role !== 'ADMIN') return;

      const transactionToDelete = transactions.find(t => t.id === id);

      if (transactionToDelete) {
          const updatedProducts = products.map(product => {
              if (product.id === transactionToDelete.product_id) {
                  let newStock = product.current_stock;
                  const qty = Number(transactionToDelete.quantity);

                  if (isNaN(qty)) return product;

                  if (transactionToDelete.type === TransactionType.IN) {
                      newStock -= qty;
                  } else {
                      newStock += qty;
                  }
                  
                  let criticalSince = product.critical_since;
                  let lastAlert = product.last_alert_sent_at;
                  
                  if (newStock <= product.min_stock_level) {
                       if (!criticalSince) criticalSince = new Date().toISOString();
                  } else {
                       criticalSince = undefined;
                       lastAlert = undefined;
                  }

                  return { 
                      ...product, 
                      current_stock: newStock,
                      critical_since: criticalSince,
                      last_alert_sent_at: lastAlert
                  };
              }
              return product;
          });
          
          const updatedTransactions = transactions.filter(t => t.id !== id);
          
          // Save ALL
          saveData(updatedProducts, updatedTransactions);
      }
      
      if (onSuccess) {
          onSuccess();
      }
  };

  const handleEditTransactionClick = (transaction: Transaction) => {
      setEditingTransaction(transaction);
      setModalType(transaction.type);
      setPreSelectedBarcode('');
      setIsModalOpen(true);
  }

  // 2. Product Create & Edit Logic
  const handleSaveProduct = (data: any) => {
    if (currentUser?.role !== 'ADMIN') return;
    
    let updatedProducts = [...products];

    if (editingProduct) {
        // Edit Existing
        const { current_stock, ...updateData } = data;
        
        updatedProducts = updatedProducts.map(p => 
            p.id === editingProduct.id ? { ...p, ...updateData } : p
        );
    } else {
        // Create New
        const newProduct: Product = {
            id: `p-${generateId()}`,
            ...data,
            created_at: new Date().toISOString(),
            critical_since: data.current_stock <= data.min_stock_level ? new Date().toISOString() : undefined
        };
        updatedProducts = [...updatedProducts, newProduct];
    }
    
    // Save ALL (Transactions don't change, but need to pass them)
    saveData(updatedProducts, transactions);
    
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleEditProductClick = (product: Product) => {
      setEditingProduct(product);
      setIsProductModalOpen(true);
  };

  const handleAddProductClick = () => {
      setEditingProduct(null);
      setIsProductModalOpen(true);
  };

  // 3. Bulk Operations Logic
  const handleBulkTransactionProcess = (newTransactionsData: any[]) => {
    if (currentUser?.role !== 'ADMIN') return;

    const newTxIds: Transaction[] = [];
    let updatedProducts = [...products];

    newTransactionsData.forEach(item => {
        const txId = `t-${generateId()}`;
        const product = updatedProducts.find(p => p.id === item.productId);
        if(!product) return;

        const previousStock = product.current_stock;
        const change = item.type === TransactionType.IN ? item.quantity : -item.quantity;
        const newStock = previousStock + change;

        newTxIds.push({
            id: txId,
            product_id: item.productId,
            product_name: product.product_name,
            type: item.type,
            quantity: item.quantity,
            date: new Date().toISOString(),
            description: item.description || 'Toplu Excel İşlemi',
            created_by: `${currentUser.name} (Excel)`,
            previous_stock: previousStock,
            new_stock: newStock
        });

        // Update product in temp array
        updatedProducts = updatedProducts.map(p => {
            if(p.id === item.productId) {
                let criticalSince = p.critical_since;
                let lastAlert = p.last_alert_sent_at;

                if (newStock <= p.min_stock_level) {
                    if (!criticalSince || p.current_stock > p.min_stock_level) {
                        criticalSince = new Date().toISOString();
                        lastAlert = undefined;
                    }
                } else {
                    criticalSince = undefined;
                    lastAlert = undefined;
                }

                return { 
                    ...p, 
                    current_stock: newStock,
                    critical_since: criticalSince,
                    last_alert_sent_at: lastAlert
                };
            }
            return p;
        });
    });

    const updatedTransactions = [...newTxIds, ...transactions];
    saveData(updatedProducts, updatedTransactions);

    setIsBulkModalOpen(false);
    alert(`${newTransactionsData.length} adet işlem başarıyla kaydedildi.`);
  };

  const handleBulkProductProcess = (newProductsData: any[]) => {
      if (currentUser?.role !== 'ADMIN') return;

      const newProducts: Product[] = newProductsData.map(p => ({
          id: `p-${generateId()}`,
          ...p,
          created_at: new Date().toISOString(),
          critical_since: p.current_stock <= p.min_stock_level ? new Date().toISOString() : undefined
      }));

      const updatedProducts = [...products, ...newProducts];
      saveData(updatedProducts, transactions);

      setIsBulkModalOpen(false);
      alert(`${newProducts.length} adet yeni ürün başarıyla eklendi.`);
  };

  const handleDeleteProduct = (id: string, onSuccess?: () => void) => {
    if (currentUser?.role !== 'ADMIN') return;
    
    const updatedProducts = products.filter(p => p.id !== id);
    const updatedTransactions = transactions.filter(t => t.product_id !== id);
    
    saveData(updatedProducts, updatedTransactions);

    if (onSuccess) onSuccess();
  }

  // YENİ: Raporlanan ürünlerin işaretlenmesi
  const handleReportSent = (productIds: string[]) => {
      const now = new Date().toISOString();
      const updatedProducts = products.map(p => {
          if (productIds.includes(p.id)) {
              return { ...p, last_alert_sent_at: now };
          }
          return p;
      });
      saveData(updatedProducts, transactions);
  };

  const openQuickAction = (type: TransactionType) => {
    setEditingTransaction(null);
    setPreSelectedBarcode('');
    setModalType(type);
    setIsModalOpen(true);
  };

  const openBulkModal = (mode: 'TRANSACTION' | 'PRODUCT') => {
      setBulkModalMode(mode);
      setIsBulkModalOpen(true);
  };

  // Global Scan Handler
  const handleGlobalScanClick = () => {
      setIsGlobalScannerOpen(true);
  };

  const handleGlobalScanSuccess = (decodedText: string) => {
      setIsGlobalScannerOpen(false);
      setEditingTransaction(null);
      setPreSelectedBarcode(decodedText);
      setModalType(TransactionType.IN);
      setIsModalOpen(true);
  };

  const navItems = [
    { id: 'DASHBOARD', label: 'Özet', icon: LayoutDashboard },
    { id: 'ANALYTICS', label: 'Analiz', icon: BarChart3 }, 
    { id: 'INVENTORY', label: 'Stok', icon: Package },
    { id: 'HISTORY', label: 'Geçmiş', icon: History },
  ];

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row transition-colors duration-300">
      
      {/* GLOBAL SCANNER OVERLAY */}
      {isGlobalScannerOpen && (
          <BarcodeScanner 
            onScanSuccess={handleGlobalScanSuccess}
            onClose={() => setIsGlobalScannerOpen(false)}
          />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-screen sticky top-0 transition-colors duration-300">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                <Package className="fill-blue-600 text-white" size={28} />
                <span className="dark:text-white text-slate-800">DepoPro</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 pl-1">v{APP_VERSION}</p>
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
            
            {hasNegativeStock && (
                 <button
                    onClick={() => setCurrentView('NEGATIVE_STOCK')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mt-4 ${
                        currentView === 'NEGATIVE_STOCK' 
                        ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 shadow-sm' 
                        : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
                    }`}
                >
                    <AlertTriangle size={20} />
                    Eksi Bakiye
                </button>
            )}
        </nav>
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
             {currentUser.role === 'ADMIN' && (
                 <>
                    {/* Cloud Status */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center gap-2">
                            {syncStatus === 'SYNCING' && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                            {syncStatus === 'SUCCESS' && <CheckCircle2 size={16} className="text-green-500" />}
                            {syncStatus === 'ERROR' && <WifiOff size={16} className="text-red-500" />}
                            {syncStatus === 'IDLE' && <Cloud size={16} className={cloudConfig?.scriptUrl ? "text-blue-500" : "text-slate-400"} />}
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                {syncStatus === 'SYNCING' ? 'Eşitleniyor...' : 
                                 syncStatus === 'SUCCESS' ? 'Eşitlendi' :
                                 syncStatus === 'ERROR' ? 'Hata' : 
                                 cloudConfig?.scriptUrl ? 'Otomatik' : 'Yerel Mod'}
                            </span>
                        </div>
                        <button 
                            onClick={() => performCloudLoad(false)}
                            disabled={syncStatus === 'SYNCING' || !cloudConfig?.scriptUrl}
                            title="Zorla Eşitle"
                        >
                            <RefreshCw size={14} className={`text-slate-400 hover:text-blue-500 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <button 
                        onClick={() => setIsCloudSetupOpen(true)}
                        className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-medium border ${!cloudConfig?.scriptUrl ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' : 'text-slate-500 hover:bg-slate-100 border-transparent'}`}
                    >
                        <Cloud size={14} /> 
                        {!cloudConfig?.scriptUrl ? 'Bulut Kurulumu Yap' : 'Drive Ayarları'}
                    </button>
                 </>
             )}

             {currentUser.role === 'ADMIN' && (
                 <>
                    <button 
                        onClick={() => setIsDataBackupOpen(true)}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    >
                        <DatabaseIcon size={18} className="text-slate-500" />
                        Yerel Yedek
                    </button>
                 </>
             )}

             <button 
                onClick={toggleDarkMode}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
             >
                <div className="flex items-center gap-2">
                    {isDarkMode ? <Moon size={18} className="text-purple-400" /> : <Sun size={18} className="text-amber-500" />}
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {isDarkMode ? 'Karanlık' : 'Aydınlık'}
                    </span>
                </div>
             </button>

            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{currentUser.name}</p>
                  <button onClick={handleLogout} className="text-red-500 hover:text-red-700" title="Çıkış Yap">
                    <LogOut size={16} />
                  </button>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 inline-block mt-1">
                  {currentUser.role === 'ADMIN' ? 'Yönetici' : 'İzleyici'}
                </span>
            </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 sticky top-0 z-30 flex justify-between items-center transition-colors duration-300">
         <div>
            <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
                <Package className="fill-blue-600 text-white" size={24} />
                <span className="dark:text-white text-slate-800">DepoPro</span>
            </h1>
            <p className="text-[10px] text-slate-400 pl-1">v{APP_VERSION}</p>
         </div>
        <div className="flex items-center gap-3">
             {currentUser.role === 'ADMIN' && (
                 <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-1" onClick={() => !cloudConfig?.scriptUrl && setIsCloudSetupOpen(true)}>
                    {syncStatus === 'SYNCING' ? <Loader2 size={14} className="animate-spin text-blue-500" /> : 
                     syncStatus === 'SUCCESS' ? <CheckCircle2 size={14} className="text-green-500" /> :
                     syncStatus === 'ERROR' ? <WifiOff size={14} className="text-red-500" /> :
                     cloudConfig?.scriptUrl ? <Cloud size={14} className="text-blue-500" /> : <Cloud size={14} className="text-slate-300" />
                    }
                 </div>
             )}
            <button onClick={handleLogout} className="p-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <LogOut size={20} />
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-auto min-h-[calc(100vh-140px)] md:h-screen pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {currentView === 'DASHBOARD' && 'Genel Bakış'}
                    {currentView === 'ANALYTICS' && 'Analiz Raporları'}
                    {currentView === 'INVENTORY' && 'Stok Listesi'}
                    {currentView === 'HISTORY' && 'Hareket Geçmişi'}
                    {currentView === 'NEGATIVE_STOCK' && 'Dikkat Gerektiren Ürünler'}
                </h2>
                
                {currentUser.role === 'ADMIN' && (
                    <div className="flex gap-2">
                        {/* Mobile Only Extra Sync Buttons */}
                        <div className="md:hidden flex gap-2">
                            {cloudConfig?.scriptUrl ? (
                                <button 
                                    onClick={() => performCloudLoad(false)}
                                    className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1"
                                >
                                    <RefreshCw size={16} /> Güncelle
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setIsCloudSetupOpen(true)}
                                    className="bg-amber-100 text-amber-700 border border-amber-200 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 animate-pulse"
                                >
                                    <Cloud size={18} /> Bağla
                                </button>
                            )}
                        </div>

                        {currentView === 'INVENTORY' && (
                            <>
                                <button 
                                    onClick={() => openBulkModal('PRODUCT')}
                                    className="hidden sm:flex bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium items-center gap-2 transition-colors shadow-lg shadow-green-200 dark:shadow-none"
                                >
                                    <FileSpreadsheet size={18} /> <span className="hidden sm:inline">Excel Yükle</span>
                                </button>
                                <button 
                                    onClick={handleAddProductClick}
                                    className="hidden sm:flex bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium items-center gap-2 transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
                                >
                                    <Plus size={18} /> <span className="hidden sm:inline">Ürün Ekle</span>
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {currentView === 'DASHBOARD' && (
                <Dashboard 
                    products={products} 
                    transactions={transactions} 
                    onQuickAction={openQuickAction}
                    onProductClick={(p) => setCurrentView('INVENTORY')}
                    onBulkAction={() => openBulkModal('TRANSACTION')}
                    onViewNegativeStock={() => setCurrentView('NEGATIVE_STOCK')}
                    onOrderSimulation={() => setIsOrderSimModalOpen(true)}
                    onScan={handleGlobalScanClick}
                    onReportSent={handleReportSent}
                    currentUser={currentUser}
                    isCloudEnabled={!!cloudConfig?.scriptUrl}
                    onOpenCloudSetup={() => setIsCloudSetupOpen(true)}
                />
            )}
            {currentView === 'ANALYTICS' && (
                <Analytics 
                    products={products}
                    transactions={transactions}
                />
            )}
            {currentView === 'INVENTORY' && (
                <InventoryList 
                    products={products} 
                    onDelete={handleDeleteProduct}
                    onEdit={handleEditProductClick} 
                    onAddProduct={handleAddProductClick}
                    onBulkAdd={() => openBulkModal('PRODUCT')}
                    onPrintBarcodes={() => setIsBarcodePrinterOpen(true)}
                    currentUser={currentUser}
                />
            )}
            {currentView === 'HISTORY' && (
                <TransactionHistory 
                    transactions={transactions} 
                    onEdit={handleEditTransactionClick}
                    onDelete={(id) => handleDeleteTransaction(id)}
                    currentUser={currentUser}
                />
            )}
            {currentView === 'NEGATIVE_STOCK' && (
                <NegativeStockList 
                    products={products}
                    onBack={() => setCurrentView('DASHBOARD')}
                />
            )}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-40 pb-safe">
        <div className="flex justify-around items-center h-16 px-2 relative">
            <button 
                onClick={() => setCurrentView('DASHBOARD')}
                className={`flex flex-col items-center justify-center w-14 space-y-1 ${currentView === 'DASHBOARD' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}
            >
                <LayoutDashboard size={20} className={currentView === 'DASHBOARD' ? 'fill-current' : ''} />
                <span className="text-[9px] font-medium">Özet</span>
            </button>

            <button 
                onClick={() => setCurrentView('INVENTORY')}
                className={`flex flex-col items-center justify-center w-14 space-y-1 ${currentView === 'INVENTORY' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}
            >
                <Package size={20} className={currentView === 'INVENTORY' ? 'fill-current' : ''} />
                <span className="text-[9px] font-medium">Stok</span>
            </button>

            <div className="relative -top-6">
                <button 
                    onClick={handleGlobalScanClick}
                    disabled={currentUser.role !== 'ADMIN'}
                    className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg active:scale-95 transition-transform border-4 border-white dark:border-slate-800 ${currentUser.role === 'ADMIN' ? 'bg-blue-600 text-white shadow-blue-200 dark:shadow-blue-900/50' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                >
                    <ScanLine size={28} />
                </button>
            </div>

            <button 
                onClick={() => setCurrentView('ANALYTICS')}
                className={`flex flex-col items-center justify-center w-14 space-y-1 ${currentView === 'ANALYTICS' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}
            >
                <BarChart3 size={20} />
                <span className="text-[9px] font-medium">Analiz</span>
            </button>

            <button 
                onClick={() => setCurrentView('HISTORY')}
                className={`flex flex-col items-center justify-center w-14 space-y-1 ${currentView === 'HISTORY' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}
            >
                <History size={20} />
                <span className="text-[9px] font-medium">Geçmiş</span>
            </button>
        </div>
      </div>

      {/* Modals */}
      {currentUser.role === 'ADMIN' && (
        <>
            <TransactionModal 
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingTransaction(null);
                    setPreSelectedBarcode('');
                }}
                onSubmit={handleTransactionSubmit}
                onDelete={(id) => handleDeleteTransaction(id, () => setIsModalOpen(false))}
                initialType={modalType}
                products={products}
                transactionToEdit={editingTransaction}
                defaultBarcode={preSelectedBarcode}
            />

            <ProductModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                onSubmit={handleSaveProduct}
                onDelete={(id) => handleDeleteProduct(id, () => setIsProductModalOpen(false))}
                productToEdit={editingProduct}
            />

            <BulkTransactionModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onProcessTransactions={handleBulkTransactionProcess}
                onProcessProducts={handleBulkProductProcess}
                products={products}
                initialMode={bulkModalMode}
            />

            <DataBackupModal
                isOpen={isDataBackupOpen}
                onClose={() => setIsDataBackupOpen(false)}
                onBackup={handleBackupData}
                onRestore={handleRestoreData}
            />

            <CloudSetupModal 
                isOpen={isCloudSetupOpen}
                onClose={() => setIsCloudSetupOpen(false)}
                onSave={handleSaveCloudConfig}
                currentUrl={cloudConfig?.scriptUrl}
            />
        </>
      )}

      <OrderSimulatorModal
        isOpen={isOrderSimModalOpen}
        onClose={() => setIsOrderSimModalOpen(false)}
        products={products}
      />
      
      <BarcodePrinterModal
        isOpen={isBarcodePrinterOpen}
        onClose={() => setIsBarcodePrinterOpen(false)}
        products={products}
      />

    </div>
  );
}

export default App;
