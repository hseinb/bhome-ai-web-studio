/**
 * Image Naming Standard & Sequencing Engine
 * 
 * Standard Naming Convention & Deterministic Supabase Slot Alignment:
 * VALID_SLOTS: ['hero1', 'dim1', 'angle1', 'angle2', 'angle3', 'angle4', 'angle5']
 * 
 * Filesystem Pattern on C:\mssql-firebase-bridge\Pictures\{itemId}\:
 * {ItemCode}_01_hero1.jpg         <- Slot hero1 (Main Catalog Cover)
 * {ItemCode}_02_dim1.jpg          <- Slot dim1 (Dimensions / Technical Blueprint)
 * {ItemCode}_03_angle1.jpg        <- Slot angle1 (Alternate Angle 1)
 * {ItemCode}_04_angle2.jpg        <- Slot angle2 (Alternate Angle 2)
 * {ItemCode}_05_angle3.jpg        <- Slot angle3 (Alternate Angle 3)
 * {ItemCode}_06_angle4.jpg        <- Slot angle4 (Alternate Angle 4)
 * {ItemCode}_07_angle5.jpg        <- Slot angle5 (Alternate Angle 5)
 */

export const VALID_SLOTS = [
  'hero1',
  'dim1',
  'angle1',
  'angle2',
  'angle3',
  'angle4',
  'angle5'
] as const;

export type ValidSlot = typeof VALID_SLOTS[number];

export function sanitizeItemCode(code: string | null | undefined, itemId: number): string {
  if (!code || !code.trim()) return String(itemId);
  return code
    .trim()
    .replace(/[\/\\]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-]/g, '');
}

export function getZeroPaddedIndex(index1Based: number): string {
  return index1Based < 10 ? `0${index1Based}` : `${index1Based}`;
}

export interface ImageRoleInfo {
  slot: ValidSlot;
  role: ValidSlot;
  label: string;
  badgeColor: string;
  isPrimarySlot: boolean;
}

/**
 * Determines the target slot and role for an image strictly based on its sequential position.
 * Position 0 -> hero1 (Cover)
 * Position 1 -> dim1 (Dimensions)
 * Position 2 -> angle1
 * Position 3 -> angle2
 * Position 4 -> angle3
 * Position 5 -> angle4
 * Position 6 -> angle5
 */
export function determineImageRole(
  positionZeroIndexed: number,
  forceSlot?: ValidSlot
): ImageRoleInfo {
  if (forceSlot && (VALID_SLOTS as readonly string[]).includes(forceSlot)) {
    return getRoleInfoForSlot(forceSlot);
  }
  const slotIndex = Math.min(positionZeroIndexed, VALID_SLOTS.length - 1);
  const slot = VALID_SLOTS[slotIndex];
  return getRoleInfoForSlot(slot);
}

/**
 * Extracts slot from an existing filename on disk
 */
export function parseSlotFromFileName(fileName: string, fallbackPosition = 0): ImageRoleInfo {
  const hint = (fileName || '').toLowerCase();
  for (const slot of VALID_SLOTS) {
    if (
      hint.endsWith(`_${slot}`) || 
      hint.includes(`_${slot}_`) || 
      hint.endsWith(`_${slot}.jpg`) || 
      hint.endsWith(`_${slot}.webp`) ||
      hint.endsWith(`_${slot}.png`)
    ) {
      return getRoleInfoForSlot(slot);
    }
  }
  if (hint.includes('hero')) return getRoleInfoForSlot('hero1');
  if (hint.includes('dimension') || hint.includes('blueprint') || hint.includes('dim')) return getRoleInfoForSlot('dim1');
  for (let a = 1; a <= 5; a++) {
    if (hint.includes(`angle${a}`) || hint.includes(`angle_${a}`)) {
      return getRoleInfoForSlot(`angle${a}` as ValidSlot);
    }
  }
  return determineImageRole(fallbackPosition);
}

