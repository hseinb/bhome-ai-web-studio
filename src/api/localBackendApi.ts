import { Item, ItemClass, ItemImagesRecord } from '../types/catalog';
import { resolveImageUrls } from '../utils/imageUrlResolver';

// Configurable Local API Host with localStorage persistence & automatic hostname detection
export function getLocalApiBaseUrl(): string {
  const saved = localStorage.getItem('PC_LOCAL_API_URL');
  if (saved && saved.trim()) return saved.trim();

  // If running in browser on host computer (localhost or 192.168.1.3), connect directly to port 8090
  if (typeof window !== 'undefined' && window.location.hostname) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8090';
    }
    return `http://${host}:8090`;
  }

  return 'http://192.168.1.3:8090';
}

export function setLocalApiBaseUrl(url: string) {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  localStorage.setItem('PC_LOCAL_API_URL', cleanUrl);
}

/**
 * Universal timeout-safe fetch helper that will never hang or throw unhandled exceptions
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 800): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch all items from Local Node.js / MSSQL Backend (api/items-detailed)
 */
export async function fetchLocalItems(): Promise<Item[]> {
  const baseUrl = getLocalApiBaseUrl();
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/items-detailed`, {
      headers: { 'Accept': 'application/json' }
    }, 800);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const json = await res.json();
    
    // Extract array from potential response keys: items, data, results, products, inventory
    let rawList: any[] = [];
    const potentialKeys = ['items', 'data', 'results', 'products', 'inventory'];
    for (const key of potentialKeys) {
      if (Array.isArray(json[key])) {
        rawList = json[key];
        break;
      }
    }
    if (rawList.length === 0) {
      if (Array.isArray(json)) rawList = json;
      else {
        for (const k of Object.keys(json)) {
          if (Array.isArray(json[k])) {
            rawList = json[k];
            break;
          }
        }
      }
    }

    return rawList.map((row: any) => ({
      item_id: row.ItemID ?? row.item_id ?? row.id,
      code: row.Code ?? row.code ?? null,
      item_name: row.ItemName ?? row.item_name ?? row.name ?? null,
      class_id: row.ClassID ?? row.class_id ?? null,
      description: row.Description ?? row.description ?? row.ItemDescription ?? null,
      upc: row.UPC ?? row.upc ?? null,
      qtty: parseFloat(row.Qtty ?? row.qtty ?? row.quantity ?? '0') || 0,
      price: parseFloat(row.SRP ?? row.srp ?? row.price ?? '0') || 0,
      material: row.Material ?? row.material ?? row.Model ?? null,
      house_rooms: row.HouseRooms ?? row.house_rooms ?? row.Catalog ?? null,
      length: parseFloat(row.Length ?? row.length ?? '0') || 0,
      width: parseFloat(row.Width ?? row.width ?? '0') || 0,
      thickness: parseFloat(row.Thickness ?? row.thickness ?? '0') || 0,
      weight: parseFloat(row.Weight ?? row.weight ?? '0') || 0,
      discount: parseFloat(row.Discount ?? row.discount ?? '0') || 0,
      tags: row.Tags ?? row.tags ?? null
    }));
  } catch (err) {
    return [];
  }
}

/**
 * Fetch all item classes / categories from Local Backend (GET /api/classes)
 */
export async function fetchLocalCategories(): Promise<ItemClass[]> {
  const baseUrl = getLocalApiBaseUrl();
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/classes`, {
      headers: { 'Accept': 'application/json' }
    }, 2500);
    if (!res.ok) return [];

    const json = await res.json();
    let rawList: any[] = [];
    if (Array.isArray(json)) {
      rawList = json;
    } else {
      const potentialKeys = ['classes', 'data', 'results', 'item_classes', 'itemClasses', 'categories'];
      for (const key of potentialKeys) {
        if (Array.isArray(json[key])) {
          rawList = json[key];
          break;
        }
      }
      if (rawList.length === 0) {
        for (const k of Object.keys(json)) {
          if (Array.isArray(json[k])) {
            rawList = json[k];
            break;
          }
        }
      }
    }

    return rawList.map((row: any) => ({
      item_class_id: parseInt(row.ClassID ?? row.class_id ?? row.Class_ID ?? row.ItemClassID ?? row.item_class_id ?? row.id ?? row.ID ?? '0', 10),
      item_class: row.ClassName ?? row.class_name ?? row.Class ?? row.ItemClass ?? row.item_class ?? row.name ?? row.Name ?? row.CategoryName ?? row.category_name ?? 'Class',
      item_class_description: row.Description ?? row.description ?? row.ClassDescription ?? row.item_class_description ?? ''
    })).filter((c: ItemClass) => !isNaN(c.item_class_id) && c.item_class_id > 0);
  } catch (err) {
    console.warn('Could not fetch /api/classes from local backend:', err);
    return [];
  }
}

/**
 * Fetch image manifest from Local Backend (api/images/manifest)
 */
