
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, ScanLine } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onScanFailure, onClose }) => {
  const [error, setError] = useState<string>('');
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
            await scannerRef.current.stop();
            scannerRef.current.clear();
        } catch (e) {
            // ignore cleanup errors
        }
      }

      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 300, height: 100 }, // Barkod için geniş dikdörtgen
        aspectRatio: 1.0, 
      };

      try {
        // Doğrudan arka kamerayı başlatmayı dene
        await html5QrCode.start(
          { facingMode: "environment" }, 
          config,
          (decodedText) => {
            if (!mountedRef.current) return;
            // Başarılı okuma
            playBeep();
            
            // Taramayı durdur ve başarı callback'ini çağır
            if (scannerRef.current?.isScanning) {
                 scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                    onScanSuccess(decodedText);
                }).catch(err => {
                    console.error("Stop failed", err);
                    onScanSuccess(decodedText);
                });
            } else {
                onScanSuccess(decodedText);
            }
          },
          (errorMessage) => {
            // Okuma hatası (QR/Barkod bulunamadı) - sessizce geç
          }
        );
      } catch (err) {
        console.error("Environment camera failed", err);
        // Eğer arka kamera (environment) hata verirse, kısıtlama olmadan (varsayılan kamera) dene
        try {
            if (!mountedRef.current) return;
            console.log("Retrying with default config...");
            await html5QrCode.start(
                { facingMode: "user" }, // Fallback to user/default if env fails
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
                setError("Kamera başlatılamadı. Lütfen tarayıcı ayarlarından kamera izni verdiğinizden emin olun.");
            }
        }
      }
    };

    // DOM render olduktan hemen sonra başlat
    setTimeout(() => {
        startScanner();
    }, 100);

    return () => {
      mountedRef.current = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Cleanup stop failed", err));
        scannerRef.current.clear();
      }
    };
  }, [onScanSuccess, onClose]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/70 to-transparent">
        <div className="text-white flex items-center gap-2">
            <Camera className="text-blue-400 animate-pulse" />
            <span className="font-bold text-sm tracking-wider">BARKOD OKUYUCU</span>
        </div>
        <button 
            onClick={() => {
                if (scannerRef.current?.isScanning) {
                    scannerRef.current.stop().then(() => {
                        scannerRef.current?.clear();
                        onClose();
                    }).catch(() => onClose());
                } else {
                    onClose();
                }
            }}
            className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
        >
            <X size={24} />
        </button>
      </div>

      {/* Camera View */}
      <div className="w-full h-full relative flex items-center justify-center bg-black">
        {error ? (
            <div className="text-white text-center p-6 px-10">
                <div className="mb-4 bg-red-500/20 p-4 rounded-full inline-block">
                    <X size={48} className="text-red-500" />
                </div>
                <p className="text-lg font-bold mb-2">Kamera Erişilemedi</p>
                <p className="text-sm text-gray-300 mb-6">{error}</p>
                <button onClick={onClose} className="px-6 py-3 bg-white text-black rounded-xl font-bold active:scale-95 transition-transform">
                    Kapat
                </button>
            </div>
        ) : (
            <>
                {/* Scanner container needs explicit ID */}
                <div id="reader" className="w-full h-full"></div>
                
                {/* Overlay UI */}
                {!error && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        {/* Scan Area Box - Rectangular for Barcode */}
                        <div className="w-72 h-32 border-2 border-white/30 rounded-xl relative overflow-hidden bg-white/5 backdrop-blur-[1px]">
                            {/* Scanning Line Animation */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-[scan-horizontal_2s_ease-in-out_infinite]"></div>
                            
                            {/* Corners */}
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-lg"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-lg"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-lg"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-lg"></div>
                        </div>
                        <p className="mt-8 text-white/90 text-sm font-bold bg-black/60 px-6 py-2 rounded-full backdrop-blur-md flex items-center gap-2">
                            <ScanLine size={16} /> Barkodu çizgiye hizalayın
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
        /* Hide html5-qrcode default elements and ensure video covers screen */
        #reader { width: 100% !important; height: 100% !important; border: none !important; }
        #reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
        #reader__scan_region img { display: none; }
        #reader__dashboard_section_csr button { display: none; }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;