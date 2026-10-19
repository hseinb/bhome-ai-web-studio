import { Item } from '../types/catalog';

/**
 * Loads an image safely with crossOrigin
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = (e) => reject(e);
      fallback.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80';
    };
    img.src = src;
  });
}

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
 * Draws an architectural dimension line with end ticks and centered metric pill
 */
function drawDimensionLine(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  label: string,
  valueCm: number,
  orientation: 'horizontal' | 'vertical' | 'diagonal' = 'horizontal'
) {
  ctx.save();

  // 1. Draw Cyan Glowing Blueprint Line
  ctx.strokeStyle = '#06b6d4'; // Cyan 500
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // 2. End Cross Ticks
  ctx.setLineDash([]);
  ctx.lineWidth = 2.5;
  const tickLength = 12;

  if (orientation === 'horizontal') {
    ctx.beginPath();
    ctx.moveTo(startX, startY - tickLength);
    ctx.lineTo(startX, startY + tickLength);
    ctx.moveTo(endX, endY - tickLength);
    ctx.lineTo(endX, endY + tickLength);
    ctx.stroke();
  } else if (orientation === 'vertical') {
    ctx.beginPath();
    ctx.moveTo(startX - tickLength, startY);
    ctx.lineTo(startX + tickLength, startY);
    ctx.moveTo(endX - tickLength, endY);
    ctx.lineTo(endX + tickLength, endY);
    ctx.stroke();
  } else {
    // Diagonal
    ctx.beginPath();
    ctx.arc(startX, startY, 4, 0, Math.PI * 2);
    ctx.arc(endX, endY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#06b6d4';
    ctx.fill();
  }

  // 3. Metric Badge / Pill Box at Midpoint
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  const pillText = `${label}: ${valueCm || '--'} cm`;
  ctx.font = 'bold 15px Inter, monospace, sans-serif';
  const textWidth = ctx.measureText(pillText).width;
  const pillW = textWidth + 24;
  const pillH = 30;

  // Background Box
  ctx.fillStyle = 'rgba(2, 6, 23, 0.92)'; // Slate 950
  roundRect(ctx, midX - pillW / 2, midY - pillH / 2, pillW, pillH, 8);
  ctx.fill();

  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 1.5;
  roundRect(ctx, midX - pillW / 2, midY - pillH / 2, pillW, pillH, 8);
  ctx.stroke();

  // Text
  ctx.fillStyle = '#67e8f9'; // Cyan 300
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, midX, midY);

  ctx.restore();
}

/**
 * Generates an architectural dimension blueprint overlay for an item in 3:4 portrait view (1200x1600 px).
 */
