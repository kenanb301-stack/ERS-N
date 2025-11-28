
import React, { useState } from 'react';
import { X, Cloud, Save, Link, CheckCircle, HelpCircle, ExternalLink, Copy, AlertTriangle } from 'lucide-react';
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
    // Veriyi okurken A sütunundaki tüm parçaları alıp birleştiriyoruz
    var lastRow = sheet.getLastRow();
    if (lastRow < 1) return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Veri yok"})).setMimeType(ContentService.MimeType.JSON);

    var range = sheet.getRange(1, 1, lastRow, 1);
    var values = range.getValues();
    var fullJson = "";

    // Parçaları birleştir (Chunk Reassembly)
    for (var i = 0; i < values.length; i++) {
      fullJson += values[i][0];
    }

    if (!fullJson) return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Veri boş"})).setMimeType(ContentService.MimeType.JSON);

    try {
      var parsedData = JSON.parse(fullJson);
      return ContentService.createTextOutput(JSON.stringify({status: "success", data: parsedData})).setMimeType(ContentService.MimeType.JSON);
    } catch (e) {
      return ContentService.createTextOutput(JSON.stringify({status: "error", message: "JSON Parse Hatası"})).setMimeType(ContentService.MimeType.JSON);
    }
  }
}

function doPost(e) {
  try {
    var json = JSON.parse(e.postData.contents);
    var db = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = db.getSheetByName("Data") || db.insertSheet("Data");
    
    if (json.action == "save") {
      var dataStr = JSON.stringify(json.data);
      var CHUNK_SIZE = 45000; // Google Hücre Limiti 50k'dır. Güvenlik için 45k yapıyoruz.
      var chunks = [];

      // Veriyi parçalara böl (Chunking)
      for (var i = 0; i < dataStr.length; i += CHUNK_SIZE) {
        chunks.push([dataStr.substring(i, i + CHUNK_SIZE)]);
      }

      // Eski veriyi temizle (Sadece A sütunu)
      sheet.getRange("A:A").clearContent();

      // Yeni parçaları A1, A2, A3... hücrelerine alt alta yaz
      if (chunks.length > 0) {
        sheet.getRange(1, 1, chunks.length, 1).setValues(chunks);
      }

      // Yedekleme tarihini B1'e yaz (Bilgi amaçlı)
      sheet.getRange("B1").setValue(new Date());

      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}
    `;
    navigator.clipboard.writeText(code.trim());
    alert("YENİ Kod kopyalandı! Lütfen Google Apps Script'e yapıştırıp YENİ DAĞITIM oluşturun.");
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
                    Mobil ve PC'nizin aynı verileri görmesi için <strong>AYNI URL'yi</strong> her iki cihaza da girmeniz gerekir. Verileriniz Google Hesabınızdaki bir Excel dosyasında toplanır.
                </p>
            </div>

            <button 
                onClick={() => setShowGuide(!showGuide)}
                className="w-full flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
                <span className="flex items-center gap-2"><HelpCircle size={16}/> Kurulum Rehberi (Link Alamayanlar İçin)</span>
                <span>{showGuide ? 'Gizle' : 'Göster'}</span>
            </button>

            {showGuide && (
                <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 border-l-2 border-slate-200 dark:border-slate-600 pl-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-r-lg">
                    <div className="space-y-1">
                        <span className="font-bold block text-slate-800 dark:text-white text-base">Adım 1: Kod Hazırlığı (GÜNCELLENDİ)</span>
                        <a href="https://sheets.new" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-bold">
                            sheets.new <ExternalLink size={12}/>
                        </a> adresine gidin. Üst menüden <strong>Uzantılar &gt; Apps Script</strong> seçin.
                        <br/>Açılan sayfadaki kodları silin ve aşağıdaki butona tıklayıp kopyaladığınız kodu yapıştırın.
                        <button onClick={copyScriptCode} className="mt-2 w-full py-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-200 dark:hover:bg-emerald-900/50">
                            <Copy size={14} /> Yeni Kodu Kopyala
                        </button>
                    </div>

                    <div className="space-y-1">
                        <span className="font-bold block text-slate-800 dark:text-white text-base">Adım 2: Yayınlama (Çok Önemli)</span>
                        <ul className="list-decimal pl-5 space-y-1">
                            <li>Sağ üstteki mavi <strong>Dağıt (Deploy)</strong> butonuna bas &rarr; <strong>Yeni Dağıtım (New Deployment)</strong> seç.</li>
                            <li>Sol üstteki "Tür seçin" çark simgesine tıkla &rarr; <strong>Web Uygulaması</strong> seç.</li>
                            <li><span className="text-red-500 font-bold">Erişimi olanlar (Who has access):</span> Mutlaka <strong>"Herkes" (Anyone)</strong> seçilmeli.</li>
                            <li>Dağıt butonuna bas.</li>
                        </ul>
                    </div>

                    <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                        <span className="font-bold flex items-center gap-2 text-amber-800 dark:text-amber-400 text-base">
                            <AlertTriangle size={16} /> Adım 3: İzin Verme (En Çok Takılınan Yer)
                        </span>
                        <p className="text-xs">Google, kendi yazdığınız kod olduğu için sizi uyaracaktır. Şunları yapın:</p>
                        <ol className="list-decimal pl-5 text-xs font-bold space-y-1 text-slate-700 dark:text-slate-300">
                            <li>"Erişimi Yetkilendir" butonuna basın ve hesabınızı seçin.</li>
                            <li>"Google bu uygulamayı doğrulamadı" ekranı gelecektir.</li>
                            <li>Sol alttaki <span className="text-blue-600">Gelişmiş (Advanced)</span> linkine tıklayın.</li>
                            <li>Açılan kısmın en altındaki <span className="text-blue-600">... projesine git (güvenli değil)</span> linkine tıklayın.</li>
                            <li>Son olarak "İzin Ver" (Allow) deyin.</li>
                        </ol>
                    </div>

                    <div className="space-y-1">
                        <span className="font-bold block text-slate-800 dark:text-white text-base">Adım 4: Linki Al</span>
                        <p>Size verilen ve <code>/exec</code> ile biten Web Uygulaması URL'sini kopyalayıp aşağıdaki kutuya yapıştırın.</p>
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
                <p className="text-xs text-slate-400 font-bold">ÖNEMLİ: Bu linki kopyalayın ve hem PC'de hem Mobilde aynı şekilde girin.</p>
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
