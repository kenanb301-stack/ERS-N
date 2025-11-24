import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Zap } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onScanFailure, onClose }) => {
  const [isPermitted, setIsPermitted] = useState(false);
  const [error, setError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Ses efekti
  const playBeep = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log("Audio play failed", e));
  };

  useEffect(() => {
    const startScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
            // Kamera var
        }

        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" }, // Arka kamera öncelikli
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            formatsToSupport: [ 
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.EAN_13 
            ]
          },
          (decodedText) => {
            // Başarılı okuma
            playBeep();
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().then(() => {
                    onScanSuccess(decodedText);
                }).catch(err => console.error("Stop failed", err));
            } else {
                onScanSuccess(decodedText);
            }
          },
          (errorMessage) => {
            // Hata veya okuma yok (Sessizce geç)
            // if (onScanFailure) onScanFailure(errorMessage);
          }
        );
        
        setIsPermitted(true);

      } catch (err) {
        console.error("Camera start error", err);
        setError("Kamera başlatılamadı. Lütfen izinleri kontrol edin.");
      }
    };

    // DOM render olduktan hemen sonra başlat
    setTimeout(() => {
        startScanner();
    }, 100);

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Cleanup stop failed", err));
        scannerRef.current.clear();
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/70 to-transparent">
        <div className="text-white flex items-center gap-2">
            <Camera className="text-blue-400 animate-pulse" />
            <span className="font-bold text-sm tracking-wider">TARAYICI AKTİF</span>
        </div>
        <button 
            onClick={() => {
                if (scannerRef.current?.isScanning) {
                    scannerRef.current.stop().then(onClose);
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
            <div className="text-white text-center p-6">
                <div className="mb-4 bg-red-500/20 p-4 rounded-full inline-block">
                    <X size={48} className="text-red-500" />
                </div>
                <p className="text-lg font-bold mb-2">Kamera Hatası</p>
                <p className="text-sm text-gray-400">{error}</p>
                <button onClick={onClose} className="mt-6 px-6 py-2 bg-white text-black rounded-full font-bold">
                    Kapat
                </button>
            </div>
        ) : (
            <>
                <div id="reader" className="w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover"></div>
                
                {/* Overlay UI */}
                {!error && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        {/* Scan Area Box */}
                        <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative overflow-hidden bg-white/5 backdrop-blur-[2px]">
                            {/* Scanning Line Animation */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                            
                            {/* Corners */}
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
                        </div>
                        <p className="mt-8 text-white/80 text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                            QR Kodu veya Barkodu çerçeveye tutun
                        </p>
                    </div>
                )}
            </>
        )}
      </div>

      <style>{`
        @keyframes scan {
            0% { top: 0; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        /* Hide html5-qrcode default elements */
        #reader__scan_region img { display: none; }
        #reader__dashboard_section_csr button { display: none; }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;