export async function fetchLocalImageManifest(): Promise<Record<number, ItemImagesRecord>> {
  const baseUrl = getLocalApiBaseUrl();
  const map: Record<number, ItemImagesRecord> = {};

  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/images/manifest?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    }, 10000);
    if (!res.ok) return map;

    const manifest: Record<string, string[]> = await res.json();
    for (const [key, files] of Object.entries(manifest)) {
      const itemId = parseInt(key, 10);
      if (isNaN(itemId) || !Array.isArray(files)) continue;

      // Natural sort so 01_hero1 comes before 02_dim1
      const sortedFiles = [...files].sort((a, b) => 
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );

      const thumbUrls = sortedFiles.map((f) =>
        f.startsWith('http') ? f : `${baseUrl}/Thumbs/${itemId}/${f}`
      );
      const rawUrls = sortedFiles.map((f) =>
        f.startsWith('http') ? f : `${baseUrl}/Pictures/${itemId}/${f}`
      );

      const resolvedThumbs = resolveImageUrls(thumbUrls);
      const resolvedRaws = resolveImageUrls(rawUrls);

      map[itemId] = {
        item_id: itemId,
        thumbs: resolvedThumbs,
        views: resolvedThumbs,
        raws: resolvedRaws,
        update_date: new Date().toISOString()
      };
    }
  } catch (err) {
    // Expected when local server is offline
  }

  return map;
}

/**
 * Push Item Info Edit to Local Backend (POST api/update-item-info)
 */
export async function updateLocalItemInfo(item: Item): Promise<boolean> {
  const baseUrl = getLocalApiBaseUrl();
  const payload = {
    ItemID: item.item_id,
    Code: item.code,
    ItemName: item.item_name,
    ClassID: item.class_id,
    Description: item.description,
    UPC: item.upc,
    Qtty: item.qtty,
    SRP: item.price,
    Model: item.material,
    Catalog: item.house_rooms,
    Length: item.length,
    Width: item.width,
    Thickness: item.thickness,
    Weight: item.weight,
    Tags: item.tags
  };

  try {
    const res = await fetch(`${baseUrl}/api/update-item-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.error('Error updating item info on Local API:', err);
    return false;
  }
}

/**
 * Push Image File directly to Local Backend (POST api/images/upload)
 * Uses Multipart FormData with "itemId" and "image" fields.
 * Saved on local server to \\192.168.1.3\mssql-firebase-bridge\Pictures\{itemId}\{file.name}
 * Served statically at http://192.168.1.3:8090/Pictures/{itemId}/{file.name}
 */
export async function uploadLocalImage(
  itemId: number, 
  file: File
): Promise<{ success: boolean; url: string; fileName: string }> {
  const baseUrl = getLocalApiBaseUrl();
  const formData = new FormData();
  formData.append('itemId', itemId.toString());
  formData.append('image', file, file.name);

  const localUrl = `${baseUrl}/Pictures/${itemId}/${file.name}`;

  try {
    const res = await fetch(`${baseUrl}/api/images/upload`, {
      method: 'POST',
      body: formData
    });
    return {
      success: res.ok,
      url: localUrl,
      fileName: file.name
    };
  } catch (err) {
    console.error('Error uploading image to Local API:', err);
    return {
      success: false,
      url: localUrl,
      fileName: file.name
    };
  }
}

/**
 * Delete Image on Local Backend (POST api/images/delete)
 */
export async function deleteLocalImage(itemId: number, fileName: string): Promise<boolean> {
  const baseUrl = getLocalApiBaseUrl();
  const cleanFileName = (fileName || '').split('?')[0].split('/').pop() || fileName;
  try {
    const res = await fetch(`${baseUrl}/api/images/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ itemId, fileName: cleanFileName })
    });
    return res.ok;
  } catch (err) {
    console.error('Error deleting image on Local API:', err);
    return false;
  }
}

export interface ImageRenamePair {
  oldFileName: string;
  newFileName: string;
}

export interface ReorderResult {
  success: boolean;
  message?: string;
  count?: number;
  files?: string[];
  cloudData?: any;
}

/**
 * Reorder & Rename Images on Local Backend (POST api/images/reorder)
 * Renames images in C:\mssql-firebase-bridge\Pictures\{itemId}\ and syncs to Supabase slots
 */
export async function reorderLocalImages(
  itemId: number,
  code: string | null | undefined,
  renames: ImageRenamePair[]
): Promise<ReorderResult> {
  const baseUrl = getLocalApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/images/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        itemId,
        code: code || String(itemId),
        renames
      })
    });
    if (!res.ok) return { success: false };
    const json = await res.json().catch(() => ({}));
    return {
      success: json.success ?? res.ok,
      message: json.message,
      count: json.count,
      files: Array.isArray(json.files) ? json.files : undefined,
      cloudData: json.cloudData
    };
  } catch (err) {
    console.error('Error reordering images on Local API:', err);
    return { success: false };
  }
}