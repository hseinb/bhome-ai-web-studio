import { Item } from '../types/catalog';

/**
 * Helper to load an image safely with crossOrigin anonymous
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // If CORS fails or source is invalid, fallback to placeholder
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = (e) => reject(e);
      fallback.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80';
    };
    img.src = src;
  });
}

/**
 * Draws rounded rectangle path on canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draws an image with object-fit "cover" inside a rounded box
 */
function drawImageCoverRounded(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.clip();

  const imgRatio = img.width / img.height;
  const targetRatio = width / height;

  let renderWidth = width;
  let renderHeight = height;
  let offsetX = 0;
  let offsetY = 0;

  if (imgRatio > targetRatio) {
    renderHeight = height;
    renderWidth = height * imgRatio;
    offsetX = (width - renderWidth) / 2;
  } else {
    renderWidth = width;
    renderHeight = width / imgRatio;
    offsetY = (height - renderHeight) / 2;
  }

  ctx.drawImage(img, x + offsetX, y + offsetY, renderWidth, renderHeight);
  ctx.restore();

  // Subtle border overlay
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, width, height, radius);
  ctx.stroke();
  ctx.restore();
}

/**
 * Generates a high-definition 1024x1024 WhatsApp marketing collage card and triggers instant browser download.
 */
export async function generateAndDownloadWhatsAppCard(
  item: Item,
  imageUrls: string[]
): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not obtain 2D canvas context');

  // 1. Draw Deep Gradient Luxury Background
  const bgGrad = ctx.createLinearGradient(0, 0, 1024, 1024);
  bgGrad.addColorStop(0, '#020617'); // Slate 950
  bgGrad.addColorStop(0.5, '#090d16');
  bgGrad.addColorStop(1, '#0f172a'); // Slate 900
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Decorative subtle gold/emerald top ambient glow
  const glow = ctx.createRadialGradient(512, 0, 10, 512, 0, 600);
  glow.addColorStop(0, 'rgba(16, 185, 129, 0.15)'); // Emerald glow
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1024, 500);

  // 2. Header Section
  const headerY = 40;
  
  // Brand Logo Text
  ctx.font = '900 28px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.letterSpacing = '3px';
  ctx.fillText('B HOME', 44, headerY + 24);

  ctx.font = '600 12px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#10b981'; // Emerald
  ctx.letterSpacing = '2px';
  ctx.fillText('LUXURY LIVING & FURNITURE', 44, headerY + 44);

  // Top Right SKU / Category Badge
  const categoryText = item.house_rooms ? item.house_rooms.toUpperCase() : 'PREMIUM COLLECTION';
  const skuText = item.code ? `SKU: ${item.code}` : `#${item.item_id}`;

  ctx.font = 'bold 12px monospace';
  const skuWidth = ctx.measureText(skuText).width;
  
  // SKU pill background
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  roundRect(ctx, 1024 - 44 - skuWidth - 28, headerY + 4, skuWidth + 28, 30, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
  ctx.lineWidth = 1;
  roundRect(ctx, 1024 - 44 - skuWidth - 28, headerY + 4, skuWidth + 28, 30, 8);
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.fillText(skuText, 1024 - 44 - skuWidth - 14, headerY + 24);

  // 3. Load Images for Grid
  const validUrls = imageUrls.filter(Boolean);
  const imagesToLoad = validUrls.length > 0
    ? validUrls.slice(0, 4)
    : ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80'];

  const loadedImages = await Promise.all(imagesToLoad.map(loadImage));

  // 4. Image Grid Layout (Y: 104 to 684 => Height: 580px)
  const gridX = 44;
  const gridY = 108;
  const gridW = 936;
  const gridH = 576;
  const radius = 16;
  const gap = 12;

  if (loadedImages.length === 1) {
    // Single Large Hero Image
    drawImageCoverRounded(ctx, loadedImages[0], gridX, gridY, gridW, gridH, radius);
  } else if (loadedImages.length === 2) {
    // 2 Columns Side-by-Side
    const colW = (gridW - gap) / 2;
    drawImageCoverRounded(ctx, loadedImages[0], gridX, gridY, colW, gridH, radius);
    drawImageCoverRounded(ctx, loadedImages[1], gridX + colW + gap, gridY, colW, gridH, radius);
  } else if (loadedImages.length === 3) {
    // Left Big Hero (60%) + Right 2 Stacked Angles (40%)
    const leftW = Math.round(gridW * 0.58);
    const rightW = gridW - leftW - gap;
    const rowH = (gridH - gap) / 2;

    drawImageCoverRounded(ctx, loadedImages[0], gridX, gridY, leftW, gridH, radius);
    drawImageCoverRounded(ctx, loadedImages[1], gridX + leftW + gap, gridY, rightW, rowH, radius);
    drawImageCoverRounded(ctx, loadedImages[2], gridX + leftW + gap, gridY + rowH + gap, rightW, rowH, radius);
  } else {
    // 4-Quad Grid (2x2)
    const colW = (gridW - gap) / 2;
    const rowH = (gridH - gap) / 2;
    drawImageCoverRounded(ctx, loadedImages[0], gridX, gridY, colW, rowH, radius);
    drawImageCoverRounded(ctx, loadedImages[1], gridX + colW + gap, gridY, colW, rowH, radius);
    drawImageCoverRounded(ctx, loadedImages[2], gridX, gridY + rowH + gap, colW, rowH, radius);
    drawImageCoverRounded(ctx, loadedImages[3], gridX + colW + gap, gridY + rowH + gap, colW, rowH, radius);
  }

  // 5. Footer Details Card (Y: 704 to 980 => Height: 276px)
  const cardY = 704;
  const cardH = 276;

  // Glass card background
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; // Slate 900
  roundRect(ctx, gridX, cardY, gridW, cardH, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)'; // Slate 700
  ctx.lineWidth = 1.5;
  roundRect(ctx, gridX, cardY, gridW, cardH, 24);
  ctx.stroke();
  ctx.restore();

  // Left Content Column inside Card (X: 74)
  const leftX = gridX + 30;
  let cursorY = cardY + 48;

  // Category & Status Tag
  ctx.font = 'bold 12px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#10b981';
  ctx.fillText(`● IN STOCK • ${categoryText}`, leftX, cursorY);
  cursorY += 34;

  // Product Name (Clamped to 1-2 lines)
  ctx.font = '800 24px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  const itemName = item.item_name || 'Premium Custom Furniture';
  
  // Measure and truncate title if too long for left side
  const maxTitleWidth = 560;
  if (ctx.measureText(itemName).width > maxTitleWidth) {
    let truncated = itemName;
    while (ctx.measureText(truncated + '...').width > maxTitleWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    ctx.fillText(truncated + '...', leftX, cursorY);
  } else {
    ctx.fillText(itemName, leftX, cursorY);
  }
  cursorY += 36;

  // Dimensions & Material Spec Pill
  const dimStr = (item.length || item.width || item.thickness)
    ? `Dims: ${item.length || 0} × ${item.width || 0} × ${item.thickness || 0} cm`
    : 'Standard Architectural Sizing';
  const matStr = item.material ? `Material: ${item.material}` : 'Crafted with premium materials';
  
  ctx.font = '500 13px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8'; // Slate 400
  ctx.fillText(`${dimStr}  |  ${matStr}`, leftX, cursorY);
  cursorY += 36;

  // Tags Line
  if (item.tags) {
    ctx.font = 'italic 12px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#64748b'; // Slate 500
    const tagList = item.tags.split(',').map((t) => `#${t.trim()}`).join('  ');
    ctx.fillText(tagList, leftX, cursorY);
  }

  // Right Pricing & Action Section inside Card
  const originalPrice = item.price || 0;
  const discount = item.discount || 0;
  const finalPrice = discount > 0 ? (originalPrice * (100 - discount)) / 100 : originalPrice;

  const rightCenterX = gridX + gridW - 150;
  const priceY = cardY + 70;

  // Price Display
  ctx.textAlign = 'center';

  if (discount > 0) {
    // Original Strikethrough Price
    ctx.font = '600 14px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    const srpStr = `$${originalPrice.toFixed(2)}`;
    ctx.fillText(srpStr, rightCenterX, priceY);

    const srpWidth = ctx.measureText(srpStr).width;
    ctx.strokeStyle = '#ef4444'; // Red strike line
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rightCenterX - srpWidth / 2 - 2, priceY - 4);
    ctx.lineTo(rightCenterX + srpWidth / 2 + 2, priceY - 4);
    ctx.stroke();

    // Discount Badge
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    roundRect(ctx, rightCenterX - 45, priceY + 8, 90, 22, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 1;
    roundRect(ctx, rightCenterX - 45, priceY + 8, 90, 22, 6);
    ctx.stroke();

    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#f87171';
    ctx.fillText(`SAVE ${discount}%`, rightCenterX, priceY + 23);

    // Final Price
    ctx.font = '900 32px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`$${finalPrice.toFixed(2)}`, rightCenterX, priceY + 68);
  } else {
    // Normal Final Price
    ctx.font = '500 12px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('SPECIAL PRICE', rightCenterX, priceY + 10);

    ctx.font = '900 36px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`$${finalPrice.toFixed(2)}`, rightCenterX, priceY + 54);
  }

  // Bottom WhatsApp CTA button
  ctx.fillStyle = '#059669'; // Emerald 600
  roundRect(ctx, rightCenterX - 95, cardY + cardH - 60, 190, 36, 12);
  ctx.fill();

  ctx.font = 'bold 12px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('💬 ORDER ON WHATSAPP', rightCenterX, cardY + cardH - 37);

  // Reset text alignment
  ctx.textAlign = 'left';

  // 6. Export to Blob and trigger Browser Download
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas Blob conversion failed'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeCode = (item.code || item.item_id).toString().replace(/[^a-zA-Z0-9-_]/g, '_');
      link.download = `B_HOME_${safeCode}_WhatsApp_Card.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}
