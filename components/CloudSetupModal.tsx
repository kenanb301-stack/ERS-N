
import React, { useState } from 'react';
import { X, Cloud, Save, Key, Database, CheckCircle, HelpCircle, ExternalLink, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { CloudConfig } from '../types';
import { createBin } from '../services/jsonbin';
import { INITIAL_PRODUCTS, INITIAL_TRANSACTIONS } from '../constants';

interface CloudSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string, binId: string) => void;
  currentConfig: CloudConfig | null;
}

const CloudSetupModal: React.FC<CloudSetupModalProps> = ({ isOpen, onClose, onSave, currentConfig }) => {
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [binId, setBinId] = useState(currentConfig?.binId || '');
  const [showGuide, setShowGuide] = useState(!currentConfig?.apiKey);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!apiKey.trim() || !binId.trim()) {
      alert("Lütfen API Key ve Bin ID alanlarını doldurun.");
      return;
    }
    onSave(apiKey.trim(), binId.trim());
    onClose();
  };

  const handleAutoCreate = async () => {
      if (!apiKey.trim()) {
          alert("Lütfen önce API Key alanını doldurun.");
          return;
      }

      setIsCreating(true);
      
      // Create empty initial data structure
      const initialData = {
          products: INITIAL_PRODUCTS,
          transactions: INITIAL_TRANSACTIONS,
          lastUpdated: new Date().toISOString()
      };

      const result = await createBin(apiKey.trim(), initialData);

      setIsCreating(false);

      if (result.success && result.binId) {
          setBinId(result.binId);
          alert("Bin başarıyla oluşturuldu! ID otomatik olarak kutuya yazıldı. Şimdi 'Bağlan ve Kaydet' butonuna basın.");
      } else {
          alert(`Hata: ${result.message}\nLütfen API Key'in doğru olduğundan emin olun.`);
      }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Cloud size={24} className="text-blue-600 dark:text-blue-400" />
            Bulut Kurulumu (JSONBin.io)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <h3 className="font-bold text-indigo-800 dark:text-indigo-300 text-sm mb-2 flex items-center gap-2">
                    <ShieldCheck size={16} /> En Kolay Yöntem
                </h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-200 opacity-90">
                    Sadece API Key alın, gerisini uygulamaya bırakın. Sitede dosya oluşturmanıza gerek yoktur.
                </p>
            </div>

            <div className="space-y-4 pt-2">
                {/* STEP 1 */}
                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                        Adım 1: API Key Girin
                    </label>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        <a href="https://jsonbin.io/login" target="_blank" className="text-blue-600 hover:underline font-bold">jsonbin.io</a> adresine giriş yapın ve sarı başlıktaki <strong>"Copy Master Key"</strong> butonuna basın.
                    </div>
                    <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="API Key buraya ($2b$10$...)"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none font-mono text-xs sm:text-sm"
                        />
                    </div>
                </div>

                {/* STEP 2 */}
                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                        Adım 2: Bin ID (Depo Kimliği)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                value={binId}
                                onChange={(e) => setBinId(e.target.value)}
                                placeholder="ID buraya gelecek..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none font-mono text-xs sm:text-sm"
                            />
                        </div>
                        <button 
                            onClick={handleAutoCreate}
                            disabled={isCreating || !apiKey}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm"
                        >
                            {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                            Otomatik Oluştur
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">
                        Eğer yeni başlıyorsanız <strong>"Otomatik Oluştur"</strong> butonuna basın. Eğer zaten bir ID'niz varsa (diğer cihazdan aldıysanız) kutuya yapıştırın.
                    </p>
                </div>
            </div>

            <button 
                onClick={handleSave}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-transform"
            >
                <Save size={20} />
                Bağlan ve Kaydet
            </button>
        </div>
      </div>
    </div>
  );
};

export default CloudSetupModal;
