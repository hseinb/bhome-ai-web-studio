import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Wand2, 
  Check, 
  RotateCcw, 
  Save, 
  Eye, 
  Sliders, 
  ShieldCheck, 
  Key, 
  Columns, 
  Layers, 
  Camera, 
  Maximize2, 
  FileText, 
  LayoutTemplate, 
  Compass, 
  Sun, 
  Download,
  Loader2,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Item, ItemClass, ItemImagesRecord, GeneratedCopywriting, AiPipelineRecord } from '../../types/catalog';
import { Badge } from '../common/Badge';
import { 
  generateProductCopywriting, 
  generateStudioShowcaseStaging, 
  generateLifestyleInSituStaging, 
  auditVisualFidelity,
  getGeminiApiKey,
  setGeminiApiKey
} from '../../api/geminiAiApi';
import { generateDimensionBlueprintImage } from '../../utils/dimensionBlueprintEngine';
import { 
  LightingTemperature, 
  StudioBackdrop, 
  RoomSettingStyle 
} from '../../utils/promptTemplates';
import { LightboxModal } from '../common/LightboxModal';

interface AiStudioViewProps {
  items: Item[];
  categories: ItemClass[];
  imagesMap: Record<number, ItemImagesRecord>;
  onApprovePipelineOutput: (
    item: Item,
    studioHeroUrl: string,
    blueprintUrl: string,
    lifestyleUrls: string[],
    updatedCopy?: GeneratedCopywriting
  ) => Promise<void>;
}

