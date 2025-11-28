
import React, { useState } from 'react';
import { X, Cloud, Save, Key, Database, Copy, CheckCircle, ShieldCheck } from 'lucide-react';
import { CloudConfig } from '../types';

interface CloudSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string, key: string) => void;
  currentConfig: CloudConfig | null;
}

const CloudSetupModal: React.FC<CloudSetupModalProps> = ({ isOpen, onClose, onSave, currentConfig }) => {
  const [url, setUrl] = useState(currentConfig?.supabaseUrl || '');
  const [apiKey, setApiKey] = useState(currentConfig?.supabaseKey || '');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!url.trim() || !apiKey.trim()) {
      alert("Lütfen Project URL ve API Key alanlarını doldurun.");
      return;
    }
    onSave(url.trim(), apiKey.trim());
    onClose();
  };

  const sqlCode = `
-- Tablo oluşturma komutları (Supabase SQL Editor'e yapıştırın) --

create table if not exists products (
  id text primary key,
  product_name text,
  part_code text,
  location text,
  material text,
  min_stock_level numeric,
  unit text,
  current_stock numeric,
  barcode text,
  created_at text,
  critical_since text,
  last_alert_sent_at text
);

create table if not exists transactions (
  id text primary key,
  product_id text,
  product_name text,
  type text,
  quantity numeric,
  date text,
  description text,
  created_by text,
  previous_stock numeric,
  new_stock numeric
);
  `.trim();

  const handleCopy = () => {
      navigator.clipboard.writeText(sqlCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Database size={24} className="text-green-600 dark:text-green-400" />
            Bulut Veritabanı Kurulumu (Supabase)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <h3 className="font-bold text-indigo-800 dark:text-indigo-300 text-sm mb-2 flex items-center gap-2">
                    <ShieldCheck size={16} /> Profesyonel Veritabanı
                </h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-200 opacity-90">
                    Artık dosya limiti, veri kaybı veya çakışma sorunu yok. Supabase ile milyonlarca veri güvenle saklanır.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* STEP 1: SQL */}
                <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                        Adım 1: Veritabanını Oluşturun
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        <a href="https://supabase.com/dashboard" target="_blank" className="text-blue-600 hover:underline font-bold">Supabase.com</a>'da yeni proje açın. Sol menüden <strong>SQL Editor</strong>'e gidin ve bu kodu yapıştırıp <strong>RUN</strong> deyin.
                    </p>
                    <div className="relative bg-slate-900 rounded-lg p-3 group">
                        <pre className="text-[10px] font-mono text-green-400 overflow-x-auto h-32 whitespace-pre-wrap">
                            {sqlCode}
                        </pre>
                        <button 
                            onClick={handleCopy}
                            className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                            title="Kodu Kopyala"
                        >
                            {copied ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>

                {/* STEP 2: CREDENTIALS */}
                <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                        Adım 2: Bağlantı Bilgileri
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Supabase'de <strong>Settings &gt; API</strong> menüsüne gidin.
                    </p>
                    
                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Project URL</label>
                        <div className="relative">
                            <Cloud className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://xyz.supabase.co"
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none text-xs font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">API Key (anon public)</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none text-xs font-mono"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <button 
                onClick={handleSave}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-transform"
            >
                <Save size={20} />
                Bağlan ve Eşitle
            </button>
        </div>
      </div>
    </div>
  );
};

export default CloudSetupModal;
