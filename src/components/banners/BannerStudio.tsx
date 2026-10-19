import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Calendar, 
  Tag, 
  Link as LinkIcon, 
  Save, 
  Eye, 
  Smartphone,
  Check,
  Image as ImageIcon
} from 'lucide-react';
import { PromoBanner, Item, ItemClass } from '../../types/catalog';
import { saveBanner, deleteBanner } from '../../api/supabaseClient';
import { resolveTagBannerUrl } from '../../utils/imageUrlResolver';
import { Badge } from '../common/Badge';

interface BannerStudioProps {
  banners: PromoBanner[];
  items: Item[];
  categories: ItemClass[];
  onBannersUpdated: (banners: PromoBanner[]) => void;
}

export const BannerStudio: React.FC<BannerStudioProps> = ({
  banners,
  items,
  categories,
  onBannersUpdated
}) => {
  const [selectedBanner, setSelectedBanner] = useState<PromoBanner | null>(banners[0] || null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New Banner Generator Template
  const handleCreateNewBanner = () => {
    const newBanner: PromoBanner = {
      id: `banner_${Date.now()}`,
      title: 'New Luxury Promo Collection',
      subtitle: 'Limited time discount on handcrafted furniture',
      image_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
      action_type: 'category',
      action_target: categories[0]?.item_class || 'Living Room',
      badge_text: 'SPECIAL OFFER',
      badge_color: '#f59e0b',
      is_active: true,
      display_order: banners.length + 1,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    setSelectedBanner(newBanner);
    setIsEditing(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBanner) return;
    setIsSaving(true);
    try {
      const normalizedBanner = {
        ...selectedBanner,
        image_url: resolveTagBannerUrl(selectedBanner.image_url)
      };
      const success = await saveBanner(normalizedBanner);
      if (success) {
        const nextBanners = banners.some((b) => b.id === normalizedBanner.id)
          ? banners.map((b) => (b.id === normalizedBanner.id ? normalizedBanner : b))
          : [...banners, normalizedBanner];
        onBannersUpdated(nextBanners);
        setSelectedBanner(normalizedBanner);
        setIsEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (confirm('Delete this promotional banner?')) {
      const success = await deleteBanner(id);
      if (success) {
        const nextBanners = banners.filter((b) => b.id !== id);
        onBannersUpdated(nextBanners);
        if (selectedBanner?.id === id) {
          setSelectedBanner(nextBanners[0] || null);
        }
      }
    }
  };

  return (
    <div className="flex h-full bg-slate-950 overflow-hidden">
      
      {/* LEFT COLUMN: Banners List (35%) */}
      <div className="w-96 border-r border-slate-800 flex flex-col bg-slate-950/60 p-4 space-y-4">
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-white">Promo Banners</h3>
            <p className="text-xs text-slate-400">Mobile Homepage Hero & Category Header Carousels</p>
          </div>
          <button
            onClick={handleCreateNewBanner}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md shadow-amber-950/40"
          >
            <Plus className="h-3.5 w-3.5" />
            New Banner
          </button>
        </div>

        {/* List of Active Banners */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {banners.map((b) => {
            const isSelected = selectedBanner?.id === b.id;
            return (
              <div
                key={b.id}
                onClick={() => {
                  setSelectedBanner(b);
                  setIsEditing(false);
                }}
                className={`rounded-2xl border p-3 cursor-pointer transition-all overflow-hidden relative ${
                  isSelected
                    ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-950/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Banner Thumbnail */}
                <div className="w-full aspect-[21/9] rounded-xl overflow-hidden bg-slate-950 relative mb-2">
                  <img src={resolveTagBannerUrl(b.image_url)} alt="" className="w-full h-full object-cover" />
                  {b.badge_text && (
                    <span
                      style={{ backgroundColor: b.badge_color || '#ef4444' }}
                      className="absolute top-2 left-2 text-[9px] font-extrabold text-white px-2 py-0.5 rounded-md shadow-md"
                    >
                      {b.badge_text}
                    </span>
                  )}
                  <span className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    b.is_active ? 'bg-emerald-500/90 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {b.is_active ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>

                {/* Banner Meta */}
                <h4 className="font-bold text-xs text-white truncate">{b.title}</h4>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{b.subtitle || 'No subtitle'}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                  <span>Target: {b.action_type} ({b.action_target})</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBanner(b.id);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* RIGHT CANVAS: Banner Form Editor & Mobile Home Preview (65%) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Center Editor */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 border-r border-slate-800/80">
          {selectedBanner ? (
            <form onSubmit={handleSaveBanner} className="space-y-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-2xl">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-base text-white">Edit Banner Canvas</h3>
                  <p className="text-xs text-slate-400">Configure visual layout, action triggers, and campaign dates</p>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-950/40"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Publish Banner'}
                </button>
              </div>

              {/* Title & Subtitle */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Title</label>
                <input
                  type="text"
                  value={selectedBanner.title}
                  onChange={(e) => setSelectedBanner({ ...selectedBanner, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Subtitle</label>
                <input
                  type="text"
                  value={selectedBanner.subtitle || ''}
                  onChange={(e) => setSelectedBanner({ ...selectedBanner, subtitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Image URL / WebP Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Banner Image URL (Cloudflare R2 auto-resolved & optimized)
                </label>
                <input
                  type="text"
                  value={selectedBanner.image_url}
                  onChange={(e) => setSelectedBanner({ ...selectedBanner, image_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Badge Text & Badge Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Badge Text (e.g. HOT DEAL)</label>
                  <input
                    type="text"
                    value={selectedBanner.badge_text || ''}
                    onChange={(e) => setSelectedBanner({ ...selectedBanner, badge_text: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Badge Color Hex</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedBanner.badge_color || '#ef4444'}
                      onChange={(e) => setSelectedBanner({ ...selectedBanner, badge_color: e.target.value })}
                      className="h-8 w-10 bg-transparent rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedBanner.badge_color || '#ef4444'}
                      onChange={(e) => setSelectedBanner({ ...selectedBanner, badge_color: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Action Type & Target */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Click Action Type</label>
                  <select
                    value={selectedBanner.action_type}
                    onChange={(e) => setSelectedBanner({ ...selectedBanner, action_type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="category">Open Category</option>
                    <option value="product">Open Single Product SKU</option>
                    <option value="tag">Filter by Tag (e.g. #SummerSale)</option>
                    <option value="whatsapp">Launch WhatsApp Promotion</option>
                    <option value="url">External Web Link</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Action Target Value</label>
                  <input
                    type="text"
                    value={selectedBanner.action_target}
                    onChange={(e) => setSelectedBanner({ ...selectedBanner, action_target: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    placeholder="e.g. Living Room, or SKU #64514"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={selectedBanner.start_date || ''}
                    onChange={(e) => setSelectedBanner({ ...selectedBanner, start_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={selectedBanner.end_date || ''}
                    onChange={(e) => setSelectedBanner({ ...selectedBanner, end_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

            </form>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Select or create a banner to start editing
            </div>
          )}
        </div>

        {/* Right Phone Simulator for Banner Home Carousel */}
        <div className="w-[420px] bg-slate-950/80 p-6 flex flex-col items-center justify-center border-l border-slate-800">
          <div className="text-center mb-3">
            <span className="text-xs font-bold text-slate-400">Mobile Home Carousel Preview</span>
          </div>

          <div className="relative w-[320px] h-[640px] bg-slate-950 rounded-[40px] p-3 shadow-2xl border-[5px] border-slate-800 flex flex-col overflow-hidden">
            {/* Mobile Home Screen Preview */}
            <div className="w-full h-full bg-slate-900 rounded-[30px] p-4 flex flex-col overflow-hidden text-slate-100">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-extrabold text-sm text-white">B HOME</span>
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs">
                  🔍
                </div>
              </div>

              {/* Hero Banner Preview */}
              {selectedBanner && (
                <div className="relative w-full aspect-[21/10] rounded-2xl overflow-hidden bg-slate-950 shadow-lg border border-slate-800">
                  <img src={resolveTagBannerUrl(selectedBanner.image_url)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
                    {selectedBanner.badge_text && (
                      <span
                        style={{ backgroundColor: selectedBanner.badge_color || '#ef4444' }}
                        className="w-fit text-[8px] font-black text-white px-2 py-0.5 rounded mb-1"
                      >
                        {selectedBanner.badge_text}
                      </span>
                    )}
                    <h5 className="font-bold text-xs text-white leading-tight">{selectedBanner.title}</h5>
                    <p className="text-[9px] text-slate-300 truncate">{selectedBanner.subtitle}</p>
                  </div>
                </div>
              )}

              {/* Mock Category Bar below banner */}
              <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
                {['Living Room', 'Bedrooms', 'Dining', 'Outdoor'].map((cat, i) => (
                  <span key={i} className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 whitespace-nowrap">
                    {cat}
                  </span>
                ))}
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
};