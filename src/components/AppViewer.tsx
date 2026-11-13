import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, RotateCw } from 'lucide-react';
import { AppItem } from '../types';

interface AppViewerProps {
  app: AppItem;
  url: string;
  onClose: () => void;
}

/** Full-screen in-app iframe viewer so external dashboards stay inside the PWA window. */
export const AppViewer: React.FC<AppViewerProps> = ({ app, url, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const handleReload = () => {
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#f4f6fa]"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Top App Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 bg-[#09234e] px-3 text-white shadow-md sm:px-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>WMD Hub</span>
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: app.color }}
          />
          <h2 className="truncate text-sm font-semibold tracking-tight sm:text-base">
            {app.name}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleReload}
            title="Reload"
            aria-label="Reload"
            className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in browser"
            aria-label="Open in browser"
            className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* Thin loading bar */}
      {isLoading && (
        <div className="h-0.5 w-full overflow-hidden bg-[#09234e]/15">
          <div className="h-full w-1/2 animate-pulse bg-[#d49b27]" />
        </div>
      )}

      {/* Embedded App Frame */}
      <iframe
        key={reloadKey}
        src={url}
        title={app.name}
        onLoad={() => setIsLoading(false)}
        className="w-full flex-1 border-0 bg-white"
        allow="clipboard-read; clipboard-write; fullscreen"
      />
    </div>
  );
};