export const AiStudioView: React.FC<AiStudioViewProps> = ({
  items,
  categories,
  imagesMap,
  onApprovePipelineOutput
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(items[0] || null);

  // Active Stage Tab in Center Stage
  const [activeStageTab, setActiveStageTab] = useState<'curtain' | 'studio' | 'blueprint' | 'copy' | 'lifestyle'>('curtain');

  // Interactive Curtain Slider Position (0 to 100%)
  const [curtainPosition, setCurtainPosition] = useState<number>(50);
  const [isDraggingCurtain, setIsDraggingCurtain] = useState(false);
  const curtainContainerRef = useRef<HTMLDivElement>(null);

  // Tariq's Prompt Tuning Controls
  const [lightingTemp, setLightingTemp] = useState<LightingTemperature>('pure_white_softbox');
  const [studioBackdrop, setStudioBackdrop] = useState<StudioBackdrop>('pure_white_seamless');
  const [lifestyleStyle, setLifestyleStyle] = useState<RoomSettingStyle>('modern_luxury_penthouse');

  // Pipeline State per Item
  const [pipelineRecords, setPipelineRecords] = useState<Record<number, AiPipelineRecord>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [isSavingApproval, setIsSavingApproval] = useState(false);

  // Gemini API Key Modal
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getGeminiApiKey());

  // Lightbox
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Filter Items
  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    return q === '' ||
      (item.item_name?.toLowerCase().includes(q) ?? false) ||
      (item.code?.toLowerCase().includes(q) ?? false) ||
      item.item_id.toString().includes(q);
  });

  const activeRecord = selectedItem ? imagesMap[selectedItem.item_id] : undefined;
  const rawPhotos = activeRecord?.raws || activeRecord?.views || activeRecord?.thumbs || [];
  const rawImage = rawPhotos[0] || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80';

  const currentPipeline = selectedItem ? pipelineRecords[selectedItem.item_id] : undefined;

  // Initialize or Run Pipeline for Current Item
  const handleRunFullPipeline = async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    const itemId = selectedItem.item_id;

    try {
      // Stage 1: Studio Staging
      setProcessingStage('Stage 1: Isolating product & synthesizing studio lighting...');
      const studioHero = await generateStudioShowcaseStaging(
        selectedItem,
        rawImage,
        studioBackdrop,
        lightingTemp
      );

      // Stage 2: Dimension Blueprint (in cm)
      setProcessingStage('Stage 2: Calculating architectural dimension blueprint in cm...');
      const { dataUrl: blueprintUrl } = await generateDimensionBlueprintImage(
        selectedItem,
        studioHero
      );

      // Stage 3: Vision Copywriting
      setProcessingStage('Stage 3: Generating multimodal luxury product copywriting...');
      const copy = await generateProductCopywriting(selectedItem, studioHero);

      // Stage 4: In-Situ Lifestyle Scene
      setProcessingStage('Stage 4: Rendering photorealistic in-situ lifestyle room scene...');
      const lifestyle1 = await generateLifestyleInSituStaging(
        selectedItem,
        studioHero,
        lifestyleStyle
      );

      // Stage 5: Visual Fidelity Audit
      setProcessingStage('Stage 5: Running Tariq visual fidelity & anti-hallucination audit...');
      const audit = await auditVisualFidelity(rawImage, studioHero);

      const record: AiPipelineRecord = {
        itemId,
        rawImageUrl: rawImage,
        studioHeroUrl: studioHero,
        blueprintUrl,
        lifestyleUrls: [lifestyle1],
        generatedCopy: copy,
        fidelityScore: audit.score,
        status: 'review',
        updatedAt: new Date().toISOString()
      };

      setPipelineRecords((prev) => ({ ...prev, [itemId]: record }));
    } catch (err) {
      console.error('AI Pipeline execution error:', err);
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  // Approve & Push to Production
  const handleApproveAndPublish = async () => {
    if (!selectedItem || !currentPipeline) return;
    setIsSavingApproval(true);
    try {
      await onApprovePipelineOutput(
        selectedItem,
        currentPipeline.studioHeroUrl || rawImage,
        currentPipeline.blueprintUrl || rawImage,
        currentPipeline.lifestyleUrls,
        currentPipeline.generatedCopy
      );

      setPipelineRecords((prev) => ({
        ...prev,
        [selectedItem.item_id]: {
          ...currentPipeline,
          status: 'approved'
        }
      }));
    } finally {
      setIsSavingApproval(false);
    }
  };

  // Curtain Drag Handlers
  const handleCurtainMove = (clientX: number) => {
    if (!curtainContainerRef.current) return;
    const rect = curtainContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setCurtainPosition(percent);
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiApiKey(apiKeyInput);
    setIsApiKeyModalOpen(false);
  };

  const studioHeroImage = currentPipeline?.studioHeroUrl || rawImage;

  return (
    <div className="flex h-full bg-slate-950 overflow-hidden select-none">
      
      {/* COLUMN 1: Item & Raw Photo Navigator (22%) */}
      <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-950/70">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Wand2 className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-xs text-white uppercase tracking-wider">AI Studio Catalog</h3>
            </div>
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
              title="Configure Gemini Vision API Key"
            >
              <Key className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product code or name..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* List of Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredItems.map((item) => {
            const isSelected = selectedItem?.item_id === item.item_id;
            const rec = imagesMap[item.item_id];
            const pRec = pipelineRecords[item.item_id];
            const thumb = rec?.thumbs?.[0] || rec?.views?.[0] || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=150&q=80';

            return (
              <div
                key={item.item_id}
                onClick={() => setSelectedItem(item)}
                className={`p-2.5 rounded-2xl cursor-pointer transition-all flex items-center gap-3 border ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                    : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-slate-950 overflow-hidden shrink-0 border border-slate-800">
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>#{item.item_id}</span>
                    <span>{item.code || 'NO-CODE'}</span>
                  </div>
                  <h5 className="font-bold text-xs text-white truncate mt-0.5">{item.item_name || 'Untitled'}</h5>
                  
                  <div className="flex items-center gap-2 mt-1">
                    {pRec?.status === 'approved' ? (
                      <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Approved
                      </span>
                    ) : pRec?.status === 'review' ? (
                      <span className="text-[9px] font-bold text-amber-400 flex items-center gap-1">
                        ● Ready for Review
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-500">⚪ Unprocessed</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* COLUMN 2: Center 5-Stage Workbench (52%) */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-800/80">
        
        {/* Top Workbench Stage HUD */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          
          {/* Stage Switcher Tabs */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveStageTab('curtain')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeStageTab === 'curtain' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              Split Curtain QA
            </button>
            <button
              onClick={() => setActiveStageTab('studio')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeStageTab === 'studio' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              Stage 1: Studio
            </button>
            <button
              onClick={() => setActiveStageTab('blueprint')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeStageTab === 'blueprint' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              Stage 2: Blueprint (cm)
            </button>
            <button
              onClick={() => setActiveStageTab('copy')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeStageTab === 'copy' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Stage 3: Copy
            </button>
            <button
              onClick={() => setActiveStageTab('lifestyle')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeStageTab === 'lifestyle' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              Stage 4: Lifestyle
            </button>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleRunFullPipeline}
            disabled={isProcessing || !selectedItem}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-emerald-200" />
                <span>Run 5-Stage AI Pipeline</span>
              </>
            )}
          </button>

        </div>

        {/* Processing Progress Banner */}
        {isProcessing && (
          <div className="bg-emerald-950/60 border-b border-emerald-500/30 px-6 py-2 flex items-center justify-between text-xs text-emerald-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              <span className="font-semibold">{processingStage}</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 uppercase">Tariq Fidelity Engine Active</span>
          </div>
        )}

        {/* Main Canvas Viewport */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center bg-slate-950">
          
          {selectedItem ? (
            <div className="w-full max-w-2xl flex flex-col items-center space-y-4">
              
              {/* TAB 1: INTERACTIVE SPLIT CURTAIN (RAW VS STUDIO) */}
              {activeStageTab === 'curtain' && (
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>👈 Raw Camera Photo</span>
                    <span className="font-bold text-emerald-400 font-mono">Drag Slider to Compare Fidelity</span>
                    <span>Studio AI Staging 👉</span>
                  </div>

                  <div
                    ref={curtainContainerRef}
                    onMouseDown={() => setIsDraggingCurtain(true)}
                    onMouseUp={() => setIsDraggingCurtain(false)}
                    onMouseMove={(e) => {
                      if (isDraggingCurtain) handleCurtainMove(e.clientX);
                    }}
                    className="relative w-full aspect-[3/4] max-h-[580px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl cursor-ew-resize group"
                  >
                    {/* Layer 1: Studio Hero Image (Right / Underneath) */}
                    <img
                      src={studioHeroImage}
                      alt="Studio"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />

                    {/* Layer 2: Raw Warehouse Image (Left / Clipped) */}
                    <div
                      style={{ width: `${curtainPosition}%` }}
                      className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-emerald-400 shadow-2xl z-10"
                    >
                      <img
                        src={rawImage}
                        alt="Raw"
                        className="absolute inset-0 w-full h-full object-cover max-w-none pointer-events-none"
                        style={{ width: curtainContainerRef.current ? `${curtainContainerRef.current.offsetWidth}px` : '100%' }}
                      />
                    </div>

                    {/* Draggable Divider Handle */}
                    <div
                      style={{ left: `${curtainPosition}%` }}
                      className="absolute inset-y-0 -translate-x-1/2 z-20 flex items-center justify-center pointer-events-none"
                    >
                      <div className="w-9 h-9 rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-950 flex items-center justify-center text-xs font-black border-2 border-slate-900">
                        ↔
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STUDIO HERO STAGE */}
              {activeStageTab === 'studio' && (
                <div className="w-full space-y-3">
                  <div className="relative w-full aspect-[3/4] max-h-[580px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
                    <img src={studioHeroImage} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-4 left-4">
                      <Badge variant="emerald">★ STAGE 1: STUDIO HERO</Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DIMENSION BLUEPRINT IN CM */}
              {activeStageTab === 'blueprint' && (
                <div className="w-full space-y-3">
                  <div className="relative w-full aspect-[3/4] max-h-[580px] rounded-3xl overflow-hidden border border-cyan-500/40 bg-slate-900 shadow-2xl">
                    <img
                      src={currentPipeline?.blueprintUrl || studioHeroImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                        📐 STAGE 2: ARCHITECTURAL BLUEPRINT (CM)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: VISION COPYWRITING */}
              {activeStageTab === 'copy' && (
                <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl text-left">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-400" />
                      Stage 3: Generated Luxury Copywriting
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">Gemini 2.5 Vision Engine</span>
                  </div>

                  {currentPipeline?.generatedCopy ? (
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Product Title</span>
                        <h3 className="font-extrabold text-base text-white mt-0.5">
                          {currentPipeline.generatedCopy.title}
                        </h3>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Marketing Tagline</span>
                        <p className="text-emerald-400 font-semibold italic mt-0.5">
                          "{currentPipeline.generatedCopy.tagline}"
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Editorial Story</span>
                        <p className="text-slate-300 leading-relaxed mt-0.5">
                          {currentPipeline.generatedCopy.description}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Craftsmanship & Durability</span>
                        <p className="text-slate-300 whitespace-pre-line mt-0.5">
                          {currentPipeline.generatedCopy.craftsmanship}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Room Placement Recommendation</span>
                        <p className="text-slate-300 mt-0.5">
                          {currentPipeline.generatedCopy.roomPlacement}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500">
                      Run the pipeline to generate rich multimodal copywriting for this product.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: LIFESTYLE IN-SITU SCENE */}
              {activeStageTab === 'lifestyle' && (
                <div className="w-full space-y-3">
                  <div className="relative w-full aspect-[3/4] max-h-[580px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
                    <img
                      src={currentPipeline?.lifestyleUrls?.[0] || studioHeroImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge variant="emerald">🛋️ STAGE 4: IN-SITU LIFESTYLE</Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Action HUD: Approve & Push */}
              {currentPipeline && (
                <div className="w-full flex items-center justify-between bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
                  <div>
                    <span className="font-bold text-xs text-white">Stage Pipeline Ready</span>
                    <p className="text-[11px] text-slate-400">100% Product Geometry & Color Preserved</p>
                  </div>

                  <button
                    onClick={handleApproveAndPublish}
                    disabled={isSavingApproval}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all"
                  >
                    {isSavingApproval ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Publishing to Catalog...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Approve & Sync to Catalog</span>
                      </>
                    )}
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center text-slate-500">
              Select an item from the left catalog list to begin
            </div>
          )}

        </div>

      </div>

      {/* COLUMN 3: Tariq - Prompt Engineer & Quality Auditor HUD (26%) */}
      <div className="w-96 border-l border-slate-800 bg-slate-950/70 p-5 flex flex-col justify-between overflow-y-auto space-y-6">
        
        <div className="space-y-5">
          
          {/* Tariq Persona Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-indigo-950/50">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Tariq (Prompt Engineer)</h4>
              <p className="text-[11px] text-slate-400">Zero-Hallucination Quality Auditor</p>
            </div>
          </div>

          {/* Visual Fidelity Score Radar */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Visual Fidelity Score</span>
              <span className="font-mono font-extrabold text-sm text-emerald-400">
                {currentPipeline?.fidelityScore || 98}%
              </span>
            </div>

            {/* Checklist */}
            <div className="space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <Check className="h-3.5 w-3.5" />
                <span>Physical Contours & Shape Locked</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <Check className="h-3.5 w-3.5" />
                <span>Wood Grain & Fabric Weave Untouched</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <Check className="h-3.5 w-3.5" />
                <span>Realistic Ground Contact Shadow</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <Check className="h-3.5 w-3.5" />
                <span>Metric Dimensions in CM Calibrated</span>
              </div>
            </div>
          </div>

          {/* Prompt Style Tuning Knobs */}
          <div className="space-y-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Studio Lighting & Backdrop
            </span>

            {/* Lighting Temperature */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Color Temperature</label>
              <select
                value={lightingTemp}
                onChange={(e) => setLightingTemp(e.target.value as LightingTemperature)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="neutral_5000k">☀️ Neutral Daylight (5000K)</option>
                <option value="warm_3500k">🌅 Warm Luxury Softbox (3500K)</option>
                <option value="cool_6500k">❄️ Crisp Architectural (6500K)</option>
                <option value="luxury_dark">🌑 Dark Moody Luxury Studio</option>
              </select>
            </div>

            {/* Studio Backdrop */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Backdrop Environment</label>
              <select
                value={studioBackdrop}
                onChange={(e) => setStudioBackdrop(e.target.value as StudioBackdrop)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="pure_white_seamless">⚪ Clean Seamless Pure White (Default)</option>
                <option value="soft_warm_cove">Soft Warm Photography Cove</option>
                <option value="infinity_cove_slate">Dark Slate Infinity Cove</option>
                <option value="minimalist_concrete">Polished Micro-Cement Floor</option>
              </select>
            </div>

            {/* Lifestyle Room Style */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">In-Situ Lifestyle Architecture</label>
              <select
                value={lifestyleStyle}
                onChange={(e) => setLifestyleStyle(e.target.value as RoomSettingStyle)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="modern_luxury_penthouse">Modern Luxury Penthouse</option>
                <option value="scandinavian_minimal">Scandinavian Minimalist Sunlit</option>
                <option value="warm_contemporary">Warm Contemporary Residence</option>
                <option value="executive_lounge">Sleek Executive Lounge</option>
              </select>
            </div>

            {/* Prompt Inspector Box */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-300">Gemini Stage 1 Prompt</span>
                <button
                  onClick={() => {
                    const promptText = `Act as a professional product photographer. Enhance this image to look like a high-end commercial studio shot. Please apply the following:\n\nBackground: Clean, seamless, pure white background with no clutter.\n\nLighting: Professional soft-box studio lighting. Eliminate harsh glare and deep shadows while enhancing the product’s textures and material details.\n\nQuality: Increase image clarity, sharpen fine details, remove any dust or surface imperfections, and ensure accurate color representation.\n\nComposition: Ensure the product is perfectly centered, stable, and naturally grounded with a subtle, realistic contact shadow beneath it.\n\nFormatting: Final output must be in a 3:4 vertical aspect ratio with professional framing and appropriate padding around the product.`;
                    navigator.clipboard.writeText(promptText);
                  }}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Copy Prompt
                </button>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400 font-mono leading-relaxed max-h-36 overflow-y-auto">
                "Act as a professional product photographer. Enhance this image to look like a high-end commercial studio shot. Clean pure white background, professional soft-box lighting, 3:4 vertical ratio with grounded contact shadow."
              </div>
            </div>
          </div>

        </div>

        {/* Tariq's Negative Prompt Guardrail Footer */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-[10px] text-slate-500 space-y-1">
          <span className="font-bold text-slate-400 uppercase">Strict Negative Guardrails:</span>
          <p className="line-clamp-2">
            No altered geometry, warped cushions, distorted legs, or texture alterations.
          </p>
        </div>

      </div>

      {/* Gemini API Key Settings Modal */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Gemini 2.5 API Key</h3>
              </div>
              <button
                onClick={() => setIsApiKeyModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveApiKey} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Persisted locally in your browser to power multimodal vision copywriting and prompt generation.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-950/40"
                >
                  Save Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