export function getRoleInfoForSlot(slot: ValidSlot): ImageRoleInfo {
  switch (slot) {
    case 'hero1':
      return {
        slot: 'hero1',
        role: 'hero1',
        label: '★ hero1 (Cover)',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        isPrimarySlot: true
      };
    case 'dim1':
      return {
        slot: 'dim1',
        role: 'dim1',
        label: '📐 dim1 (Dimensions)',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        isPrimarySlot: true
      };
    case 'angle1':
      return {
        slot: 'angle1',
        role: 'angle1',
        label: '📷 angle1',
        badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
        isPrimarySlot: true
      };
    case 'angle2':
      return {
        slot: 'angle2',
        role: 'angle2',
        label: '📷 angle2',
        badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
        isPrimarySlot: true
      };
    case 'angle3':
      return {
        slot: 'angle3',
        role: 'angle3',
        label: '📷 angle3',
        badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
        isPrimarySlot: true
      };
    case 'angle4':
      return {
        slot: 'angle4',
        role: 'angle4',
        label: '📷 angle4',
        badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
        isPrimarySlot: true
      };
    case 'angle5':
      return {
        slot: 'angle5',
        role: 'angle5',
        label: '📷 angle5',
        badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
        isPrimarySlot: true
      };
    default:
      return {
        slot: 'hero1',
        role: 'hero1',
        label: '★ hero1',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        isPrimarySlot: false
      };
  }
}

/**
 * Generates the standardized filename: [ItemCode]_[Seq]_[Role].jpg
 * e.g., POT_01_hero1.jpg, POT_02_dim1.jpg, POT_03_angle1.jpg
 */
export function generateStandardFileName(
  code: string | null | undefined,
  itemId: number,
  positionZeroIndexed: number,
  forceSlot?: ValidSlot
): string {
  const cleanCode = sanitizeItemCode(code, itemId);
  const paddedIndex = getZeroPaddedIndex(positionZeroIndexed + 1);
  const { slot } = determineImageRole(positionZeroIndexed, forceSlot);
  return `${cleanCode}_${paddedIndex}_${slot}.jpg`;
}

/**
 * Extracts filename from full URL or relative path
 */
export function extractFileNameFromUrl(url: string): string {
  if (!url) return '';
  const clean = url.split('?')[0];
  const parts = clean.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Parses existing filename to extract display label & badge
 */
export function parseImageBadgeInfo(urlOrFileName: string, fallbackPosition: number) {
  const fileName = extractFileNameFromUrl(urlOrFileName);
  const roleInfo = parseSlotFromFileName(fileName, fallbackPosition);
  const indexMatch = fileName.match(/_(\d{2})_/);
  const detectedIndex = indexMatch ? parseInt(indexMatch[1], 10) : fallbackPosition + 1;

  return {
    slot: roleInfo.slot,
    indexLabel: getZeroPaddedIndex(detectedIndex),
    roleLabel: roleInfo.label,
    badgeColor: roleInfo.badgeColor
  };
}

/**
 * Converts any browser Image / File (PNG, BMP, WEBP, etc.) to standard high-quality JPEG
 */
export async function convertFileToStandardJpg(file: File, targetFileName: string): Promise<File> {
  return new Promise((resolve) => {
    // If it's already a JPEG and doesn't need re-encoding, just rename it
    if ((file.type === 'image/jpeg' || file.type === 'image/jpg') && file.name.toLowerCase().endsWith('.jpg')) {
      resolve(new File([file], targetFileName, { type: 'image/jpeg' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(new File([file], targetFileName, { type: 'image/jpeg' }));
          return;
        }

        // Fill white background for transparent PNGs before converting to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const convertedFile = new File([blob], targetFileName, { type: 'image/jpeg' });
              resolve(convertedFile);
            } else {
              resolve(new File([file], targetFileName, { type: 'image/jpeg' }));
            }
          },
          'image/jpeg',
          0.92 // High quality 92% JPEG
        );
      };

      img.onerror = () => {
        resolve(new File([file], targetFileName, { type: 'image/jpeg' }));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve(new File([file], targetFileName, { type: 'image/jpeg' }));
    };

    reader.readAsDataURL(file);
  });
}
