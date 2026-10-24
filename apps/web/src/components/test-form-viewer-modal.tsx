'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { getTestFormPreviewUrl, printTestFormPdf, downloadTestFormPdf } from '@/lib/test-form-utils';

interface TestFormViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  testCode: string;
  testStandard?: string;
  sampleNumber?: string;
  pdfEndpoint: string;
  hasTemplate?: boolean;
  defaultFilename?: string;
}

export default function TestFormViewerModal({
  isOpen,
  onClose,
  title,
  testCode,
  testStandard,
  sampleNumber,
  pdfEndpoint,
  hasTemplate = true,
  defaultFilename,
}: TestFormViewerModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !pdfEndpoint) {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setError(null);
      return;
    }

    let isMounted = true;
    let localBlobUrl: string | null = null;
    setLoading(true);
    setError(null);

    getTestFormPreviewUrl(pdfEndpoint)
      .then((url) => {
        if (isMounted) {
          localBlobUrl = url;
          setBlobUrl(url);
          setLoading(false);
        } else {
          window.URL.revokeObjectURL(url);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err?.message || 'Failed to generate PDF document');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (localBlobUrl) {
        window.URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [isOpen, pdfEndpoint]);

  if (!isOpen) return null;

  const resolvedFilename = defaultFilename || `${sampleNumber || 'DOW'}_${testCode}_Form.pdf`;

  const handlePrint = () => {
    printTestFormPdf(pdfEndpoint);
  };

  const handleDownload = () => {
    downloadTestFormPdf(pdfEndpoint, resolvedFilename);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
                {hasTemplate ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Official Form
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3" /> QR Label Fallback
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {testCode} {testStandard ? `• ${testStandard}` : ''}{' '}
                {sampleNumber ? `• Specimen: ${sampleNumber}` : ''}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !!error}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-xl shadow-md transition"
              title="Print document directly to office printer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={loading || !!error}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-xl transition"
              title="Download PDF to computer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                title="Open in new window"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
              <p className="text-xs font-medium">Generating QR-stamped laboratory document...</p>
            </div>
          )}

          {error && (
            <div className="max-w-md p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Document Generation Notice</h3>
              <p className="text-xs text-rose-200">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={`Preview of ${title}`}
            />
          )}
        </div>

        {/* Footer info note */}
        <div className="px-6 py-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            {hasTemplate
              ? 'Official Department of Works laboratory form stamped with authentic QR tracking code.'
              : 'Notice: Official form template is not in the digital archive. A printable QR custody label has been provided.'}
          </span>
          <span className="font-mono text-slate-400">{sampleNumber || 'DoW MS'}</span>
        </div>
      </div>
    </div>
  );
}
