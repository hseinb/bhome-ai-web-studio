import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Image as ImageIcon,
  Edit2
} from 'lucide-react';
import { Item, ItemClass, ItemImagesRecord } from '../../types/catalog';
import { Badge } from '../common/Badge';

interface MatrixTableViewProps {
  items: Item[];
  categories: ItemClass[];
  imagesMap: Record<number, ItemImagesRecord>;
  onSelectStudioItem: (item: Item) => void;
}

export const MatrixTableView: React.FC<MatrixTableViewProps> = ({
  items,
  categories,
  imagesMap,
  onSelectStudioItem
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [auditFilter, setAuditFilter] = useState<'all' | 'no-photo' | 'no-dims' | 'no-room'>('all');

  const categoriesMap = React.useMemo(() => {
    const map: Record<number, string> = {};
    categories.forEach((c) => {
      map[c.item_class_id] = c.item_class || 'Category';
    });
    return map;
  }, [categories]);

  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = q === '' ||
      (item.item_name?.toLowerCase().includes(q) ?? false) ||
      (item.code?.toLowerCase().includes(q) ?? false) ||
      item.item_id.toString().includes(q);

    const rec = imagesMap[item.item_id];
    const hasPhoto = ((rec?.thumbs?.length || 0) + (rec?.views?.length || 0)) > 0;
    const hasDims = (item.length || 0) > 0 || (item.width || 0) > 0;
    const hasRoom = !!item.house_rooms;

    let matchesAudit = true;
    if (auditFilter === 'no-photo') matchesAudit = !hasPhoto;
    if (auditFilter === 'no-dims') matchesAudit = !hasDims;
    if (auditFilter === 'no-room') matchesAudit = !hasRoom;

    return matchesSearch && matchesAudit;
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      
      {/* Top Audit Filter Bar */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[300px] max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU audit table..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Audit Filter Buttons */}
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setAuditFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              auditFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All SKUs ({items.length})
          </button>
          <button
            onClick={() => setAuditFilter('no-photo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              auditFilter === 'no-photo' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔴 Missing Photos
          </button>
          <button
            onClick={() => setAuditFilter('no-dims')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              auditFilter === 'no-dims' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🟡 Missing Dimensions
          </button>
          <button
            onClick={() => setAuditFilter('no-room')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              auditFilter === 'no-room' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔵 No House Room
          </button>
        </div>

      </div>

      {/* High-Density Spreadsheet Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Photo</th>
                <th className="py-3 px-4">Item ID / SKU</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price ($)</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Dimensions (L/W/T)</th>
                <th className="py-3 px-4">Room & Material</th>
                <th className="py-3 px-4">Media Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredItems.map((item) => {
                const rec = imagesMap[item.item_id];
                const thumbs = rec?.thumbs || [];
                const views = rec?.views || [];
                const raws = rec?.raws || [];
                const allPhotos = views.length > 0 ? views : (thumbs.length > 0 ? thumbs : raws);
                const photoCount = allPhotos.length;
                const heroImg = thumbs[0] || views[0] || raws[0] || null;

                const hasDims = (item.length || 0) > 0 || (item.width || 0) > 0;

                return (
                  <tr
                    key={item.item_id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Photo Thumbnail (3:4 Portrait) */}
                    <td className="py-2.5 px-4">
                      <div className="w-9 aspect-[3/4] rounded-lg bg-slate-950 overflow-hidden border border-slate-800">
                        {heroImg ? (
                          <img
                            src={heroImg}
                            alt=""
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=150&q=80';
                            }}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* ID / Code */}
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-300">
                      <div>#{item.item_id}</div>
                      <div className="text-[10px] text-slate-500">{item.code || 'None'}</div>
                    </td>

                    {/* Product Name */}
                    <td className="py-2.5 px-4 font-bold text-white max-w-[220px] truncate">
                      {item.item_name || 'Untitled Item'}
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-4 text-slate-300 truncate max-w-[140px]">
                      {item.class_id ? categoriesMap[item.class_id] || `Cat ${item.class_id}` : 'Unassigned'}
                    </td>

                    {/* Price */}
                    <td className="py-2.5 px-4 font-bold text-emerald-400 font-mono">
                      ${item.price?.toFixed(2) || '0.00'}
                    </td>

                    {/* Stock */}
                    <td className="py-2.5 px-4 font-mono text-slate-300">
                      {(item.qtty || 0) > 0 ? (
                        <span className="text-emerald-400 font-semibold">{item.qtty}</span>
                      ) : (
                        <span className="text-rose-400 font-semibold">0</span>
                      )}
                    </td>

                    {/* Dimensions */}
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                      {hasDims ? (
                        `${item.length || 0}×${item.width || 0}×${item.thickness || 0}`
                      ) : (
                        <span className="text-amber-500/80">No Dims</span>
                      )}
                    </td>

                    {/* Room & Material */}
                    <td className="py-2.5 px-4 text-slate-400 text-[11px] truncate max-w-[150px]">
                      {item.house_rooms || item.material ? (
                        `${item.house_rooms || ''} ${item.material ? `• ${item.material}` : ''}`
                      ) : (
                        <span className="text-slate-600">Unset</span>
                      )}
                    </td>

                    {/* Media Status */}
                    <td className="py-2.5 px-4">
                      {photoCount >= 2 ? (
                        <Badge variant="emerald" size="sm">🟢 {photoCount} Photos</Badge>
                      ) : photoCount === 1 ? (
                        <Badge variant="amber" size="sm">🟡 1 Photo</Badge>
                      ) : (
                        <Badge variant="rose" size="sm">🔴 Missing</Badge>
                      )}
                    </td>

                    {/* Edit in Studio */}
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => onSelectStudioItem(item)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-all shadow-sm"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};