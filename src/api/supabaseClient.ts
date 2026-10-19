import { createClient } from '@supabase/supabase-js';
import { Item, ItemClass, ItemImagesRecord, PromoBanner, ItemTag } from '../types/catalog';
import { resolveImageUrls, resolveTagBannerUrl } from '../utils/imageUrlResolver';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fetch ALL items from Supabase by paginating through PostgREST 1000-row limit in chunks.
 */
export async function fetchItems(): Promise<Item[]> {
  let allItems: Item[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;

  try {
    while (true) {
      const { data, error } = await supabase
        .from('tbl_items')
        .select('*')
        .order('item_id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching chunk from tbl_items:', error);
        break;
      }

      if (!data || data.length === 0) break;
      allItems = allItems.concat(data as Item[]);

      if (data.length < PAGE_SIZE) break; // Reached last page
      from += PAGE_SIZE;
    }
  } catch (err) {
    console.error('Unexpected error fetching all items:', err);
  }

  return allItems;
}

export async function fetchCategories(): Promise<ItemClass[]> {
  const { data, error } = await supabase
    .from('tbl_item_classes')
    .select('*')
    .order('item_class', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return (data || []) as ItemClass[];
}

/**
 * Fetch ALL item images by chunking through PostgREST.
 */
export async function fetchAllItemImages(): Promise<Record<number, ItemImagesRecord>> {
  const map: Record<number, ItemImagesRecord> = {};
  let from = 0;
  const PAGE_SIZE = 1000;

  try {
    while (true) {
      const { data, error } = await supabase
        .from('item_images')
        .select('*')
        .order('ItemID', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.warn('Error fetching chunk from item_images:', error);
        break;
      }

      if (!data || data.length === 0) break;

      data.forEach((row: any) => {
        const itemId = Number(row.ItemID ?? row.item_id ?? row.id);
        if (isNaN(itemId) || !itemId) return;

        let rawThumbs: string[] = [];
        let rawViews: string[] = [];
        let rawRaws: string[] = [];

        // 1. Check deterministic slot columns: hero1, dim1, angle1..angle5
        const VALID_SLOTS = ['hero1', 'dim1', 'angle1', 'angle2', 'angle3', 'angle4', 'angle5'];
        let hasSlotData = false;

        VALID_SLOTS.forEach((slot) => {
          const slotVal = row[slot];
          if (slotVal && typeof slotVal === 'object') {
            hasSlotData = true;
            if (slotVal.thumb) rawThumbs.push(slotVal.thumb);
            if (slotVal.view) rawViews.push(slotVal.view);
            if (slotVal.raw) rawRaws.push(slotVal.raw);
          }
        });

        // 2. Fallback to legacy arrays if no slot columns populated
        if (!hasSlotData) {
          try {
            rawThumbs = Array.isArray(row.Thumb) ? row.Thumb : (typeof row.Thumb === 'string' ? JSON.parse(row.Thumb || '[]') : []);
          } catch { rawThumbs = typeof row.Thumb === 'string' ? [row.Thumb] : []; }

          try {
            rawViews = Array.isArray(row.View) ? row.View : (typeof row.View === 'string' ? JSON.parse(row.View || '[]') : []);
          } catch { rawViews = typeof row.View === 'string' ? [row.View] : []; }

          try {
            rawRaws = Array.isArray(row.Raw) ? row.Raw : (typeof row.Raw === 'string' ? JSON.parse(row.Raw || '[]') : []);
          } catch { rawRaws = typeof row.Raw === 'string' ? [row.Raw] : []; }
        }

        const thumbs = resolveImageUrls(rawThumbs);
        const views = resolveImageUrls(rawViews);
        const raws = resolveImageUrls(rawRaws);

        map[itemId] = {
          item_id: itemId,
          thumbs,
          views,
          raws,
          hero1: row.hero1 || null,
          dim1: row.dim1 || null,
          angle1: row.angle1 || null,
          angle2: row.angle2 || null,
          angle3: row.angle3 || null,
          angle4: row.angle4 || null,
          angle5: row.angle5 || null,
          update_date: row.UpdateDate
        };
      });

      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  } catch (err) {
    console.warn('Unexpected error in fetchAllItemImages:', err);
  }

  return map;
}

export async function saveItemImages(
  itemId: number,
  thumbs: string[],
  views: string[],
  raws: string[]
): Promise<boolean> {
  const payload: any = {
    ItemID: itemId,
    Thumb: thumbs,
    View: views,
    Raw: raws,
    UpdateDate: new Date().toISOString()
  };

  // Populate deterministic slot columns matching backend schema
  const VALID_SLOTS = ['hero1', 'dim1', 'angle1', 'angle2', 'angle3', 'angle4', 'angle5'];
  VALID_SLOTS.forEach((slot, idx) => {
    if (thumbs[idx] || views[idx] || raws[idx]) {
      payload[slot] = {
        thumb: thumbs[idx] || views[idx] || raws[idx],
        view: views[idx] || thumbs[idx] || raws[idx],
        raw: raws[idx] || views[idx] || thumbs[idx]
      };
    } else {
      payload[slot] = null;
    }
  });

  const { error } = await supabase
    .from('item_images')
    .upsert(payload, { onConflict: 'ItemID' });

  if (error) {
    console.error(`Failed to save item images for item ${itemId}:`, error);
    return false;
  }
  return true;
}

/**
 * Upload image binary to Supabase Storage bucket 'product-images'
 */
export async function uploadImageToStorage(
  itemId: number,
  tier: 'thumbs' | 'views' | 'raws',
  blob: Blob,
  fileName: string
): Promise<string | null> {
  const path = `${tier}/${itemId}_${Date.now()}_${fileName}.webp`;
  
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(path, blob, {
      contentType: 'image/webp',
      upsert: true
    });

  if (error) {
    console.warn('Supabase storage upload fallback:', error.message);
    return null;
  }

  const { data: publicUrlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(path);

  return publicUrlData.publicUrl;
}

export async function updateItemSpecs(itemId: number, updates: Partial<Item>): Promise<boolean> {
  const { error } = await supabase
    .from('tbl_items')
    .update({
      ...updates,
      modified_date: new Date().toISOString()
    })
    .eq('item_id', itemId);

  if (error) {
    console.error(`Failed to update item specs for item ${itemId}:`, error);
    return false;
  }
  return true;
}

export async function fetchItemTags(): Promise<ItemTag[]> {
  const { data, error } = await supabase
    .from('item_tags')
    .select('*')
    .order('tag_name', { ascending: true });

  if (error) {
    console.warn('Error fetching item_tags from Supabase:', error);
    return [];
  }
  return (data || []).map((t: any) => ({
    ...t,
    image_url: t.image_url ? resolveTagBannerUrl(t.image_url) : t.image_url
  })) as ItemTag[];
}

export async function saveItemTag(tag: Partial<ItemTag>): Promise<boolean> {
  const normalizedTag = {
    ...tag,
    image_url: tag.image_url ? resolveTagBannerUrl(tag.image_url) : tag.image_url,
    updated_at: Date.now()
  };

  const { error } = await supabase
    .from('item_tags')
    .upsert(normalizedTag);

  if (error) {
    console.error('Failed to save item tag:', error);
    return false;
  }
  return true;
}

export async function deleteItemTag(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('item_tags')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete item tag:', error);
    return false;
  }
  return true;
}

export async function fetchBanners(): Promise<PromoBanner[]> {
  try {
    const tags = await fetchItemTags();
    if (tags.length > 0) {
      return tags.map((t, index) => ({
        id: t.id,
        title: t.title || t.tag_name,
        subtitle: t.description || `Special selection for ${t.tag_name}`,
        image_url: resolveTagBannerUrl(t.image_url || ''),
        action_type: 'tag' as const,
        action_target: t.tag_name,
        badge_text: t.tag_name.toUpperCase(),
        badge_color: index === 0 ? '#ef4444' : '#10b981',
        is_active: true,
        display_order: index + 1
      }));
    }
  } catch (err) {
    console.warn('Fallback banners used:', err);
  }
  return getFallbackBanners();
}

export async function saveBanner(banner: PromoBanner): Promise<boolean> {
  const resolvedUrl = resolveTagBannerUrl(banner.image_url);
  // If banner corresponds to an item_tag, update item_tags
  const success = await saveItemTag({
    id: banner.id,
    tag_name: banner.action_target || banner.title,
    title: banner.title,
    description: banner.subtitle,
    image_url: resolvedUrl
  });
  return success;
}

export async function deleteBanner(bannerId: string): Promise<boolean> {
  return await deleteItemTag(bannerId);
}

function getFallbackBanners(): PromoBanner[] {
  return [
    {
      id: 'b1',
      title: 'Grand Living Room Collection',
      subtitle: 'Up to 25% off selected sofas and luxury centerpieces',
      image_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
      action_type: 'category',
      action_target: 'Living Room',
      badge_text: 'HOT SALE',
      badge_color: '#ef4444',
      is_active: true,
      display_order: 1,
      start_date: '2026-08-01',
      end_date: '2026-09-30'
    },
    {
      id: 'b2',
      title: 'Designer Dining Suites',
      subtitle: 'Exclusive handcrafted marble & solid wood tables',
      image_url: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80',
      action_type: 'tag',
      action_target: 'Dining Suite',
      badge_text: 'NEW ARRIVAL',
      badge_color: '#10b981',
      is_active: true,
      display_order: 2,
      start_date: '2026-08-15',
      end_date: '2026-10-15'
    }
  ];
}