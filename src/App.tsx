import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MediaGridView } from './components/views/MediaGridView';
import { SplitStudioView } from './components/views/SplitStudioView';
import { MatrixTableView } from './components/views/MatrixTableView';
import { BannerStudio } from './components/banners/BannerStudio';
import { AiStudioView } from './components/views/AiStudioView';
import { GoogleDriveBrowserModal } from './components/studio/GoogleDriveBrowserModal';
import { 
  Item, 
  ItemClass, 
  ItemImagesRecord, 
  PromoBanner, 
  ItemTag,
  ViewMode,
  GeneratedCopywriting 
} from './types/catalog';
import { 
  fetchItems as fetchSupabaseItems, 
  fetchCategories as fetchSupabaseCategories, 
  fetchAllItemImages, 
  fetchBanners, 
  fetchItemTags,
  saveItemImages,
  updateItemSpecs as updateSupabaseItemSpecs 
} from './api/supabaseClient';
import { 
  fetchLocalItems, 
  fetchLocalCategories, 
  fetchLocalImageManifest, 
  uploadLocalImage, 
  updateLocalItemInfo,
  getLocalApiBaseUrl 
} from './api/localBackendApi';
import { processImageFile } from './utils/imageOptimizer';
import { convertFileToStandardJpg, generateStandardFileName, parseSlotFromFileName } from './utils/imageNaming';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('grid');
  
  // Data State
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ItemClass[]>([]);
  const [imagesMap, setImagesMap] = useState<Record<number, ItemImagesRecord>>({});
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [tagsList, setTagsList] = useState<ItemTag[]>([]);
  
  // Active Workbench State
  const [selectedStudioItem, setSelectedStudioItem] = useState<Item | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Hybrid Data Loader (Loads Supabase immediately in parallel and merges local API overlay)
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch Cloud metadata in parallel
      const [supabaseItems, supabaseCats, fetchedBanners, fetchedTags] = await Promise.all([
        fetchSupabaseItems(),
        fetchSupabaseCategories(),
        fetchBanners(),
        fetchItemTags()
      ]);

      // 2. Fetch Local Node.js / MSSQL API & Local Images strictly from :8090
      const [localItemsList, localCatsList, localImgsList] = await Promise.all([
        fetchLocalItems(),
        fetchLocalCategories(),
        fetchLocalImageManifest()
      ]);

      const finalItems = localItemsList.length > 0 ? localItemsList : supabaseItems;
      const finalCats = localCatsList.length > 0 ? localCatsList : supabaseCats;
      const finalImgs = localImgsList; // Strictly from local C:\mssql-firebase-bridge\Pictures

      setItems(finalItems);
      setCategories(finalCats);
      setImagesMap(finalImgs);
      setBanners(fetchedBanners);
      setTagsList(fetchedTags);

      if (finalItems.length > 0 && !selectedStudioItem) {
        setSelectedStudioItem(finalItems[0]);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Metrics
  const totalItems = items.length;
  let completeCount = 0;
  let missingMediaCount = 0;

  items.forEach((item) => {
    const rec = imagesMap[item.item_id];
    const count = (rec?.thumbs?.length || 0) + (rec?.views?.length || 0);
    if (count >= 2) completeCount++;
    else if (count === 0) missingMediaCount++;
  });

  // Handle Multi-Photo Batch Upload directly through Backend App (:8090)
  const handleUploadImagesForItem = async (item: Item, files: File[]) => {
    if (files.length === 0) return;
    try {
      showToast(`Normalizing & uploading ${files.length} photo${files.length > 1 ? 's' : ''} to backend...`);

      const existingRecord = imagesMap[item.item_id];
      const existingCount = (existingRecord?.thumbs || []).length;

      // 1. Convert any format (PNG, WEBP, BMP, etc.) to standard JPG and assign standard filenames
      const standardizedFiles = await Promise.all(
        files.map((file, idx) => {
          const positionIndex = existingCount + idx;
          const roleInfo = parseSlotFromFileName(file.name, positionIndex);
          const targetFileName = generateStandardFileName(item.code, item.item_id, positionIndex, roleInfo.slot);
          return convertFileToStandardJpg(file, targetFileName);
        })
      );

      // 2. Push standardized JPG files directly to Backend API (POST /api/images/upload)
      const uploadResults = await Promise.all(
        standardizedFiles.map((file) => uploadLocalImage(item.item_id, file))
      );

      // 3. Extract local static URLs
      const baseUrl = getLocalApiBaseUrl();
      const addedLocalThumbs = uploadResults.filter((r) => r.success).map((r) => `${baseUrl}/Thumbs/${item.item_id}/${r.fileName}`);
      const addedLocalRaws = uploadResults.filter((r) => r.success).map((r) => `${baseUrl}/Pictures/${item.item_id}/${r.fileName}`);

      const newThumbs = [...(existingRecord?.thumbs || []), ...addedLocalThumbs];
      const newViews = [...(existingRecord?.views || []), ...addedLocalThumbs];
      const newRaws = [...(existingRecord?.raws || []), ...addedLocalRaws];

      setImagesMap((prev) => ({
        ...prev,
        [item.item_id]: {
          item_id: item.item_id,
          thumbs: newThumbs,
          views: newViews,
          raws: newRaws,
          update_date: new Date().toISOString()
        }
      }));

      showToast(`✨ ${addedLocalThumbs.length} photo${addedLocalThumbs.length > 1 ? 's' : ''} saved as standard JPGs!`);
    } catch (err) {
      console.error('Batch upload failed:', err);
      showToast('Error uploading images to backend');
    }
  };

  // Handle Image Assignment from Google Drive
  const handleAssignDriveImage = async (item: Item, driveUrl: string) => {
    const existingRecord = imagesMap[item.item_id];
    const newThumbs = [...(existingRecord?.thumbs || []), driveUrl];
    const newViews = [...(existingRecord?.views || []), driveUrl];
    const newRaws = [...(existingRecord?.raws || []), driveUrl];

    const success = await saveItemImages(item.item_id, newThumbs, newViews, newRaws);
    if (success) {
      setImagesMap((prev) => ({
        ...prev,
        [item.item_id]: {
          item_id: item.item_id,
          thumbs: newThumbs,
          views: newViews,
          raws: newRaws,
          update_date: new Date().toISOString()
        }
      }));
      showToast(`Linked Drive photo to Item #${item.item_id}`);
    }
  };

  // Handle AI Pipeline Approval & Catalog Sync
  const handleApproveAiPipelineOutput = async (
    item: Item,
    studioHeroUrl: string,
    blueprintUrl: string,
    lifestyleUrls: string[],
    updatedCopy?: GeneratedCopywriting
  ) => {
    try {
      showToast(`Syncing AI Studio assets for #${item.item_id}...`);

      const baseUrl = getLocalApiBaseUrl();

      // Convert Data URLs to Standard JPG Files and upload to local backend
      const dataUrlToJpgFile = async (dataUrl: string, fileName: string): Promise<File> => {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        return new File([blob], fileName, { type: 'image/jpeg' });
      };

      const heroFileName = generateStandardFileName(item.code, item.item_id, 0, 'hero1');
      const blueprintFileName = generateStandardFileName(item.code, item.item_id, 1, 'dim1');

      const heroFile = studioHeroUrl.startsWith('data:') 
        ? await dataUrlToJpgFile(studioHeroUrl, heroFileName) 
        : null;
      const blueprintFile = blueprintUrl.startsWith('data:') 
        ? await dataUrlToJpgFile(blueprintUrl, blueprintFileName) 
        : null;

      const uploadFiles = [heroFile, blueprintFile].filter(Boolean) as File[];
      if (uploadFiles.length > 0) {
        await Promise.all(uploadFiles.map((f) => uploadLocalImage(item.item_id, f)));
      }

      const heroThumbUrl = `${baseUrl}/Thumbs/${item.item_id}/${heroFileName}`;
      const blueprintThumbUrl = `${baseUrl}/Thumbs/${item.item_id}/${blueprintFileName}`;
      const heroRawUrl = `${baseUrl}/Pictures/${item.item_id}/${heroFileName}`;
      const blueprintRawUrl = `${baseUrl}/Pictures/${item.item_id}/${blueprintFileName}`;

      const existingRecord = imagesMap[item.item_id];
      const otherThumbs = (existingRecord?.thumbs || []).filter(
        (url) => !url.includes(heroFileName) && !url.includes(blueprintFileName)
      );
      const otherViews = (existingRecord?.views || []).filter(
        (url) => !url.includes(heroFileName) && !url.includes(blueprintFileName)
      );
      const otherRaws = (existingRecord?.raws || []).filter(
        (url) => !url.includes(heroFileName) && !url.includes(blueprintFileName)
      );

      const newThumbs = [heroThumbUrl, blueprintThumbUrl, ...otherThumbs];
      const newViews = [heroThumbUrl, blueprintThumbUrl, ...otherViews];
      const newRaws = [heroRawUrl, blueprintRawUrl, ...otherRaws];

      setImagesMap((prev) => ({
        ...prev,
        [item.item_id]: {
          item_id: item.item_id,
          thumbs: newThumbs,
          views: newViews,
          raws: newRaws,
          update_date: new Date().toISOString()
        }
      }));

      // If copywriting was generated, update item specs
      if (updatedCopy) {
        const updatedItem: Item = {
          ...item,
          item_name: updatedCopy.title || item.item_name,
          description: updatedCopy.description || item.description,
          tags: updatedCopy.tags ? updatedCopy.tags.join(', ') : item.tags
        };

        await updateLocalItemInfo(updatedItem);
        await updateSupabaseItemSpecs(item.item_id, {
          item_name: updatedItem.item_name,
          description: updatedItem.description,
          tags: updatedItem.tags
        });

        setItems((prev) => prev.map((i) => (i.item_id === item.item_id ? updatedItem : i)));
      }

      showToast(`✨ AI Studio assets & specs approved for SKU #${item.item_id}!`);
    } catch (err) {
      console.error('Failed to approve AI pipeline output:', err);
      showToast('Error syncing AI assets to catalog');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-emerald-500 text-white font-bold text-xs shadow-2xl shadow-emerald-950/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Navbar */}
      <Navbar
        currentView={currentView}
        onViewChange={(v) => setCurrentView(v)}
        totalItems={totalItems}
        completeCount={completeCount}
        missingMediaCount={missingMediaCount}
        isRefreshing={isRefreshing}
        onRefresh={loadData}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 overflow-hidden">
        {currentView === 'grid' && (
          <MediaGridView
            items={items}
            categories={categories}
            imagesMap={imagesMap}
            onSelectStudioItem={(item) => {
              setSelectedStudioItem(item);
              setCurrentView('studio');
            }}
            onUploadImagesForItem={handleUploadImagesForItem}
          />
        )}

        {currentView === 'studio' && (
          <SplitStudioView
            items={items}
            categories={categories}
            imagesMap={imagesMap}
            selectedItem={selectedStudioItem}
            tagsList={tagsList}
            onSelectItem={(item) => setSelectedStudioItem(item)}
            onItemUpdated={(updated) => {
              setItems((prev) => prev.map((i) => (i.item_id === updated.item_id ? updated : i)));
              setSelectedStudioItem(updated);
            }}
            onUploadImagesForItem={handleUploadImagesForItem}
            onOpenDriveModal={() => setIsDriveModalOpen(true)}
            onImagesSaved={(itemId, thumbs, views, raws) => {
              setImagesMap((prev) => ({
                ...prev,
                [itemId]: { item_id: itemId, thumbs, views, raws, update_date: new Date().toISOString() }
              }));
              showToast('Media sequence saved!');
            }}
          />
        )}

        {currentView === 'matrix' && (
          <MatrixTableView
            items={items}
            categories={categories}
            imagesMap={imagesMap}
            onSelectStudioItem={(item) => {
              setSelectedStudioItem(item);
              setCurrentView('studio');
            }}
          />
        )}

        {currentView === 'ai-studio' && (
          <AiStudioView
            items={items}
            categories={categories}
            imagesMap={imagesMap}
            onApprovePipelineOutput={handleApproveAiPipelineOutput}
          />
        )}

        {currentView === 'banners' && (
          <BannerStudio
            banners={banners}
            items={items}
            categories={categories}
            onBannersUpdated={(newBanners) => {
              setBanners(newBanners);
              showToast('Promotional banners synced!');
            }}
          />
        )}
      </main>

      {/* Google Drive Asset Picker Modal */}
      <GoogleDriveBrowserModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        items={items}
        onAssignImageToItem={handleAssignDriveImage}
      />

    </div>
  );
};