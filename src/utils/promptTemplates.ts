import { Item } from '../types/catalog';

export type LightingTemperature = 'warm_3500k' | 'neutral_5000k' | 'cool_6500k' | 'pure_white_softbox';
export type StudioBackdrop = 'pure_white_seamless' | 'infinity_cove_slate' | 'soft_warm_cove' | 'minimalist_concrete';
export type RoomSettingStyle = 'scandinavian_minimal' | 'modern_luxury_penthouse' | 'warm_contemporary' | 'executive_lounge';

export const STRICT_NEGATIVE_PROMPTS = [
  'altered geometry',
  'distorted product parts',
  'warped edges',
  'changed fabric texture',
  'altered logo or typography',
  'altered product color',
  'blurry edges',
  'cartoonish CGI look',
  'unrealistic proportions',
  'floating objects without contact shadows',
  'extra items replacing the product',
  'watermarks',
  'text artifacts'
].join(', ');

/**
 * Generates the studio isolation and enhancement prompt for Gemini
 */
export function buildStudioStagingPrompt(
  item: Item,
  backdrop: StudioBackdrop = 'pure_white_seamless',
  lighting: LightingTemperature = 'pure_white_softbox'
): { prompt: string; negativePrompt: string } {
  const bgDesc = backdrop === 'infinity_cove_slate'
    ? 'Clean, seamless dark slate photography cove background with subtle ambient floor gradient.'
    : backdrop === 'soft_warm_cove'
    ? 'Clean, seamless soft warm off-white photography studio background.'
    : backdrop === 'minimalist_concrete'
    ? 'Clean, seamless polished micro-cement studio background.'
    : 'Clean, seamless, pure white background with no clutter.';

  const prompt = `
Act as a professional product photographer. Enhance this image to look like a high-end commercial studio shot. Please apply the following:

Background: ${bgDesc}

Lighting: Professional soft-box studio lighting. Eliminate harsh glare and deep shadows while enhancing the product’s textures and material details.

Quality: Increase image clarity, sharpen fine details, remove any dust or surface imperfections, and ensure accurate color representation.

Composition: Ensure the product is perfectly centered, stable, and naturally grounded with a subtle, realistic contact shadow beneath it.

Formatting: Final output must be in a 3:4 vertical aspect ratio with professional framing and appropriate padding around the product.
`.trim();

  return { prompt, negativePrompt: STRICT_NEGATIVE_PROMPTS };
}

/**
 * Builds the vision copywriting prompt for Gemini 2.5
 */
export function buildVisionCopywritingPrompt(item: Item): string {
  return `
You are an expert luxury product specialist, copywriter, and commercial catalog editor for B HOME.
Analyze this product image along with its database specifications:
- SKU/Code: ${item.code || 'N/A'} (ID: ${item.item_id})
- Item Name: ${item.item_name || 'Custom Product'}
- Category ID: ${item.class_id || 'General'}
- Material: ${item.material || 'Premium Material'}
- House Room: ${item.house_rooms || 'Living Room / Multi-room'}
- Dimensions: ${item.length || 0}cm (L) x ${item.width || 0}cm (W) x ${item.thickness || 0}cm (H)
- Price: $${item.price || 0}

Generate an exquisite, high-converting product editorial in JSON format with the following fields:
{
  "title": "A captivating, elegant product title",
  "tagline": "A punchy 1-sentence luxury marketing tagline",
  "description": "A compelling 2-3 paragraph product description detailing ergonomics, material craftsmanship, tactile feel, and aesthetic allure.",
  "craftsmanship": "A bulleted or detailed explanation of the build quality, materials, durability, and finishing details.",
  "roomPlacement": "Specific styling and room layout advice (e.g. ideal room dimensions, paired color palettes, lighting suggestions).",
  "tags": ["Array", "of", "5-8", "relevant", "search", "and", "style", "tags"]
}

Return ONLY valid JSON matching this exact structure without markdown backticks.
`.trim();
}

/**
 * Builds the in-situ lifestyle staging prompt
 */
export function buildLifestyleStagingPrompt(
  item: Item,
  generatedCopy?: string,
  style: RoomSettingStyle = 'modern_luxury_penthouse'
): { prompt: string; negativePrompt: string } {
  const roomType = item.house_rooms || 'Living Room';
  
  const styleDesc = {
    scandinavian_minimal: 'sunlit Scandinavian minimalist interior with light oak flooring, large floor-to-ceiling windows, and sheer linen curtains',
    modern_luxury_penthouse: 'architectural modern luxury penthouse interior with polished terrazzo flooring, panoramic city views, and warm designer ambient lighting',
    warm_contemporary: 'warm contemporary residence with rich walnut accents, designer textured rug, and subtle indoor architectural plants',
    executive_lounge: 'sleek executive lounge with subtle ambient cove lighting, dark stone features, and high-end modern decor'
  }[style];

  const prompt = `
Photorealistic in-situ architectural photography placing this exact product ("${item.item_name || 'product'}") into a stunning ${roomType} setting.
Interior Setting: ${styleDesc}.
Scene Composition: The product is the primary hero focal point, naturally anchored to the floor with photorealistic perspective, ground shadows, and accurate scale.
Natural light streams gently through the space, interacting realistically with the room while preserving the item's authentic color, fabric texture, and structural details.
CRITICAL CONSTRAINT: Do not alter the product design, dimensions, or physical qualities.
`.trim();

  return { prompt, negativePrompt: STRICT_NEGATIVE_PROMPTS };
}
