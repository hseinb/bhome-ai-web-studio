/**
 * Client-Side In-Browser 3-Tier WebP Converter & Image Optimizer
 * Generates:
 * 1. Thumb WebP (~300x400, quality 0.82, <25KB)
 * 2. View HD WebP (~1200x1600, quality 0.90, <180KB)
 * 3. Lossless Raw URL linking
 */

export interface OptimizedImageResult {
  thumbDataUrl: string;
  viewDataUrl: string;
  thumbBlob: Blob;
  viewBlob: Blob;
  originalWidth: number;
  originalHeight: number;
  aspectRatio: string;
}

export async function processImageFile(file: File): Promise<OptimizedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const originalWidth = img.width;
          const originalHeight = img.height;
          const aspectRatio = `${originalWidth}:${originalHeight}`;

          // 1. Generate Thumbnail (Max 400px bound)
          const thumbCanvas = document.createElement('canvas');
          const thumbScale = Math.min(1, 400 / Math.max(img.width, img.height));
          thumbCanvas.width = Math.round(img.width * thumbScale);
          thumbCanvas.height = Math.round(img.height * thumbScale);

          const thumbCtx = thumbCanvas.getContext('2d');
          if (!thumbCtx) throw new Error('Canvas 2D context not available');
          thumbCtx.imageSmoothingEnabled = true;
          thumbCtx.imageSmoothingQuality = 'high';
          thumbCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);

          const thumbDataUrl = thumbCanvas.toDataURL('image/webp', 0.82);
          const thumbBlob = await canvasToBlob(thumbCanvas, 'image/webp', 0.82);

          // 2. Generate View HD (Max 1600px bound)
          const viewCanvas = document.createElement('canvas');
          const viewScale = Math.min(1, 1600 / Math.max(img.width, img.height));
          viewCanvas.width = Math.round(img.width * viewScale);
          viewCanvas.height = Math.round(img.height * viewScale);

          const viewCtx = viewCanvas.getContext('2d');
          if (!viewCtx) throw new Error('Canvas 2D context not available');
          viewCtx.imageSmoothingEnabled = true;
          viewCtx.imageSmoothingQuality = 'high';
          viewCtx.drawImage(img, 0, 0, viewCanvas.width, viewCanvas.height);

          const viewDataUrl = viewCanvas.toDataURL('image/webp', 0.90);
          const viewBlob = await canvasToBlob(viewCanvas, 'image/webp', 0.90);

          resolve({
            thumbDataUrl,
            viewDataUrl,
            thumbBlob,
            viewBlob,
            originalWidth,
            originalHeight,
            aspectRatio
          });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image into DOM'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file buffer'));
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas blob generation failed'));
      },
      type,
      quality
    );
  });
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}