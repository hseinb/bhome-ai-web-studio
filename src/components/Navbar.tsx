import React, { useState } from 'react';
import { 
  LayoutGrid, 
  Columns, 
  Table2, 
  Sparkles, 
  HardDrive, 
  RefreshCw, 
  Server,
  Layers,
  Settings,
  X
} from 'lucide-react';
import { ViewMode } from '../types/catalog';
import { Badge } from './common/Badge';
import { getLocalApiBaseUrl, setLocalApiBaseUrl } from '../api/localBackendApi';

interface NavbarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  totalItems: number;
  completeCount: number;
  missingMediaCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenDriveModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  totalItems,
  completeCount,
  missingMediaCount,
  isRefreshing,
  onRefresh,
  onOpenDriveModal
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState(getLocalApiBaseUrl());

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalApiBaseUrl(apiUrl);
    setIsSettingsOpen(false);
    onRefresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        
        {/* Brand & Studio Title */}
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-950/40">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">B HOME</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Product Studio
              </span>
            </div>
            <p className="text-xs text-slate-400">Local API & Backend Integration Portal</p>
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => onViewChange('grid')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'grid'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Media Grid
          </button>

          <button
            onClick={() => onViewChange('studio')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'studio'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Columns className="h-4 w-4" />
            Split Studio
          </button>

          <button
            onClick={() => onViewChange('matrix')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'matrix'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Table2 className="h-4 w-4" />
            Audit Matrix
          </button>

          <button
            onClick={() => onViewChange('ai-studio')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'ai-studio'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/30'
                : 'text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/30'
            }`}
          >
            <Sparkles className="h-4 w-4 text-emerald-300" />
            AI Studio
          </button>

          <button
            onClick={() => onViewChange('banners')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'banners'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md shadow-amber-950/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-200" />
            Promo Banners
          </button>
        </div>

        {/* Right Tools & Local API Status */}
        <div className="flex items-center gap-3">
          
          {/* Quick Metrics */}
          <div className="hidden lg:flex items-center gap-2 border-r border-slate-800 pr-4">
            <Badge variant="slate">
              <span className="text-slate-400">Total:</span> {totalItems}
            </Badge>
            <Badge variant="emerald">
              🟢 {completeCount} Complete
            </Badge>
            {missingMediaCount > 0 && (
              <Badge variant="rose">
                🔴 {missingMediaCount} Missing
              </Badge>
            )}
          </div>

          {/* Local API Endpoint Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
            title="Configure Local API Server IP"
          >
            <Server className="h-3.5 w-3.5 text-emerald-400" />
            <span className="truncate max-w-[120px]">{apiUrl.replace(/^https?:\/\//, '')}</span>
          </button>

          {/* Google Drive Asset Picker */}
          <button
            onClick={onOpenDriveModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
            title="Browse Company Google Drive"
          >
            <HardDrive className="h-4 w-4" />
            Drive
          </button>

          {/* Sync Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all ${
              isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Refresh Catalog from Local API"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

      </div>

      {/* Local API Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Local Backend API Settings</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveApiUrl} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Local Backend Base URL
                </label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="e.g. http://192.168.1.3:8090"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Default: <span className="font-mono text-slate-400">http://192.168.1.3:8090</span>.
                  All images and item edits will be pushed directly through this local endpoint.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-950/40"
                >
                  Save & Reconnect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};