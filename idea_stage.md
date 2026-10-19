# Idea Stage Backlog & Technical Discussion

## Active Discussion: Multi-Select Pill Pickers (Tags from `item_tags`, House Rooms, Material)

### 1. Requirements Breakdown
1. **Tags from Supabase `item_tags` Table**:
   - Fetch tags from `item_tags` (`id`, `tag_name`, `title`, `description`, `image_url`, `updated_at`).
   - Tags double as **Promo Banners** whose images are hosted in Supabase Storage (`tag-images` bucket).
   - In `ItemSpecsEditor`, render Tags as an interactive **Multi-Select Pill Picker** where users can toggle existing company tags or add custom tags.

2. **House Rooms Multi-Select (`house_rooms` / `Catalog`)**:
   - Dynamically aggregate all unique values across the catalog by splitting comma-separated strings (`"Living Room, Dining Room"` $\to$ `["Living Room", "Dining Room"]`).
   - In `ItemSpecsEditor`, render House Rooms as an interactive **Multi-Select Pill Picker**.

3. **Material Multi-Select (`material` / `Model`)**:
   - Dynamically aggregate all unique values across the catalog by splitting comma-separated strings (`"Wood, Velvet, Steel"` $\to$ `["Wood", "Velvet", "Steel"]`).
   - In `ItemSpecsEditor`, render Material as an interactive **Multi-Select Pill Picker**.

4. **Promo Banners Integration**:
   - Update `BannerStudioView` to directly manage and display tags from `item_tags` with their banner images.

---

## Active Discussion: Cloudflare R2 Tag Banner Delivery & Auto-Resolution

### 1. Requirements Breakdown
1. **Cloudflare R2 Bucket Delivery**:
   - Tag banner images have been migrated and optimized into Cloudflare R2 (`https://pub-91d344728db8455caa2530306bdfbcb0.r2.dev/tag-images/...`).
2. **Database Alignment (`item_tags`)**:
   - Update `item_tags` records in Supabase so `image_url` references the direct Cloudflare R2 URLs.
3. **URL Resolution Engine (`resolveTagBannerUrl`)**:
   - In `src/utils/imageUrlResolver.ts`, add `resolveTagBannerUrl` to automatically rewrite any legacy `*.supabase.co/storage/v1/object/public/tag-images/...` URLs to Cloudflare R2.
4. **Banner Studio & Tag Persistence**:
   - In `BannerStudio.tsx` and `src/api/supabaseClient.ts`, route all tag and banner image reads and writes through `resolveTagBannerUrl`, ensuring all new/updated tags and banners persist direct R2 URLs to Supabase.
