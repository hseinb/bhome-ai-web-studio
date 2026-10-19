import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Share2, 
  ShoppingCart, 
  Tag, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  Smartphone,
  Download,
  Loader2
} from 'lucide-react';
import { Item, ItemImagesRecord } from '../../types/catalog';
import { generateAndDownloadWhatsAppCard } from '../../utils/collageGenerator';

interface MobileAppSimulatorProps {
  item: Item | null;
  imagesRecord?: ItemImagesRecord;
  stagedViews: string[];
}

export const MobileAppSimulator: React.FC<MobileAppSimulatorProps> = ({
  item,
  imagesRecord,
  stagedViews
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [previewMode, setPreviewMode] = useState<'detail' | 'collage'>('detail');
  const [isGeneratingCollage, setIsGeneratingCollage] = useState(false);

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-3xl">
        <Smartphone className="h-12 w-12 stroke-[1.5] mb-3 text-slate-600" />
        <p className="font-medium text-sm text-slate-400">Select an item to simulate live mobile preview</p>
        <p className="text-xs text-slate-600 mt-1">Shows Android/iOS ViewPager carousel & collage share cards</p>
      </div>
    );
  }

  // Combined image stream (Staged overrides record, fallback to mock placeholder)
  const displayImages = stagedViews.length > 0
    ? stagedViews
    : (imagesRecord?.views && imagesRecord.views.length > 0)
      ? imagesRecord.views
      : (imagesRecord?.thumbs && imagesRecord.thumbs.length > 0)
        ? imagesRecord.thumbs
        : ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80'];

  const originalPrice = item.price || 0;
  const discount = item.discount || 0;
  const finalPrice = discount > 0 ? (originalPrice * (100 - discount)) / 100 : originalPrice;

  return (
    <div className="flex flex-col items-center">
      
      {/* Mode Switcher */}
      <div className="flex items-center gap-2 mb-4 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setPreviewMode('detail')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
            previewMode === 'detail'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          📱 Detail Screen
        </button>
        <button
          onClick={() => setPreviewMode('collage')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
            previewMode === 'collage'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ✨ WhatsApp Collage Card
        </button>
      </div>

      {/* Phone Hardware Chassis (380px x 780px) */}
      <div className="relative w-[340px] h-[680px] bg-slate-950 rounded-[44px] p-3 shadow-2xl border-[6px] border-slate-800 ring-1 ring-slate-700/50 flex flex-col overflow-hidden">
        
        {/* Dynamic Island / Speaker Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-30 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-950 mr-2" />
          <div className="w-2 h-2 rounded-full bg-blue-950/80" />
        </div>

        {/* Inner Mobile Screen */}
        <div className="w-full h-full bg-slate-900 rounded-[34px] flex flex-col overflow-hidden text-slate-100 relative">
          
          {/* Status Bar */}
          <div className="h-8 flex items-center justify-between px-6 text-[10px] font-semibold text-slate-400 z-20">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-4 h-2 border border-slate-400 rounded-sm p-0.5">
                <div className="h-full bg-slate-400 rounded-xs" />
              </div>
            </div>
          </div>

          {previewMode === 'detail' ? (
            /* DETAIL SCREEN SIMULATION */
            <div className="flex-1 overflow-y-auto no-scrollbar pb-16">
              
              {/* Media Carousel (3:4 Portrait Ratio) */}
              <div className="relative w-full aspect-[3/4] bg-slate-950 overflow-hidden group">
                <img
                  src={displayImages[activeImageIdx] || displayImages[0]}
                  alt={item.item_name || 'Product'}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80';
                  }}
                  className="w-full h-full object-cover transition-transform duration-300"
                />

                {/* Left/Right Carousel Controls */}
                {displayImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-all"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setActiveImageIdx((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-all"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    {/* Dot Indicators */}
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                      {displayImages.map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-1.5 rounded-full transition-all ${
                            activeImageIdx === idx ? 'w-4 bg-emerald-400' : 'w-1.5 bg-white/40'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Share Floating Action Button */}
                <div className="absolute top-2 right-2 flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center shadow-lg">
                    <Share2 className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Product Info Section */}
              <div className="p-4 space-y-3">
                
                {/* Stock Tag */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    ● In Stock ({(item.qtty || 0) > 0 ? item.qtty : 'Available'})
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {item.code || `ID: ${item.item_id}`}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-base text-white leading-tight">
                  {item.item_name || 'Untitled Product'}
                </h3>

                {/* Price HUD */}
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-emerald-400">
                    ${finalPrice.toFixed(2)}
                  </span>
                  {discount > 0 && (
                    <>
                      <span className="text-xs text-slate-400 line-through">
                        ${originalPrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        SAVE {discount}%
                      </span>
                    </>
                  )}
                </div>

                {/* Dimensions & Material Capsule */}
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] space-y-1">
                  <div className="text-slate-400 flex justify-between">
                    <span>Dimensions:</span>
                    <span className="font-mono text-slate-200">
                      L: {item.length || 0} | W: {item.width || 0} | T: {item.thickness || 0}
                    </span>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span>Material / Room:</span>
                    <span className="text-slate-200">
                      {item.material || 'Standard'} • {item.house_rooms || 'All Rooms'}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {item.tags && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.split(',').map((tag, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full">
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                )}

              </div>
            </div>
          ) : (
            /* COLLAGE PREVIEW SIMULATION (1:1 Square Card) */
            <div className="flex-1 p-4 flex flex-col justify-center items-center">
              <div className="w-full aspect-square bg-slate-950 rounded-2xl p-3 border border-slate-800 shadow-xl flex flex-col justify-between">
                
                {/* Collage Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-black tracking-wider text-xs text-white">B HOME</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    FEATURED
                  </span>
                </div>

                {/* Image Quad / Hero */}
                <div className="grid grid-cols-2 gap-1.5 my-2 flex-1 rounded-xl overflow-hidden">
                  <img src={displayImages[0]} className="w-full h-full object-cover rounded-lg" alt="" />
                  <img src={displayImages[1] || displayImages[0]} className="w-full h-full object-cover rounded-lg" alt="" />
                </div>

                {/* Collage Footer Details */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-xs text-white truncate max-w-[180px]">{item.item_name}</span>
                    <span className="font-bold text-sm text-emerald-400">${finalPrice.toFixed(2)}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 truncate">
                    Code: {item.code} | {item.material} | {item.house_rooms}
                  </p>
                </div>

              </div>

              {/* Download WhatsApp Card Button */}
              <button
                onClick={async () => {
                  if (!item) return;
                  setIsGeneratingCollage(true);
                  try {
                    await generateAndDownloadWhatsAppCard(item, displayImages);
                  } catch (err) {
                    console.error('Failed to generate collage:', err);
                  } finally {
                    setIsGeneratingCollage(false);
                  }
                }}
                disabled={isGeneratingCollage}
                className="w-full mt-3 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
              >
                {isGeneratingCollage ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Rendering 1024×1024 HD Card...
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    Download WhatsApp Card (HD)
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-500 mt-2 text-center">
                Exports a pixel-perfect 1024×1024 PNG with specs, price badge, and photos for customer messaging.
              </p>
            </div>
          )}

          {/* Sticky Bottom Add to Cart Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-14 bg-slate-950/95 border-t border-slate-800 px-4 flex items-center justify-between z-20">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400">Total Price</span>
              <span className="font-bold text-sm text-emerald-400">${finalPrice.toFixed(2)}</span>
            </div>
            <button className="flex items-center gap-1.5 bg-emerald-600 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg shadow-emerald-950/50">
              <ShoppingCart className="h-3.5 w-3.5" />
              Add to Cart
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};