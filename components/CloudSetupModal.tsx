
import React, { useState } from 'react';
import { X, Cloud, Save, Link, CheckCircle, HelpCircle, ExternalLink, Copy } from 'lucide-react';
import { CloudConfig } from '../types';

interface CloudSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string) => void;
  currentUrl?: string;
}

const CloudSetupModal: React.FC<CloudSetupModalProps> = ({ isOpen, onClose, onSave, currentUrl }) => {
  const [url, setUrl] = useState(currentUrl || '');
  const [showGuide, setShowGuide] = useState(!currentUrl); // URL yoksa rehberi göster

  if (!isOpen) return null;

  const handleSave = () => {
    if (!url.trim().startsWith('https://script.google.com/')) {
      alert("Lütfen geçerli bir Google Script URL'si girin.");
      return;
    }
    onSave(url.trim());
    onClose();
  };

  const copyScriptCode = () => {
    const code = `
function doGet(e) {
  var action = e.parameter.action;
  var db = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = db.getSheetByName("Data") || db.insertSheet("Data");
  
  if (action == "load") {
    var data = sheet.getRange("A1").getValue();
    if (!data) return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Veri yok"}));
    return ContentService.createTextOutput(JSON.stringify({status: "success", data: JSON.parse(data)})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var json = JSON.parse(e.postData.contents);
    var db = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = db.getSheetByName("Data") || db.insertSheet("Data");
    
    if (json.action == "save") {
      // Veriyi tek bir hücreye sıkıştırılmış JSON olarak kaydet (En güvenli yöntem)
      sheet.getRange("A1").setValue(JSON.stringify(json.data));
      // Yedekleme için tarih at
      sheet.getRange("B1").setValue(new Date());
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}
    `;
    navigator.clipboard.writeText(code.trim());
    alert("Kod kopyalandı!");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Cloud size={24} className="text-blue-600 dark:text-blue-400" />
            Google Drive Senkronizasyonu
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                <h3 className="font-bold text-blue-800 dark:text-blue-300 text-sm mb-2 flex items-center gap-2">
                    <CheckCircle size={16} /> Nasıl Çalışır?
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-200 opacity-90">
                    Verileriniz kendi Google Hesabınızdaki bir Excel (Sheet) tablosunda saklanır. 
                    Aşağıdaki adımları bir kere yaparak aldığınız linki, hem bilgisayarınıza hem telefonunuza girerseniz iki cihaz ortak çalışır.
                </p>
            </div>

            <button 
                onClick={() => setShowGuide(!showGuide)}
                className="w-full flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
                <span className="flex items-center gap-2"><HelpCircle size={16}/> Kurulum Rehberi (Sadece İlk Sefer)</span>
                <span>{showGuide ? 'Gizle' : 'Göster'}</span>
            </button>

            {showGuide && (
                <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 border-l-2 border-slate-200 dark:border-slate-600 pl-4">
                    <div className="space-y-1">
                        <span className="font-bold block text-slate-800 dark:text-white">Adım 1: Yeni E-Tablo</span>
                        <a href="https://sheets.new" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                            sheets.new <ExternalLink size={12}/>
                        </a> adresine gidip yeni bir Google E-Tablo oluşturun.
                    </div>
                    
                    <div className="space-y-1">
                        <span className="font-bold block text-slate-800 dark:text-white">Adım 2: Apps Script</span>
                        <p>Tabloda üst menüden <strong>Uzantılar &gt; Apps Script</strong> seçeneğine tıklayın.</p>
                    </div>

                    <div className="space-y-1">
                        <span className="font-bold block text-slate-800 dark:text-white">Adım 3: Kodu Yapıştır</span>
                        <p>Açılan sayfadaki kodları silin ve aşağıdaki butona tıklayıp kopyaladığınız kodu yapıştırın.</p>
                        <button onClick={copyScriptCode} className="mt-2 px-3 py-1.5 bg-slate-200 dark:bg-slate-600 rounded text-xs font-bold flex items-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-500">
                            <Copy size={14} /> Kodu Kopyala
                        </button>
                    </div>

                    <div className="space-y-1">
                        <span className="font-bold block text-slate-800 dark:text-white">Adım 4: Yayınla (Önemli!)</span>
                        <p>Sağ üstteki <strong>Dağıt (Deploy) &gt; Yeni Dağıtım</strong> butonuna tıklayın.</p>
                        <ul className="list-disc pl-5 text-xs opacity-80 mt-1 space-y-1">
                            <li>Tür seçin: <strong>Web Uygulaması</strong></li>
                            <li>Erişimi olanlar: <strong>Herkes (Anyone)</strong> (Bu çok önemli, yoksa uygulama veriye erişemez)</li>
                            <li>Dağıt'a tıklayın ve izinleri onaylayın.</li>
                        </ul>
                    </div>

                    <div className="space-y-1">
                        <span className="font-bold block text-slate-800 dark:text-white">Adım 5: Linki Al</span>
                        <p>Size verilen <strong>Web Uygulaması URL</strong>'sini (script.google.com ile başlayan) kopyalayın.</p>
                    </div>
                </div>
            )}

            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                    Web Uygulaması URL'si
                </label>
                <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/..../exec"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none font-mono text-xs sm:text-sm"
                    />
                </div>
                <p className="text-xs text-slate-400">Bu linki diğer cihazlarınızdaki uygulamaya da girerseniz verileriniz ortak olur.</p>
            </div>

            <button 
                onClick={handleSave}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-transform"
            >
                <Save size={20} />
                Ayarları Kaydet
            </button>
        </div>
      </div>
    </div>
  );
};

export default CloudSetupModal;
