import React, { useState, useEffect, useMemo } from 'react';
import { Save, Check, Sparkles, Server, Lock } from 'lucide-react';
import { Item, ItemClass, ItemTag } from '../../types/catalog';
import { updateLocalItemInfo } from '../../api/localBackendApi';
import { MultiSelectPillPicker } from '../common/MultiSelectPillPicker';
import { 
  extractUniqueHouseRooms, 
  extractUniqueMaterials, 
  extractUniqueTags, 
  splitCommaSeparatedValues 
} from '../../utils/metadataExtractor';

interface ItemSpecsEditorProps {
  item: Item | null;
  categories: ItemClass[];
  allItems?: Item[];
  tagsList?: ItemTag[];
  onItemUpdated: (updatedItem: Item) => void;
}

export const ItemSpecsEditor: React.FC<ItemSpecsEditorProps> = ({
  item,
  categories,
  allItems = [],
  tagsList = [],
  onItemUpdated
}) => {
  const [formData, setFormData] = useState<Partial<Item>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Dynamic Suggestion Clouds
  const availableHouseRooms = useMemo(() => extractUniqueHouseRooms(allItems), [allItems]);
  const availableMaterials = useMemo(() => extractUniqueMaterials(allItems), [allItems]);
  const availableTags = useMemo(() => extractUniqueTags(allItems, tagsList), [allItems, tagsList]);

  useEffect(() => {
    if (item) {
      setFormData({
        item_name: item.item_name || '',
        code: item.code || '',
        upc: item.upc || '',
        price: item.price || 0,
        discount: item.discount || 0,
        qtty: item.qtty || 0,
        class_id: item.class_id,
        material: item.material || '',
        house_rooms: item.house_rooms || '',
        length: item.length || 0,
        width: item.width || 0,
        thickness: item.thickness || 0,
        weight: item.weight || 0,
        tags: item.tags || '',
        description: item.description || ''
      });
      setSavedSuccess(false);
    }
  }, [item]);

  if (!item) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
        <p className="text-sm">Select an item from the list to edit specifications</p>
      </div>
    );
  }

  const handleChange = (field: keyof Item, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSavedSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Preserve ERP-locked fields
      const updatedItem: Item = {
        ...item,
        ...formData,
        code: item.code,
        price: item.price,
        discount: item.discount,
        qtty: item.qtty
      } as Item;

      // Push directly to Backend API (POST /api/update-item-info)
      const localSuccess = await updateLocalItemInfo(updatedItem);

      if (localSuccess) {
        setSavedSuccess(true);
        onItemUpdated(updatedItem);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      
      {/* Header with Save Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-white">Item Specifications</h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Local API Push
            </span>
          </div>
          <p className="text-xs text-slate-400">ID #{item.item_id} • Code: {item.code || 'None'}</p>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
            savedSuccess
              ? 'bg-emerald-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
          }`}
        >
          {savedSuccess ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Pushed to Local API!
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'Saving...' : 'Save via Local API'}
            </>
          )}
        </button>
      </div>

      {/* Row 1: Product Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name</label>
        <input
          type="text"
          value={formData.item_name || ''}
          onChange={(e) => handleChange('item_name', e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          placeholder="e.g. Velvet Armchair with Gold Legs"
        />
      </div>

      {/* Row 2: Code, UPC, Category */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-400">Item Code</label>
            <span className="flex items-center gap-0.5 text-[9px] text-slate-500 font-mono">
              <Lock className="h-2.5 w-2.5" /> Locked
            </span>
          </div>
          <input
            type="text"
            value={formData.code || ''}
            readOnly
            disabled
            className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono cursor-not-allowed select-all"
            title="Item Code is managed by ERP / MSSQL"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">UPC Barcode</label>
          <input
            type="text"
            value={formData.upc || ''}
            onChange={(e) => handleChange('upc', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Item Class</label>
          <select
            value={formData.class_id || ''}
            onChange={(e) => handleChange('class_id', e.target.value ? parseInt(e.target.value, 10) : null)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">Select Item Class</option>
            {categories.map((c) => (
              <option key={c.item_class_id} value={c.item_class_id}>
                {c.item_class}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3: Price, Discount, Qtty (ALL LOCKED) */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-400">Price / SRP ($)</label>
            <span className="flex items-center gap-0.5 text-[9px] text-slate-500 font-mono">
              <Lock className="h-2.5 w-2.5" /> Locked
            </span>
          </div>
          <input
            type="number"
            step="0.01"
            value={formData.price ?? 0}
            readOnly
            disabled
            className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-emerald-500/70 font-bold cursor-not-allowed select-all"
            title="Price is managed by ERP / MSSQL"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-400">Discount (%)</label>
            <span className="flex items-center gap-0.5 text-[9px] text-slate-500 font-mono">
              <Lock className="h-2.5 w-2.5" /> Locked
            </span>
          </div>
          <input
            type="number"
            step="1"
            value={formData.discount ?? 0}
            readOnly
            disabled
            className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-rose-500/70 font-bold cursor-not-allowed select-all"
            title="Discount is managed by ERP / MSSQL"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-400">Stock Qtty</label>
            <span className="flex items-center gap-0.5 text-[9px] text-slate-500 font-mono">
              <Lock className="h-2.5 w-2.5" /> Locked
            </span>
          </div>
          <input
            type="number"
            step="1"
            value={formData.qtty ?? 0}
            readOnly
            disabled
            className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono cursor-not-allowed select-all"
            title="Stock Quantity is managed by ERP / MSSQL"
          />
        </div>
      </div>

      {/* Row 4: Material Multi-Select */}
      <MultiSelectPillPicker
        label="Material (Model)"
        selectedValues={splitCommaSeparatedValues(formData.material)}
        availableOptions={availableMaterials}
        onChange={(vals) => handleChange('material', vals.join(', '))}
        colorTheme="blue"
        placeholder="e.g. Velvet, Solid Wood, Brass..."
      />

      {/* Row 5: House Rooms Multi-Select */}
      <MultiSelectPillPicker
        label="House Room (Catalog)"
        selectedValues={splitCommaSeparatedValues(formData.house_rooms)}
        availableOptions={availableHouseRooms}
        onChange={(vals) => handleChange('house_rooms', vals.join(', '))}
        colorTheme="amber"
        placeholder="e.g. Living Room, Dining Room, Bedroom..."
      />

      {/* Row 6: Dimensions (L, W, T, Weight) */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Dimensions (Length × Width × Thickness in cm, Weight in kg)</label>
        <div className="grid grid-cols-4 gap-2">
          <input
            type="number"
            step="0.1"
            value={formData.length ?? 0}
            onChange={(e) => handleChange('length', parseFloat(e.target.value) || 0)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white text-center"
            placeholder="Length"
          />
          <input
            type="number"
            step="0.1"
            value={formData.width ?? 0}
            onChange={(e) => handleChange('width', parseFloat(e.target.value) || 0)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white text-center"
            placeholder="Width"
          />
          <input
            type="number"
            step="0.1"
            value={formData.thickness ?? 0}
            onChange={(e) => handleChange('thickness', parseFloat(e.target.value) || 0)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white text-center"
            placeholder="Thick"
          />
          <input
            type="number"
            step="0.1"
            value={formData.weight ?? 0}
            onChange={(e) => handleChange('weight', parseFloat(e.target.value) || 0)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white text-center"
            placeholder="Weight (kg)"
          />
        </div>
      </div>

      {/* Row 7: Tags Multi-Select */}
      <MultiSelectPillPicker
        label="Tags (Promo Banners & Search Filters)"
        selectedValues={splitCommaSeparatedValues(formData.tags)}
        availableOptions={availableTags}
        onChange={(vals) => handleChange('tags', vals.join(', '))}
        colorTheme="emerald"
        placeholder="e.g. On Sale, Summer, New Arrival..."
      />

      {/* Row 8: Description */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Catalog Description</label>
        <textarea
          rows={3}
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
          placeholder="Detailed material specs, care instructions, and dimensions..."
        />
      </div>

    </form>
  );
};