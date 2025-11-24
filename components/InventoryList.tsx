
import React, { useState, useMemo } from 'react';
import { Search, Package, Edit, Trash2, Plus, FileSpreadsheet, Check, X, Printer, MapPin, Hexagon } from 'lucide-react';
import { Product, User } from '../types';

interface InventoryListProps {
  products: Product[];
  onDelete: (id: string) => void;
  onEdit: (product: Product) => void;
  onAddProduct: () => void;
  onBulkAdd: () => void;
  onPrintBarcodes: () => void;
  currentUser: User;
}

const InventoryList: React.FC<InventoryListProps> = ({ products, onDelete, onEdit, onAddProduct, onBulkAdd, onPrintBarcodes, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = product.product_name.toLowerCase().includes(term) || 
                            (product.part_code && product.part_code.toLowerCase().includes(term)) ||
                            (product.location && product.location.toLowerCase().includes(term)) ||
                            (product.barcode && product.barcode.includes(term));
      return matchesSearch;
    });
  }, [products, searchTerm]);

  const getStockStatusColor = (current: number, min: number) => {
    if (current === 0) return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600';
    if (current <= min) return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30';
    if (current <= min * 1.5) return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30';
    return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30';
  };

  return (
    <div className="space-y-4 pb-20 h-full flex flex-col">
      
      {/* Mobile Header Actions */}
      <div className="flex justify-between items-center md:hidden gap-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Stok Listesi</h3>
          <div className="flex gap-2">
            <button 
                onClick={onPrintBarcodes}
                className="bg-slate-600 text-white p-2 rounded-lg shadow-md active:scale-95 transition-transform"
                title="Etiket Yazdır"
            >
                <Printer size={20} />
            </button>
            {currentUser.role === 'ADMIN' && (
                <>
                    <button 
                        onClick={onBulkAdd}
                        className="bg-green-600 text-white p-2 rounded-lg shadow-md active:scale-95 transition-transform"
                    >
                        <FileSpreadsheet size={20} />
                    </button>
                    <button 
                        onClick={onAddProduct}
                        className="bg-blue-600 text-white p-2 rounded-lg shadow-md active:scale-95 transition-transform"
                    >
                        <Plus size={20} />
                    </button>
                </>
            )}
          </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 sticky top-0 z-10 transition-colors">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Parça Kodu, Adı veya Reyon ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
        
        <button
            onClick={onPrintBarcodes}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors font-medium border border-slate-200 dark:border-slate-600"
        >
            <Printer size={18} />
            <span className="hidden lg:inline">Etiket Yazdır</span>
        </button>
      </div>

      {/* Product List - Responsive */}
      <div className="grid gap-3">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
            <Package className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={48} />
            <p className="text-slate-500 dark:text-slate-400">Kayıtlı parça/ürün bulunamadı.</p>
            {currentUser.role === 'ADMIN' && (
                <div className="flex justify-center gap-3 mt-4">
                    <button onClick={onAddProduct} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                        Yeni Parça Ekle
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <button onClick={onBulkAdd} className="text-green-600 dark:text-green-400 font-medium hover:underline">
                        Excel ile Yükle
                    </button>
                </div>
            )}
          </div>
        ) : (
          filteredProducts.map(product => (
            <div 
              key={product.id} 
              className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-all relative group"
            >
              <div className="flex-1 flex gap-4 items-start sm:items-center">
                
                <div className="flex-1 w-full">
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-start w-full">
                            <div>
                                {/* Parça Kodu ve Adı */}
                                {product.part_code && (
                                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded mb-1 inline-block">
                                        {product.part_code}
                                    </span>
                                )}
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">
                                    {product.product_name}
                                </h3>
                            </div>
                            <div className={`sm:hidden px-3 py-1 rounded-lg border text-sm font-bold whitespace-nowrap ${getStockStatusColor(product.current_stock, product.min_stock_level)}`}>
                                {product.current_stock} <span className="text-xs font-normal">{product.unit}</span>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {/* Reyon Bilgisi */}
                            {product.location && (
                                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                    <MapPin size={14} className="text-orange-500" />
                                    <span>{product.location}</span>
                                </div>
                            )}
                            
                            {/* Hammadde */}
                            {product.material && (
                                <div className="flex items-center gap-1">
                                    <Hexagon size={14} className="text-slate-400" />
                                    <span className="line-clamp-1">{product.material}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 mt-2 sm:mt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700 pt-3 sm:pt-0">
                
                <div className="hidden sm:block text-right min-w-[100px]">
                    <div className={`px-3 py-1 rounded-lg border text-lg font-bold inline-block ${getStockStatusColor(product.current_stock, product.min_stock_level)}`}>
                        {product.current_stock} <span className="text-sm font-normal opacity-80">{product.unit}</span>
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Min: {product.min_stock_level}</div>
                </div>

                {currentUser.role === 'ADMIN' && (
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button 
                            type="button"
                            onClick={(e) => {
                            e.stopPropagation();
                            onEdit(product);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 rounded-lg transition-colors relative z-10"
                            title="Düzenle"
                        >
                            <Edit size={18} />
                        </button>
                        
                        {deleteConfirmId === product.id ? (
                            <div className="flex items-center gap-1 animate-fade-in">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(product.id);
                                        setDeleteConfirmId(null);
                                    }}
                                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                    title="Silmeyi Onayla"
                                >
                                    <Check size={18} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmId(null);
                                    }}
                                    className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                    title="İptal"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <button 
                                type="button"
                                onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(product.id);
                                }}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg transition-colors relative z-10"
                                title="Sil"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InventoryList;
