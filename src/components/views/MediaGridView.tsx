import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Upload, 
  Check, 
  Sparkles, 
  Image as ImageIcon, 
  ChevronRight,
  SlidersHorizontal,
  Home,
  Layers,
  Percent,
  Box,
  RotateCcw,
  Maximize2
} from 'lucide-react';
import { Item, ItemClass, ItemImagesRecord } from '../../types/catalog';
import { Badge } from '../common/Badge';
import { LightboxModal } from '../common/LightboxModal';

interface MediaGridViewProps {
  items: Item[];
  categories: ItemClass[];
  imagesMap: Record<number, ItemImagesRecord>;
  onSelectStudioItem: (item: Item) => void;
  onUploadImagesForItem: (item: Item, files: File[]) => void;
}

type SortOption = 
  | 'name_asc' 
  | 'name_desc' 
  | 'id_desc' 
  | 'id_asc' 
  | 'price_asc' 
  | 'price_desc' 
  | 'stock_desc' 
  | 'discount_desc' 
  | 'media_desc' 
  | 'media_asc';

export const MediaGridView: React.FC<MediaGridViewProps> = ({
  items,
  categories,
  imagesMap,
  onSelectStudioItem,
  onUploadImagesForItem
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [discountFilter, setDiscountFilter] = useState<'all' | 'on_sale'>('all');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'complete' | 'single' | 'missing'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');

  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<number | null>(null);
  const [hoveredImageIdx, setHoveredImageIdx] = useState<number>(0);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(60);

  // Lightbox Modal State
  const [lightboxItem, setLightboxItem] = useState<Item | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const openLightbox = (item: Item, images: string[], idx = 0) => {
    setLightboxItem(item);
    setLightboxImages(images);
    setLightboxIndex(idx);
    setIsLightboxOpen(true);
  };

  // Extract distinct Rooms, Materials, and Tags dynamically
  const distinctRooms = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.house_rooms) {
        i.house_rooms.split(',').forEach((r) => {
          const trimmed = r.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  }, [items]);

  const distinctMaterials = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.material) {
        i.material.split(',').forEach((m) => {
          const trimmed = m.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  }, [items]);

  const distinctTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.tags) {
        i.tags.split(',').forEach((t) => {
          const trimmed = t.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Filter & Sort Pipeline
  const processedItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return items
      .filter((item) => {
        // Multi-field text search
        const matchesSearch = query === '' ||
          (item.item_name?.toLowerCase().includes(query) ?? false) ||
          (item.code?.toLowerCase().includes(query) ?? false) ||
          (item.upc?.toLowerCase().includes(query) ?? false) ||
          (item.description?.toLowerCase().includes(query) ?? false) ||
          (item.tags?.toLowerCase().includes(query) ?? false) ||
          (item.material?.toLowerCase().includes(query) ?? false) ||
          (item.house_rooms?.toLowerCase().includes(query) ?? false) ||
          item.item_id.toString().includes(query);

        // Category Filter
        const matchesCategory = selectedCategory === null || item.class_id === selectedCategory;

        // Room Filter
        const matchesRoom = selectedRoom === '' ||
          (item.house_rooms?.toLowerCase().includes(selectedRoom.toLowerCase()) ?? false);

        // Material Filter
        const matchesMaterial = selectedMaterial === '' ||
          (item.material?.toLowerCase().includes(selectedMaterial.toLowerCase()) ?? false);

        // Tag Filter
        const matchesTag = selectedTag === '' ||
          (item.tags?.toLowerCase().includes(selectedTag.toLowerCase()) ?? false);

        // Stock Filter
        const qtty = item.qtty || 0;
        let matchesStock = true;
        if (stockFilter === 'in_stock') matchesStock = qtty > 0;
        if (stockFilter === 'out_of_stock') matchesStock = qtty <= 0;

        // Discount Filter
        const discount = item.discount || 0;
        let matchesDiscount = true;
        if (discountFilter === 'on_sale') matchesDiscount = discount > 0;

        // Media Filter
        const imgRecord = imagesMap[item.item_id];
        const photoCount = (imgRecord?.thumbs?.length || 0) + (imgRecord?.views?.length || 0);
        let matchesMedia = true;
        if (mediaFilter === 'complete') matchesMedia = photoCount >= 2;
        if (mediaFilter === 'single') matchesMedia = photoCount === 1;
        if (mediaFilter === 'missing') matchesMedia = photoCount === 0;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesRoom &&
          matchesMaterial &&
          matchesTag &&
          matchesStock &&
          matchesDiscount &&
          matchesMedia
        );
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name_asc':
            return (a.item_name || '').localeCompare(b.item_name || '');
          case 'name_desc':
            return (b.item_name || '').localeCompare(a.item_name || '');
          case 'id_desc':
            return b.item_id - a.item_id;
          case 'id_asc':
            return a.item_id - b.item_id;
          case 'price_asc':
            return (a.price || 0) - (b.price || 0);
          case 'price_desc':
            return (b.price || 0) - (a.price || 0);
          case 'stock_desc':
            return (b.qtty || 0) - (a.qtty || 0);
          case 'discount_desc':
            return (b.discount || 0) - (a.discount || 0);
          case 'media_desc': {
            const countA = (imagesMap[a.item_id]?.thumbs?.length || 0) + (imagesMap[a.item_id]?.views?.length || 0);
            const countB = (imagesMap[b.item_id]?.thumbs?.length || 0) + (imagesMap[b.item_id]?.views?.length || 0);
            return countB - countA;
          }
          case 'media_asc': {
            const countA = (imagesMap[a.item_id]?.thumbs?.length || 0) + (imagesMap[a.item_id]?.views?.length || 0);
            const countB = (imagesMap[b.item_id]?.thumbs?.length || 0) + (imagesMap[b.item_id]?.views?.length || 0);
            return countA - countB;
          }
          default:
            return 0;
        }
      });
  }, [
    items,
    searchQuery,
    selectedCategory,
    selectedRoom,
    selectedMaterial,
    selectedTag,
    stockFilter,
    discountFilter,
    mediaFilter,
    sortBy,
    imagesMap
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedRoom('');
    setSelectedMaterial('');
    setSelectedTag('');
    setStockFilter('all');
    setDiscountFilter('all');
    setMediaFilter('all');
    setSortBy('name_asc');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedCategory !== null ||
    selectedRoom !== '' ||
    selectedMaterial !== '' ||
    selectedTag !== '' ||
    stockFilter !== 'all' ||
    discountFilter !== 'all' ||
    mediaFilter !== 'all' ||
    sortBy !== 'name_asc';

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      
      {/* Top Filter & Sorter HUD */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md space-y-3">
        
        {/* Row 1: Search, Category, Sorter & Advanced Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[280px] max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Name, SKU Code, UPC, Tags, Material, Room..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory ?? ''}
            onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value, 10) : null)}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Item Classes ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.item_class_id} value={c.item_class_id}>
                {c.item_class}
              </option>
            ))}
          </select>

          {/* Sorter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs text-white">
            <ArrowUpDown className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer py-1"
            >
              <option value="name_asc" className="bg-slate-900">Name (A → Z)</option>
              <option value="name_desc" className="bg-slate-900">Name (Z → A)</option>
              <option value="id_desc" className="bg-slate-900">Newest First (Item ID ↓)</option>
              <option value="id_asc" className="bg-slate-900">Oldest First (Item ID ↑)</option>
              <option value="price_asc" className="bg-slate-900">Price (Low → High)</option>
              <option value="price_desc" className="bg-slate-900">Price (High → Low)</option>
              <option value="stock_desc" className="bg-slate-900">Stock Qty (Highest)</option>
              <option value="discount_desc" className="bg-slate-900">Highest Discount %</option>
              <option value="media_desc" className="bg-slate-900">Most Photos First</option>
              <option value="media_asc" className="bg-slate-900">Missing Photos First</option>
            </select>
          </div>

          {/* Advanced Filters Drawer Button */}
          <button
            onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isAdvancedFiltersOpen || hasActiveFilters
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters {hasActiveFilters && '●'}
          </button>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800"
              title="Reset all filters"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}

          {/* Live Count */}
          <span className="text-xs font-mono text-slate-400 font-semibold">
            Showing {processedItems.length} of {items.length} items
          </span>

        </div>

        {/* Row 2: Secondary Quick Filter Chips & Expanded Attributes */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/40">
          
          {/* Media Health Status Pills */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMediaFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                mediaFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Media
            </button>
            <button
              onClick={() => setMediaFilter('complete')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                mediaFilter === 'complete' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🟢 Complete (2+)
            </button>
            <button
              onClick={() => setMediaFilter('single')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                mediaFilter === 'single' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🟡 1 Angle
            </button>
            <button
              onClick={() => setMediaFilter('missing')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                mediaFilter === 'missing' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔴 Missing Photos
            </button>
          </div>

          {/* Stock Filter Pills */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                stockFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Stock
            </button>
            <button
              onClick={() => setStockFilter('in_stock')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                stockFilter === 'in_stock' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              In Stock Only
            </button>
            <button
              onClick={() => setStockFilter('out_of_stock')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                stockFilter === 'out_of_stock' ? 'bg-slate-700 text-slate-200' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Out of Stock
            </button>
          </div>

          {/* On Sale Pill */}
          <button
            onClick={() => setDiscountFilter(discountFilter === 'on_sale' ? 'all' : 'on_sale')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
              discountFilter === 'on_sale'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Percent className="h-3 w-3" />
            On Sale (Discounted)
          </button>

          {/* Expanded Attributes (Room, Material, Tag Dropdowns) */}
          {isAdvancedFiltersOpen && (
            <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-top-1 duration-200">
              
              {/* Room Dropdown */}
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Rooms ({distinctRooms.length})</option>
                {distinctRooms.map((r) => (
                  <option key={r} value={r}>🏠 {r}</option>
                ))}
              </select>

              {/* Material Dropdown */}
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Materials ({distinctMaterials.length})</option>
                {distinctMaterials.map((m) => (
                  <option key={m} value={m}>🪵 {m}</option>
                ))}
              </select>

              {/* Tag Dropdown */}
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Tags ({distinctTags.length})</option>
                {distinctTags.map((t) => (
                  <option key={t} value={t}>🏷️ #{t}</option>
                ))}
              </select>

            </div>
          )}

        </div>

      </div>

      {/* Product Grid Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {processedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <ImageIcon className="h-12 w-12 text-slate-600 mb-2" />
            <p className="text-sm font-semibold">No items match your active filters</p>
            <p className="text-xs text-slate-600 mt-1">Try resetting filters to view all catalog products</p>
            <button
              onClick={resetFilters}
              className="mt-3 px-4 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {processedItems.slice(0, visibleCount).map((item) => {
                const imgRecord = imagesMap[item.item_id];
                const thumbs = imgRecord?.thumbs || [];
                const views = imgRecord?.views || [];
                const raws = imgRecord?.raws || [];
                const allPhotos = views.length > 0 ? views : (thumbs.length > 0 ? thumbs : raws);
                const photoCount = allPhotos.length;

                const isHovered = hoveredCardId === item.item_id;
                const isDragOver = dragOverCardId === item.item_id;

                const activeImage = photoCount > 0
                  ? (isHovered && photoCount > 1 ? allPhotos[hoveredImageIdx % photoCount] : allPhotos[0])
                  : 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80';

                const originalPrice = item.price || 0;
                const discount = item.discount || 0;
                const finalPrice = discount > 0 ? (originalPrice * (100 - discount)) / 100 : originalPrice;

                return (
                  <div
                    key={item.item_id}
                    onMouseEnter={() => {
                      setHoveredCardId(item.item_id);
                      setHoveredImageIdx(0);
                    }}
                    onMouseLeave={() => setHoveredCardId(null)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverCardId(item.item_id);
                    }}
                    onDragLeave={() => {
                      if (dragOverCardId === item.item_id) setDragOverCardId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverCardId(null);
                      const droppedFiles = Array.from(e.dataTransfer.files || []);
                      if (droppedFiles.length > 0) {
                        onUploadImagesForItem(item, droppedFiles);
                      }
                    }}
                    className={`group relative bg-slate-900/90 rounded-2xl border transition-all flex flex-col overflow-hidden ${
                      isDragOver
                        ? 'border-2 border-emerald-400 ring-4 ring-emerald-500/20 scale-[1.02] shadow-2xl'
                        : 'border-slate-800 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-950/20'
                    }`}
                  >
                    
                    {/* Image Container with Hover Cycling (3:4 Portrait) */}
                    <div className="relative w-full aspect-[3/4] bg-slate-950 overflow-hidden flex items-center justify-center">
                      {activeImage ? (
                        <img
                          src={activeImage}
                          alt={item.item_name || 'Item'}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-700 gap-1.5 p-4 text-center">
                          <ImageIcon className="h-8 w-8 text-slate-800 group-hover:text-emerald-500/60 transition-colors" />
                          <span className="text-[10px] text-slate-600 font-medium">Drop photo here</span>
                        </div>
                      )}

                    {/* Top Right Full-Screen Lightbox Action */}
                    {photoCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openLightbox(item, allPhotos, hoveredImageIdx % photoCount);
                        }}
                        className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-black/60 hover:bg-emerald-600 text-white opacity-0 group-hover:opacity-100 backdrop-blur-xs transition-all shadow-lg"
                        title="Inspect Full-Screen"
                      >
                        <Maximize2 className="h-3 w-3" />
                      </button>
                    )}

                    {/* Hover Cycling Dots */}
                    {photoCount > 1 && isHovered && (
                      <div className="absolute top-2 left-2 right-10 flex gap-1 z-10">
                        {allPhotos.map((_, idx) => (
                          <div
                            key={idx}
                            onMouseEnter={(e) => {
                              e.stopPropagation();
                              setHoveredImageIdx(idx);
                            }}
                            className={`h-1 flex-1 rounded-full cursor-pointer transition-all ${
                              hoveredImageIdx === idx ? 'bg-emerald-400' : 'bg-black/60'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Media Count Badge */}
                    <div className="absolute bottom-2 left-2 z-10">
                      {photoCount >= 2 ? (
                        <Badge variant="emerald" size="sm">
                          🟢 {photoCount} Photos
                        </Badge>
                      ) : photoCount === 1 ? (
                        <Badge variant="amber" size="sm">
                          🟡 1 Photo
                        </Badge>
                      ) : (
                        <Badge variant="rose" size="sm">
                          🔴 No Media
                        </Badge>
                      )}
                    </div>

                    {/* Stock Pill */}
                    <div className="absolute bottom-2 right-2 z-10">
                      {(item.qtty || 0) > 0 ? (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/70 text-emerald-400 backdrop-blur-xs">
                          {item.qtty} in stock
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-500/30">
                          Out of stock
                        </span>
                      )}
                    </div>

                    {/* Dropzone Overlay for Direct Multi-File Upload */}
                    <label className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs opacity-0 hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity z-20">
                      <Upload className="h-6 w-6 text-emerald-400 mb-1" />
                      <span className="text-[11px] font-bold">+ Drop Photos</span>
                      <span className="text-[9px] text-emerald-200">1 or multiple images</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) onUploadImagesForItem(item, files);
                        }}
                      />
                    </label>
                  </div>

                  {/* Card Body */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-mono">
                        <span>#{item.item_id}</span>
                        <span className="font-semibold text-slate-300">{item.code || 'NO-CODE'}</span>
                      </div>
                      <h4 className="font-bold text-xs text-white line-clamp-2 leading-snug">
                        {item.item_name || 'Untitled Item'}
                      </h4>
                      {item.house_rooms && (
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          🏠 {item.house_rooms} {item.material ? `• ${item.material}` : ''}
                        </p>
                      )}
                    </div>

                    {/* Price & Quick Studio Action */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-xs text-emerald-400">${finalPrice.toFixed(2)}</span>
                        {discount > 0 && (
                          <span className="text-[10px] text-rose-400 ml-1 font-semibold">-{discount}%</span>
                        )}
                      </div>

                      <button
                        onClick={() => onSelectStudioItem(item)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-all shadow-sm"
                      >
                        Studio
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>

            {/* Pagination / Load More Footer */}
            {processedItems.length > visibleCount && (
              <div className="flex flex-col items-center justify-center pt-8 pb-4 gap-3">
                <p className="text-xs text-slate-400 font-medium">
                  Showing <span className="text-white font-bold">{Math.min(visibleCount, processedItems.length)}</span> of <span className="text-white font-bold">{processedItems.length}</span> products
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 60)}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white font-semibold text-xs transition-all shadow-md active:scale-95"
                  >
                    Load More (+60 Items)
                  </button>
                  <button
                    onClick={() => setVisibleCount(processedItems.length)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white font-semibold text-xs transition-all active:scale-95"
                  >
                    Load All ({processedItems.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-Screen Lightbox Modal */}
      <LightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={lightboxImages}
        initialIndex={lightboxIndex}
        item={lightboxItem}
      />

    </div>
  );
};