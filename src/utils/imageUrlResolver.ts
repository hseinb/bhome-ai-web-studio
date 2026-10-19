/**
 * Resolves and normalizes image URLs directly as stored in the database.
 */

export const FALLBACK_PLACEHOLDER_IMAGE = 
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80';

/**
 * Ensures an image URL is valid and handles Google Drive view/download redirects if needed,
 * preserving all Cloudflare R2 and direct URLs exactly as stored.
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return FALLBACK_PLACEHOLDER_IMAGE;
  }

  const cleanUrl = url.trim();

  // 1. Data URLs, blobs, and direct R2 / HTTPS URLs pass straight through
  if (
    cleanUrl.startsWith('data:') || 
    cleanUrl.startsWith('blob:') || 
    cleanUrl.startsWith('http://192.168.') ||
    cleanUrl.startsWith('http://localhost')
  ) {
    return cleanUrl;
  }

  // 2. Google Drive download links: if stored as uc?export=download, convert to direct Google CDN (lh3)
  const driveIdMatch = 
    cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if ((cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com')) && driveIdMatch && driveIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
  }

  // Pass through exact R2 URL as stored
  return cleanUrl;
}

export const R2_PUBLIC_BASE = 'https://pub-91d344728db8455caa2530306bdfbcb0.r2.dev';

/**
 * Resolves a promotional tag banner image URL.
 * Automatically rewrites any legacy Supabase storage URLs
 * (e.g. *.supabase.co/storage/v1/object/public/tag-images/...) to Cloudflare R2:
 * https://pub-91d344728db8455caa2530306bdfbcb0.r2.dev/tag-images/{fileName}
 */
export function resolveTagBannerUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return FALLBACK_PLACEHOLDER_IMAGE;
  }

  const cleanUrl = url.trim();

  // If already an R2 URL
  if (cleanUrl.startsWith(R2_PUBLIC_BASE)) {
    return cleanUrl;
  }

  // Legacy Supabase storage URL rewrite:
  // e.g. https://...supabase.co/storage/v1/object/public/tag-images/tag_xyz.jpg
  // or /tag-images/tag_xyz.jpg
  const tagImagesMatch = cleanUrl.match(/\/tag-images\/([^?#]+)/);
  if (tagImagesMatch && tagImagesMatch[1]) {
    const fileName = tagImagesMatch[1];
    return `${R2_PUBLIC_BASE}/tag-images/${fileName}`;
  }

  // If filename starts with tag_
  if (cleanUrl.startsWith('tag_')) {
    return `${R2_PUBLIC_BASE}/tag-images/${cleanUrl}`;
  }

  return resolveImageUrl(cleanUrl);
}

/**
 * Normalizes an array of image URLs
 */
export function resolveImageUrls(urls: string[] | null | undefined): string[] {
  if (!Array.isArray(urls) || urls.length === 0) return [];
  return urls.map(resolveImageUrl).filter(Boolean);
}
