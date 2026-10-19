import React, { useState } from 'react';
import { 
  Search, 
  Upload, 
  Trash2, 
  GripVertical, 
  HardDrive, 
  Sparkles, 
  Save, 
  Plus, 
  Layers, 
  Smartphone,
  Eye,
  Maximize2
} from 'lucide-react';
import { Item, ItemClass, ItemImagesRecord, ItemTag } from '../../types/catalog';
import { Badge } from '../common/Badge';
import { MobileAppSimulator } from '../studio/MobileAppSimulator';
import { ItemSpecsEditor } from '../studio/ItemSpecsEditor';
import { LightboxModal } from '../common/LightboxModal';
import { saveItemImages } from '../../api/supabaseClient';
import { deleteLocalImage, reorderLocalImages, getLocalApiBaseUrl } from '../../api/localBackendApi';
import { 
  generateStandardFileName, 
  extractFileNameFromUrl, 
  determineImageRole, 
  getZeroPaddedIndex,
  sanitizeItemCode
} from '../../utils/imageNaming';

interface SplitStudioViewProps {
  items: Item[];
  categories: ItemClass[];
  imagesMap: Record<number, ItemImagesRecord>;
  selectedItem: Item | null;
  tagsList?: ItemTag[];
  onSelectItem: (item: Item) => void;
  onItemUpdated: (item: Item) => void;
  onUploadImagesForItem: (item: Item, files: File[]) => void;
  onOpenDriveModal: () => void;
  onImagesSaved: (itemId: number, thumbs: string[], views: string[], raws: string[]) => void;
}

