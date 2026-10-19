export interface Item {
  item_id: number;
  code: string | null;
  item_name: string | null;
  class_id: number | null;
  description: string | null;
  upc: string | null;
  qtty: number | null;
  price: number | null;
  material: string | null;
  house_rooms: string | null;
  length: number | null;
  width: number | null;
  thickness: number | null;
  weight: number | null;
  discount: number | null;
  tags: string | null;
  video_url?: string | null;
  video_thumbnail_url?: string | null;
  modified_date?: string | null;
}

export interface ItemClass {
  item_class_id: number;
  item_class: string | null;
  item_class_description: string | null;
  def_commission?: number | null;
  def_discount?: number | null;
}

export interface ImageSlotData {
  thumb: string;
  view: string;
  raw: string;
}

export interface ItemImagesRecord {
  item_id: number;
  thumbs: string[];
  views: string[];
  raws: string[];
  update_date?: string | null;
  // Deterministic Supabase Slot Columns
  hero1?: ImageSlotData | null;
  dim1?: ImageSlotData | null;
  angle1?: ImageSlotData | null;
  angle2?: ImageSlotData | null;
  angle3?: ImageSlotData | null;
  angle4?: ImageSlotData | null;
  angle5?: ImageSlotData | null;
}

export interface ItemTag {
  id: string;
  tag_name: string;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  local_image_path?: string | null;
  updated_at?: number | null;
}

export interface PromoBanner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  action_type: 'product' | 'category' | 'tag' | 'whatsapp' | 'url';
  action_target: string;
  badge_text?: string;
  badge_color?: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  display_order: number;
}

export type ViewMode = 'grid' | 'studio' | 'matrix' | 'banners' | 'drive' | 'ai-studio';

export interface DriveAsset {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  sizeBytes: number;
  folder: string;
  matchedItemId?: number | null;
  isLinked?: boolean;
}

export interface ImageTierUpload {
  thumbUrl: string;
  viewUrl: string;
  rawUrl: string;
  name: string;
  file?: File;
}

export interface GeneratedCopywriting {
  title: string;
  tagline: string;
  description: string;
  craftsmanship: string;
  roomPlacement: string;
  tags: string[];
}

export interface AiPipelineRecord {
  itemId: number;
  rawImageUrl: string;
  studioHeroUrl?: string;
  blueprintUrl?: string;
  lifestyleUrls: string[];
  generatedCopy?: GeneratedCopywriting;
  fidelityScore: number;
  status: 'idle' | 'processing' | 'review' | 'approved';
  updatedAt: string;
}