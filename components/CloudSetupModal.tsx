
import React, { useState } from 'react';
import { X, Database, Copy, CheckCircle, ShieldCheck, Settings, FileText, ExternalLink, Zap, AlertTriangle, Loader2 } from 'lucide-react';
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
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
      setIsTesting(true);
      const result = await testConnection(url, apiKey);
      setIsTesting(false);
      setTestResult(result);
  };

  const sqlCode = `
-- TABLOLARI OLUŞTURMA KODU --

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
  short_id text,
  created_at text,
  critical_since text,
  last_alert_sent_at text,
  last_counted_at text
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

-- YENİ: Sipariş Yönetimi için Tablo --
create table if not exists orders (
  id text primary key,
  name text,
  status text,
  created_at text,
  items jsonb -- Sipariş kalemleri JSON olarak saklanır
);

-- İZİNLERİ AÇMA (BAĞLANTI HATASINI ÇÖZER) --
alter table products disable row level security;
alter table transactions disable row level security;
alter table orders disable row level security;

-- EKSİK SÜTUNLARI TAMAMLAMA --
alter table products add column if not exists short_id text;
alter table products add column if not exists last_counted_at text;
  `.trim();

  const handleCopy = () => {
      navigator.clipboard.writeText(sqlCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Database size={24} className="text-green-600" /> Bulut Kurulumu
          </h2>
          <button onClick={onClose}><X size={24} className="text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <h3 className="font-bold text-indigo-800 dark:text-indigo-300 text-sm mb-2 flex items-center gap-2"><ShieldCheck size={16}/> Veri Güvenliği</h3>
                <p className="text-xs text-indigo-700 dark:text-indigo-200">Verileriniz Supabase veritabanında güvenle saklanır. Sipariş modülü için aşağıdaki SQL kodunu çalıştırın.</p>
            </div>
            <div className="relative bg-slate-900 rounded-lg p-3 group border border-slate-700">
                <pre className="text-[10px] font-mono text-green-400 overflow-x-auto h-32 whitespace-pre-wrap">{sqlCode}</pre>
                <button onClick={handleCopy} className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 text-white rounded">{copied ? <CheckCircle size={16} /> : <Copy size={16} />}</button>
            </div>
            <div className="space-y-4">
                <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Project URL" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
            </div>
            {testResult && <div className={`p-3 rounded text-sm font-bold ${testResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{testResult.message}</div>}
            <div className="flex gap-3">
                <button onClick={handleTest} disabled={isTesting} className="px-4 py-3 bg-slate-100 rounded font-bold text-slate-700 flex items-center gap-2">{isTesting ? <Loader2 className="animate-spin"/> : <Zap/>} Test Et</button>
                <button onClick={() => { onSave(url, apiKey); onClose(); }} className="flex-1 bg-green-600 text-white rounded font-bold shadow-lg">Kaydet</button>
            </div>
        </div>
      </div>
    </div>
  );
};
export default CloudSetupModal;
