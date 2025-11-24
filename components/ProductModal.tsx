
import React, { useState, useEffect, useRef } from 'react';
import { X, PackagePlus, AlertCircle, Save, Lock, Trash2, QrCode, Image as ImageIcon, MapPin, Hexagon, Hash, Upload } from 'lucide-react';
import { CATEGORIES, UNITS } from '../constants';
import { Product } from '../types';
import BarcodeScanner from './BarcodeScanner';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onDelete?: (id: string) => void;
  productToEdit?: Product | null;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSubmit, onDelete, productToEdit }) => {
  const [name, setName] = useState('');
  const [partCode, setPartCode] = useState('');
  const [location, setLocation] = useState('');
  const [material, setMaterial] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [unit, setUnit] = useState(UNITS[0]);
  const [minStock, setMinStock] = useState<number>(10);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [barcode, setBarcode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form alanlarını duruma göre doldur veya sıfırla
  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        // Düzenleme Modu
        setName(productToEdit.product_name);
        setPartCode(productToEdit.part_code || '');
        setLocation(productToEdit.location || '');
        setMaterial(productToEdit.material || '');
        setCategory(productToEdit.category);
        setUnit(productToEdit.unit);
        setMinStock(productToEdit.min_stock_level);
        setInitialStock(productToEdit.current_stock);
        setBarcode(productToEdit.barcode || '');
        setImageUrl(productToEdit.image_url || '');
      } else {
        // Yeni Ekleme Modu
        setName('');
        setPartCode('');
        setLocation('');
        setMaterial('');
        setCategory(CATEGORIES[0]);
        setUnit(UNITS[0]);
        setMinStock(10);
        setInitialStock(0);
        setBarcode('');
        setImageUrl('');
      }
      setError('');
      setShowScanner(false);
      setIsProcessingImage(false);
    }
  }, [isOpen, productToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Açıklama (Ürün Adı) zorunludur.');
      return;
    }

    const formData = {
      product_name: name,
      part_code: partCode.trim(),
      location: location.trim(),
      material: material.trim(),
      category,
      unit,
      min_stock_level: Number(minStock),
      current_stock: Number(initialStock),
      barcode: barcode.trim() || partCode.trim(), // Barkod girilmezse parça kodu kullanılır
      image_url: imageUrl.trim()
    };

    onSubmit(formData);
    onClose();
  };

  const handleScanSuccess = (decodedText: string) => {
      setBarcode(decodedText);
      setShowScanner(false);
  };

  // Görseli küçültüp Base64'e çeviren fonksiyon
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dosya tipi kontrolü
    if (!file.type.startsWith('image/')) {
        setError('Lütfen geçerli bir resim dosyası seçin (JPG, PNG).');
        return;
    }

    setIsProcessingImage(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
            // Canvas ile resmi yeniden boyutlandır (Max genişlik 400px)
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400;
            const scaleSize = MAX_WIDTH / img.width;
            
            // Eğer resim zaten küçükse boyutlandırma
            if (scaleSize >= 1) {
                canvas.width = img.width;
                canvas.height = img.height;
            } else {
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
            }

            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Kaliteyi %70'e düşürerek sıkıştır
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            setImageUrl(compressedBase64);
            setIsProcessingImage(false);
        };
        img.onerror = () => {
            setError('Görsel işlenirken hata oluştu.');
            setIsProcessingImage(false);
        }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
    {showScanner && (
        <BarcodeScanner 
            onScanSuccess={handleScanSuccess} 
            onClose={() => setShowScanner(false)} 
        />
    )}
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            {productToEdit ? (
                <>
                    <Save size={20} className="text-blue-600 dark:text-blue-400" />
                    Parça/Ürün Düzenle
                </>
            ) : (
                <>
                    <PackagePlus size={20} className="text-green-600 dark:text-green-400" />
                    Yeni Parça Ekle
                </>
            )}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 pb-0">
          <form id="productForm" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Parça Kodu ve Reyon (Yan Yana) */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Parça Kodu</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={partCode}
                            onChange={(e) => setPartCode(e.target.value)}
                            placeholder="Örn: P-00003"
                            className="w-full pl-9 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-mono"
                        />
                        <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reyon / Raf</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Örn: B1-06-06"
                            className="w-full pl-9 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-mono uppercase"
                        />
                        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" />
                    </div>
                </div>
            </div>

            {/* Ürün Adı (Açıklama) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Açıklama / Parça Adı</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: BASKI LAMASI"
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-bold"
              />
            </div>

            {/* Hammadde */}
             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hammadde / Materyal</label>
                <div className="relative">
                    <input
                        type="text"
                        value={material}
                        onChange={(e) => setMaterial(e.target.value)}
                        placeholder="Örn: ST37 SOĞUK ÇEKME"
                        className="w-full pl-9 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                    <Hexagon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
            </div>

            {/* Kategori ve Birim */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Birim</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            {/* Stok ve Kritik Seviye */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kritik Stok (Min)</label>
                <input
                  type="number"
                  value={minStock}
                  onChange={(e) => setMinStock(Number(e.target.value))}
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {productToEdit ? 'Mevcut Stok' : 'Açılış Stoğu'}
                </label>
                <div className="relative">
                  <input
                      type="number"
                      value={initialStock}
                      onChange={(e) => setInitialStock(Number(e.target.value))}
                      disabled={!!productToEdit}
                      className={`w-full p-3 rounded-lg border outline-none ${productToEdit ? 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 cursor-not-allowed' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20'}`}
                  />
                  {productToEdit && (
                      <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Görsel ve QR */}
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ürün Görseli</label>
                     <div className="flex flex-col gap-3">
                        <div className="flex gap-2 items-center">
                             <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://... veya dosya yükleyin ->"
                                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none pl-10"
                                />
                                <ImageIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                            
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-2 whitespace-nowrap"
                                disabled={isProcessingImage}
                            >
                                <Upload size={20} />
                                <span className="hidden sm:inline text-sm font-bold">
                                    {isProcessingImage ? '...' : 'Yükle'}
                                </span>
                            </button>
                        </div>

                        {imageUrl && (
                            <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-slate-200 dark:border-slate-600 flex-shrink-0">
                                    <img src={imageUrl} alt="Önizleme" className="w-full h-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                                </div>
                                <div className="text-xs text-slate-500">
                                    <p className="font-bold text-slate-700 dark:text-slate-300">Görsel Yüklendi</p>
                                    <p className="line-clamp-1 break-all opacity-70">{imageUrl.substring(0, 50)}...</p>
                                    <button 
                                        type="button"
                                        onClick={() => setImageUrl('')}
                                        className="text-red-500 hover:text-red-700 mt-1 font-medium"
                                    >
                                        Görseli Kaldır
                                    </button>
                                </div>
                            </div>
                        )}
                     </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">QR Kod / Barkod Verisi</label>
                  <div className="flex gap-2">
                      <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="Otomatik (Parça kodu) veya Tara"
                        className="flex-1 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="p-3 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors"
                        title="Kamerayı Aç"
                      >
                          <QrCode size={24} />
                      </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Boş bırakılırsa otomatik olarak Parça Kodu kullanılır.</p>
                </div>
            </div>

          </form>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 mt-6 flex gap-3">
             {productToEdit && onDelete && (
                <button
                    type="button"
                    onClick={() => onDelete(productToEdit.id)}
                    className="p-3.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors shadow-sm active:scale-95"
                    title="Ürünü Sil"
                >
                    <Trash2 size={20} />
                </button>
            )}
            <button
              type="submit"
              form="productForm"
              className={`flex-1 py-3.5 rounded-xl text-white font-bold shadow-lg dark:shadow-none transition-transform transform active:scale-95 ${productToEdit ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}`}
            >
              {productToEdit ? 'Değişiklikleri Kaydet' : 'Kaydet'}
            </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default ProductModal;
