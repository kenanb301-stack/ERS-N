
import React, { useState } from 'react';
import { X, Cloud, Save, Key, Database, Copy, CheckCircle, ShieldCheck, Settings, FileText, ExternalLink, Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { CloudConfig } from '../types';
import { testConnection } from '../services/supabase';

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
  
  // Test State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!url.trim() || !apiKey.trim()) {
      alert("Lütfen Project URL ve API Key alanlarını doldurun.");
      return;
    }
    onSave(url.trim(), apiKey.trim());
    onClose();
  };

  const handleTest = async () => {
      if (!url.trim() || !apiKey.trim()) {
          setTestResult({ success: false, message: "Önce URL ve Key giriniz." });
          return;
      }
      setIsTesting(true);
      setTestResult(null);
      
      const result = await testConnection(url, apiKey);
      setIsTesting(false);
      setTestResult(result);
  };

  // SQL Code with RLS DISABLE commands included
  const sqlCode = `
-- Tablo oluşturma komutları --

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
  short_id text, -- Kısa barkod için 6 haneli kod (SABİT)
  created_at text,
  critical_since text,
  last_alert_sent_at text,
  last_counted_at text -- Yeni: Son sayım tarihi
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

-- ÖNEMLİ: Bağlantı hatalarını önlemek için güvenlik duvarını (RLS) kaldırıyoruz --
alter table products disable row level security;
alter table transactions disable row level security;

-- Eğer tablo zaten varsa yeni sütunları eklemek için (Opsiyonel) --
alter table products add column if not exists last_counted_at text;
alter table products add column if not exists short_id text;
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
                    Supabase sayesinde veri kaybı, çakışma veya limit sorunu yaşamadan milyonlarca stok verisini yönetebilirsiniz.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* STEP 1: SQL */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold">1</span>
                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                            Tabloları Oluşturun (SQL)
                        </label>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        <a href="https://supabase.com/dashboard" target="_blank" className="text-blue-600 hover:underline font-bold flex items-center gap-1">
                            Supabase Dashboard <ExternalLink size={10} />
                        </a>
                        adresine gidin. Sol menüden <strong>SQL Editor</strong>'e tıklayın, bu kodu yapıştırın ve sağ alttaki <strong>RUN</strong> butonuna basın.
                    </p>
                    <div className="relative bg-slate-900 rounded-lg p-3 group border border-slate-700">
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
                    <div className="text-[10px] text-amber-600 dark:text-amber-500 flex items-start gap-1 bg-amber-50 dark:bg-amber-900/10 p-2 rounded">
                        <AlertTriangle size={12} className="min-w-[12px] mt-0.5" /> 
                        Not: "short_id" sütunu, barkodun değişmemesi için zorunludur.
                    </div>
                </div>

                {/* STEP 2: CREDENTIALS */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold">2</span>
                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                            Bağlantı Bilgilerini Girin
                        </label>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                        <p className="flex items-center gap-2">
                            <Settings size={14} className="text-slate-400" />
                            1. Sol menünün <strong>EN ALTINDAKİ</strong> Dişli Çarka (Project Settings) tıklayın.
                        </p>
                        <p className="flex items-center gap-2">
                            <FileText size={14} className="text-slate-400" />
                            2. Açılan listeden <strong>API</strong> sekmesini seçin.
                        </p>
                    </div>
                    
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

            {/* TEST RESULT AREA */}
            {testResult && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-bold ${testResult.success ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {testResult.success ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    {testResult.message}
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button
                    onClick={handleTest}
                    disabled={isTesting}
                    className="px-4 py-4 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
                >
                    {isTesting ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                    Bağlantıyı Test Et
                </button>
                <button 
                    onClick={handleSave}
                    disabled={isTesting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-transform"
                >
                    <Save size={20} />
                    Kaydet ve Bağlan
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CloudSetupModal;