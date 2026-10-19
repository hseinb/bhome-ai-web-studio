import React, { useState, useEffect, useCallback } from 'react';
import { 
  HardDrive, 
  X, 
  Search, 
  Folder, 
  FileImage, 
  Check, 
  Sparkles, 
  ArrowRight, 
  Download, 
  ExternalLink,
  Layers,
  LogIn,
  LogOut,
  Settings,
  AlertCircle,
  Loader2,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { Item, DriveAsset } from '../../types/catalog';
import { matchFilenameToItem } from '../../utils/skuMatcher';
import { Badge } from '../common/Badge';
import { 
  getGoogleClientId, 
  setGoogleClientId, 
  getGoogleDriveAccessToken, 
  getGoogleUserEmail, 
  signInWithGoogleDrive, 
  clearGoogleDriveAuth,
  listDriveFolders,
  listDriveImages
} from '../../api/googleDriveClient';

interface GoogleDriveBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  onAssignImageToItem: (item: Item, driveUrl: string) => void;
}

// Fallback demo assets when not authenticated or testing
const DEMO_DRIVE_ASSETS: DriveAsset[] = [
  {
    id: '1sQRoaZ8cjDptE_k4CLOmozBka5G8xuq2',
    name: '78919_MUG_COFFEE.jpg',
    url: 'https://lh3.googleusercontent.com/d/1sQRoaZ8cjDptE_k4CLOmozBka5G8xuq2',
    thumbnailUrl: 'https://lh3.googleusercontent.com/d/1sQRoaZ8cjDptE_k4CLOmozBka5G8xuq2',
    sizeBytes: 2450000,
    folder: 'Pictures'
  },
  {
    id: '1VupsvwQ3DjHJ94hULgt9sfdM2UnXrZg-',
    name: '54723_64514_1.webp',
    url: 'https://lh3.googleusercontent.com/d/1VupsvwQ3DjHJ94hULgt9sfdM2UnXrZg-',
    thumbnailUrl: 'https://lh3.googleusercontent.com/d/1VupsvwQ3DjHJ94hULgt9sfdM2UnXrZg-',
    sizeBytes: 145000,
    folder: 'Pictures'
  },
  {
    id: '1C2s1ENh3tAUL9Q-q3L6wq2Cupm7__q4b',
    name: '74459_WA0084.webp',
    url: 'https://lh3.googleusercontent.com/d/1C2s1ENh3tAUL9Q-q3L6wq2Cupm7__q4b',
    thumbnailUrl: 'https://lh3.googleusercontent.com/d/1C2s1ENh3tAUL9Q-q3L6wq2Cupm7__q4b',
    sizeBytes: 152000,
    folder: 'Pictures'
  },
  {
    id: '1BRo2Dj32d7kWQT76mzFGx6RpHe5K5R6z',
    name: '74466_RAW_CAMERA.jpg',
    url: 'https://lh3.googleusercontent.com/d/1BRo2Dj32d7kWQT76mzFGx6RpHe5K5R6z',
    thumbnailUrl: 'https://lh3.googleusercontent.com/d/1BRo2Dj32d7kWQT76mzFGx6RpHe5K5R6z',
    sizeBytes: 1850000,
    folder: 'Raw Media'
  }
];

