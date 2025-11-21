import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Package, History, Plus, Menu, X, FileSpreadsheet, AlertTriangle, Moon, Sun } from 'lucide-react';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import TransactionHistory from './components/TransactionHistory';
import TransactionModal from './components/TransactionModal';
import ProductModal from './components/ProductModal';
import BulkTransactionModal from './components/BulkTransactionModal';
import NegativeStockList from './components/NegativeStockList';
import OrderSimulatorModal from './components/OrderSimulatorModal';
import { INITIAL_PRODUCTS, INITIAL_TRANSACTIONS } from './constants';
import { Product, Transaction, TransactionType, ViewState } from './types';

// Utility to generate simple ID
const generateId = () => Math.random().toString(36).substring(2, 11);

function App() {
  // State Management
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>(TransactionType.IN);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null); 
  
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkModalMode, setBulkModalMode] = useState<'TRANSACTION' | 'PRODUCT'>('TRANSACTION');

  const [isOrderSimModalOpen, setIsOrderSimModalOpen] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Check for negative stock
  const hasNegativeStock = products.some(p => p.current_stock < 0);

  // 1. Transaction Logic (Create or Edit)
  const handleTransactionSubmit = (data: { id?: string; productId: string; quantity: number; description: string; type: TransactionType }) => {
    const newProductTarget = products.find(p => p.id === data.productId);
    if (!newProductTarget) return;

    if (data.id) {
        // EDIT EXISTING TRANSACTION
        const oldTransaction = transactions.find(t => t.id === data.id);
        if (!oldTransaction) return;

        const oldProductId = oldTransaction.product_id;
        const newProductId = data.productId;

        // Calculate logic:
        // 1. Revert Old Transaction (on Old Product)
        // 2. Apply New Transaction (on New Product)
        
        setProducts(prevProducts => {
            return prevProducts.map(p => {
                let stock = p.current_stock;

                // Step 1: Revert Old Transaction Effect
                if (p.id === oldProductId) {
                    if (oldTransaction.type === TransactionType.IN) {
                        stock -= oldTransaction.quantity; // Revert IN: subtract
                    } else {
                        stock += oldTransaction.quantity; // Revert OUT: add
                    }
                }

                // Step 2: Apply New Transaction Effect
                // Note: If oldProductId === newProductId, this runs sequentially on the same 'stock' variable
                if (p.id === newProductId) {
                     if (data.type === TransactionType.IN) {
                         stock += data.quantity; // Apply IN: add
                     } else {
                         stock -= data.quantity; // Apply OUT: subtract
                     }
                }

                return { ...p, current_stock: stock };
            });
        });

        // 3. Update Transaction Record
        setTransactions(prevTransactions => prevTransactions.map(t => {
            if (t.id === data.id) {
                // Calculate stock snapshots for history
                // If product changed, we can't easily know the historical 'previous_stock' of the new product without replay.
                // We will use the current stock of the target product as 'previous' (best effort for edit) or preserve old if product same.
                let prevStockSnapshot = t.previous_stock;
                
                if (oldProductId !== newProductId) {
                     // Product changed, use current stock of new product as base
                     prevStockSnapshot = newProductTarget.current_stock;
                }
                
                // If previous stock is available, calculate new stock based on the change
                const change = data.type === TransactionType.IN ? data.quantity : -data.quantity;
                const newStockSnapshot = prevStockSnapshot !== undefined ? prevStockSnapshot + change : undefined;

                return {
                    ...t,
                    product_id: newProductId,
                    product_name: newProductTarget.product_name, // Update name in case product changed
                    type: data.type,
                    quantity: data.quantity,
                    description: data.description,
                    previous_stock: prevStockSnapshot,
                    new_stock: newStockSnapshot
                };
            }
            return t;
        }));

    } else {
        // CREATE NEW TRANSACTION
        // Capture snapshots before update
        const currentStock = newProductTarget.current_stock;
        const change = data.type === TransactionType.IN ? data.quantity : -data.quantity;
        const newStockVal = currentStock + change;

        const newTransaction: Transaction = {
            id: `t-${generateId()}`,
            product_id: data.productId,
            product_name: newProductTarget.product_name,
            type: data.type,
            quantity: data.quantity,
            date: new Date().toISOString(),
            description: data.description,
            created_by: 'Mevcut Kullanıcı',
            previous_stock: currentStock,
            new_stock: newStockVal
        };

        setProducts(prevProducts => prevProducts.map(p => {
            if (p.id === data.productId) {
                return { ...p, current_stock: newStockVal };
            }
            return p;
        }));

        setTransactions(prevTransactions => [newTransaction, ...prevTransactions]);
    }

    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (id: string, onSuccess?: () => void) => {
      const transactionToDelete = transactions.find(t => t.id === id);

      if (transactionToDelete) {
          setProducts(prevProducts => {
              return prevProducts.map(product => {
                  if (product.id === transactionToDelete.product_id) {
                      let newStock = product.current_stock;
                      const qty = Number(transactionToDelete.quantity);

                      if (isNaN(qty)) return product;

                      if (transactionToDelete.type === TransactionType.IN) {
                          newStock -= qty;
                      } else {
                          newStock += qty;
                      }
                      return { ...product, current_stock: newStock };
                  }
                  return product;
              });
          });
      }

      setTransactions(prevTransactions => prevTransactions.filter(t => t.id !== id));
      
      if (onSuccess) {
          onSuccess();
      }
  };

  const handleEditTransactionClick = (transaction: Transaction) => {
      setEditingTransaction(transaction);
      setModalType(transaction.type);
      setIsModalOpen(true);
  }

  // 2. Product Create & Edit Logic
  const handleSaveProduct = (data: any) => {
    if (editingProduct) {
        // Edit Existing
        const { current_stock, ...updateData } = data;
        
        setProducts(prevProducts => prevProducts.map(p => 
            p.id === editingProduct.id ? { ...p, ...updateData } : p
        ));
    } else {
        // Create New
        const newProduct: Product = {
            id: `p-${generateId()}`,
            ...data,
            created_at: new Date().toISOString(),
        };
        setProducts(prev => [...prev, newProduct]);
    }
    
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
    const newTxIds: Transaction[] = [];
    
    setProducts(prevProducts => {
        let updatedProducts = [...prevProducts];

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
                created_by: 'Excel Import',
                previous_stock: previousStock,
                new_stock: newStock
            });

            updatedProducts = updatedProducts.map(p => {
                if(p.id === item.productId) {
                    return { ...p, current_stock: newStock };
                }
                return p;
            });
        });
        return updatedProducts;
    });

    setTransactions(prev => [...newTxIds, ...prev]);
    setIsBulkModalOpen(false);
    alert(`${newTransactionsData.length} adet işlem başarıyla kaydedildi.`);
  };

  const handleBulkProductProcess = (newProductsData: any[]) => {
      const newProducts: Product[] = newProductsData.map(p => ({
          id: `p-${generateId()}`,
          ...p,
          created_at: new Date().toISOString(),
      }));

      setProducts(prev => [...prev, ...newProducts]);
      setIsBulkModalOpen(false);
      alert(`${newProducts.length} adet yeni ürün başarıyla eklendi.`);
  };

  const handleDeleteProduct = (id: string, onSuccess?: () => void) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setTransactions(prev => prev.filter(t => t.product_id !== id));
    if (onSuccess) onSuccess();
  }

  const openQuickAction = (type: TransactionType) => {
    setEditingTransaction(null);
    setModalType(type);
    setIsModalOpen(true);
  };

  const openBulkModal = (mode: 'TRANSACTION' | 'PRODUCT') => {
      setBulkModalMode(mode);
      setIsBulkModalOpen(true);
  };

  const navItems = [
    { id: 'DASHBOARD', label: 'Özet', icon: LayoutDashboard },
    { id: 'INVENTORY', label: 'Stok Listesi', icon: Package },
    { id: 'HISTORY', label: 'Hareketler', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row transition-colors duration-300">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-screen sticky top-0 transition-colors duration-300">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                <Package className="fill-blue-600 text-white" size={28} />
                <span className="dark:text-white text-slate-800">DepoPro</span>
            </h1>
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
        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
             <button 
                onClick={toggleDarkMode}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors mb-3 group"
             >
                <div className="flex items-center gap-2">
                    {isDarkMode ? <Moon size={18} className="text-purple-400" /> : <Sun size={18} className="text-amber-500" />}
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {isDarkMode ? 'Karanlık Mod' : 'Aydınlık Mod'}
                    </span>
                </div>
             </button>

            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Giriş yapan kullanıcı</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Depo Sorumlusu</p>
            </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 sticky top-0 z-30 flex justify-between items-center transition-colors duration-300">
         <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <Package className="fill-blue-600 text-white" size={24} />
            <span className="dark:text-white text-slate-800">DepoPro</span>
        </h1>
        <div className="flex items-center gap-2">
            <button onClick={toggleDarkMode} className="p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg">
                {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600 dark:text-slate-300">
                {isSidebarOpen ? <X /> : <Menu />}
            </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}>
             <div className="bg-white dark:bg-slate-800 w-3/4 h-full p-4 shadow-2xl transition-colors duration-300" onClick={e => e.stopPropagation()}>
                <div className="mb-8">
                     <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                        <Package className="fill-blue-600 text-white" size={28} />
                        <span className="dark:text-white text-slate-800">DepoPro</span>
                    </h1>
                </div>
                <nav className="space-y-2">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setCurrentView(item.id as ViewState);
                                setIsSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-base font-medium transition-all ${
                                currentView === item.id 
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </button>
                    ))}
                    {hasNegativeStock && (
                        <button
                            onClick={() => {
                                setCurrentView('NEGATIVE_STOCK');
                                setIsSidebarOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-base font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all mt-2"
                        >
                            <AlertTriangle size={20} />
                            Eksi Bakiye
                        </button>
                    )}
                </nav>
             </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
        <div className="max-w-5xl mx-auto">
            {/* View Title */}
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {currentView === 'DASHBOARD' && 'Genel Bakış'}
                    {currentView === 'INVENTORY' && 'Stok Listesi'}
                    {currentView === 'HISTORY' && 'Hareket Geçmişi'}
                    {currentView === 'NEGATIVE_STOCK' && 'Dikkat Gerektiren Ürünler'}
                </h2>
                {currentView === 'INVENTORY' && (
                    <div className="flex gap-2">
                        <button 
                            onClick={() => openBulkModal('PRODUCT')}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-green-200 dark:shadow-none"
                        >
                            <FileSpreadsheet size={18} /> <span className="hidden sm:inline">Excel Yükle</span>
                        </button>
                        <button 
                            onClick={handleAddProductClick}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
                        >
                            <Plus size={18} /> <span className="hidden sm:inline">Ürün Ekle</span>
                        </button>
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
                />
            )}
            {currentView === 'INVENTORY' && (
                <InventoryList 
                    products={products} 
                    onDelete={handleDeleteProduct}
                    onEdit={handleEditProductClick} 
                    onAddProduct={handleAddProductClick}
                    onBulkAdd={() => openBulkModal('PRODUCT')}
                />
            )}
            {currentView === 'HISTORY' && (
                <TransactionHistory 
                    transactions={transactions} 
                    onEdit={handleEditTransactionClick}
                    onDelete={(id) => handleDeleteTransaction(id)}
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

      {/* Modals */}
      <TransactionModal 
        isOpen={isModalOpen}
        onClose={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
        }}
        onSubmit={handleTransactionSubmit}
        onDelete={(id) => handleDeleteTransaction(id, () => setIsModalOpen(false))}
        initialType={modalType}
        products={products}
        transactionToEdit={editingTransaction}
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

      <OrderSimulatorModal
        isOpen={isOrderSimModalOpen}
        onClose={() => setIsOrderSimModalOpen(false)}
        products={products}
      />

    </div>
  );
}

export default App;