export const SplitStudioView: React.FC<SplitStudioViewProps> = ({
  items,
  categories,
  imagesMap,
  selectedItem,
  tagsList = [],
  onSelectItem,
  onItemUpdated,
  onUploadImagesForItem,
  onOpenDriveModal,
  onImagesSaved
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Drag-and-Drop Image Sequence State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Lightbox Modal State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);

  const filteredList = items.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    return q === '' ||
      (item.item_name?.toLowerCase().includes(q) ?? false) ||
      (item.code?.toLowerCase().includes(q) ?? false) ||
      item.item_id.toString().includes(q);
  });

  const activeRecord = selectedItem ? imagesMap[selectedItem.item_id] : undefined;

  // Local state for re-ordering or removing images before saving
  const [stagedThumbs, setStagedThumbs] = useState<string[]>([]);
  const [stagedViews, setStagedViews] = useState<string[]>([]);
  const [stagedRaws, setStagedRaws] = useState<string[]>([]);
  const [isSavingMedia, setIsSavingMedia] = useState(false);

  // Sync staged with activeRecord on item selection
  React.useEffect(() => {
    if (selectedItem) {
      const rec = imagesMap[selectedItem.item_id];
      setStagedThumbs(rec?.thumbs || []);
      setStagedViews(rec?.views || []);
      setStagedRaws(rec?.raws || []);
    }
  }, [selectedItem, imagesMap]);

  const handleMoveImage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= stagedThumbs.length || fromIdx === toIdx) return;

    const nextThumbs = [...stagedThumbs];
    const [movedThumb] = nextThumbs.splice(fromIdx, 1);
    nextThumbs.splice(toIdx, 0, movedThumb);

    const nextViews = [...stagedViews];
    const [movedView] = nextViews.splice(fromIdx, 1);
    nextViews.splice(toIdx, 0, movedView);

    const nextRaws = [...stagedRaws];
    const [movedRaw] = nextRaws.splice(fromIdx, 1);
    nextRaws.splice(toIdx, 0, movedRaw);

    setStagedThumbs(nextThumbs);
    setStagedViews(nextViews);
    setStagedRaws(nextRaws);
  };

  const handleRemoveImage = async (idx: number) => {
    if (!selectedItem || stagedThumbs.length === 0 || isSavingMedia) return;
    const removedUrl = stagedThumbs[idx] || stagedViews[idx] || stagedRaws[idx];
    if (!removedUrl) return;

    const fileName = extractFileNameFromUrl(removedUrl);
    if (!fileName) return;

    setIsSavingMedia(true);
    try {
      const baseUrl = getLocalApiBaseUrl();

      // 1. Physically delete the target file on local disk and cloud storage/Supabase
      await deleteLocalImage(selectedItem.item_id, fileName);

      // 2. Compute remaining images
      const remainingThumbs = stagedThumbs.filter((_, i) => i !== idx);

      if (remainingThumbs.length > 0) {
        // 3. Compact and re-sequence remaining files to fill the gap (01_hero1, 02_dim1, ...)
        const renames = remainingThumbs.map((url, newIdx) => {
          const oldName = extractFileNameFromUrl(url);
          const newName = generateStandardFileName(selectedItem.code, selectedItem.item_id, newIdx);
          return { oldFileName: oldName, newFileName: newName };
        });

        // 4. Rename remaining files on disk & update Supabase slots
        const reorderResult = await reorderLocalImages(selectedItem.item_id, selectedItem.code, renames);

        const finalizedFiles = reorderResult.files && reorderResult.files.length === renames.length
          ? reorderResult.files
          : renames.map(r => r.newFileName);

        const cacheBuster = Date.now();
        const updatedThumbs = finalizedFiles.map(f => `${baseUrl}/Thumbs/${selectedItem.item_id}/${f}?t=${cacheBuster}`);
        const updatedViews = finalizedFiles.map(f => `${baseUrl}/Thumbs/${selectedItem.item_id}/${f}?t=${cacheBuster}`);
        const updatedRaws = finalizedFiles.map(f => `${baseUrl}/Pictures/${selectedItem.item_id}/${f}?t=${cacheBuster}`);

        setStagedThumbs(updatedThumbs);
        setStagedViews(updatedViews);
        setStagedRaws(updatedRaws);

        onImagesSaved(selectedItem.item_id, updatedThumbs, updatedViews, updatedRaws);
      } else {
        setStagedThumbs([]);
        setStagedViews([]);
        setStagedRaws([]);
        onImagesSaved(selectedItem.item_id, [], [], []);
      }
    } catch (err) {
      console.error('Failed to remove image and auto-resequence:', err);
    } finally {
      setIsSavingMedia(false);
    }
  };

  const handleSaveMediaSequence = async () => {
    if (!selectedItem || stagedThumbs.length === 0) return;
    setIsSavingMedia(true);
    try {
      const baseUrl = getLocalApiBaseUrl();
      const renames = stagedThumbs.map((url, idx) => {
        const oldFileName = extractFileNameFromUrl(url);
        const newFileName = generateStandardFileName(selectedItem.code, selectedItem.item_id, idx);
        return { oldFileName, newFileName };
      });

      // 1. Call Local Backend API to rename/reorder files on disk & trigger cloud/Supabase slot pipeline
      const reorderResult = await reorderLocalImages(selectedItem.item_id, selectedItem.code, renames);

      // 2. Compute updated URLs using new standardized filenames or backend returned files
      const finalizedFiles = reorderResult.files && reorderResult.files.length === renames.length
        ? reorderResult.files
        : renames.map(r => r.newFileName);

      const cacheBuster = Date.now();
      const updatedThumbs = finalizedFiles.map(f => `${baseUrl}/Thumbs/${selectedItem.item_id}/${f}?t=${cacheBuster}`);
      const updatedViews = finalizedFiles.map(f => `${baseUrl}/Thumbs/${selectedItem.item_id}/${f}?t=${cacheBuster}`);
      const updatedRaws = finalizedFiles.map(f => `${baseUrl}/Pictures/${selectedItem.item_id}/${f}?t=${cacheBuster}`);

      setStagedThumbs(updatedThumbs);
      setStagedViews(updatedViews);
      setStagedRaws(updatedRaws);

      // 3. Notify parent app to update catalog and media grid
      onImagesSaved(selectedItem.item_id, updatedThumbs, updatedViews, updatedRaws);
    } catch (err) {
      console.error('Failed to save media sequence:', err);
    } finally {
      setIsSavingMedia(false);
    }
  };

  const openLightbox = (idx: number) => {
    setLightboxInitialIndex(idx);
    setIsLightboxOpen(true);
  };

  const allDisplayViews = stagedViews.length > 0
    ? stagedViews
    : (stagedThumbs.length > 0 ? stagedThumbs : []);

  return (
    <div className="flex h-full bg-slate-950 overflow-hidden">
      
      {/* LEFT COLUMN: Searchable Item Navigator (30%) */}
      <div className="w-80 lg:w-96 border-r border-slate-800 flex flex-col bg-slate-950/60">
        
        {/* Search Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter items by name or SKU..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Scrollable Items List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredList.map((item) => {
            const isSelected = selectedItem?.item_id === item.item_id;
            const rec = imagesMap[item.item_id];
            const count = (rec?.thumbs?.length || 0) + (rec?.views?.length || 0);

            return (
              <div
                key={item.item_id}
                onClick={() => onSelectItem(item)}
                className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 border ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                    : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                {/* Thumbnail Avatar */}
                <div className="w-12 h-12 rounded-xl bg-slate-950 overflow-hidden shrink-0 border border-slate-800">
                  <img
                    src={rec?.thumbs?.[0] || rec?.views?.[0] || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=150&q=80'}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>#{item.item_id}</span>
                    <span>{item.code || 'NO-CODE'}</span>
                  </div>
                  <h5 className="font-bold text-xs text-white truncate mt-0.5">{item.item_name || 'Untitled'}</h5>
                  <div className="flex items-center gap-2 mt-1">
                    {count >= 2 ? (
                      <span className="text-[9px] font-semibold text-emerald-400">● {count} Photos</span>
                    ) : count === 1 ? (
                      <span className="text-[9px] font-semibold text-amber-400">● 1 Photo</span>
                    ) : (
                      <span className="text-[9px] font-semibold text-rose-400">● No Media</span>
                    )}
                    <span className="text-[9px] text-slate-500">• ${item.price || 0}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* RIGHT CANVAS: Workstation Studio & Mobile Simulator (70%) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Center Studio Workbench */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 border-r border-slate-800/60">
          {selectedItem ? (
            <>
              {/* Product Top Title Card */}
              <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 flex items-center justify-between shadow-xl">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="emerald">SKU: {selectedItem.code || 'None'}</Badge>
                    <span className="text-xs font-mono text-slate-400">Item ID #{selectedItem.item_id}</span>
                  </div>
                  <h2 className="font-extrabold text-lg text-white">{selectedItem.item_name || 'Untitled Product'}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenDriveModal}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                  >
                    <HardDrive className="h-4 w-4" />
                    Pick from Google Drive
                  </button>
                </div>
              </div>

              {/* Media Sequence & Upload Strip */}
              <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">Media Carousel & Angle Sequence</h3>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Drag & Drop Reorder
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Drag tiles to reorder slots (hero1, dim1, angle1..angle5). Saving renames physical files and triggers the cloud/Supabase pipeline.
                    </p>
                  </div>

                  <button
                    onClick={handleSaveMediaSequence}
                    disabled={isSavingMedia}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {isSavingMedia ? 'Saving & Syncing...' : 'Save Media Sequence'}
                  </button>
                </div>

                {/* Draggable Image Tiles */}
                <div className="grid grid-cols-4 gap-3">
                  {stagedThumbs.map((thumbUrl, idx) => {
                    const isDraggingThis = draggedIndex === idx;
                    const isDropTarget = dropTargetIndex === idx && draggedIndex !== idx;
                    const roleInfo = determineImageRole(idx);
                    const targetName = generateStandardFileName(selectedItem?.code, selectedItem?.item_id || 0, idx);

                    return (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => {
                          setDraggedIndex(idx);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          setDropTargetIndex(idx);
                        }}
                        onDragLeave={() => {
                          if (dropTargetIndex === idx) setDropTargetIndex(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedIndex !== null && draggedIndex !== idx) {
                            handleMoveImage(draggedIndex, idx);
                          }
                          setDraggedIndex(null);
                          setDropTargetIndex(null);
                        }}
                        onDragEnd={() => {
                          setDraggedIndex(null);
                          setDropTargetIndex(null);
                        }}
                        className={`group relative aspect-[3/4] rounded-2xl bg-slate-950 border overflow-hidden flex flex-col justify-between p-2 shadow-inner transition-all cursor-grab active:cursor-grabbing ${
                          isDraggingThis ? 'opacity-40 scale-95 border-dashed border-emerald-500' : ''
                        } ${
                          isDropTarget ? 'border-2 border-emerald-400 scale-105 shadow-xl shadow-emerald-950/50' : 'border-slate-800'
                        }`}
                      >
                        <img 
                          src={thumbUrl} 
                          alt="" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80';
                          }}
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
                        />
                        
                        {/* Top Badges & Lightbox Inspect */}
                        <div className="relative z-10 flex justify-between items-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs border ${roleInfo.badgeColor} shadow-md`}>
                            {roleInfo.label}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openLightbox(idx)}
                              className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Inspect Full-Screen"
                            >
                              <Maximize2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleRemoveImage(idx)}
                              disabled={isSavingMedia}
                              className="p-1 rounded-lg bg-rose-600/80 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Remove Photo"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Bar: Reorder Controls & Standard Filename Target */}
                        <div className="relative z-10 flex items-center justify-between gap-1 w-full bg-slate-950/80 backdrop-blur-xs p-1 rounded-xl border border-slate-800">
                          <button
                            onClick={() => handleMoveImage(idx, idx - 1)}
                            disabled={idx === 0}
                            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-emerald-600 text-[10px] text-white disabled:opacity-20 transition-colors"
                            title="Move Left"
                          >
                            ◀
                          </button>
                          
                          <span className="text-[9px] font-mono text-slate-400 truncate flex-1 text-center" title={targetName}>
                            {targetName}
                          </span>

                          <button
                            onClick={() => handleMoveImage(idx, idx + 1)}
                            disabled={idx === stagedThumbs.length - 1}
                            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-emerald-600 text-[10px] text-white disabled:opacity-20 transition-colors"
                            title="Move Right"
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Multi-File Upload Dropzone Card (3:4 Portrait) */}
                  <label 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const droppedFiles = Array.from(e.dataTransfer.files || []);
                      if (droppedFiles.length > 0) {
                        onUploadImagesForItem(selectedItem, droppedFiles);
                      }
                    }}
                    className="aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-emerald-500/60 hover:bg-emerald-950/20 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-400 cursor-pointer transition-all p-2 text-center"
                  >
                    <Upload className="h-6 w-6 mb-1" />
                    <span className="text-xs font-bold">+ Drop 1 or Many</span>
                    <span className="text-[10px] text-slate-500">Auto WebP Convert</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) onUploadImagesForItem(selectedItem, files);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Spec & Dimension Editor Card */}
              <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-xl">
                <ItemSpecsEditor
                  item={selectedItem}
                  categories={categories}
                  allItems={items}
                  tagsList={tagsList}
                  onItemUpdated={onItemUpdated}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Layers className="h-16 w-16 text-slate-700 mb-3" />
              <h3 className="font-bold text-base text-slate-300">No Product Selected</h3>
              <p className="text-xs text-slate-500 mt-1">Select an item from the left catalog list to launch the workstation</p>
            </div>
          )}
        </div>

        {/* Right Phone Simulator Panel (420px) */}
        <div className="w-[420px] bg-slate-950/80 p-6 flex flex-col items-center justify-center overflow-y-auto border-l border-slate-800/80">
          <MobileAppSimulator
            item={selectedItem}
            imagesRecord={activeRecord}
            stagedViews={stagedViews}
          />
        </div>

      </div>

      {/* Lightbox Modal */}
      <LightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={allDisplayViews}
        initialIndex={lightboxInitialIndex}
        item={selectedItem}
      />

    </div>
  );
};