import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { sound } from '../utils/audio';
import {
  X,
  Smartphone,
  Download,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Terminal,
  QrCode,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface ApkGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkGuideModal: React.FC<ApkGuideModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install, isAndroid } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  // The published preview URL
  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-levl2mlpzx3qmqybfngasi-768077204224.asia-northeast1.run.app';

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    appUrl
  )}&margin=8`;

  const pwabuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(appUrl)}`;

  const bubblewrapCmd = `npx @bubblewrap/cli init --manifest=${appUrl}/manifest.webmanifest\nnpx @bubblewrap/cli build`;

  const handleCopyUrl = () => {
    sound.playClick();
    navigator.clipboard.writeText(appUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyCmd = () => {
    sound.playClick();
    navigator.clipboard.writeText(bubblewrapCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleInstallClick = async () => {
    sound.playClick();
    await install();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-900 dark:text-slate-100 my-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Android App & APK</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded font-bold">
                  v2.4 Android
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Install as a native full-screen app on your phone or generate a signed APK
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code + Instant Phone Installation Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-center gap-5">
          {/* QR Code for phone scan */}
          <div className="p-2 bg-white rounded-xl shadow-xs shrink-0 flex flex-col items-center">
            <img
              src={qrCodeUrl}
              alt="Scan to open on Android"
              className="w-36 h-36 rounded-lg object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="text-[10px] font-mono text-slate-500 font-semibold mt-1">
              Scan with phone camera
            </span>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
              Fastest Method · No APK File Needed
            </span>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Install Directly on Android
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Scan the QR code with your phone (or open this page in Chrome on Android). Android will immediately prompt to <strong>Install App</strong> as an official full-screen native WebAPK.
            </p>

            <div className="pt-1 flex flex-wrap justify-center sm:justify-start gap-2">
              {isInstallable && (
                <button
                  onClick={handleInstallClick}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Install on this Device</span>
                </button>
              )}

              <button
                onClick={handleCopyUrl}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'URL Copied!' : 'Copy Mobile Link'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Binary APK Builder (PWABuilder) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
                Method 2 · Standalone APK File
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                Download Signed APK via PWABuilder
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                If you need an actual <strong>.apk</strong> file to sideload or distribute to other devices, you can generate it in 30 seconds using Microsoft PWABuilder (pre-configured with our 512px icons and standalone manifest).
              </p>
            </div>
          </div>

          <a
            href={pwabuilderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-between w-full p-3 bg-white dark:bg-slate-900 hover:bg-blue-50/50 dark:hover:bg-slate-800 border border-blue-200 dark:border-blue-900/40 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="font-bold">Build & Download .APK Package (PWABuilder)</span>
            </div>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        {/* Method 3: Command Line (Bubblewrap) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
              <span>Method 3 · Build Locally with Bubblewrap CLI</span>
            </span>
            <button
              onClick={handleCopyCmd}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              {copiedCmd ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed">
            {bubblewrapCmd}
          </pre>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-1">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
