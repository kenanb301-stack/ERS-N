
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, ScanLine, Zap, ZapOff, ZoomIn, ZoomOut, AlertTriangle, RefreshCw } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onScanFailure, onClose }) => {
  const [error, setError] = useState<string>('');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomCap, setZoomCap] = useState<{min: number, max: number} | null>(null);
  const [status, setStatus] = useState<string>('Kamera başlatılıyor...');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef<boolean>(true);

  // Ses efekti
  const playBeep = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log("Audio play failed", e));
  };

  useEffect(() => {
    mountedRef.current = true;

    // 1. HTTPS Kontrolü
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setError("Güvenlik nedeniyle tarayıcılar kamerayı sadece HTTPS veya Localhost üzerinde çalıştırır. Lütfen güvenli bağlantı kullanın.");
        return;
    }

    const startScanner = async () => {
      // Önceki bir instance varsa temizle
      if (scannerRef.current) {
        try {
            if (scannerRef.current.isScanning) {
                await scannerRef.current.stop();
            }
            scannerRef.current.clear();
        } catch (e) {
            // ignore cleanup errors
        }
      }

      // Formatları kısıtlamak performansı CİDDİ oranda artırır.
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];

      const html5QrCode = new Html5Qrcode("reader", { 
          formatsToSupport: formatsToSupport,
          verbose: false
      });
      
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 300, height: 200 },
        aspectRatio: 1.0,
        disableFlip: false,
      };

      // Kademeli Başlatma Stratejisi
      // 1. Yüksek Kalite (Çözünürlük kısıtlamalı)
      // 2. Standart (Sadece facingMode)
      // 3. Herhangi bir kamera

      const startWithConstraints = async (constraints: any, attemptName: string) => {
          console.log(`Kamera başlatılıyor (${attemptName})...`);
          setStatus(`Kamera başlatılıyor (${attemptName})...`);
          
          await html5QrCode.start(
            constraints, 
            config,
            (decodedText) => {
                if (!mountedRef.current) return;
                playBeep();
                
                if (scannerRef.current?.isScanning) {
                     scannerRef.current.stop().then(() => {
                        scannerRef.current?.clear();
                        onScanSuccess(decodedText);
                    }).catch(err => {
                        onScanSuccess(decodedText);
                    });
                } else {
                    onScanSuccess(decodedText);
                }
            },
            (errorMessage) => {
                // Okuma hatası - kritik değil
            }
          );
      };

      try {
        // DENEME 1: Arka Kamera + Yüksek Çözünürlük
        try {
            await startWithConstraints({
                facingMode: "environment",
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                focusMode: "continuous"
            }, "HD Modu");
        } catch (errHigh) {
            console.warn("HD mod başarısız, standart moda geçiliyor...", errHigh);
            
            // DENEME 2: Sadece Arka Kamera (Çözünürlük yok)
            try {
                await startWithConstraints({ facingMode: "environment" }, "Standart Mod");
            } catch (errBasic) {
                console.warn("Standart arka kamera başarısız, herhangi bir kamera deneniyor...", errBasic);

                // DENEME 3: Herhangi bir kamera (Örn: Ön kamera veya laptop kamerası)
                await startWithConstraints({ facingMode: "user" }, "Genel Mod");
            }
        }

        // Başarılı olursa yetenekleri kontrol et
        if (html5QrCode.isScanning) {
            try {
                 // @ts-ignore - Kütüphane tiplerinde eksiklik olabilir
                const capabilities = html5QrCode.getRunningTrackCapabilities() as any;

                if (capabilities.torch) {
                    setHasTorch(true);
                }

                if (capabilities.zoom) {
                    setZoomCap({
                        min: capabilities.zoom.min,
                        max: capabilities.zoom.max
                    });
                    setZoom(capabilities.zoom.min);
                }
            } catch (capErr) {
                console.log("Kamera yetenekleri alınamadı", capErr);
            }
        }

      } catch (finalErr: any) {
        console.error("Tüm kamera denemeleri başarısız oldu", finalErr);
        let msg = "Kamera başlatılamadı.";
        
        if (finalErr?.name === "NotAllowedError" || finalErr?.name === "PermissionDeniedError") {
            msg = "Kamera izni reddedildi. Lütfen tarayıcı ayarlarından kameraya izin verin.";
        } else if (finalErr?.name === "NotFoundError" || finalErr?.name === "DevicesNotFoundError") {
            msg = "Kamera cihazı bulunamadı.";
        } else if (finalErr?.name === "NotReadableError" || finalErr?.name === "TrackStartError") {
            msg = "Kamera şu anda başka bir uygulama tarafından kullanılıyor veya erişilemiyor.";
        } else if (finalErr?.name === "OverconstrainedError") {
            msg = "Kamera istenen çözünürlüğü desteklemiyor.";
        }
        
        if (mountedRef.current) {
            setError(msg);
        }
      }
    };

    // UI render olduktan hemen sonra başlat
    const timer = setTimeout(() => {
        startScanner();
    }, 100);

    return () => {
      clearTimeout(timer);
      mountedRef.current = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Cleanup failed", err));
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
          }).catch(err => console.error("Torch error", err));
      }
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newZoom = Number(e.target.value);
      setZoom(newZoom);
      if (scannerRef.current) {
          scannerRef.current.applyVideoConstraints({
              advanced: [{ zoom: newZoom }]
          } as any).catch(err => console.error("Zoom error", err));
      }
  };

  const handleRetry = () => {
      setError('');
      setStatus('Yeniden deneniyor...');
      // useEffect'i tetiklemek için basit bir trick: componenti unmount/mount etmek yerine sayfayı yenilemek en temizi ama burada state reset yeterli
      window.location.reload(); 
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-white flex items-center gap-2">
            <Camera className="text-blue-400 animate-pulse" />
            <span className="font-bold text-sm tracking-wider">BARKOD OKUYUCU</span>
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
            <div className="text-white text-center p-6 px-10 max-w-md">
                <div className="mb-4 bg-red-500/20 p-4 rounded-full inline-block animate-bounce">
                    <AlertTriangle size={48} className="text-red-500" />
                </div>
                <p className="text-lg font-bold mb-2">Kamera Hatası</p>
                <p className="text-sm text-gray-300 mb-6 leading-relaxed">{error}</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={onClose} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors">
                        Kapat
                    </button>
                    <button onClick={handleRetry} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors">
                        <RefreshCw size={18} /> Yeniden Dene
                    </button>
                </div>
            </div>
        ) : (
            <>
                <div id="reader" className="w-full h-full bg-black"></div>
                
                {/* Status Loading Overlay */}
                {!scannerRef.current?.isScanning && !error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                        <div className="text-center">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-white text-sm">{status}</p>
                        </div>
                    </div>
                )}
                
                {/* Overlay UI */}
                {!error && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        {/* Scan Area Box */}
                        <div className="w-72 h-48 sm:w-80 sm:h-56 border-2 border-white/40 rounded-xl relative overflow-hidden bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                            {/* Scanning Line Animation */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.9)] animate-[scan-horizontal_2s_ease-in-out_infinite]"></div>
                            
                            {/* Corners */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg"></div>
                        </div>

                        {/* Zoom Controls (Pointer events enabled for slider) */}
                        {zoomCap && (
                             <div className="absolute bottom-24 w-64 pointer-events-auto flex items-center gap-3 bg-black/50 p-2 rounded-full backdrop-blur-sm animate-fade-in-up">
                                <ZoomOut size={16} className="text-white" />
                                <input 
                                    type="range" 
                                    min={zoomCap.min} 
                                    max={zoomCap.max} 
                                    step="0.1" 
                                    value={zoom} 
                                    onChange={handleZoomChange}
                                    className="w-full h-1 bg-gray-400 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <ZoomIn size={16} className="text-white" />
                             </div>
                        )}

                        <p className="absolute bottom-10 text-white/90 text-xs sm:text-sm font-bold bg-black/60 px-6 py-2 rounded-full backdrop-blur-md flex items-center gap-2">
                            <ScanLine size={16} /> Barkodu çerçeveye ortalayın
                        </p>
                    </div>
                )}
            </>
        )}
      </div>

      <style>{`
        @keyframes scan-horizontal {
            0% { left: 0; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { left: 100%; opacity: 0; }
        }
        #reader { width: 100% !important; height: 100% !important; border: none !important; }
        #reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;
