
import React, { useState } from 'react';
import { X, Cloud, Save, Key, Database, CheckCircle, HelpCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { CloudConfig } from '../types';

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

  if (!isOpen) return null;

  const handleSave = () => {
    if (!apiKey.trim() || !binId.trim()) {
      alert("Lütfen API Key ve Bin ID alanlarını doldurun.");
      return;
    }
    onSave(apiKey.trim(), binId.trim());
    onClose();
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
                    <ShieldCheck size={16} /> JSONBin Nedir?
                </h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-200 opacity-90">
                    Verilerinizi Google Sheets yerine profesyonel bir JSON veritabanında saklar. Daha hızlıdır, limit sorunu yoktur ve kopma yapmaz.
                </p>
            </div>

            <button 
                onClick={() => setShowGuide(!showGuide)}
                className="w-full flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
                <span className="flex items-center gap-2"><HelpCircle size={16}/> Kurulum Rehberi (Çok Kolay)</span>
                <span>{showGuide ? 'Gizle' : 'Göster'}</span>
            </button>

            {showGuide && (
                <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 border-l-2 border-slate-200 dark:border-slate-600 pl-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-r-lg">
                    <div className="space-y-1">
                        <span className="font-bold block text-slate-800 dark:text-white text-base">Adım 1: Kayıt Ol</span>
                        <a href="https://jsonbin.io/login" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-bold">
                            jsonbin.io <ExternalLink size={12}/>
                        </a> adresine gidin ve Google ile giriş yapın.
                    </div>

                    <div className="space-y-1">
                        <span className="font-bold block text-slate-800 dark:text-white text-base">Adım 2: API Key Al</span>
                        <p>Giriş yaptıktan sonra sayfanın en üstündeki sarı/profil başlığında <strong>"Copy Master Key"</strong> butonuna basın. Kopyaladığınız kodu aşağıdaki <strong>API Key</strong> kutusuna yapıştırın.</p>
                    </div>

                    <div className="space-y-1">
                        <span className="font-bold block text-slate-800 dark:text-white text-base">Adım 3: Bin (Depo) Oluştur</span>
                        <p>Sitede <strong>"+ Create New"</strong> butonuna basın. Editör açılacaktır.</p>
                        <p>Editörün içine sadece iki süslü parantez <code>{'{}'}</code> yazın ve <strong>Create</strong> butonuna basın.</p>
                    </div>

                    <div className="space-y-1">
                        <span className="font-bold block text-slate-800 dark:text-white text-base">Adım 4: Bin ID Al</span>
                        <p>Oluşturduktan sonra üst kısımda (Metadata başlığı altında) <strong>"Bin ID"</strong> yazar (Örn: <code>65a...</code>). Onu kopyalayın ve aşağıdaki <strong>Bin ID</strong> kutusuna yapıştırın.</p>
                    </div>
                </div>
            )}

            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                        Master API Key
                    </label>
                    <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="$2b$10$..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none font-mono text-xs sm:text-sm"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                        Bin ID
                    </label>
                    <div className="relative">
                        <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            value={binId}
                            onChange={(e) => setBinId(e.target.value)}
                            placeholder="65a..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none font-mono text-xs sm:text-sm"
                        />
                    </div>
                </div>

                <p className="text-xs text-slate-400 font-bold mt-2">ÖNEMLİ: Bu iki kodu kopyalayın ve hem PC'de hem Mobilde aynı şekilde girin.</p>
            </div>

            <button 
                onClick={handleSave}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-transform"
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