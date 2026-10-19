import { Item } from '../types/catalog';

/**
 * Parses image filenames and matches them against catalogue SKUs & Item IDs.
 * Examples handled:
 * - "64514_1.webp" -> Item ID 64514
 * - "Pictures_54723_1.jpg" -> Item ID 54723
 * - "CHAIR-LUX-01_hero.jpg" -> Code CHAIR-LUX-01
 * - "80395.png" -> Item ID 80395
 */
export function matchFilenameToItem(filename: string, items: Item[]): {
  matchedItem: Item | null;
  confidence: 'exact_id' | 'exact_code' | 'partial_name' | 'none';
  extractedKey: string;
} {
  const cleanName = filename.replace(/\.[^/.]+$/, '').trim(); // strip extension

  // 1. Try extracting leading digits (Item ID) e.g. "64514_1" -> 64514
  const idMatch = cleanName.match(/(?:^|[^\d])(\d{3,7})(?:[^\d]|$)/);
  if (idMatch && idMatch[1]) {
    const numericId = parseInt(idMatch[1], 10);
    const foundById = items.find((i) => i.item_id === numericId);
    if (foundById) {
      return { matchedItem: foundById, confidence: 'exact_id', extractedKey: idMatch[1] };
    }
  }

  // 2. Try matching SKU / Code exact (case-insensitive)
  const tokens = cleanName.split(/[_\-\s]+/);
  for (const token of tokens) {
    if (token.length < 2) continue;
    const foundByCode = items.find(
      (i) => i.code && i.code.trim().toLowerCase() === token.toLowerCase()
    );
    if (foundByCode) {
      return { matchedItem: foundByCode, confidence: 'exact_code', extractedKey: token };
    }
  }

  // 3. Try matching Name contains
  const lowerName = cleanName.toLowerCase();
  for (const item of items) {
    if (item.item_name && item.item_name.length > 4) {
      const lowerItemName = item.item_name.toLowerCase();
      if (lowerName.includes(lowerItemName) || lowerItemName.includes(lowerName)) {
        return { matchedItem: item, confidence: 'partial_name', extractedKey: item.item_name };
      }
    }
  }

  return { matchedItem: null, confidence: 'none', extractedKey: '' };
}