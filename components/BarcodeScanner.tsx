
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, ScanLine, Zap, ZapOff, ZoomIn, ZoomOut, AlertTriangle, RefreshCw, Info } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onScanFailure, onClose }) => {
  const [error, setError] = useState<string>('');
  const [debugError, setDebugError] = useState<string>('');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomCap, setZoomCap] = useState<{min: number, max: number} | null>(null);
  const [status, setStatus] = useState<string>('Kamera izni kontrol ediliyor...');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef<boolean>(true);
  const isScanningRef = useRef<boolean>(false);

  // Ses efekti
  const playBeep = () => {
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => { /* Audio play error ignored */ });
    } catch (e) {
        // Ignore audio errors
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    isScanningRef.current = false;

    // 1. HTTPS Kontrolü
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setError("Güvenlik nedeniyle kamera sadece HTTPS veya Localhost üzerinde çalışır.");
        return;
    }

    const startScanner = async () => {
      // Temizlik
      if (scannerRef.current) {
        try {
            if (scannerRef.current.isScanning) {
                await scannerRef.current.stop();
            }
            scannerRef.current.clear();
        } catch (e) {
            console.warn("Cleanup error:", e);
        }
      }

      // 2. Format Kısıtlaması (Code 128, EAN, QR) - Performans için
      const html5QrCode = new Html5Qrcode("reader", { 
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.QR_CODE,
          ]
      });
      scannerRef.current = html5QrCode;

      // 3. İzin Kontrolü (Önden kontrol ederek hatayı net yakalıyoruz)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // İzin alındı, hemen akışı durdurup kütüphaneye bırakıyoruz
        stream.getTracks().forEach(track => track.stop());
      } catch (permErr: any) {
        console.error("Permission Error:", permErr);
        setError("Kamera izni verilmedi veya erişilemiyor.");
        setDebugError(`${permErr.name}: ${permErr.message}`);
        return;
      }

      // 4. Kademeli Başlatma Stratejileri
      const strategies = [
        // Strateji 1: Arka Kamera (En iyi deneyim)
        { name: "Arka Kamera", config: { facingMode: "environment" } },
        // Strateji 2: Ön Kamera (Tablet/Laptop)
        { name: "Ön Kamera", config: { facingMode: "user" } },
        // Strateji 3: Herhangi bir kamera (Kısıtlama yok)
        { name: "Genel Mod", config: true }
      ];

      // Ortak QR Ayarları
      const qrConfig = {
        fps: 10, // 15 yerine 10 daha stabil
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0, 
        disableFlip: false,
      };

      for (const strategy of strategies) {
        if (!mountedRef.current) break;
        if (isScanningRef.current) break;

        try {
            setStatus(`${strategy.name} başlatılıyor...`);
            console.log(`Trying strategy: ${strategy.name}`);
            
            await html5QrCode.start(
                strategy.config, 
                qrConfig,
                (decodedText) => {
                    if (!mountedRef.current) return;
                    // Çoklu okumayı önle
                    if (isScanningRef.current) return; 
                    
                    playBeep();
                    isScanningRef.current = true; // Flag set

                    // Başarılı okuma sonrası durdur
                    html5QrCode.stop().then(() => {
                        html5QrCode.clear();
                        onScanSuccess(decodedText);
                    }).catch(err => {
                        console.warn("Stop failed", err);
                        onScanSuccess(decodedText); // Yine de devam et
                    });
                },
                (errorMessage) => {
                    // Okuma hatası - Kullanıcıya göstermeye gerek yok
                }
            );
            
            // Başarılı olduysa döngüden çık
            setStatus("");
            isScanningRef.current = false; // Scanning but waiting for code
            
            // Yetenekleri Kontrol Et (Flaş / Zoom)
            try {
                // @ts-ignore
                const capabilities = html5QrCode.getRunningTrackCapabilities() as any;
                if (capabilities) {
                    if (capabilities.torch) setHasTorch(true);
                    if (capabilities.zoom) {
                        setZoomCap({ min: capabilities.zoom.min, max: capabilities.zoom.max });
                        setZoom(capabilities.zoom.min);
                    }
                }
            } catch (capErr) {
                console.log("Capabilities check failed", capErr);
            }
            
            return; // Başarılı, fonksiyondan çık

        } catch (err: any) {
            console.warn(`${strategy.name} failed:`, err);
            // Son strateji de başarısız olursa hata göster
            if (strategy === strategies[strategies.length - 1]) {
                setError("Kamera başlatılamadı.");
                setDebugError(`${err.name}: ${err.message}`);
            }
        }
      }
    };

    // DOM render sonrası başlat
    const timer = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(timer);
      mountedRef.current = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(e => console.error("Cleanup stop failed", e));
        scannerRef.current.clear();
      }
    };
  }, [onScanSuccess, onClose]);

  const toggleTorch = () => {
      if (scannerRef.current && hasTorch) {
          const newStatus = !torchOn;
          scannerRef.current.applyVideoConstraints({
              advanced: [{ torch: newStatus }]
          } as any).then(() => {
              setTorchOn(newStatus);
          }).catch(err => console.error("Torch toggle failed", err));
      }
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newZoom = Number(e.target.value);
      setZoom(newZoom);
      if (scannerRef.current) {
          scannerRef.current.applyVideoConstraints({
              advanced: [{ zoom: newZoom }]
          } as any).catch(err => console.error("Zoom failed", err));
      }
  };

  const handleRetry = () => {
      window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-white flex items-center gap-2">
            <Camera className="text-blue-400 animate-pulse" />
            <span className="font-bold text-sm tracking-wider">TARAYICI</span>
        </div>
        <div className="flex gap-4">
            {hasTorch && (
                <button 
                    onClick={toggleTorch}
                    className={`p-2 rounded-full transition-colors ${torchOn ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white'}`}
                >
                    {torchOn ? <Zap size={24} fill="black" /> : <ZapOff size={24} />}
                </button>
            )}
            <button 
                onClick={() => onClose()}
                className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
            >
                <X size={24} />
            </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="w-full h-full relative flex items-center justify-center bg-black overflow-hidden">
        {error ? (
            <div className="text-white text-center p-6 px-10 max-w-md animate-fade-in">
                <div className="mb-4 bg-red-500/20 p-4 rounded-full inline-block">
                    <AlertTriangle size={48} className="text-red-500" />
                </div>
                <p className="text-lg font-bold mb-2">Kamera Hatası</p>
                <p className="text-sm text-gray-300 mb-4">{error}</p>
                
                {debugError && (
                    <div className="mb-6 p-3 bg-slate-800 rounded text-xs font-mono text-red-300 border border-red-900/50 break-all">
                        {debugError}
                    </div>
                )}
                
                <div className="flex flex-col gap-3">
                     <button onClick={handleRetry} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                        <RefreshCw size={18} /> Sayfayı Yenile
                    </button>
                    <button onClick={onClose} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors">
                        Kapat
                    </button>
                </div>
            </div>
        ) : (
            <>
                <div id="reader" className="w-full h-full bg-black"></div>
                
                {/* Status Loading Overlay */}
                {status && !error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 backdrop-blur-sm">
                        <div className="text-center">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-white text-sm font-medium">{status}</p>
                        </div>
                    </div>
                )}
                
                {/* Overlay UI */}
                {!status && !error && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        {/* Scan Area Box */}
                        <div className="w-64 h-64 border-2 border-white/40 rounded-3xl relative overflow-hidden bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-[scan-vertical_2s_ease-in-out_infinite]"></div>
                            
                            {/* Corners */}
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                        </div>

                        {/* Zoom Controls */}
                        {zoomCap && (
                             <div className="absolute bottom-24 w-64 pointer-events-auto flex items-center gap-3 bg-black/60 p-3 rounded-2xl backdrop-blur-md border border-white/10">
                                <ZoomOut size={16} className="text-white/70" />
                                <input 
                                    type="range" 
                                    min={zoomCap.min} 
                                    max={zoomCap.max} 
                                    step="0.1" 
                                    value={zoom} 
                                    onChange={handleZoomChange}
                                    className="w-full h-1 bg-gray-500 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <ZoomIn size={16} className="text-white/70" />
                             </div>
                        )}

                        <div className="absolute bottom-8 px-6 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2">
                             <Info size={16} className="text-blue-400" />
                             <span className="text-xs text-white/90">Barkodu karenin içine hizalayın</span>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>

      <style>{`
        @keyframes scan-vertical {
            0% { top: 0; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        #reader { width: 100% !important; height: 100% !important; border: none !important; }
        #reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;
