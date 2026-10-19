import { Item, ItemTag } from '../types/catalog';

/**
 * Splits a comma-separated string into trimmed non-empty tokens.
 */
export function splitCommaSeparatedValues(raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Extracts distinct, sorted House Rooms (Catalog) across all items in the catalog.
 */
export function extractUniqueHouseRooms(items: Item[]): string[] {
  const set = new Set<string>();

  // Default standard suggestions if catalog is empty
  const defaults = [
    'Living Room',
    'Dining Room',
    'Bedroom',
    'Kitchen',
    'Bathroom',
    'Office',
    'Outdoor',
    'Hallway',
    'Kids Room',
    'Bar & Lounge'
  ];
  defaults.forEach((d) => set.add(d));

  items.forEach((item) => {
    if (item.house_rooms) {
      splitCommaSeparatedValues(item.house_rooms).forEach((room) => {
        // Capitalize nicely
        const clean = room.charAt(0).toUpperCase() + room.slice(1);
        set.add(clean);
      });
    }
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Extracts distinct, sorted Materials (Model) across all items in the catalog.
 */
export function extractUniqueMaterials(items: Item[]): string[] {
  const set = new Set<string>();

  // Default standard suggestions if catalog is empty
  const defaults = [
    'Solid Wood',
    'Oak Wood',
    'Walnut Wood',
    'Teak Wood',
    'Stainless Steel',
    'Brushed Brass',
    'Black Metal',
    'Velvet',
    'Leather',
    'Linen Fabric',
    'Tempered Glass',
    'Ceramic & Porcelain',
    'Marble',
    'Granite',
    'Rattan & Wicker',
    'Acrylic / Plastic'
  ];
  defaults.forEach((d) => set.add(d));

  items.forEach((item) => {
    if (item.material) {
      splitCommaSeparatedValues(item.material).forEach((mat) => {
        const clean = mat.charAt(0).toUpperCase() + mat.slice(1);
        set.add(clean);
      });
    }
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Extracts and merges unique tags from Supabase item_tags table and catalog item tags.
 */
export function extractUniqueTags(items: Item[], supabaseTags: ItemTag[] = []): string[] {
  const set = new Set<string>();

  // 1. Add all official Supabase item_tags
  supabaseTags.forEach((t) => {
    if (t.tag_name) {
      set.add(t.tag_name.trim());
    }
  });

  // 2. Add all tags from catalog items
  items.forEach((item) => {
    if (item.tags) {
      splitCommaSeparatedValues(item.tags).forEach((tag) => {
        set.add(tag.trim());
      });
    }
  });

  // Fallback defaults
  if (set.size === 0) {
    ['On Sale', 'New Arrival', 'Best Seller', 'Summer', 'Featured', 'Clearance'].forEach((t) => set.add(t));
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