export const GoogleDriveBrowserModal: React.FC<GoogleDriveBrowserModalProps> = ({
  isOpen,
  onClose,
  items,
  onAssignImageToItem
}) => {
  // Auth state
  const [accessToken, setAccessToken] = useState<string | null>(getGoogleDriveAccessToken());
  const [userEmail, setUserEmail] = useState<string | null>(getGoogleUserEmail());
  const [clientId, setClientId] = useState<string>(getGoogleClientId());
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Folder and file state
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([
    { id: 'all', name: 'All Drive Images' }
  ]);
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [driveAssets, setDriveAssets] = useState<DriveAsset[]>(DEMO_DRIVE_ASSETS);
  const [selectedAsset, setSelectedAsset] = useState<DriveAsset | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Load real files from Google Drive
  const loadDriveData = useCallback(async (token: string, folderId: string, search: string) => {
    setIsLoadingFiles(true);
    setAuthError(null);
    try {
      // 1. Fetch folders if not already loaded
      const driveFolders = await listDriveFolders(token);
      setFolders([
        { id: 'all', name: 'All Drive Images' },
        ...driveFolders
      ]);

      // 2. Fetch images
      const { files } = await listDriveImages(token, folderId, search);
      setDriveAssets(files.length > 0 ? files : DEMO_DRIVE_ASSETS);
    } catch (err: any) {
      console.warn('Google Drive fetch error:', err);
      setAuthError(err.message || 'Failed to fetch files from Google Drive');
      // Keep demo assets visible
      setDriveAssets(DEMO_DRIVE_ASSETS);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  // Sync auth state on modal open
  useEffect(() => {
    if (isOpen) {
      const token = getGoogleDriveAccessToken();
      const email = getGoogleUserEmail();
      setAccessToken(token);
      setUserEmail(email);

      if (token) {
        loadDriveData(token, activeFolderId, searchQuery);
      }
    }
  }, [isOpen, activeFolderId, searchQuery, loadDriveData]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const token = await signInWithGoogleDrive(clientId);
      const email = getGoogleUserEmail();
      setAccessToken(token);
      setUserEmail(email);
      await loadDriveData(token, activeFolderId, searchQuery);
    } catch (err: any) {
      setAuthError(err.message || 'Google Sign-In failed');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = () => {
    clearGoogleDriveAuth();
    setAccessToken(null);
    setUserEmail(null);
    setDriveAssets(DEMO_DRIVE_ASSETS);
    setFolders([{ id: 'all', name: 'All Drive Images' }]);
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleClientId(clientId);
    setIsConfigOpen(false);
  };

  if (!isOpen) return null;

  const filteredAssets = driveAssets.filter((asset) => {
    const matchesSearch = searchQuery === '' || asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Company Google Drive Media Picker</h3>
                {accessToken ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <UserCheck className="h-3 w-3" /> Connected: {userEmail || 'Google Drive'}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    Preview / Demo Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Browse shared company folders & automatically match photos to catalog SKUs</p>
            </div>
          </div>

          {/* Top Actions: Sign In / Out & Config */}
          <div className="flex items-center gap-2">
            {!accessToken ? (
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/50 transition-all disabled:opacity-50"
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                title="Disconnect Google Drive"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </button>
            )}

            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Google OAuth Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* OAuth Client ID Settings Accordion */}
        {isConfigOpen && (
          <form onSubmit={handleSaveClientId} className="bg-slate-950 border-b border-slate-800 px-6 py-3 flex items-center gap-4 text-xs">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Google OAuth 2.0 Web Client ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g. 1234567890-abc.apps.googleusercontent.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div className="pt-4 flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
              >
                Save Client ID
              </button>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
              >
                Google Cloud Console <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </form>
        )}

        {/* Error Notification Banner */}
        {authError && (
          <div className="bg-amber-950/60 border-b border-amber-500/40 px-6 py-2.5 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>{authError}</span>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="text-[10px] text-amber-400 underline font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Body: Left Folders + Center Media Grid + Right Match Inspector */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Column 1: Folder Navigation */}
          <div className="w-56 border-r border-slate-800 bg-slate-950/40 p-4 space-y-2">
            <div className="flex items-center justify-between px-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Drive Folders
              </span>
              {accessToken && (
                <button
                  onClick={() => loadDriveData(accessToken, activeFolderId, searchQuery)}
                  className="text-slate-500 hover:text-slate-300"
                  title="Refresh Folders"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFolderId(f.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all truncate ${
                  activeFolderId === f.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Folder className={`h-4 w-4 shrink-0 ${activeFolderId === f.id ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>

          {/* Column 2: Drive Assets Grid */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/50">
            
            {/* Search & Filter Bar */}
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search file name or SKU in Drive (e.g. 64514)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3">
              {isLoadingFiles ? (
                <div className="col-span-3 py-16 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                  <span className="text-xs font-medium">Scanning Google Drive files...</span>
                </div>
              ) : filteredAssets.length > 0 ? (
                filteredAssets.map((asset) => {
                  const matchResult = matchFilenameToItem(asset.name, items);
                  const isSelected = selectedAsset?.id === asset.id;

                  return (
                    <div
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className={`group relative rounded-2xl border p-2 flex flex-col cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Thumbnail (3:4 Portrait) */}
                      <div className="w-full aspect-[3/4] rounded-xl overflow-hidden bg-slate-900 mb-2 relative">
                        <img src={asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-cover" />
                        {matchResult.matchedItem && (
                          <div className="absolute top-1.5 right-1.5">
                            <Badge variant="emerald" size="sm">
                              <Sparkles className="h-3 w-3" />
                              Match #{matchResult.matchedItem.item_id}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <span className="font-semibold text-xs text-white truncate">{asset.name}</span>
                      <span className="text-[10px] text-slate-500">{asset.folder} • {(asset.sizeBytes / 1024).toFixed(0)} KB</span>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-3 py-16 text-center text-slate-500 text-xs">
                  No images found matching your search.
                </div>
              )}
            </div>

          </div>

          {/* Column 3: Auto-Match & Assignment Sidebar */}
          <div className="w-80 border-l border-slate-800 bg-slate-950/80 p-5 flex flex-col justify-between">
            {selectedAsset ? (
              (() => {
                const match = matchFilenameToItem(selectedAsset.name, items);
                return (
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Selected Drive File
                    </span>

                    <div className="w-full aspect-[3/4] max-h-48 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center">
                      <img src={selectedAsset.url} alt="" className="w-full h-full object-cover" />
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-white truncate">{selectedAsset.name}</h4>
                      <p className="text-xs text-slate-400">{(selectedAsset.sizeBytes / (1024 * 1024)).toFixed(2)} MB • {selectedAsset.folder}</p>
                    </div>

                    {/* Auto Match Result Box */}
                    {match.matchedItem ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                          <Check className="h-4 w-4" />
                          <span>Auto-Matched to SKU!</span>
                        </div>
                        <p className="font-bold text-xs text-white">
                          #{match.matchedItem.item_id} - {match.matchedItem.item_name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Code: {match.matchedItem.code} | Matched by: {match.confidence}
                        </p>

                        <button
                          onClick={() => {
                            if (match.matchedItem) {
                              onAssignImageToItem(match.matchedItem, selectedAsset.url);
                              onClose();
                            }
                          }}
                          className="w-full mt-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Link to Item #{match.matchedItem.item_id}
                        </button>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs text-slate-400">
                        <p>No automatic SKU detected in filename.</p>
                        <p className="text-[10px] text-slate-500">You can drag this photo directly onto any product card in the Media Grid!</p>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                <FileImage className="h-10 w-10 text-slate-600 mb-2" />
                <p className="text-xs">Click a photo from Google Drive to inspect and link</p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2 rounded-xl border border-slate-800 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              Close Drive Browser
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};