'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  Camera,
  Upload,
  X,
  AlertCircle,
  Search,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (decodedText: string) => void;
}

export default function QrScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: QrScannerModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'qr-reader-viewport';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setScannedResult(null);
      setErrorMsg(null);
      setManualCode('');
      return;
    }

    if (activeTab === 'camera') {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, activeTab]);

  const handleScanSuccess = (text: string) => {
    // Extract token if text is a URL
    let token = text.trim();
    try {
      if (token.includes('token=')) {
        const url = new URL(token);
        const urlToken = url.searchParams.get('token');
        if (urlToken) token = urlToken;
      }
    } catch {
      // not a full URL, use raw string
    }

    setScannedResult(token);
    stopScanner();

    if (onScanSuccess) {
      onScanSuccess(token);
    } else {
      router.push(`/samples/scan?token=${encodeURIComponent(token)}`);
      onClose();
    }
  };

  const startScanner = async () => {
    setErrorMsg(null);
    setIsScanning(true);

    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore
        }
      }

      // Small delay to ensure container element is mounted
      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode(readerElementId);
          scannerRef.current = html5QrCode;

          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          };

          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              handleScanSuccess(decodedText);
            },
            () => {
              // frame scanned without code
            }
          );
          setHasCameraPermission(true);
        } catch (err: any) {
          console.warn('Camera start error:', err);
          setHasCameraPermission(false);
          setErrorMsg(
            'Unable to access camera. Please allow camera permissions or enter the Sample ID manually.'
          );
          setIsScanning(false);
        }
      }, 200);
    } catch (err: any) {
      setErrorMsg('Failed to initialize scanner. ' + (err.message || ''));
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        // ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    try {
      const html5QrCode = new Html5Qrcode('qr-file-processor');
      const result = await html5QrCode.scanFile(file, true);
      handleScanSuccess(result);
      html5QrCode.clear();
    } catch (err: any) {
      setErrorMsg('No readable QR code found in the uploaded image. Please try another image.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanSuccess(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">QR Sample Scanner</h3>
              <p className="text-xs text-slate-400">DoW Materials Custody & Tracking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 pt-2">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'camera'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" /> Live Camera
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" /> Upload Image
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'manual'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" /> Manual ID Entry
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'camera' && (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-800 min-h-[280px] flex items-center justify-center">
                <div id={readerElementId} className="w-full h-full min-h-[280px]" />
                {!isScanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950">
                    <Camera className="w-10 h-10 text-slate-600 mb-2" />
                    <p className="text-xs text-slate-400 max-w-xs mb-4">
                      {hasCameraPermission === false
                        ? 'Camera access was denied or is unavailable.'
                        : 'Camera is currently stopped.'}
                    </p>
                    <button
                      onClick={startScanner}
                      className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium flex items-center gap-2 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Start Camera
                    </button>
                  </div>
                )}
              </div>
              <p className="text-center text-[11px] text-slate-400">
                Position the official DoW sample label QR code within the viewfinder.
              </p>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-slate-700 hover:border-teal-500/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition-all text-center">
                <Upload className="w-10 h-10 text-teal-400 mb-3" />
                <span className="text-sm font-medium text-slate-200 mb-1">
                  Click to select QR code photo
                </span>
                <span className="text-xs text-slate-500">Supports PNG, JPG, or JPEG</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <div id="qr-file-processor" className="hidden" />
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Sample Number or QR Token
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="e.g. 26P-S-001 or UUID token"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Accepts DoW standard numbers (26P-S-001, 26P-A-001) or 64-char QR tokens.
                </p>
              </div>

              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Locate Sample Record
              </button>
            </form>
          )}

          {scannedResult && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold block">Detected Code:</span>
                <span className="font-mono text-[11px]">{scannedResult}</span>
              </div>
              <button
                onClick={() => handleScanSuccess(scannedResult)}
                className="px-3 py-1.5 rounded bg-emerald-600 text-white font-medium text-[11px] hover:bg-emerald-500"
              >
                Proceed
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center text-[11px] text-slate-400">
          <span>Department of Works • Quality Assurance</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