export async function generateDimensionBlueprintImage(
  item: Item,
  baseImageUrl: string
): Promise<{ dataUrl: string; blob: Blob }> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600; // 3:4 Vertical Aspect Ratio
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // 1. Draw Blueprint Dark Grid Background
  ctx.fillStyle = '#020617'; // Slate 950
  ctx.fillRect(0, 0, 1200, 1600);

  // Architectural Grid Lines
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.07)'; // Subtle cyan grid
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < 1200; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1600);
    ctx.stroke();
  }
  for (let y = 0; y < 1600; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1200, y);
    ctx.stroke();
  }

  // 2. Draw Product Center Image (with subtle glow and border)
  const baseImg = await loadImage(baseImageUrl);
  const imgBoxX = 140;
  const imgBoxY = 160;
  const imgBoxW = 920;
  const imgBoxH = 1100;

  // Render centered image with cover/contain
  ctx.save();
  const imgRatio = baseImg.width / baseImg.height;
  const boxRatio = imgBoxW / imgBoxH;
  let renderW = imgBoxW;
  let renderH = imgBoxH;
  let offsetX = 0;
  let offsetY = 0;

  if (imgRatio > boxRatio) {
    renderW = imgBoxW;
    renderH = imgBoxW / imgRatio;
    offsetY = (imgBoxH - renderH) / 2;
  } else {
    renderH = imgBoxH;
    renderW = imgBoxH * imgRatio;
    offsetX = (imgBoxW - renderW) / 2;
  }

  roundRect(ctx, imgBoxX + offsetX, imgBoxY + offsetY, renderW, renderH, 20);
  ctx.clip();
  ctx.drawImage(baseImg, imgBoxX + offsetX, imgBoxY + offsetY, renderW, renderH);
  ctx.restore();

  // Subtle border around product
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, imgBoxX + offsetX, imgBoxY + offsetY, renderW, renderH, 20);
  ctx.stroke();

  // 3. Header: Technical Blueprint Title Card
  const headerY = 50;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px Inter, system-ui, sans-serif';
  ctx.fillText('B HOME • TECHNICAL DIMENSION SPECIFICATION', 60, headerY + 20);

  ctx.font = '600 12px monospace';
  ctx.fillStyle = '#06b6d4';
  const skuStr = item.code ? `SKU: ${item.code}` : `ITEM ID: #${item.item_id}`;
  ctx.fillText(`ARCHITECTURAL BLUEPRINT (METRIC: CM)  |  ${skuStr}`, 60, headerY + 44);

  // 4. Draw Architectural Dimension Lines
  const length = item.length || 200;
  const width = item.width || 90;
  const height = item.thickness || 85;

  const actualItemLeft = imgBoxX + offsetX;
  const actualItemRight = actualItemLeft + renderW;
  const actualItemTop = imgBoxY + offsetY;
  const actualItemBottom = actualItemTop + renderH;

  // Bottom Horizontal Line: Length / Width (↔)
  drawDimensionLine(
    ctx,
    actualItemLeft,
    actualItemBottom + 45,
    actualItemRight,
    actualItemBottom + 45,
    '↔ Length',
    length,
    'horizontal'
  );

  // Left Vertical Line: Height / Thickness (↕)
  drawDimensionLine(
    ctx,
    actualItemLeft - 45,
    actualItemTop,
    actualItemLeft - 45,
    actualItemBottom,
    '↕ Height',
    height,
    'vertical'
  );

  // Right Top Diagonal Line: Depth / Width (↗)
  drawDimensionLine(
    ctx,
    actualItemRight + 20,
    actualItemTop + 60,
    actualItemRight + 65,
    actualItemTop - 15,
    '↗ Depth',
    width,
    'diagonal'
  );

  // 5. Footer Technical Specification HUD (Y: 1360)
  const footerY = 1360;
  const footerH = 170;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; // Slate 900
  roundRect(ctx, 60, footerY, 1080, footerH, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 60, footerY, 1080, footerH, 20);
  ctx.stroke();

  // Item Title inside Footer
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 20px Inter, system-ui, sans-serif';
  ctx.fillText(item.item_name || 'Custom Architectural Furniture', 90, footerY + 40);

  // Specs Quad Grid inside Footer
  const cbm = ((length * width * height) / 1000000).toFixed(3);

  const specsCol1 = `Dimensions: ${length} × ${width} × ${height} cm`;
  const specsCol2 = `Volume (CBM): ${cbm} m³`;
  const specsCol3 = `Material: ${item.material || 'Solid Wood & Premium Upholstery'}`;
  const specsCol4 = `Room: ${item.house_rooms || 'Living / Commercial'}`;

  ctx.font = '500 13px Inter, monospace';
  ctx.fillStyle = '#94a3b8'; // Slate 400
  ctx.fillText(specsCol1, 90, footerY + 80);
  ctx.fillText(specsCol2, 90, footerY + 115);

  ctx.fillText(specsCol3, 580, footerY + 80);
  ctx.fillText(specsCol4, 580, footerY + 115);

  // Right Verified Badge
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  roundRect(ctx, 940, footerY + 30, 165, 36, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
  ctx.lineWidth = 1;
  roundRect(ctx, 940, footerY + 30, 165, 36, 10);
  ctx.stroke();

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 12px Inter, system-ui, sans-serif';
  ctx.fillText('✓ SPECS VERIFIED', 960, footerY + 53);

  // 6. Return Data URL and Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Blueprint blob creation failed'));
        return;
      }
      resolve({
        dataUrl: canvas.toDataURL('image/webp', 0.90),
        blob
      });
    }, 'image/webp', 0.90);
  });
}
