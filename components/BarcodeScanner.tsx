
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, ScanLine, Zap, ZapOff, ZoomIn, ZoomOut } from 'lucide-react';

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
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef<boolean>(true);

  // Ses efekti
  const playBeep = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log("Audio play failed", e));
  };

  useEffect(() => {
    mountedRef.current = true;

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
      // Gereksiz formatları (Aztec, PDF417 vb.) taramaya çalışmaz.
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
        fps: 15, // FPS artırıldı
        qrbox: { width: 300, height: 200 }, // Alan biraz daha genişletildi
        aspectRatio: 1.0,
        disableFlip: false,
      };

      const videoConstraints = {
          facingMode: "environment",
          width: { min: 640, ideal: 1280, max: 1920 }, // Daha yüksek çözünürlük iste
          height: { min: 480, ideal: 720, max: 1080 },
          focusMode: "continuous" // Sürekli odaklama iste
      };

      try {
        await html5QrCode.start(
          videoConstraints, 
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
            // Okuma hatası
          }
        );

        // Kamera özelliklerini kontrol et (Zoom ve Flash için)
        if (html5QrCode.isScanning) {
            // @ts-ignore - Kütüphane tiplerinde eksiklik olabilir
            const track = html5QrCode.getRunningTrackCameraCapabilities();
            const capabilities = html5QrCode.getRunningTrackCapabilities() as any;

            if (capabilities.torch) {
                setHasTorch(true);
            }

            if (capabilities.zoom) {
                setZoomCap({
                    min: capabilities.zoom.min,
                    max: capabilities.zoom.max
                });
                setZoom(capabilities.zoom.min); // Başlangıç zoom seviyesi
            }
        }

      } catch (err) {
        console.error("Environment camera failed", err);
        // Fallback: Varsayılan kamera
        try {
            if (!mountedRef.current) return;
            await html5QrCode.start(
                { facingMode: "user" },
                config,
                (decodedText) => {
                    playBeep();
                    onScanSuccess(decodedText);
                    onClose();
                },
                () => {}
            );
        } catch (err2) {
            if (mountedRef.current) {
                setError("Kamera başlatılamadı. İzinleri kontrol edin.");
            }
        }
      }
    };

    setTimeout(() => {
        startScanner();
    }, 100);

    return () => {
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
            <div className="text-white text-center p-6 px-10">
                <div className="mb-4 bg-red-500/20 p-4 rounded-full inline-block">
                    <X size={48} className="text-red-500" />
                </div>
                <p className="text-lg font-bold mb-2">Kamera Hatası</p>
                <p className="text-sm text-gray-300 mb-6">{error}</p>
                <button onClick={onClose} className="px-6 py-3 bg-white text-black rounded-xl font-bold active:scale-95 transition-transform">
                    Kapat
                </button>
            </div>
        ) : (
            <>
                <div id="reader" className="w-full h-full"></div>
                
                {/* Overlay UI */}
                {!error && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        {/* Scan Area Box */}
                        <div className="w-80 h-48 border-2 border-white/40 rounded-xl relative overflow-hidden bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
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
                             <div className="absolute bottom-24 w-64 pointer-events-auto flex items-center gap-3 bg-black/50 p-2 rounded-full backdrop-blur-sm">
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

                        <p className="absolute bottom-10 text-white/90 text-sm font-bold bg-black/60 px-6 py-2 rounded-full backdrop-blur-md flex items-center gap-2">
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
