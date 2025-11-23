import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onScanFailure, onClose }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Slight delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true
            },
            /* verbose= */ false
        );
    
        scanner.render(
            (decodedText) => {
                scanner.clear().then(() => {
                    onScanSuccess(decodedText);
                }).catch(err => console.error("Failed to clear scanner", err));
            },
            (errorMessage) => {
                if (onScanFailure) onScanFailure(errorMessage);
            }
        );

        // Cleanup on unmount
        return () => {
             scanner.clear().catch(error => {
                 console.error("Failed to clear html5-qrcode scanner during cleanup", error);
             });
        };
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [onScanSuccess, onScanFailure]);

  return (
    <div className="fixed inset-0 z-[200] bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl overflow-hidden relative">
        <button 
            onClick={onClose}
            className="absolute top-2 right-2 z-10 p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-200"
        >
            <X size={24} />
        </button>
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-center font-bold text-slate-800 dark:text-white">Barkodu Okutun</h3>
        </div>
        <div id="reader" className="w-full bg-black"></div>
        <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
            Kamerayı barkoda doğru tutun.
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;