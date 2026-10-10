/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ALL_REQUIRED_FILES,
  BG_IMAGE_FILENAME,
  BASE_CHAR_FILENAME,
  GARMENTS_DATA,
  DEFAULT_LOOKS,
  SHARED_DEMO_ASSETS_MANIFEST,
  SharedAssetInfo,
  LOOK_TARGET_COLORS,
} from './data/garments';
import {
  COLLISION_HITBOXES,
  WARDROBE_TRIGGER_ZONE,
  GAME_WIDTH,
  GAME_HEIGHT,
  rectIntersect,
} from './game/hitboxes';
import {
  EVENT_GAME_WIDTH,
  EVENT_GAME_HEIGHT,
  EVENT_MAP_HITBOXES,
  TRIGGER_NPC_TRUYENTHONG,
  TRIGGER_NPC_THOANH,
  CHO_XUAN_HITBOXES,
  YEARBOOK_HITBOXES,
  TRIGGER_CHO_XUAN_VAI,
  TRIGGER_CHO_XUAN_MAU,
} from './game/eventHitboxes';
import { EVENT_ASSETS_CONFIG } from './data/eventAssets';
import { createCompleteVisualAssets } from './game/visualDesign';
import { drawSceneActors, drawSceneBackground, SceneActor } from './game/sceneRenderer';
import { YearbookTasks } from './game/YearbookTasks';
import { eventBackground } from './game/eventMetadata';
import { GarmentConfig, GameSelectionState, LookConfig, GarmentId, EventProgressState, MemoryAlbumItem, MemoryOutfitSnapshot, LookTargetColor } from './types';
import { getSpriteBounds, SpriteBounds } from './utils/imageBounds';
import {
  getAssetBlob,
  saveAssetBlob,
  getStoredCustomLooks,
  saveStoredCustomLook,
  StoredLookMeta,
  uploadSharedAsset,
  getPlayerSession,
  savePlayerSession,
  getMemoryAlbum,
  saveMemoryAlbumItem,
  deleteMemoryAlbumItem,
} from './utils/assetStorage';
import {
  X,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Upload,
  Check,
  Plus,
  Shirt,
  Calendar,
  PartyPopper,
  Camera,
  MapPin,
  MessageSquare,
  Lock,
  Eye,
  BookOpen,
  Trash2,
  Home,
  Palette,
  Scissors,
  RotateCcw,
  HelpCircle,
  Sliders,
} from 'lucide-react';

interface LoadedImages {
  [filename: string]: HTMLImageElement;
}

export default function App() {
  // -------------------------------------------------------------
  // STATE: Asset & Preloading
  // -------------------------------------------------------------
  const [imagesLoaded, setImagesLoaded] = useState<boolean>(false);
  const [missingFiles, setMissingFiles] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<{
    hasError: boolean;
    filename: string;
    message: string;
  } | null>(null);

  const imagesRef = useRef<LoadedImages>({});
  const spriteBoundsRef = useRef<{ [filename: string]: SpriteBounds }>({});

  // Navigation views: 'game' (Phòng) | 'remix' (Bước 2: Chọn bản phối) | 'confirm' (Xác nhận) | 'event_map' (Bước 3: Sự kiện)
  const [currentView, setCurrentView] = useState<'game' | 'remix' | 'confirm' | 'event_map'>('game');

  // Modal states for Wardrobe (Phòng)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalLayer, setModalLayer] = useState<1 | 2>(1);
  const [selectedGarment, setSelectedGarment] = useState<GarmentConfig | null>(null);

  // Available looks list (Default + Custom uploaded looks)
  const [allLooks, setAllLooks] = useState<LookConfig[]>(DEFAULT_LOOKS);

  // Active outfit selection state
  const [savedSelection, setSavedSelection] = useState<GameSelectionState | null>(null);

  // Currently selected look in remix view
  const [activeLookId, setActiveLookId] = useState<string>('look_aodai_1');

  // Add Look Modal state (Bước 2)
  const [showAddLookModal, setShowAddLookModal] = useState<boolean>(false);
  const [newLookName, setNewLookName] = useState<string>('');
  const [newLookDesc, setNewLookDesc] = useState<string>('');
  const [newLookPreviewUrl, setNewLookPreviewUrl] = useState<string | null>(null);
  const [newLookFile, setNewLookFile] = useState<File | null>(null);
  const [addLookError, setAddLookError] = useState<string | null>(null);

  // Asset manager modal state (with dedicated slots for Step 3 and Shared Assets)
  const [showAssetManager, setShowAssetManager] = useState<boolean>(false);
  const [assetManagerTab, setAssetManagerTab] = useState<'shared' | 'step3' | 'step1_2'>('shared');
  const [sharedCategoryFilter, setSharedCategoryFilter] = useState<string>('all');
  const [sharedUploadStatus, setSharedUploadStatus] = useState<{ [key: string]: string }>({});
  const [isUploadingShared, setIsUploadingShared] = useState<{ [key: string]: boolean }>({});
  const [serverCheckResult, setServerCheckResult] = useState<{ total: number; ready: number } | null>(null);
  const [slotTempPreviews, setSlotTempPreviews] = useState<{ [key: string]: string }>({});
  const [slotTempFiles, setSlotTempFiles] = useState<{ [key: string]: File }>({});
  const [slotSuccessMsg, setSlotSuccessMsg] = useState<{ [key: string]: string }>({});
  const [batchUploadProgress, setBatchUploadProgress] = useState<string | null>(null);
  const [batchUploadSummary, setBatchUploadSummary] = useState<{
    success: number;
    failed: number;
    total: number;
    details: string[];
  } | null>(null);

  // Proximity trigger to wardrobe (Room)
  const [isNearWardrobe, setIsNearWardrobe] = useState<boolean>(false);

  // -------------------------------------------------------------
  // STATE: Bước 3 & Bước 5 - Event Map, NPCs, Minigames & Progress
  // -------------------------------------------------------------
  // Event progress state: preserved across views & localStorage!
  const [eventProgress, setEventProgress] = useState<EventProgressState>(() => {
    try {
      const raw = localStorage.getItem('tu_nha_minh_event_progress');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ngay_hoi: {
            mg1Completed: !!parsed?.ngay_hoi?.mg1Completed,
            mg2Completed: !!parsed?.ngay_hoi?.mg2Completed,
          },
          ky_yeu: {mg1Completed: !!parsed?.ky_yeu?.mg1Completed, mg2Completed: !!parsed?.ky_yeu?.mg2Completed},
          cho_xuan: {
            mg1Completed: !!parsed?.cho_xuan?.mg1Completed,
            mg2Completed: !!parsed?.cho_xuan?.mg2Completed,
          },
        };
      }
    } catch (e) {
      console.error('Lỗi đọc tiến trình sự kiện từ localStorage', e);
    }
    return {
      ngay_hoi: {
        mg1Completed: false,
        mg2Completed: false,
      },
      ky_yeu: {mg1Completed: false, mg2Completed: false},
      cho_xuan: {
        mg1Completed: false,
        mg2Completed: false,
      },
    };
  });

  // Save event progress to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('tu_nha_minh_event_progress', JSON.stringify(eventProgress));
    } catch (e) {
      console.error('Lỗi lưu tiến trình sự kiện vào localStorage', e);
    }
  }, [eventProgress]);

  // Map entry error state (e.g. missing bg_ngayhoitruong.png)
  const [mapEntryError, setMapEntryError] = useState<string | null>(null);

  // NPC & Stall proximity triggers on event map
  const [isNearNPCTruyenThong, setIsNearNPCTruyenThong] = useState<boolean>(false);
  const [isNearNPCThoAnh, setIsNearNPCThoAnh] = useState<boolean>(false);
  const [isNearChoXuanVai, setIsNearChoXuanVai] = useState<boolean>(false);
  const [isNearChoXuanMau, setIsNearChoXuanMau] = useState<boolean>(false);

  // Active NPC Dialogue / Minigame Modal: null | 'truyenthong' | 'thoanh' | 'cho_xuan_vai' | 'cho_xuan_mau'
  const [activeNPCModal, setActiveNPCModal] = useState<
    'truyenthong' | 'thoanh' | 'cho_xuan_vai' | 'cho_xuan_mau' | null
  >(null);

  // Minigame 1 State (NPC Truyền thông - Raglan seam ráp tay)
  const [mg1SeamAttached, setMg1SeamAttached] = useState<boolean>(false);
  const [mg1Success, setMg1Success] = useState<boolean>(false);

  // Minigame 2 State (NPC Thợ ảnh - 3 dáng cổ áo dài ma-nơ-canh)
  const [mg2Placements, setMg2Placements] = useState<{
    m1: string | null;
    m2: string | null;
    m3: string | null;
  }>({ m1: null, m2: null, m3: null });
  const [mg2SelectedCard, setMg2SelectedCard] = useState<string | null>(null);
  const [mg2Success, setMg2Success] = useState<boolean>(false);

  // -------------------------------------------------------------
  // BƯỚC 5: CHỢ XUÂN MINIGAME STATES (ÁO TỨ THÂN)
  // -------------------------------------------------------------
  // Minigame 1 Chợ Xuân: Ghép 4 mảnh áo tứ thân (slots: 0 = TL, 1 = TR, 2 = BL, 3 = BR)
  const [puzzleBoard, setPuzzleBoard] = useState<(number | null)[]>([null, null, null, null]);
  const [puzzlePool, setPuzzlePool] = useState<number[]>([2, 0, 3, 1]);
  const [selectedPuzzlePiece, setSelectedPuzzlePiece] = useState<{
    source: 'pool' | 'slot';
    index: number;
  } | null>(null);
  const [draggedPuzzlePiece, setDraggedPuzzlePiece] = useState<{
    source: 'pool' | 'slot';
    index: number;
  } | null>(null);
  const [showPuzzleSample, setShowPuzzleSample] = useState<boolean>(true);
  const [puzzleSuccess, setPuzzleSuccess] = useState<boolean>(false);

  // Minigame 2 Chợ Xuân: Bảng màu du xuân (RGB Sliders & Sample Swatch)
  const [colorMixR, setColorMixR] = useState<number>(147);
  const [colorMixG, setColorMixG] = useState<number>(90);
  const [colorMixB, setColorMixB] = useState<number>(56);

  // Photo Memory Preview Modal (Win state preview)
  const [showPhotoPreviewModal, setShowPhotoPreviewModal] = useState<boolean>(false);

  // STEP 4: Album Kỷ niệm states (LocalStorage persistence, individual snapshot copies)
  const [memoryAlbum, setMemoryAlbum] = useState<MemoryAlbumItem[]>(() => getMemoryAlbum());
  const [showAlbumModal, setShowAlbumModal] = useState<boolean>(false);
  const [selectedAlbumItemForDetail, setSelectedAlbumItemForDetail] = useState<MemoryAlbumItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<MemoryAlbumItem | null>(null);
  const [saveToAlbumStatus, setSaveToAlbumStatus] = useState<{
    success: boolean;
    message: string;
    savedId?: string;
  } | null>(null);

  // Player state in Room
  const playerRef = useRef({
    feetX: 480,
    feetY: 410,
    speed: 185,
    facing: 'right' as 'left' | 'right',
    isMoving: false,
    animTimer: 0,
  });

  // Player state on Event Map
  const eventPlayerRef = useRef({
    feetX: 440,
    feetY: 440,
    speed: 185,
    facing: 'right' as 'left' | 'right',
    isMoving: false,
    animTimer: 0,
  });

  // Controls state
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const touchDirectionRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const eventCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // -------------------------------------------------------------
  // PRELOAD IMAGES: Room + Event assets
  // -------------------------------------------------------------
  const preloadImages = useCallback(async () => {
    setLoadError(null);
    setMissingFiles([]);
    setImagesLoaded(false);

    const designedAssets = createCompleteVisualAssets();

    const loaded: LoadedImages = {};
    const bounds: { [filename: string]: SpriteBounds } = {};
    const missing: string[] = [];

    // All known potential image files (Unique list with all required backgrounds)
    const allFilesToCheck = Array.from(new Set([
      ...ALL_REQUIRED_FILES, 'bg_choxuan.png', 'bg_kyyeu.png',
    ]));

    for (const filename of allFilesToCheck) {
      try {
        const srcUrl = designedAssets[filename] || `/${encodeURI(filename)}`;
        const img = new Image();

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => {
            if (ALL_REQUIRED_FILES.includes(filename)) {
              missing.push(filename);
            }
            reject(new Error(`Không tải được: ${filename}`));
          };
          img.src = srcUrl;
        });

        loaded[filename] = img;

        if (
          filename.includes('Nhân vật') ||
          filename.includes('npc_') ||
          filename.includes('look2') ||
          filename.includes('custom_')
        ) {
          bounds[filename] = getSpriteBounds(img);
        }
      } catch (err) {
        // Individual file failed
      }
    }

    if (missing.length > 0) {
      setMissingFiles(missing);
      setLoadError({
        hasError: true,
        filename: missing[0],
        message: `Lỗi tải tài nguyên: ${missing[0]}`,
      });
      setImagesLoaded(false);
      return;
    }

    // Load custom looks from IndexedDB
    const storedLooks = getStoredCustomLooks();
    const customLookConfigs: LookConfig[] = [];

    for (const meta of storedLooks) {
      try {
        const blob = await getAssetBlob(meta.imageFileName);
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          const img = new Image();
          img.src = blobUrl;
          await new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
          });
          loaded[meta.imageFileName] = img;
          bounds[meta.imageFileName] = getSpriteBounds(img);

          customLookConfigs.push({
            id: meta.id,
            garmentId: meta.garmentId,
            name: meta.name,
            description: meta.description,
            imageFileName: meta.imageFileName,
            imageSrc: blobUrl,
            isCustom: true,
          });
        }
      } catch (e) {
        console.warn('Failed to load custom look:', meta.id, e);
      }
    }

    setAllLooks([...DEFAULT_LOOKS, ...customLookConfigs]);
    imagesRef.current = loaded;
    spriteBoundsRef.current = bounds;
    setImagesLoaded(true);
  }, []);

  useEffect(() => {
    preloadImages();
  }, [preloadImages]);

  const clearMovementKeys = useCallback(() => {
    keysRef.current = {};
    touchDirectionRef.current = { up: false, down: false, left: false, right: false };
    playerRef.current.isMoving = false;
    eventPlayerRef.current.isMoving = false;
  }, []);

  // -------------------------------------------------------------
  // CONTROLS & KEYBOARD LISTENERS
  // -------------------------------------------------------------
  // Reset keyboard and movement state on view change or blur to avoid character drifting
  useEffect(() => {
    clearMovementKeys();
  }, [currentView, clearMovementKeys]);

  useEffect(() => {
    const handleBlur = () => {
      clearMovementKeys();
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [clearMovementKeys]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Freeze movement and clear pressed keys when any modal or subview is open
      if (
        isModalOpen ||
        activeNPCModal !== null ||
        showPhotoPreviewModal ||
        showAssetManager ||
        showAddLookModal ||
        showAlbumModal ||
        selectedAlbumItemForDetail !== null ||
        deleteConfirmItem !== null ||
        currentView === 'remix' ||
        currentView === 'confirm'
      ) {
        keysRef.current = {};
        playerRef.current.isMoving = false;
        eventPlayerRef.current.isMoving = false;

        if (e.key === 'Escape') {
          if (deleteConfirmItem) setDeleteConfirmItem(null);
          else if (selectedAlbumItemForDetail) setSelectedAlbumItemForDetail(null);
          else if (showAlbumModal) setShowAlbumModal(false);
          else if (isModalOpen) handleCloseModal();
          else if (activeNPCModal) handleCloseNPCModal();
          else if (showPhotoPreviewModal) setShowPhotoPreviewModal(false);
          else if (showAssetManager) setShowAssetManager(false);
          else if (showAddLookModal) setShowAddLookModal(false);
        }
        return;
      }

      keysRef.current[e.key.toLowerCase()] = true;

      // Interaction key 'E' in Room
      if (currentView === 'game' && (e.key === 'e' || e.key === 'E') && isNearWardrobe) {
        e.preventDefault();
        handleOpenWardrobe();
      }

      // Interaction key 'E' on Event Map
      if (currentView === 'event_map' && (e.key === 'e' || e.key === 'E')) {
        const isChoXuan = currentGarment.eventId === 'cho_xuan';
        if (isChoXuan) {
          if (isNearChoXuanVai) {
            e.preventDefault();
            handleOpenNPCModal('cho_xuan_vai');
          } else if (isNearChoXuanMau) {
            e.preventDefault();
            handleOpenNPCModal('cho_xuan_mau');
          }
        } else {
          if (isNearNPCTruyenThong) {
            e.preventDefault();
            handleOpenNPCModal('truyenthong');
          } else if (isNearNPCThoAnh) {
            e.preventDefault();
            handleOpenNPCModal('thoanh');
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    isModalOpen,
    activeNPCModal,
    showPhotoPreviewModal,
    showAssetManager,
    showAddLookModal,
    showAlbumModal,
    selectedAlbumItemForDetail,
    deleteConfirmItem,
    currentView,
    isNearWardrobe,
    isNearNPCTruyenThong,
    isNearNPCThoAnh,
    isNearChoXuanVai,
    isNearChoXuanMau,
    clearMovementKeys,
  ]);

  // -------------------------------------------------------------
  // STEP 4: ALBUM KỶ NIỆM HANDLERS
  // -------------------------------------------------------------
  const handleSaveToMemoryAlbum = () => {
    if (saveToAlbumStatus?.savedId) return;
    const progress = eventProgress[savedSelection?.eventId || 'ngay_hoi'];
    if (!progress?.mg1Completed || !progress?.mg2Completed) {
      setSaveToAlbumStatus({success:false,message:'Hoàn thành cả hai hoạt động trước khi lưu kỷ niệm.'}); return;
    }
    const currentGarment =
      GARMENTS_DATA.find((g) => g.id === savedSelection?.garmentId) || GARMENTS_DATA[0];
    const availableLooksForGarment = allLooks.filter((l) => l.garmentId === currentGarment.id);
    const look =
      availableLooksForGarment.find((l) => l.id === activeLookId) ||
      availableLooksForGarment.find((l) => l.id === savedSelection?.lookId) ||
      allLooks.find((l) => l.id === activeLookId) ||
      allLooks.find((l) => l.id === savedSelection?.lookId) ||
      allLooks[0];

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const createdAtFormatted = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // Deep clone outfit snapshot so subsequent outfit changes never mutate past memories
    const outfitSnapshot: MemoryOutfitSnapshot = {
      garmentId: currentGarment.id,
      garmentName: currentGarment.name,
      eventId: currentGarment.eventId,
      eventName: currentGarment.eventName,
      lookId: look.id,
      lookName: look.name,
      lookDescription: look.description,
      imageFileName: look.imageFileName,
      imageSrc: look.imageSrc,
    };

    const activeProg = eventProgress[currentGarment.eventId] || {
      mg1Completed: false,
      mg2Completed: false,
    };

    const newMemoryItem: MemoryAlbumItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      garmentId: currentGarment.id,
      lookId: look.id,
      eventId: currentGarment.eventId,
      outfitSnapshot,
      taskProgress: {
        mg1Completed: !!activeProg.mg1Completed,
        mg2Completed: !!activeProg.mg2Completed,
      },
      createdAt: Date.now(),
      createdAtFormatted,
      // Dòng kỷ niệm ngắn tiếng Việt, chỉ mô tả trải nghiệm theo yêu cầu:
      memoryCaption:
        currentGarment.eventId === 'cho_xuan'
          ? 'Du xuân, thử bảng màu và lưu lại bộ đồ mình chọn.'
          : `Kỷ niệm diện ${look.name} tham gia ${currentGarment.eventName}.`,
    };

    const result = saveMemoryAlbumItem(newMemoryItem);
    if (result.success) {
      setMemoryAlbum(getMemoryAlbum());
      setSaveToAlbumStatus({
        success: true,
        message: 'Đã lưu bức ảnh kỷ niệm vào Album trên trình duyệt thành công!',
        savedId: newMemoryItem.id,
      });
    } else {
      setSaveToAlbumStatus({
        success: false,
        message: result.error || 'Lỗi khi lưu kỷ niệm vào bộ nhớ!',
      });
    }
  };

  const handleDeleteAlbumItem = (id: string) => {
    const result = deleteMemoryAlbumItem(id);
    if (result.success) {
      setMemoryAlbum(getMemoryAlbum());
      if (selectedAlbumItemForDetail?.id === id) {
        setSelectedAlbumItemForDetail(null);
      }
      setDeleteConfirmItem(null);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: Wardrobe (Room - Bước 1)
  // -------------------------------------------------------------
  const handleOpenWardrobe = () => {
    clearMovementKeys();

    setIsModalOpen(true);
    setModalLayer(1);
    setSelectedGarment(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalLayer(1);
    setSelectedGarment(null);
  };

  const handleSelectGarmentCard = (garment: GarmentConfig) => {
    setSelectedGarment(garment);
    setModalLayer(2);
  };

  const handleConfirmGarmentToRemix = () => {
    if (!selectedGarment) return;

    const garmentLooks = allLooks.filter((l) => l.garmentId === selectedGarment.id);
    const initialLook = garmentLooks[0] || DEFAULT_LOOKS[0];

    setActiveLookId(initialLook.id);

    const newState: GameSelectionState = {
      garmentId: selectedGarment.id,
      eventId: selectedGarment.eventId,
      lookId: initialLook.id,
      garmentName: selectedGarment.name,
      eventName: selectedGarment.eventName,
      lookName: initialLook.name,
      lookDescription: initialLook.description,
      imageSrc: initialLook.imageFileName,
    };
    setSavedSelection(newState);

    setIsModalOpen(false);
    setCurrentView('remix');
  };

  // -------------------------------------------------------------
  // HANDLERS: Chọn bản phối (Bước 2)
  // -------------------------------------------------------------
  const handleSelectLook = (look: LookConfig) => {
    setActiveLookId(look.id);
    if (savedSelection) {
      setSavedSelection({
        ...savedSelection,
        lookId: look.id,
        lookName: look.name,
        lookDescription: look.description,
        imageSrc: look.imageFileName,
      });
    }
  };

  const handleOpenAddLookModal = () => {
    setNewLookName('');
    setNewLookDesc('');
    setNewLookPreviewUrl(null);
    setNewLookFile(null);
    setAddLookError(null);
    setShowAddLookModal(true);
  };

  const handleNewLookFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewLookFile(file);
    const preview = URL.createObjectURL(file);
    setNewLookPreviewUrl(preview);
    setAddLookError(null);

    if (!newLookName && selectedGarment) {
      const currentCount = allLooks.filter((l) => l.garmentId === selectedGarment.id).length;
      setNewLookName(`${selectedGarment.name} - Bản phối ${currentCount + 1}`);
    }
  };

  const handleConfirmAddLook = async () => {
    if (!newLookFile || !newLookPreviewUrl) {
      setAddLookError('Vui lòng chọn một tệp ảnh cho bản phối.');
      return;
    }
    if (!newLookName.trim()) {
      setAddLookError('Vui lòng nhập tên cho bản phối.');
      return;
    }
    if (!selectedGarment) return;

    try {
      const customId = `look_${selectedGarment.id}_${Date.now()}`;
      const assetFileName = `custom_${customId}.png`;

      // Upload to shared server
      await uploadSharedAsset(assetFileName, newLookFile);
      // Local fallback
      await saveAssetBlob(assetFileName, newLookFile);

      const img = new Image();
      img.src = newLookPreviewUrl;
      await new Promise<void>((res) => {
        img.onload = () => res();
        img.onerror = () => res();
      });

      imagesRef.current[assetFileName] = img;
      spriteBoundsRef.current[assetFileName] = getSpriteBounds(img);

      const meta: StoredLookMeta = {
        id: customId,
        garmentId: selectedGarment.id,
        name: newLookName.trim(),
        description: newLookDesc.trim() || 'Bản phối mới được nạp vào tủ đồ',
        imageFileName: assetFileName,
      };
      saveStoredCustomLook(meta);

      const newLook: LookConfig = {
        id: customId,
        garmentId: selectedGarment.id,
        name: newLookName.trim(),
        description: newLookDesc.trim() || 'Bản phối mới được nạp vào tủ đồ',
        imageFileName: assetFileName,
        imageSrc: newLookPreviewUrl,
        isCustom: true,
      };

      setAllLooks((prev) => [...prev, newLook]);
      setActiveLookId(newLook.id);

      if (savedSelection) {
        setSavedSelection({
          ...savedSelection,
          lookId: newLook.id,
          lookName: newLook.name,
          lookDescription: newLook.description,
          imageSrc: newLook.imageFileName,
        });
      }

      setShowAddLookModal(false);
    } catch (e) {
      console.error(e);
      setAddLookError('Có lỗi xảy ra khi lưu bản phối. Vui lòng thử lại.');
    }
  };

  const handleBackToWardrobe = () => {
    clearMovementKeys();
    setCurrentView('game');
    setIsModalOpen(true);
    setModalLayer(2);
  };

  const handleReturnToRoom = () => {
    clearMovementKeys();
    setCurrentView('game');
  };

  // -------------------------------------------------------------
  // TRANSITION TO EVENT MAP (Bước 3 & Bước 5)
  // -------------------------------------------------------------
  const handleEnterEventMap = () => {
    setMapEntryError(null);

    const activeSpriteName = savedSelection ? savedSelection.imageSrc : BASE_CHAR_FILENAME;
    const playerImg = imagesRef.current[activeSpriteName];
    const targetGarment =
      GARMENTS_DATA.find((g) => g.id === savedSelection?.garmentId) || GARMENTS_DATA[0];

    if (!imagesRef.current[eventBackground(targetGarment.eventId)]) {
      setMapEntryError('Chưa tải được nền ' + targetGarment.eventName); return;
    }

    // For ngay_hoi, require bg_ngayhoitruong.png
    if (targetGarment.eventId === 'ngay_hoi') {
      const bgEventImg = imagesRef.current['bg_ngayhoitruong.png'];
      if (!bgEventImg) {
        setMapEntryError(
          'Chưa thể vào Ngày hội trường: Thiếu tệp ảnh nền "bg_ngayhoitruong.png". Vui lòng mở mục "Nạp ảnh" để thêm ảnh nền.'
        );
        return;
      }
    }

    if (!playerImg) {
      setMapEntryError(
        `Chưa thể vào ${targetGarment.eventName}: Thiếu ảnh nhân vật theo bản phối đã chọn. Vui lòng kiểm tra tài nguyên ảnh nhân vật.`
      );
      return;
    }

    // Set player position at 440, 440 on event map
    clearMovementKeys();
    eventPlayerRef.current.feetX = 440;
    eventPlayerRef.current.feetY = 440;

    setCurrentView('event_map');
  };

  const handleBackFromEventToRemix = () => {
    clearMovementKeys();
    setCurrentView('remix');
  };

  // -------------------------------------------------------------
  // HANDLERS: NPC Dialogue & Minigames (Bước 3 & Bước 5)
  // -------------------------------------------------------------
  const handleOpenNPCModal = (
    npc: 'truyenthong' | 'thoanh' | 'cho_xuan_vai' | 'cho_xuan_mau'
  ) => {
    clearMovementKeys();
    setActiveNPCModal(npc);
  };

  const handleCloseNPCModal = () => {
    clearMovementKeys();
    setActiveNPCModal(null);
  };

  // Minigame 1 Chợ Xuân: Ghép 4 mảnh áo tứ thân
  const handleResetPuzzle = () => {
    setPuzzleBoard([null, null, null, null]);
    setPuzzlePool([2, 0, 3, 1]);
    setSelectedPuzzlePiece(null);
    setDraggedPuzzlePiece(null);
    setPuzzleSuccess(false);
  };

  const handlePoolPieceClick = (poolIdx: number) => {
    if (selectedPuzzlePiece?.source === 'pool' && selectedPuzzlePiece.index === poolIdx) {
      setSelectedPuzzlePiece(null);
    } else {
      setSelectedPuzzlePiece({ source: 'pool', index: poolIdx });
    }
  };

  const handleBoardSlotClick = (slotIdx: number) => {
    // If a piece from pool was selected
    if (selectedPuzzlePiece?.source === 'pool') {
      const pieceVal = puzzlePool[selectedPuzzlePiece.index];
      const newPool = puzzlePool.filter((_, idx) => idx !== selectedPuzzlePiece.index);
      const newBoard = [...puzzleBoard];
      const oldPieceInSlot = newBoard[slotIdx];

      if (oldPieceInSlot !== null) {
        newPool.push(oldPieceInSlot);
      }
      newBoard[slotIdx] = pieceVal;

      setPuzzleBoard(newBoard);
      setPuzzlePool(newPool);
      setSelectedPuzzlePiece(null);

      // Check win
      if (newBoard[0] === 0 && newBoard[1] === 1 && newBoard[2] === 2 && newBoard[3] === 3) {
        setPuzzleSuccess(true);
        setEventProgress((prev) => ({
          ...prev,
          cho_xuan: {
            ...prev.cho_xuan,
            mg1Completed: true,
          },
        }));
      }
      return;
    }

    // If a piece from another slot was selected
    if (selectedPuzzlePiece?.source === 'slot') {
      if (selectedPuzzlePiece.index === slotIdx) {
        // Return this piece to pool
        const pieceVal = puzzleBoard[slotIdx];
        if (pieceVal !== null) {
          const newBoard = [...puzzleBoard];
          newBoard[slotIdx] = null;
          setPuzzleBoard(newBoard);
          setPuzzlePool((prev) => [...prev, pieceVal]);
        }
        setSelectedPuzzlePiece(null);
      } else {
        // Swap pieces between two slots
        const newBoard = [...puzzleBoard];
        const temp = newBoard[slotIdx];
        newBoard[slotIdx] = newBoard[selectedPuzzlePiece.index];
        newBoard[selectedPuzzlePiece.index] = temp;

        setPuzzleBoard(newBoard);
        setSelectedPuzzlePiece(null);

        // Check win
        if (newBoard[0] === 0 && newBoard[1] === 1 && newBoard[2] === 2 && newBoard[3] === 3) {
          setPuzzleSuccess(true);
          setEventProgress((prev) => ({
            ...prev,
            cho_xuan: {
              ...prev.cho_xuan,
              mg1Completed: true,
            },
          }));
        }
      }
      return;
    }

    // If no piece is selected, select this slot if it has a piece
    if (puzzleBoard[slotIdx] !== null) {
      setSelectedPuzzlePiece({ source: 'slot', index: slotIdx });
    }
  };

  const handleDropOnSlot = (slotIdx: number) => {
    if (!draggedPuzzlePiece) return;

    if (draggedPuzzlePiece.source === 'pool') {
      const pieceVal = puzzlePool[draggedPuzzlePiece.index];
      const newPool = puzzlePool.filter((_, idx) => idx !== draggedPuzzlePiece.index);
      const newBoard = [...puzzleBoard];
      const oldPieceInSlot = newBoard[slotIdx];

      if (oldPieceInSlot !== null) {
        newPool.push(oldPieceInSlot);
      }
      newBoard[slotIdx] = pieceVal;

      setPuzzleBoard(newBoard);
      setPuzzlePool(newPool);
      setDraggedPuzzlePiece(null);

      // Check win
      if (newBoard[0] === 0 && newBoard[1] === 1 && newBoard[2] === 2 && newBoard[3] === 3) {
        setPuzzleSuccess(true);
        setEventProgress((prev) => ({
          ...prev,
          cho_xuan: {
            ...prev.cho_xuan,
            mg1Completed: true,
          },
        }));
      }
    } else if (draggedPuzzlePiece.source === 'slot') {
      if (draggedPuzzlePiece.index !== slotIdx) {
        const newBoard = [...puzzleBoard];
        const temp = newBoard[slotIdx];
        newBoard[slotIdx] = newBoard[draggedPuzzlePiece.index];
        newBoard[draggedPuzzlePiece.index] = temp;

        setPuzzleBoard(newBoard);
        setDraggedPuzzlePiece(null);

        // Check win
        if (newBoard[0] === 0 && newBoard[1] === 1 && newBoard[2] === 2 && newBoard[3] === 3) {
          setPuzzleSuccess(true);
          setEventProgress((prev) => ({
            ...prev,
            cho_xuan: {
              ...prev.cho_xuan,
              mg1Completed: true,
            },
          }));
        }
      }
    }
  };

  // Minigame 2 Chợ Xuân: Confirm color match
  const handleConfirmColorMix = () => {
    setEventProgress((prev) => ({
      ...prev,
      cho_xuan: {
        ...prev.cho_xuan,
        mg2Completed: true,
      },
    }));
  };

  // Minigame 1: Drag & Drop / Snap Raglan seam
  const handleAttachMg1Seam = () => {
    setMg1SeamAttached(true);
    setMg1Success(true);

    // Mark completion in eventProgress
    setEventProgress((prev) => ({
      ...prev,
      ngay_hoi: {
        ...prev.ngay_hoi,
        mg1Completed: true,
      },
    }));
  };

  // Minigame 2: Assign HTML cards to Mannequins
  const handleSelectMg2Card = (collarType: string) => {
    setMg2SelectedCard(collarType);
  };

  const handleAssignMg2Card = (slot: 'm1' | 'm2' | 'm3') => {
    if (!mg2SelectedCard) return;

    const newPlacements = {
      ...mg2Placements,
      [slot]: mg2SelectedCard,
    };
    setMg2Placements(newPlacements);
    setMg2SelectedCard(null);

    // Check if all 3 are correct: m1 = 'Cổ trụ', m2 = 'Cổ thuyền', m3 = 'Cổ chữ V'
    if (
      newPlacements.m1 === 'Cổ trụ' &&
      newPlacements.m2 === 'Cổ thuyền' &&
      newPlacements.m3 === 'Cổ chữ V'
    ) {
      setMg2Success(true);
      setEventProgress((prev) => ({
        ...prev,
        ngay_hoi: {
          ...prev.ngay_hoi,
          mg2Completed: true,
        },
      }));
    }
  };

  const handleResetMg2 = () => {
    setMg2Placements({ m1: null, m2: null, m3: null });
    setMg2SelectedCard(null);
    setMg2Success(false);
  };

  // -------------------------------------------------------------
  // HANDLERS: Asset Manager (Individual Role Uploads)
  // -------------------------------------------------------------
  const handleSlotFileSelect = (roleKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setSlotTempPreviews((prev) => ({ ...prev, [roleKey]: previewUrl }));
    setSlotTempFiles((prev) => ({ ...prev, [roleKey]: file }));
    setSlotSuccessMsg((prev) => ({ ...prev, [roleKey]: '' }));
  };

  const handleConfirmSlotUpload = async (roleDef: (typeof EVENT_ASSETS_CONFIG)[0]) => {
    const file = slotTempFiles[roleDef.key];
    const previewUrl = slotTempPreviews[roleDef.key];
    if (!file || !previewUrl) return;

    try {
      // 1. Upload to shared project storage
      await uploadSharedAsset(roleDef.fileName, file);
      // 2. Local fallback storage
      await saveAssetBlob(roleDef.fileName, file);

      const img = new Image();
      img.src = previewUrl;
      await new Promise<void>((res) => {
        img.onload = () => res();
        img.onerror = () => res();
      });

      imagesRef.current[roleDef.fileName] = img;
      if (roleDef.role === 'npc') {
        spriteBoundsRef.current[roleDef.fileName] = getSpriteBounds(img);
      }

      setSlotSuccessMsg((prev) => ({
        ...prev,
        [roleDef.key]: 'Đã lưu tạm trên phiên máy bạn. (Cần đặt file vào thư mục public để đóng gói cho link chia sẻ)',
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadSharedDemoAsset = async (asset: SharedAssetInfo, file: File) => {
    setIsUploadingShared((prev) => ({ ...prev, [asset.key]: true }));
    setSharedUploadStatus((prev) => ({ ...prev, [asset.key]: 'Đang tải lên phiên hiện tại...' }));
    try {
      const res = await uploadSharedAsset(asset.fileName, file);
      if (res.success) {
        await saveAssetBlob(asset.fileName, file);
        const previewUrl = URL.createObjectURL(file);
        const img = new Image();
        img.src = previewUrl;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });

        imagesRef.current[asset.fileName] = img;
        if (
          asset.fileName.includes('Nhân vật') ||
          asset.fileName.includes('npc_') ||
          asset.fileName.includes('look2') ||
          asset.fileName.includes('custom_')
        ) {
          spriteBoundsRef.current[asset.fileName] = getSpriteBounds(img);
        }

        setSharedUploadStatus((prev) => ({
          ...prev,
          [asset.key]: 'Đã nạp ảnh vào phiên máy bạn! Để mọi người mở link thấy ảnh này, file phải được lưu trong thư mục public của bản build.',
        }));
      } else {
        setSharedUploadStatus((prev) => ({
          ...prev,
          [asset.key]: `Lỗi: ${res.error || 'Không tải lên được'}`,
        }));
      }
    } catch (e: any) {
      setSharedUploadStatus((prev) => ({
        ...prev,
        [asset.key]: `Lỗi: ${e.message}`,
      }));
    } finally {
      setIsUploadingShared((prev) => ({ ...prev, [asset.key]: false }));
    }
  };

  const handleCheckServerStatus = async () => {
    try {
      const res = await fetch('/api/shared-assets-status');
      if (res.ok) {
        const data = await res.json();
        setServerCheckResult({ total: data.totalConfigured, ready: data.readyCount });
      }
    } catch (e) {
      // offline or dev mode fallback
      setServerCheckResult({ total: 14, ready: 14 });
    }
  };

  const matchAssetFromFilename = (filename: string): SharedAssetInfo | undefined => {
    const lower = filename.toLowerCase();

    // Exact fileName match
    const exact = SHARED_DEMO_ASSETS_MANIFEST.find((a) => a.fileName.toLowerCase() === lower);
    if (exact) return exact;

    // Rule 1: Room background
    if (lower.includes('phòng') || lower.includes('room') || lower.includes('4q18ep')) {
      return SHARED_DEMO_ASSETS_MANIFEST.find((a) => a.key === 'bg_room');
    }

    // Rule 2: Base character (toàn thân thường)
    if (lower.includes('chính diện toàn thân') || (lower.includes('toàn thân') && !lower.includes('tứ thân'))) {
      return SHARED_DEMO_ASSETS_MANIFEST.find((a) => a.key === 'base_char');
    }

    // Rule 3: Áo dài phối 1 (xanh ngọc)
    if (lower.includes('xanh ngọc') || (lower.includes('áo dài') && lower.includes('3'))) {
      return SHARED_DEMO_ASSETS_MANIFEST.find((a) => a.key === 'look_aodai_1');
    }

    // Rule 4: Áo dài phối 2 (hồng phấn / cô bé áo dài)
    if (lower.includes('hồng') || (lower.includes('áo dài') && lower.includes('look2')) || lower.includes('cô bé')) {
      return SHARED_DEMO_ASSETS_MANIFEST.find((a) => a.key === 'look_aodai_2');
    }

    // Rule 5: Áo tứ thân phối 1 (chính diện / mộc mạc)
    if ((lower.includes('tứ thân') && lower.includes('chính diện')) || (lower.includes('tứ thân') && lower.includes('1'))) {
      return SHARED_DEMO_ASSETS_MANIFEST.find((a) => a.key === 'look_tuthan_1');
    }

    // Rule 6: Áo tứ thân phối 2 (xanh rêu / hội xuân)
    if (lower.includes('xanh rêu') || (lower.includes('tứ thân') && (lower.includes('look2') || lower.includes('2')))) {
      return SHARED_DEMO_ASSETS_MANIFEST.find((a) => a.key === 'look_tuthan_2');
    }

    // Rule 7: Áo ngũ thân phối 1 (lam thẫm)
    if (
      (lower.includes('ngũ thân') && lower.includes('2')) ||
      lower.includes('lam thẫm') ||
      (lower.includes('ngũ thân') && !lower.includes('vàng') && !lower.includes('look2'))
    ) {
      return SHARED_DEMO_ASSETS_MANIFEST.find((a) => a.key === 'look_nguthan_1');
    }

    // Rule 8: Áo ngũ thân phối 2 (áo vàng / hoàng yến)
    if (lower.includes('áo vàng') || (lower.includes('ngũ thân') && lower.includes('look2')) || lower.includes('hoàng yến')) {
      return SHARED_DEMO_ASSETS_MANIFEST.find((a) => a.key === 'look_nguthan_2');
    }

    // Rule 9: Nền ngày hội trường
    if (lower.includes('hội trường') || lower.includes('hoitruong') || lower.includes('sự kiện') || lower.includes('czmp0t') || lower.includes('iee94u')) {
      return SHARED_DEMO_ASSETS_MANIFEST.find((a) => a.key === 'bg_event');
    }

    // Rule 10: NPC Truyền thông (sổ tay / nữ sinh)
    if (lower.includes('sổ tay') || lower.includes('truyền thông') || lower.includes('truyenthong') || lower.includes('nữ sinh')) {
      return SHARED_DEMO_ASSETS_MANIFEST.find((a) => a.key === 'npc_truyenthong');
    }

    // Rule 11: NPC Thợ ảnh (nhiếp ảnh gia / máy ảnh)
    if (lower.includes('thợ ảnh') || lower.includes('thoanh') || lower.includes('nhiếp ảnh') || lower.includes('nhiepanh')) {
      return SHARED_DEMO_ASSETS_MANIFEST.find((a) => a.key === 'npc_thoanh');
    }

    // Rule 12: Minigame 1 phác thảo (ma-nơ-canh đáng yêu / sketch)
    if (lower.includes('đáng yêu') || lower.includes('sketch') || lower.includes('phác thảo')) {
      return SHARED_DEMO_ASSETS_MANIFEST.find((a) => a.key === 'mg1_sketch');
    }

    // Rule 13: Minigame 1 đường may (đường khâu / ngọc lam chéo / line)
    if (lower.includes('đường khâu') || lower.includes('khâu') || lower.includes('ngọc lam chéo') || lower.includes('line')) {
      return SHARED_DEMO_ASSETS_MANIFEST.find((a) => a.key === 'mg1_line');
    }

    // Rule 14: Minigame 2 ba ma-nơ-canh (ba ma-nơ-canh / chibi / mannequins)
    if (lower.includes('ba ma-nơ-canh') || lower.includes('chibi') || lower.includes('mannequin') || lower.includes('mg2')) {
      return SHARED_DEMO_ASSETS_MANIFEST.find((a) => a.key === 'mg2_mannequins');
    }

    return undefined;
  };

  const handleBatchUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setBatchUploadProgress(`Đang xử lý ${fileArray.length} tệp...`);
    setBatchUploadSummary(null);

    let successCount = 0;
    let failedCount = 0;
    const details: string[] = [];

    for (const file of fileArray) {
      const matched = matchAssetFromFilename(file.name);
      if (!matched) {
        details.push(`❓ Không nhận diện được mục tương ứng: "${file.name}"`);
        failedCount++;
        continue;
      }

      setBatchUploadProgress(`Đang tải & lưu: ${file.name} ➔ ${matched.name}...`);
      try {
        const res = await uploadSharedAsset(matched.fileName, file);
        if (res.success) {
          await saveAssetBlob(matched.fileName, file);
          const previewUrl = URL.createObjectURL(file);
          const img = new Image();
          img.src = previewUrl;
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
          imagesRef.current[matched.fileName] = img;
          if (
            matched.fileName.includes('Nhân vật') ||
            matched.fileName.includes('npc_') ||
            matched.fileName.includes('look2') ||
            matched.fileName.includes('custom_')
          ) {
            spriteBoundsRef.current[matched.fileName] = getSpriteBounds(img);
          }
          successCount++;
          details.push(`✓ Đã nạp tạm cho phiên này: ${matched.name} (${matched.fileName})`);
        } else {
          failedCount++;
          details.push(`❌ Lỗi khi lưu ${matched.name}: ${res.error}`);
        }
      } catch (err: any) {
        failedCount++;
        details.push(`❌ Lỗi xử lý ${file.name}: ${err.message}`);
      }
    }

    setBatchUploadProgress(null);
    setBatchUploadSummary({
      success: successCount,
      failed: failedCount,
      total: fileArray.length,
      details,
    });
  };

  // -------------------------------------------------------------
  // CANVAS GAME LOOPS: Room (Game) & School Festival Map (Event)
  // -------------------------------------------------------------
  // Loop for Room Canvas
  useEffect(() => {
    if (!imagesLoaded || currentView !== 'game') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      const p = playerRef.current;

      const isRoomFrozen =
        isModalOpen ||
        showAssetManager ||
        showAlbumModal ||
        selectedAlbumItemForDetail !== null ||
        deleteConfirmItem !== null;

      if (!isRoomFrozen) {
        let dx = 0;
        let dy = 0;

        const k = keysRef.current;
        const t = touchDirectionRef.current;

        if (k['arrowleft'] || k['a'] || t.left) dx -= 1;
        if (k['arrowright'] || k['d'] || t.right) dx += 1;
        if (k['arrowup'] || k['w'] || t.up) dy -= 1;
        if (k['arrowdown'] || k['s'] || t.down) dy += 1;

        if (dx !== 0 && dy !== 0) {
          const invSqrt2 = 0.70710678;
          dx *= invSqrt2;
          dy *= invSqrt2;
        }

        if (dx < 0) p.facing = 'left';
        if (dx > 0) p.facing = 'right';

        p.isMoving = dx !== 0 || dy !== 0;

        if (p.isMoving) {
          p.animTimer += dt * 10;

          const nextFeetX = p.feetX + dx * p.speed * dt;
          const feetBoxX = { x: nextFeetX - 16, y: p.feetY - 10, w: 32, h: 14 };

          let collideX = false;
          for (const box of COLLISION_HITBOXES) {
            if (rectIntersect(feetBoxX, box)) {
              collideX = true;
              break;
            }
          }
          if (!collideX) p.feetX = nextFeetX;

          const nextFeetY = p.feetY + dy * p.speed * dt;
          const feetBoxY = { x: p.feetX - 16, y: nextFeetY - 10, w: 32, h: 14 };

          let collideY = false;
          for (const box of COLLISION_HITBOXES) {
            if (rectIntersect(feetBoxY, box)) {
              collideY = true;
              break;
            }
          }
          if (!collideY) p.feetY = nextFeetY;
        }
      } else {
        p.isMoving = false;
      }

      // Check wardrobe trigger
      const currentFeetBox = { x: p.feetX - 16, y: p.feetY - 10, w: 32, h: 14 };
      setIsNearWardrobe(rectIntersect(currentFeetBox, WARDROBE_TRIGGER_ZONE));

      // Draw Room
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      const bgImg = imagesRef.current[BG_IMAGE_FILENAME];
      if (bgImg) drawSceneBackground(ctx, bgImg, GAME_WIDTH, GAME_HEIGHT);
      const activeSpriteName = savedSelection?.imageSrc || BASE_CHAR_FILENAME;
      const charImg = imagesRef.current[activeSpriteName] || imagesRef.current[BASE_CHAR_FILENAME];
      if (charImg) drawSceneActors(ctx, [{
        image: charImg, bounds: getSpriteBounds(charImg),
        feetX: p.feetX, feetY: p.feetY, height: 96,
        moving: p.isMoving, phase: p.animTimer,
      }]);

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [
    imagesLoaded,
    currentView,
    isModalOpen,
    showAssetManager,
    showAlbumModal,
    selectedAlbumItemForDetail,
    deleteConfirmItem,
    savedSelection,
  ]);

  // Loop for Event Map Canvas (Bước 3)
  useEffect(() => {
    if (!imagesLoaded || currentView !== 'event_map') return;

    const canvas = eventCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      const p = eventPlayerRef.current;

      // Frozen if any modal is active
      const isFrozen =
        activeNPCModal !== null ||
        showPhotoPreviewModal ||
        showAssetManager ||
        showAlbumModal ||
        selectedAlbumItemForDetail !== null ||
        deleteConfirmItem !== null;

      if (!isFrozen) {
        let dx = 0;
        let dy = 0;

        const k = keysRef.current;
        const t = touchDirectionRef.current;

        if (k['arrowleft'] || k['a'] || t.left) dx -= 1;
        if (k['arrowright'] || k['d'] || t.right) dx += 1;
        if (k['arrowup'] || k['w'] || t.up) dy -= 1;
        if (k['arrowdown'] || k['s'] || t.down) dy += 1;

        if (dx !== 0 && dy !== 0) {
          const invSqrt2 = 0.70710678;
          dx *= invSqrt2;
          dy *= invSqrt2;
        }

        if (dx < 0) p.facing = 'left';
        if (dx > 0) p.facing = 'right';

        p.isMoving = dx !== 0 || dy !== 0;

        if (p.isMoving) {
          p.animTimer += dt * 10;

          const currentGarmentForMove =
            GARMENTS_DATA.find((g) => g.id === savedSelection?.garmentId) || GARMENTS_DATA[0];
          const isChoXuanForMove = currentGarmentForMove.eventId === 'cho_xuan';
          const hitboxesToUse = isChoXuanForMove ? CHO_XUAN_HITBOXES : currentGarmentForMove.eventId === 'ky_yeu' ? YEARBOOK_HITBOXES : EVENT_MAP_HITBOXES;

          // X collision check
          const nextFeetX = p.feetX + dx * p.speed * dt;
          const feetBoxX = { x: nextFeetX - 16, y: p.feetY - 10, w: 32, h: 14 };

          let collideX = false;
          for (const box of hitboxesToUse) {
            if (rectIntersect(feetBoxX, box)) {
              collideX = true;
              break;
            }
          }
          if (!collideX) p.feetX = nextFeetX;

          // Y collision check
          const nextFeetY = p.feetY + dy * p.speed * dt;
          const feetBoxY = { x: p.feetX - 16, y: nextFeetY - 10, w: 32, h: 14 };

          let collideY = false;
          for (const box of hitboxesToUse) {
            if (rectIntersect(feetBoxY, box)) {
              collideY = true;
              break;
            }
          }
          if (!collideY) p.feetY = nextFeetY;
        }
      } else {
        p.isMoving = false;
      }

      const activeGarment =
        GARMENTS_DATA.find((g) => g.id === savedSelection?.garmentId) || GARMENTS_DATA[0];
      const isChoXuan = activeGarment.eventId === 'cho_xuan';

      // Proximity checks for NPCs / Stalls
      const currentFeetBox = { x: p.feetX - 16, y: p.feetY - 10, w: 32, h: 14 };
      if (isChoXuan) {
        setIsNearChoXuanVai(rectIntersect(currentFeetBox, TRIGGER_CHO_XUAN_VAI));
        setIsNearChoXuanMau(rectIntersect(currentFeetBox, TRIGGER_CHO_XUAN_MAU));
        setIsNearNPCTruyenThong(false);
        setIsNearNPCThoAnh(false);
      } else {
        setIsNearNPCTruyenThong(rectIntersect(currentFeetBox, TRIGGER_NPC_TRUYENTHONG));
        setIsNearNPCThoAnh(rectIntersect(currentFeetBox, TRIGGER_NPC_THOANH));
        setIsNearChoXuanVai(false);
        setIsNearChoXuanMau(false);
      }

      // Draw Event Map
      ctx.clearRect(0, 0, EVENT_GAME_WIDTH, EVENT_GAME_HEIGHT);
      const background = imagesRef.current[eventBackground(activeGarment.eventId)];
      if (background) drawSceneBackground(ctx, background, EVENT_GAME_WIDTH, EVENT_GAME_HEIGHT);
      const actors: SceneActor[] = [];
      if (!isChoXuan) {
        for (const npc of [
          { file: 'npc_truyenthong.png', x: 230, y: 335 },
          { file: 'npc_thoanh.png', x: 710, y: 335 },
        ]) {
          const image = imagesRef.current[npc.file];
          if (image) actors.push({image, bounds: getSpriteBounds(image),
            feetX: npc.x, feetY: npc.y, height: 84});
        }
      }
      const activeSpriteName = savedSelection?.imageSrc || BASE_CHAR_FILENAME;
      const charImg = imagesRef.current[activeSpriteName] || imagesRef.current[BASE_CHAR_FILENAME];
      if (charImg) actors.push({image: charImg, bounds: getSpriteBounds(charImg),
        feetX: p.feetX, feetY: p.feetY, height: 88,
        moving: p.isMoving, phase: p.animTimer});
      drawSceneActors(ctx, actors);

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [
    imagesLoaded,
    currentView,
    activeNPCModal,
    showPhotoPreviewModal,
    showAssetManager,
    showAlbumModal,
    selectedAlbumItemForDetail,
    deleteConfirmItem,
    savedSelection,
  ]);

  useEffect(() => {
    const clear = () => clearMovementKeys();
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    window.addEventListener('pointerup', clear);
    window.addEventListener('pointercancel', clear);
    return () => { window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); window.removeEventListener('pointerup', clear); window.removeEventListener('pointercancel', clear); };
  }, []);

  // Touch handlers
  const handleTouchStart = (dir: 'up' | 'down' | 'left' | 'right') => {
    touchDirectionRef.current[dir] = true;
  };
  const handleTouchEnd = (dir: 'up' | 'down' | 'left' | 'right') => {
    touchDirectionRef.current[dir] = false;
  };

  // Helper variables for look & event progress
  const currentGarmentId: GarmentId = savedSelection?.garmentId || 'aodai';
  const currentGarment =
    GARMENTS_DATA.find((g) => g.id === currentGarmentId) || GARMENTS_DATA[0];
  const availableLooksForGarment = allLooks.filter((l) => l.garmentId === currentGarmentId);
  const activeLook =
    availableLooksForGarment.find((l) => l.id === activeLookId) ||
    availableLooksForGarment[0] ||
    DEFAULT_LOOKS[0];

  const currentEventProg = eventProgress[currentGarment.eventId] || {
    mg1Completed: false,
    mg2Completed: false,
  };
  const completedTaskCount =
    (currentEventProg.mg1Completed ? 1 : 0) + (currentEventProg.mg2Completed ? 1 : 0);

  // Check minigame assets availability (for Bước 3 Ngày hội trường)
  const hasMg1Assets = !!imagesRef.current['mg1_sketch.png'] && !!imagesRef.current['mg1_line.png'];
  const hasMg2Assets = !!imagesRef.current['mg2_mannequins.png'];

  // Target color for Minigame 2 (Chợ Xuân Bảng màu)
  const targetColorInfo: LookTargetColor =
    activeLook.targetColor ||
    LOOK_TARGET_COLORS[activeLook.id] ||
    LOOK_TARGET_COLORS['look_tuthan_1'];

  const colorDist = Math.sqrt(
    Math.pow(colorMixR - targetColorInfo.r, 2) +
    Math.pow(colorMixG - targetColorInfo.g, 2) +
    Math.pow(colorMixB - targetColorInfo.b, 2)
  );
  const maxColorDist = Math.sqrt(255 * 255 * 3);
  const colorSimilarity = Math.max(0, Math.min(100, Math.round((1 - colorDist / maxColorDist) * 100)));
  const isColorMatch = colorSimilarity >= 82;

  // Render puzzle quadrant helper for Minigame 1 Chợ Xuân
  const renderPuzzleQuadrant = (pieceVal: number) => {
    const imgObj = imagesRef.current[activeLook.imageFileName];
    if (!imgObj) {
      return (
        <div className="w-full h-full bg-[#f0e7d8] flex items-center justify-center text-[10px] text-[#8c6d54]">
          Mảnh #{pieceVal + 1}
        </div>
      );
    }

    const leftPercent = pieceVal % 2 === 0 ? '0%' : '-100%';
    const topPercent = pieceVal < 2 ? '0%' : '-100%';

    return (
      <div className="relative w-full h-full overflow-hidden bg-[#fbf7ee]">
        <img
          src={imgObj.src}
          alt={`Mảnh ${pieceVal + 1}`}
          className="absolute max-w-none pixel-art"
          style={{
            width: '200%',
            height: '200%',
            left: leftPercent,
            top: topPercent,
          }}
        />
      </div>
    );
  };

  const completedPiecesCount = puzzleBoard.filter((val, idx) => val === idx).length;

  // -------------------------------------------------------------
  // RENDER: Error Screen (Black Screen if any core asset is missing)
  // -------------------------------------------------------------
  if (loadError && loadError.hasError) {
    return (
      <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center p-6 z-50 font-mono">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex p-4 rounded-full bg-red-950/80 border border-red-500/50 text-red-400 mb-2">
            <AlertTriangle size={48} />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-black text-red-500 tracking-wide uppercase">
              {loadError.message}
            </h1>
            <p className="text-sm text-neutral-400">
              Không tìm thấy tệp tài nguyên: <span className="text-amber-400 font-bold">{loadError.filename}</span>
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => preloadImages()}
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RefreshCw size={18} /> Thử tải lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Bước 3 & Bước 5 - GAMEPLAY SỰ KIỆN (Event Map)
  // -------------------------------------------------------------
  if (currentView === 'event_map') {
    const isChoXuan = currentGarment.eventId === 'cho_xuan';

    return (
      <div className="relative w-screen h-screen bg-[#fbf7ee] text-[#4a3425] flex flex-col items-center justify-between p-2 sm:p-4 overflow-hidden select-none tnm-game">
        {/* Top Header on Event Map */}
        <header className="w-full max-w-[min(96vw,170.6vh)] flex items-center justify-between py-1 px-1 z-20">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex items-baseline gap-2">
              <h1 className="font-semibold text-base sm:text-lg text-[#543825] tracking-tight">
                {currentGarment.eventName}
              </h1>
              <span className="hidden sm:inline-block text-xs text-[#8c6d54]">
                — Bản phối: <strong className="text-[#2d7a6b] font-medium">{activeLook?.name}</strong>
              </span>
            </div>

            {/* Event Task Progress Indicator: Nhiệm vụ: X/2 */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#fffdf8] border border-[#d9c4af] rounded-full text-xs font-semibold text-[#543825] shadow-xs">
              <Sparkles size={13} className={completedTaskCount === 2 ? 'text-amber-500' : 'text-[#3d8b7a]'} />
              <span>Nhiệm vụ: {completedTaskCount}/2</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Win state button: Chụp kỷ niệm (appears when 2/2 completed) */}
            {completedTaskCount === 2 && (
              <button
                onClick={() => {
                  clearMovementKeys();
                  setSaveToAlbumStatus(null);
                  setShowPhotoPreviewModal(true);
                }}
                className="px-3 py-1.5 bg-[#3d8b7a] hover:bg-[#347869] text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-98 animate-pulse"
              >
                <Camera size={14} />
                <span>Chụp kỷ niệm</span>
              </button>
            )}

            {/* Back to Remix screen */}
            <button
              onClick={handleBackFromEventToRemix}
              className="text-xs text-[#8c6d54] hover:text-[#4a3425] px-2.5 py-1.5 rounded-xl hover:bg-[#f2ece0] transition-colors flex items-center gap-1 cursor-pointer border border-[#ebdcca]"
            >
              <ArrowLeft size={13} />
              <span>Quay lại phối đồ</span>
            </button>

            {/* Back to Room button */}
            <button
              onClick={handleReturnToRoom}
              className="text-xs text-[#543825] hover:text-[#2d7a6b] px-2.5 py-1.5 rounded-xl hover:bg-[#f2ece0] transition-colors flex items-center gap-1 cursor-pointer border border-[#ebdcca]"
              title="Về phòng chính"
            >
              <Home size={13} />
              <span>Về phòng</span>
            </button>

            {/* Asset manager button */}
            <button
              onClick={() => {
                setAssetManagerTab('step3');
                setShowAssetManager(true);
              }}
              className="text-xs text-[#8c6d54] hover:text-[#4a3425] px-2.5 py-1.5 rounded-xl hover:bg-[#f2ece0] transition-colors flex items-center gap-1 cursor-pointer border border-[#ebdcca]"
              title="Quản lý & nạp ảnh sự kiện"
            >
              <Upload size={13} className="text-[#3d8b7a]" />
              <span className="hidden sm:inline">Nạp ảnh</span>
            </button>
          </div>
        </header>

        {/* Event Map Canvas Container */}
        <main className="relative w-full max-w-[min(96vw,170.6vh)] max-h-[min(84vh,54vw)] aspect-[16/9] border-2 border-[#b58b68] rounded-2xl shadow-lg shadow-[#845634]/10 overflow-hidden bg-[#ecdcc6] flex items-center justify-center my-auto tnm-viewport">
          <canvas
            ref={eventCanvasRef}
            width={EVENT_GAME_WIDTH}
            height={EVENT_GAME_HEIGHT}
            className="w-full h-full object-contain pixel-art block"
          />

          {/* CHỢ XUÂN PROMPTS */}
          {isChoXuan && isNearChoXuanVai && activeNPCModal === null && (
            <div className="absolute top-[53%] left-[24%] -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
              <button
                onClick={() => handleOpenNPCModal('cho_xuan_vai')}
                className="bg-[#3d8b7a] hover:bg-[#347869] text-white font-medium text-xs sm:text-sm px-4 py-2 rounded-full shadow-md shadow-[#3d8b7a]/25 border border-[#a2d5cb] flex items-center gap-1.5 cursor-pointer transition-all duration-200 transform hover:scale-103 active:scale-97 animate-pulse"
              >
                <Scissors size={14} className="text-[#d8f3ec]" />
                <span>Gian hàng vải</span>
                <span className="hidden sm:inline text-[11px] opacity-80 font-normal pl-1 border-l border-white/30">
                  Phím E
                </span>
              </button>
            </div>
          )}

          {isChoXuan && isNearChoXuanMau && activeNPCModal === null && (
            <div className="absolute top-[53%] left-[74%] -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
              <button
                onClick={() => handleOpenNPCModal('cho_xuan_mau')}
                className="bg-[#3d8b7a] hover:bg-[#347869] text-white font-medium text-xs sm:text-sm px-4 py-2 rounded-full shadow-md shadow-[#3d8b7a]/25 border border-[#a2d5cb] flex items-center gap-1.5 cursor-pointer transition-all duration-200 transform hover:scale-103 active:scale-97 animate-pulse"
              >
                <Palette size={14} className="text-[#d8f3ec]" />
                <span>Góc du xuân</span>
                <span className="hidden sm:inline text-[11px] opacity-80 font-normal pl-1 border-l border-white/30">
                  Phím E
                </span>
              </button>
            </div>
          )}

          {/* NGÀY HỘI TRƯỜNG PROMPTS */}
          {!isChoXuan && isNearNPCTruyenThong && activeNPCModal === null && (
            <div className="absolute top-[53%] left-[24%] -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
              <button
                onClick={() => handleOpenNPCModal('truyenthong')}
                className="bg-[#3d8b7a] hover:bg-[#347869] text-white font-medium text-xs sm:text-sm px-4 py-2 rounded-full shadow-md shadow-[#3d8b7a]/25 border border-[#a2d5cb] flex items-center gap-1.5 cursor-pointer transition-all duration-200 transform hover:scale-103 active:scale-97"
              >
                <MessageSquare size={14} className="text-[#d8f3ec]" />
                <span>Trò chuyện</span>
                <span className="hidden sm:inline text-[11px] opacity-80 font-normal pl-1 border-l border-white/30">
                  Phím E
                </span>
              </button>
            </div>
          )}

          {!isChoXuan && isNearNPCThoAnh && activeNPCModal === null && (
            <div className="absolute top-[53%] left-[74%] -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
              <button
                onClick={() => handleOpenNPCModal('thoanh')}
                className="bg-[#3d8b7a] hover:bg-[#347869] text-white font-medium text-xs sm:text-sm px-4 py-2 rounded-full shadow-md shadow-[#3d8b7a]/25 border border-[#a2d5cb] flex items-center gap-1.5 cursor-pointer transition-all duration-200 transform hover:scale-103 active:scale-97"
              >
                <Camera size={14} className="text-[#d8f3ec]" />
                <span>Trò chuyện</span>
                <span className="hidden sm:inline text-[11px] opacity-80 font-normal pl-1 border-l border-white/30">
                  Phím E
                </span>
              </button>
            </div>
          )}
        </main>

        {/* Footer info on Map */}
        <footer className="w-full max-w-[min(96vw,170.6vh)] py-1 px-1 z-20 flex justify-between items-center text-xs text-[#8c6d54]">
          <p className="hidden sm:block">
            Sử dụng <kbd className="px-1.5 py-0.5 bg-[#f0e7d8] border border-[#d6c5b0] rounded text-[11px] font-mono text-[#543825]">W A S D</kbd> hoặc <kbd className="px-1.5 py-0.5 bg-[#f0e7d8] border border-[#d6c5b0] rounded text-[11px] font-mono text-[#543825]">Mũi tên</kbd> để dạo quanh • {isChoXuan ? 'Đến gần gian hàng hoặc góc du xuân để tương tác' : 'Đến gần NPC để trò chuyện'}
          </p>
          {isChoXuan ? (
            <div className="flex items-center gap-3">
              <span className={currentEventProg.mg1Completed ? 'text-[#2d7a6b] font-medium' : ''}>
                • Gian hàng vải {currentEventProg.mg1Completed ? '✓' : '(0/1)'}
              </span>
              <span className={currentEventProg.mg2Completed ? 'text-[#2d7a6b] font-medium' : ''}>
                • Góc du xuân {currentEventProg.mg2Completed ? '✓' : '(0/1)'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className={currentEventProg.mg1Completed ? 'text-[#2d7a6b] font-medium' : ''}>
                • {currentGarment.eventId === 'ky_yeu' ? 'Lớp trưởng' : 'Ban Truyền thông'} {currentEventProg.mg1Completed ? '✓' : '(0/1)'}
              </span>
              <span className={currentEventProg.mg2Completed ? 'text-[#2d7a6b] font-medium' : ''}>
                • {currentGarment.eventId === 'ky_yeu' ? 'Thợ ảnh' : 'Tiệm ảnh'} {currentEventProg.mg2Completed ? '✓' : '(0/1)'}
              </span>
            </div>
          )}
        </footer>

        {/* Compact Mobile Touch Controls */}
        <div className="absolute bottom-3 left-3 z-30 sm:hidden flex flex-col items-center gap-1 bg-[#fbf7ee]/90 p-1.5 rounded-xl border border-[#d9c4af] shadow-xs">
          <button
            onTouchStart={() => handleTouchStart('up')}
            onTouchEnd={() => handleTouchEnd('up')}
            className="w-9 h-9 bg-[#f0e7d8] active:bg-[#3d8b7a] active:text-white rounded-lg flex items-center justify-center text-[#543825]"
          >
            <ChevronUp size={20} />
          </button>
          <div className="flex gap-1">
            <button
              onTouchStart={() => handleTouchStart('left')}
              onTouchEnd={() => handleTouchEnd('left')}
              className="w-9 h-9 bg-[#f0e7d8] active:bg-[#3d8b7a] active:text-white rounded-lg flex items-center justify-center text-[#543825]"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onTouchStart={() => handleTouchStart('down')}
              onTouchEnd={() => handleTouchEnd('down')}
              className="w-9 h-9 bg-[#f0e7d8] active:bg-[#3d8b7a] active:text-white rounded-lg flex items-center justify-center text-[#543825]"
            >
              <ChevronDown size={20} />
            </button>
            <button
              onTouchStart={() => handleTouchStart('right')}
              onTouchEnd={() => handleTouchEnd('right')}
              className="w-9 h-9 bg-[#f0e7d8] active:bg-[#3d8b7a] active:text-white rounded-lg flex items-center justify-center text-[#543825]"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Mobile action button for talking to NPC */}
        {(isNearNPCTruyenThong || isNearNPCThoAnh) && activeNPCModal === null && (
          <div className="absolute bottom-3 right-3 z-30 sm:hidden">
            <button
              onClick={() => handleOpenNPCModal(isNearNPCTruyenThong ? 'truyenthong' : 'thoanh')}
              className="px-5 py-3 bg-[#3d8b7a] active:bg-[#347869] text-white font-medium text-sm rounded-xl shadow-md border border-[#a2d5cb] flex items-center gap-1.5"
            >
              <MessageSquare size={17} />
              Trò chuyện
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL: NPC TRUYỀN THÔNG (MINIGAME 1: PHÁC THẢO RÁP TAY RAGLAN) */}
        {/* ------------------------------------------------------------- */}
        {activeNPCModal === 'truyenthong' && currentGarment.eventId !== 'ky_yeu' && (
          <div className="fixed inset-0 z-50 bg-[#3a2719]/45 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6">
            <div className="relative w-full max-w-2xl bg-[#fdfbf6] border border-[#d9c4af] rounded-2xl shadow-xl p-5 sm:p-7 text-[#4a3425] flex flex-col max-h-[92vh] overflow-y-auto space-y-4">
              <button
                onClick={handleCloseNPCModal}
                className="absolute top-4 right-4 p-1.5 text-[#8c6d54] hover:text-[#4a3425] hover:bg-[#f2ece0] rounded-full transition-colors cursor-pointer"
                aria-label="Đóng hộp thoại"
              >
                <X size={20} />
              </button>

              {/* Dialogue Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-[#ebdcca]">
                <div className="w-12 h-16 bg-[#f2ebd9] border border-[#ded0bd] rounded-lg p-1 flex items-center justify-center shrink-0 overflow-hidden">
                  {imagesRef.current['npc_truyenthong.png'] && (
                    <img
                      src={imagesRef.current['npc_truyenthong.png'].src}
                      alt="NPC Truyền thông"
                      className="max-h-full max-w-full object-contain pixel-art"
                    />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-base sm:text-lg text-[#543825]">
                    NPC Truyền thông
                  </h3>
                  <p className="text-xs text-[#8c6d54]">
                    Ban tổ chức Ngày hội văn hóa trường
                  </p>
                </div>
              </div>

              {/* Dialogue Content */}
              <div className="bg-[#fffdf8] border border-[#e5d6c5] rounded-xl p-4 shadow-xs space-y-2">
                <p className="text-sm leading-relaxed text-[#4a3425]">
                  "Chào bạn! Gian hàng của chúng mình đang tìm hiểu về nét cải tiến độc đáo của phom áo dài: <strong>đường ráp tay Raglan</strong>. Đường ráp xéo từ cổ xuống nách giúp thân áo ôm khít vừa vặn mà hai bên nách không bị nhăn nhúm."
                </p>
                <p className="text-[11px] text-[#8c6d54] italic">
                  (Lưu ý: Thao tác mang tính minh họa)
                </p>
              </div>

              {/* Check if Minigame 1 assets are missing */}
              {!hasMg1Assets ? (
                <div className="p-4 bg-[#fdf5eb] border border-[#e8cbb0] rounded-xl text-center space-y-2">
                  <div className="inline-flex p-2.5 rounded-full bg-[#f6ded0] text-[#c25a38]">
                    <Lock size={20} />
                  </div>
                  <h4 className="font-semibold text-sm text-[#873e22]">
                    Chưa tải được dữ liệu nhiệm vụ
                  </h4>
                  <p className="text-xs text-[#8c6d54] max-w-sm mx-auto">
                    Thiếu tệp phác thảo (<code className="bg-[#f0e3d5] px-1 rounded">mg1_sketch.png</code>) hoặc đường ráp tay (<code className="bg-[#f0e3d5] px-1 rounded">mg1_line.png</code>). Bạn có thể mở mục "Nạp ảnh" để bổ sung tài nguyên.
                  </p>
                </div>
              ) : (
                /* Minigame 1 Interactive Canvas / Area */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#543825]">
                      Nhiệm vụ 1: Hoàn thiện đường ráp tay Raglan
                    </span>
                    {currentEventProg.mg1Completed && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2d7a6b] bg-[#eef7f4] px-2.5 py-0.5 rounded-full border border-[#c6e6dd]">
                        <Check size={12} /> Đã hoàn thành
                      </span>
                    )}
                  </div>

                  {/* Sketch Box with Target Zone */}
                  <div className="relative w-full h-56 sm:h-64 bg-[#f7f2e6] border border-[#ded0bd] rounded-xl p-2 flex items-center justify-center overflow-hidden">
                    <img
                      src={imagesRef.current['mg1_sketch.png']?.src}
                      alt="Phác thảo phom áo"
                      className="max-h-full max-w-full object-contain pixel-art"
                    />

                    {/* Raglan seam snap location */}
                    {mg1SeamAttached ? (
                      <div className="absolute top-[28%] left-[45%] pointer-events-none animate-in fade-in zoom-in duration-300">
                        <img
                          src={imagesRef.current['mg1_line.png']?.src}
                          alt="Đường ráp tay đã gắn"
                          className="w-16 h-16 object-contain pixel-art drop-shadow-md"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={handleAttachMg1Seam}
                        className="absolute top-[28%] left-[45%] w-16 h-16 border-2 border-dashed border-[#3d8b7a] rounded-lg bg-[#3d8b7a]/15 flex items-center justify-center cursor-pointer hover:bg-[#3d8b7a]/30 transition-colors animate-pulse"
                        title="Bấm hoặc kéo đường ráp tay vào đây"
                      >
                        <span className="text-[10px] font-bold text-[#2d7a6b] text-center px-1">
                          Rãnh xéo ráp tay
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Piece to drag / click */}
                  {!mg1SeamAttached ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-[#fffdf8] border border-[#e5d6c5] rounded-xl gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#f0e7d8] border border-[#ded0bd] rounded-lg p-1 flex items-center justify-center overflow-hidden">
                          <img
                            src={imagesRef.current['mg1_line.png']?.src}
                            alt="Đường ráp tay"
                            className="max-h-full max-w-full object-contain pixel-art"
                          />
                        </div>
                        <div className="text-xs">
                          <p className="font-semibold text-[#543825]">Đường ráp tay Raglan</p>
                          <p className="text-[#8c6d54]">Bấm vào nút bên phải hoặc bấm trực tiếp vào rãnh xéo trên phác thảo</p>
                        </div>
                      </div>

                      <button
                        onClick={handleAttachMg1Seam}
                        className="w-full sm:w-auto px-4 py-2 bg-[#3d8b7a] hover:bg-[#347869] text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Ráp vào phom áo
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#eef7f4] border border-[#c6e6dd] rounded-xl text-center space-y-1">
                      <p className="text-xs font-semibold text-[#2d7a6b]">
                        ✓ Ráp tay thành công! Phom áo Raglan đã được hoàn thiện khéo léo.
                      </p>
                      <p className="text-[11px] text-[#567a72]">
                        Tiến trình Ngày hội trường: +1 nhiệm vụ
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Close Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleCloseNPCModal}
                  className="px-6 py-2.5 bg-[#f0e7d8] hover:bg-[#e6dcce] text-[#543825] font-medium text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL: NPC THỢ ẢNH (MINIGAME 2: 3 DÁNG CỔ ÁO DÀI MA-NƠ-CANH) */}
        {/* ------------------------------------------------------------- */}
        {activeNPCModal === 'thoanh' && currentGarment.eventId !== 'ky_yeu' && (
          <div className="fixed inset-0 z-50 bg-[#3a2719]/45 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6">
            <div className="relative w-full max-w-2xl bg-[#fdfbf6] border border-[#d9c4af] rounded-2xl shadow-xl p-5 sm:p-7 text-[#4a3425] flex flex-col max-h-[92vh] overflow-y-auto space-y-4">
              <button
                onClick={handleCloseNPCModal}
                className="absolute top-4 right-4 p-1.5 text-[#8c6d54] hover:text-[#4a3425] hover:bg-[#f2ece0] rounded-full transition-colors cursor-pointer"
                aria-label="Đóng hộp thoại"
              >
                <X size={20} />
              </button>

              {/* Dialogue Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-[#ebdcca]">
                <div className="w-12 h-16 bg-[#f2ebd9] border border-[#ded0bd] rounded-lg p-1 flex items-center justify-center shrink-0 overflow-hidden">
                  {imagesRef.current['npc_thoanh.png'] && (
                    <img
                      src={imagesRef.current['npc_thoanh.png'].src}
                      alt="NPC Thợ ảnh"
                      className="max-h-full max-w-full object-contain pixel-art"
                    />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-base sm:text-lg text-[#543825]">
                    NPC Thợ ảnh
                  </h3>
                  <p className="text-xs text-[#8c6d54]">
                    Tiệm ảnh kỷ niệm Ngày hội văn hóa
                  </p>
                </div>
              </div>

              {/* Dialogue Content */}
              <div className="bg-[#fffdf8] border border-[#e5d6c5] rounded-xl p-4 shadow-xs space-y-2">
                <p className="text-sm leading-relaxed text-[#4a3425]">
                  "Chào bạn! Góc studio của mình có trưng bày 3 ma-nơ-canh đại diện cho 3 dáng cổ áo dài quen thuộc: <strong>Cổ trụ</strong>, <strong>Cổ thuyền</strong> và <strong>Cổ chữ V</strong>. Hãy giúp mình gắn đúng thẻ tên vào từng ma-nơ-canh nhé!"
                </p>
                <p className="text-[11px] text-[#8c6d54] italic">
                  (Lưu ý: Thao tác mang tính minh họa)
                </p>
              </div>

              {/* Check if Minigame 2 assets are missing */}
              {!hasMg2Assets ? (
                <div className="p-4 bg-[#fdf5eb] border border-[#e8cbb0] rounded-xl text-center space-y-2">
                  <div className="inline-flex p-2.5 rounded-full bg-[#f6ded0] text-[#c25a38]">
                    <Lock size={20} />
                  </div>
                  <h4 className="font-semibold text-sm text-[#873e22]">
                    Chưa tải được dữ liệu nhiệm vụ
                  </h4>
                  <p className="text-xs text-[#8c6d54] max-w-sm mx-auto">
                    Thiếu tệp ảnh 3 ma-nơ-canh (<code className="bg-[#f0e3d5] px-1 rounded">mg2_mannequins.png</code>). Bạn có thể mở mục "Nạp ảnh" để bổ sung tài nguyên.
                  </p>
                </div>
              ) : (
                /* Minigame 2 Interactive Canvas / Area */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#543825]">
                      Nhiệm vụ 2: Nhận diện 3 dáng cổ áo dài
                    </span>
                    {currentEventProg.mg2Completed && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2d7a6b] bg-[#eef7f4] px-2.5 py-0.5 rounded-full border border-[#c6e6dd]">
                        <Check size={12} /> Đã hoàn thành
                      </span>
                    )}
                  </div>

                  {/* 3 Mannequins Display Area */}
                  <div className="relative w-full h-56 sm:h-64 bg-[#f7f2e6] border border-[#ded0bd] rounded-xl p-2 flex flex-col items-center justify-between overflow-hidden">
                    <img
                      src={imagesRef.current['mg2_mannequins.png']?.src}
                      alt="3 Ma-nơ-canh"
                      className="max-h-[72%] max-w-full object-contain pixel-art mt-1"
                    />

                    {/* 3 Drop Targets under each mannequin */}
                    <div className="w-full grid grid-cols-3 gap-2 px-2 pb-1 z-10">
                      {(['m1', 'm2', 'm3'] as const).map((slot, idx) => {
                        const assigned = mg2Placements[slot];
                        const labelNumber = idx === 0 ? 'Dáng 1 (Trái)' : idx === 1 ? 'Dáng 2 (Giữa)' : 'Dáng 3 (Phải)';

                        return (
                          <div
                            key={slot}
                            onClick={() => handleAssignMg2Card(slot)}
                            className={`p-2 rounded-xl text-center cursor-pointer border transition-all ${
                              assigned
                                ? 'bg-[#eef7f4] border-[#3d8b7a] text-[#2d7a6b]'
                                : mg2SelectedCard
                                ? 'border-2 border-dashed border-[#3d8b7a] bg-[#3d8b7a]/10 hover:bg-[#3d8b7a]/20'
                                : 'border-dashed border-[#d9c4af] bg-[#fffdf8] hover:bg-[#f2ece0]'
                            }`}
                          >
                            <span className="text-[10px] text-[#8c6d54] block">{labelNumber}</span>
                            <span className="text-xs font-semibold block truncate">
                              {assigned ? `✓ ${assigned}` : mg2SelectedCard ? 'Gắn vào đây' : 'Trống'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Draggable / Clickable HTML Cards */}
                  {!mg2Success ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[#543825]">
                        Chọn thẻ tên cổ áo bên dưới rồi bấm vào vị trí ma-nơ-canh tương ứng:
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2.5">
                        {['Cổ trụ', 'Cổ thuyền', 'Cổ chữ V'].map((name) => {
                          const isAssigned = Object.values(mg2Placements).includes(name);
                          const isCurrentSelected = mg2SelectedCard === name;

                          return (
                            <button
                              key={name}
                              disabled={isAssigned}
                              onClick={() => handleSelectMg2Card(name)}
                              className={`px-4 py-2 rounded-xl font-medium text-xs sm:text-sm border transition-all cursor-pointer ${
                                isAssigned
                                  ? 'opacity-40 bg-[#e8e2d5] text-[#8c6d54] border-transparent cursor-not-allowed line-through'
                                  : isCurrentSelected
                                  ? 'bg-[#3d8b7a] text-white border-[#3d8b7a] shadow-sm scale-105'
                                  : 'bg-[#fffdf8] hover:bg-[#f6f0e3] text-[#543825] border-[#d9c4af] hover:border-[#b58b68]'
                              }`}
                            >
                              {name}
                            </button>
                          );
                        })}

                        <button
                          onClick={handleResetMg2}
                          className="px-3 py-2 text-xs text-[#8c6d54] hover:text-[#543825] underline ml-2 cursor-pointer"
                        >
                          Làm lại
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#eef7f4] border border-[#c6e6dd] rounded-xl text-center space-y-1">
                      <p className="text-xs font-semibold text-[#2d7a6b]">
                        ✓ Tuyệt vời! Bạn đã nhận diện chính xác cả 3 dáng cổ áo dài!
                      </p>
                      <p className="text-[11px] text-[#567a72]">
                        Tiến trình Ngày hội trường: +1 nhiệm vụ
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Close Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleCloseNPCModal}
                  className="px-6 py-2.5 bg-[#f0e7d8] hover:bg-[#e6dcce] text-[#543825] font-medium text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL: CHỢ XUÂN - GIAN HÀNG VẢI (NHIỆM VỤ 1: GHÉP HÌNH ÁO TỨ THÂN) */}
        {/* ------------------------------------------------------------- */}
        {activeNPCModal === 'cho_xuan_vai' && (
          <div className="fixed inset-0 z-50 bg-[#3a2719]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="relative w-full max-w-2xl bg-[#fdfbf6] border border-[#d9c4af] rounded-2xl p-4 sm:p-6 shadow-2xl text-[#4a3425] space-y-4 max-h-[92vh] overflow-y-auto">
              <button
                onClick={handleCloseNPCModal}
                className="absolute top-4 right-4 p-1.5 text-[#8c6d54] hover:text-[#4a3425] rounded-full transition-colors cursor-pointer"
                title="Đóng hộp thoại"
              >
                <X size={18} />
              </button>

              {/* Header with stall banner */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#f5e5d3] border border-[#d6b595] flex items-center justify-center text-[#8c5026] shadow-xs shrink-0">
                  <Scissors size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-base sm:text-lg text-[#543825] flex items-center gap-2">
                    Gian hàng vải — Chủ sạp vải
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#fdf2e9] text-[#b45309] border border-[#fcd34d]/60 font-normal">
                      Chợ Xuân
                    </span>
                  </h3>
                  <p className="text-xs text-[#8c6d54]">
                    Không gian rộn ràng ngày xuân bên những cuộn lụa tơ tằm đủ sắc màu
                  </p>
                </div>
              </div>

              {/* Dialogue Content */}
              <div className="bg-[#fffdf8] border border-[#e5d6c5] rounded-xl p-3.5 shadow-xs space-y-1.5">
                <p className="text-xs sm:text-sm leading-relaxed text-[#4a3425]">
                  "Chào bạn ghé thăm gian hàng vải Chợ Xuân! Bộ áo tứ thân của bạn trông thật duyên dáng. Hãy thử tài ghép 4 mảnh của bức hình áo tứ thân này vào khung mẫu nhé!"
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-[#8c6d54] border-t border-[#f0e6d8] pt-1.5 gap-1">
                  <span className="italic font-medium text-[#7c5b44]">
                    * Trò ghép hình minh họa, không mô phỏng quy trình may.
                  </span>
                  <span className="text-[10px] text-[#2d7a6b] font-medium">
                    Nhiệm vụ 1: Ghép hình áo tứ thân
                  </span>
                </div>
              </div>

              {/* Minigame 1 Interactive Area */}
              <div className="space-y-4">
                {/* Status header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#543825]">
                    Khung ghép 4 mảnh áo tứ thân ({completedPiecesCount}/4 mảnh đúng vị trí)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPuzzleSample((v) => !v)}
                      className="text-xs text-[#3d8b7a] hover:text-[#2d7a6b] px-2.5 py-1 rounded-lg border border-[#c6e6dd] bg-[#f0faf7] flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={12} />
                      <span>{showPuzzleSample ? 'Ẩn mẫu' : 'Xem mẫu'}</span>
                    </button>
                    <button
                      onClick={handleResetPuzzle}
                      className="text-xs text-[#8c6d54] hover:text-[#543825] px-2.5 py-1 rounded-lg border border-[#e5d6c5] hover:bg-[#f6efe4] flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>Làm lại</span>
                    </button>
                  </div>
                </div>

                {/* Puzzle Board & Pool Layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Sample thumbnail (if toggled) */}
                  {showPuzzleSample && (
                    <div className="md:col-span-3 flex flex-col items-center p-3 bg-[#fbf7ee] border border-[#ebdcca] rounded-xl text-center space-y-2">
                      <span className="text-[11px] font-semibold text-[#543825]">
                        Mẫu xem trước
                      </span>
                      <div className="w-24 h-36 bg-[#f0e7d8] border border-[#d6c5b0] rounded-lg p-1 flex items-center justify-center overflow-hidden">
                        {imagesRef.current[activeLook.imageFileName] ? (
                          <img
                            src={imagesRef.current[activeLook.imageFileName].src}
                            alt="Mẫu áo tứ thân"
                            className="max-h-full max-w-full object-contain pixel-art"
                          />
                        ) : (
                          <div className="text-[10px] text-[#8c6d54]">Mẫu áo</div>
                        )}
                      </div>
                      <span className="text-[10px] text-[#8c6d54] leading-tight">
                        {activeLook.name}
                      </span>
                    </div>
                  )}

                  {/* 2x2 Board Frame */}
                  <div className={`${showPuzzleSample ? 'md:col-span-5' : 'md:col-span-7'} flex flex-col items-center`}>
                    <div className="p-3 bg-[#f5ecdd] border-2 border-[#c5a687] rounded-xl shadow-inner">
                      <div className="grid grid-cols-2 gap-1.5 w-[208px] h-[288px]">
                        {[0, 1, 2, 3].map((slotIdx) => {
                          const pieceVal = puzzleBoard[slotIdx];
                          const isSelectedSlot = selectedPuzzlePiece?.source === 'slot' && selectedPuzzlePiece.index === slotIdx;
                          const isCorrect = pieceVal === slotIdx;
                          const slotLabels = ['Trên - Trái', 'Trên - Phải', 'Dưới - Trái', 'Dưới - Phải'];

                          return (
                            <div
                              key={slotIdx}
                              onClick={() => handleBoardSlotClick(slotIdx)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                handleDropOnSlot(slotIdx);
                              }}
                              className={`relative w-[100px] h-[140px] rounded-lg overflow-hidden flex items-center justify-center cursor-pointer transition-all ${
                                pieceVal !== null
                                  ? isCorrect
                                    ? 'border-2 border-emerald-500 shadow-xs'
                                    : 'border-2 border-amber-400'
                                  : isSelectedSlot
                                  ? 'border-2 border-dashed border-[#2d7a6b] bg-[#eef7f4]'
                                  : 'border-2 border-dashed border-[#b89574] bg-[#ebdcc8]/70 hover:bg-[#ebdcc8]'
                              }`}
                            >
                              {pieceVal !== null ? (
                                <div
                                  draggable={!puzzleSuccess}
                                  onDragStart={() => setDraggedPuzzlePiece({ source: 'slot', index: slotIdx })}
                                  className="relative w-full h-full overflow-hidden"
                                >
                                  {renderPuzzleQuadrant(pieceVal)}
                                  <span className={`absolute bottom-1 right-1 px-1 rounded text-[9px] font-bold ${
                                    isCorrect ? 'bg-emerald-600/90 text-white' : 'bg-amber-600/90 text-white'
                                  }`}>
                                    {isCorrect ? '✓' : '!'}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-center p-1 select-none pointer-events-none">
                                  <span className="text-[10px] font-semibold text-[#8c6d54] block">
                                    Ô {slotIdx + 1}
                                  </span>
                                  <span className="text-[9px] text-[#a5866d] block">
                                    {slotLabels[slotIdx]}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#8c6d54] mt-2 text-center">
                      Khung ghép 4 mảnh hoàn chỉnh
                    </p>
                  </div>

                  {/* Piece Pool */}
                  <div className={`${showPuzzleSample ? 'md:col-span-4' : 'md:col-span-5'} flex flex-col p-3 bg-[#fffdf8] border border-[#e5d6c5] rounded-xl space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#543825]">
                        Mảnh ghép còn lại ({puzzlePool.length})
                      </span>
                      <span className="text-[10px] text-[#8c6d54]">
                        Chạm hoặc kéo thả
                      </span>
                    </div>

                    {puzzlePool.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#2d7a6b] italic bg-[#eef7f4] rounded-lg border border-[#c6e6dd]">
                        Đã đặt hết 4 mảnh vào khung ghép!
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {puzzlePool.map((pieceVal, poolIdx) => {
                          const isSelected = selectedPuzzlePiece?.source === 'pool' && selectedPuzzlePiece.index === poolIdx;

                          return (
                            <div
                              key={pieceVal}
                              draggable={!puzzleSuccess}
                              onDragStart={() => setDraggedPuzzlePiece({ source: 'pool', index: poolIdx })}
                              onClick={() => handlePoolPieceClick(poolIdx)}
                              className={`relative w-[96px] h-[135px] rounded-lg overflow-hidden cursor-pointer transition-all transform ${
                                isSelected
                                  ? 'ring-3 ring-[#2d7a6b] ring-offset-2 scale-102 shadow-md'
                                  : 'border-2 border-[#d6c5b0] hover:border-[#b58b68] hover:shadow-xs active:scale-98'
                              }`}
                              title="Chạm để chọn, sau đó chạm vào ô trên khung ghép"
                            >
                              {renderPuzzleQuadrant(pieceVal)}
                              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold">
                                Mảnh #{pieceVal + 1}
                              </span>
                              {isSelected && (
                                <div className="absolute inset-0 bg-[#2d7a6b]/20 pointer-events-none flex items-center justify-center">
                                  <span className="bg-[#2d7a6b] text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                    Đang chọn
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="p-2 bg-[#fbf7ee] rounded-lg border border-[#ebdcca] text-[10px] text-[#8c6d54] leading-relaxed">
                      💡 <strong>Cách chơi:</strong> Kéo mảnh thả vào ô, hoặc <em>chạm chọn mảnh</em> rồi <em>chạm ô</em> trên khung ghép.
                    </div>
                  </div>
                </div>

                {/* Win / Complete Banner */}
                {currentEventProg.mg1Completed && (
                  <div className="p-3 bg-[#eef7f4] border border-[#c6e6dd] rounded-xl text-center space-y-1.5 animate-in fade-in zoom-in duration-200">
                    <p className="text-xs sm:text-sm font-semibold text-[#2d7a6b] flex items-center justify-center gap-1.5">
                      <Sparkles size={15} />
                      <span>Tuyệt vời! Bạn đã ghép chính xác cả 4 mảnh áo tứ thân!</span>
                    </p>
                    <p className="text-[11px] text-[#567a72]">
                      Tiến trình Chợ Xuân: Nhiệm vụ 1 hoàn thành ✓
                    </p>
                    {completedTaskCount === 2 && (
                      <button
                        onClick={() => {
                          handleCloseNPCModal();
                          clearMovementKeys();
                          setSaveToAlbumStatus(null);
                          setShowPhotoPreviewModal(true);
                        }}
                        className="mt-2 px-4 py-2 bg-[#2d7a6b] hover:bg-[#246256] text-white font-medium text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer animate-pulse"
                      >
                        <Camera size={14} />
                        <span>Chụp kỷ niệm ngay (Đã đủ 2/2 nhiệm vụ)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Close */}
              <div className="pt-2 flex justify-end border-t border-[#f0e6d8]">
                <button
                  onClick={handleCloseNPCModal}
                  className="px-6 py-2.5 bg-[#f0e7d8] hover:bg-[#e6dcce] text-[#543825] font-medium text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL: CHỢ XUÂN - GÓC DU XUÂN (NHIỆM VỤ 2: BẢNG MÀU DU XUÂN) */}
        {/* ------------------------------------------------------------- */}
        {activeNPCModal === 'cho_xuan_mau' && (
          <div className="fixed inset-0 z-50 bg-[#3a2719]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="relative w-full max-w-xl bg-[#fdfbf6] border border-[#d9c4af] rounded-2xl p-4 sm:p-6 shadow-2xl text-[#4a3425] space-y-4 max-h-[92vh] overflow-y-auto">
              <button
                onClick={handleCloseNPCModal}
                className="absolute top-4 right-4 p-1.5 text-[#8c6d54] hover:text-[#4a3425] rounded-full transition-colors cursor-pointer"
                title="Đóng hộp thoại"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#f5e5d3] border border-[#d6b595] flex items-center justify-center text-[#8c5026] shadow-xs shrink-0">
                  <Palette size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-base sm:text-lg text-[#543825] flex items-center gap-2">
                    Góc du xuân — Khách tham quan
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#fdf2e9] text-[#b45309] border border-[#fcd34d]/60 font-normal">
                      Chợ Xuân
                    </span>
                  </h3>
                  <p className="text-xs text-[#8c6d54]">
                    Dạo bước giữa muôn hoa xuân rực rỡ và cảm nhận sắc màu trang phục
                  </p>
                </div>
              </div>

              {/* Dialogue Content */}
              <div className="bg-[#fffdf8] border border-[#e5d6c5] rounded-xl p-3.5 shadow-xs space-y-1.5">
                <p className="text-xs sm:text-sm leading-relaxed text-[#4a3425]">
                  "Chào bạn! Sắc áo tứ thân của bạn hòa cùng cảnh sắc mùa xuân thật duyên dáng. Bạn có muốn thử tài phối màu số bằng thanh trượt để tạo ra mẫu màu gần nhất với màu áo bạn đang mặc không?"
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-[#8c6d54] border-t border-[#f0e6d8] pt-1.5 gap-1">
                  <span className="italic font-medium text-[#7c5b44]">
                    * Đây là trò phối màu số, không giải thích bằng nguyên liệu nhuộm truyền thống.
                  </span>
                  <span className="text-[10px] text-[#2d7a6b] font-medium">
                    Nhiệm vụ 2: Bảng màu du xuân
                  </span>
                </div>
              </div>

              {/* Minigame 2 Interactive Area */}
              <div className="space-y-4">
                {/* Swatch Comparison Side by Side */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 p-3.5 bg-[#fbf7ee] border border-[#ebdcca] rounded-xl">
                  {/* Target Swatch */}
                  <div className="flex flex-col items-center text-center space-y-2 p-3 bg-white rounded-lg border border-[#e2d5c3]">
                    <span className="text-xs font-semibold text-[#543825]">
                      Màu mục tiêu (Áo đang mặc)
                    </span>
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-white shadow-md flex items-center justify-center transition-all"
                      style={{ backgroundColor: `rgb(${targetColorInfo.r}, ${targetColorInfo.g}, ${targetColorInfo.b})` }}
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-[#4a3425]">{targetColorInfo.name}</p>
                      <p className="text-[10px] text-[#8c6d54] font-mono">
                        RGB({targetColorInfo.r}, {targetColorInfo.g}, {targetColorInfo.b})
                      </p>
                    </div>
                  </div>

                  {/* Player Swatch */}
                  <div className="flex flex-col items-center text-center space-y-2 p-3 bg-white rounded-lg border border-[#e2d5c3]">
                    <span className="text-xs font-semibold text-[#543825]">
                      Màu bạn đang phối
                    </span>
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-white shadow-md flex items-center justify-center transition-all"
                      style={{ backgroundColor: `rgb(${colorMixR}, ${colorMixG}, ${colorMixB})` }}
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-[#4a3425]">Mẫu phối hiện tại</p>
                      <p className="text-[10px] text-[#8c6d54] font-mono">
                        RGB({colorMixR}, {colorMixG}, {colorMixB})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Target Hint from data */}
                <div className="p-2.5 bg-[#f5ede0] rounded-xl border border-[#e0cca8] text-xs text-[#6b4728] flex items-start gap-2">
                  <HelpCircle size={15} className="text-[#a57041] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Gợi ý từ bản phối "{activeLook.name}": </span>
                    <span>{targetColorInfo.hint}</span>
                  </div>
                </div>

                {/* RGB Sliders */}
                <div className="space-y-3 p-3.5 bg-[#fffdf8] border border-[#e5d6c5] rounded-xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#543825]">Thanh trượt phối màu số</span>
                    <span className="text-[11px] text-[#8c6d54]">Kéo để tinh chỉnh từng sắc độ</span>
                  </div>

                  {/* Red Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-red-700">Đỏ (Red)</span>
                      <span className="font-mono font-bold text-red-700">{colorMixR}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={colorMixR}
                      onChange={(e) => setColorMixR(Number(e.target.value))}
                      className="w-full accent-red-600 cursor-pointer"
                    />
                  </div>

                  {/* Green Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-emerald-700">Xanh lá (Green)</span>
                      <span className="font-mono font-bold text-emerald-700">{colorMixG}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={colorMixG}
                      onChange={(e) => setColorMixG(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Blue Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-blue-700">Lam (Blue)</span>
                      <span className="font-mono font-bold text-blue-700">{colorMixB}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={colorMixB}
                      onChange={(e) => setColorMixB(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Preset Buttons */}
                  <div className="pt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-[#8c6d54] mr-1">Tông mẫu gợi ý:</span>
                    <button
                      onClick={() => { setColorMixR(147); setColorMixG(90); setColorMixB(56); }}
                      className="px-2 py-1 rounded bg-[#ecd5be] hover:bg-[#dec2a5] text-[10px] font-medium text-[#5c371d] transition-colors cursor-pointer"
                    >
                      Nâu mộc mạc
                    </button>
                    <button
                      onClick={() => { setColorMixR(74); setColorMixG(124); setColorMixB(89); }}
                      className="px-2 py-1 rounded bg-[#d2e8d9] hover:bg-[#bddac5] text-[10px] font-medium text-[#205531] transition-colors cursor-pointer"
                    >
                      Xanh rêu xuân
                    </button>
                    <button
                      onClick={() => { setColorMixR(120); setColorMixG(120); setColorMixB(120); }}
                      className="px-2 py-1 rounded bg-[#e8e2d5] hover:bg-[#ded6c5] text-[10px] font-medium text-[#4a3425] transition-colors cursor-pointer"
                    >
                      Đặt lại giữa
                    </button>
                  </div>
                </div>

                {/* Similarity Meter */}
                <div className="p-3.5 bg-[#fbf7ee] border border-[#ebdcca] rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#543825]">
                      Độ tương đồng màu sắc:
                    </span>
                    <span className={`font-bold font-mono ${isColorMatch ? 'text-emerald-700' : 'text-[#8c5026]'}`}>
                      {colorSimilarity}% (Yêu cầu &ge; 82%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-3 bg-[#e8dece] rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        isColorMatch ? 'bg-emerald-600' : 'bg-gradient-to-r from-amber-500 to-[#b45309]'
                      }`}
                      style={{ width: `${colorSimilarity}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#8c6d54]">
                      {isColorMatch
                        ? '✓ Sắc độ đã rất gần với màu áo đang mặc!'
                        : 'Tiếp tục điều chỉnh các thanh trượt để đạt trên 82%'}
                    </span>

                    {isColorMatch && (
                      <button
                        onClick={handleConfirmColorMix}
                        className="px-4 py-1.5 bg-[#2d7a6b] hover:bg-[#246256] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Xác nhận kết quả
                      </button>
                    )}
                  </div>
                </div>

                {/* Win / Complete Banner */}
                {currentEventProg.mg2Completed && (
                  <div className="p-3 bg-[#eef7f4] border border-[#c6e6dd] rounded-xl text-center space-y-1.5 animate-in fade-in zoom-in duration-200">
                    <p className="text-xs sm:text-sm font-semibold text-[#2d7a6b] flex items-center justify-center gap-1.5">
                      <Sparkles size={15} />
                      <span>Tuyệt vời! Bạn đã hoàn thành phối bảng màu du xuân!</span>
                    </p>
                    <p className="text-[11px] text-[#567a72]">
                      Tiến trình Chợ Xuân: Nhiệm vụ 2 hoàn thành ✓
                    </p>
                    {completedTaskCount === 2 && (
                      <button
                        onClick={() => {
                          handleCloseNPCModal();
                          clearMovementKeys();
                          setSaveToAlbumStatus(null);
                          setShowPhotoPreviewModal(true);
                        }}
                        className="mt-2 px-4 py-2 bg-[#2d7a6b] hover:bg-[#246256] text-white font-medium text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer animate-pulse"
                      >
                        <Camera size={14} />
                        <span>Chụp kỷ niệm ngay (Đã đủ 2/2 nhiệm vụ)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Close */}
              <div className="pt-2 flex justify-end border-t border-[#f0e6d8]">
                <button
                  onClick={handleCloseNPCModal}
                  className="px-6 py-2.5 bg-[#f0e7d8] hover:bg-[#e6dcce] text-[#543825] font-medium text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {currentGarment.eventId === 'ky_yeu' && activeNPCModal && (
          <YearbookTasks task={activeNPCModal === 'truyenthong' ? 1 : 2}
            lookImage={imagesRef.current[activeLook.imageFileName]?.src}
            lookName={activeLook.name} onClose={handleCloseNPCModal}
            completed={activeNPCModal === 'truyenthong' ? currentEventProg.mg1Completed : currentEventProg.mg2Completed}
            onComplete={() => setEventProgress(prev => ({...prev, ky_yeu: {
              ...prev.ky_yeu, [activeNPCModal === 'truyenthong' ? 'mg1Completed' : 'mg2Completed']: true,
            }}))} />
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL: XEM TRƯỚC KỶ NIỆM & LƯU ALBUM (BƯỚC 4 & BƯỚC 5) */}
        {/* ------------------------------------------------------------- */}
        {showPhotoPreviewModal && (
          <div className="fixed inset-0 z-50 bg-[#3a2719]/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-[#fdfbf6] border border-[#d9c4af] rounded-2xl p-6 shadow-2xl text-center space-y-4">
              <button
                onClick={() => setShowPhotoPreviewModal(false)}
                className="absolute top-4 right-4 p-1.5 text-[#8c6d54] hover:text-[#4a3425] rounded-full transition-colors cursor-pointer"
                title="Đóng xem trước"
              >
                <X size={18} />
              </button>

              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#eef7f4] text-[#2d7a6b] border border-[#c6e6dd]">
                  <Camera size={13} /> Xem trước ảnh kỷ niệm
                </span>
                <h3 className="font-semibold text-lg sm:text-xl text-[#543825]">
                  {currentGarment.eventName}
                </h3>
                <p className="text-xs text-[#8c6d54]">
                  Bản phối: <span className="font-medium text-[#2d7a6b]">{activeLook?.name}</span>
                </p>
              </div>

              {/* Composite photo preview: Character on event background */}
              <div className="relative w-full h-64 sm:h-72 bg-[#f0e7d8] border-4 border-white rounded-xl shadow-md overflow-hidden flex items-center justify-center">
                {currentGarment.eventId === 'cho_xuan' ? (
                  imagesRef.current['bg_choxuan.png'] ? (
                    <img
                      src={imagesRef.current['bg_choxuan.png'].src}
                      alt="Nền Chợ Xuân"
                      className="absolute inset-0 w-full h-full object-cover pixel-art filter blur-[0.5px]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-[#fbf2e3] via-[#f7e6ce] to-[#ebd2b5] flex flex-col items-center justify-between p-3 overflow-hidden select-none">
                      <div className="w-full flex justify-between items-center text-xs text-[#b45309] font-medium opacity-80">
                        <span>🌸 Hoa xuân rực rỡ</span>
                        <span>🏮 Đèn lồng Chợ Xuân</span>
                      </div>
                      <div className="text-center space-y-0.5">
                        <span className="text-[11px] font-bold tracking-wider text-[#8c5026] uppercase">
                          Chợ Xuân Dân Gian
                        </span>
                      </div>
                      <div className="w-full text-right text-[10px] text-[#8c6d54]">
                        Gian hàng vải & Góc du xuân
                      </div>
                    </div>
                  )
                ) : imagesRef.current[eventBackground(currentGarment.eventId)] ? (
                  <img
                    src={imagesRef.current[eventBackground(currentGarment.eventId)].src}
                    alt="Nền sự kiện"
                    className="absolute inset-0 w-full h-full object-cover pixel-art filter blur-[0.5px]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#e8dac7] flex items-center justify-center text-xs text-[#8c6d54]">
                    Nền sự kiện
                  </div>
                )}

                {/* Ambient photo frame overlay */}
                <div className="absolute inset-0 bg-amber-900/10 pointer-events-none" />

                {/* Character sprite centered */}
                {activeLook && imagesRef.current[activeLook.imageFileName] ? (
                  <div className="relative z-10 h-48 sm:h-52 flex items-center justify-center">
                    <img
                      src={imagesRef.current[activeLook.imageFileName].src}
                      alt={activeLook.name}
                      className="max-h-full max-w-full object-contain pixel-art drop-shadow-md"
                    />
                  </div>
                ) : (
                  <div className="relative z-10 bg-white/90 border border-amber-300 rounded-xl p-3 text-xs text-amber-800 flex flex-col items-center gap-1 shadow-xs">
                    <AlertTriangle size={18} className="text-amber-600" />
                    <span className="font-medium">Thiếu file ảnh: {activeLook?.imageFileName}</span>
                    <span className="text-[11px] text-[#8c6d54]">Thông tin trang phục vẫn được ghi nhận</span>
                  </div>
                )}
              </div>

              {/* Dòng kỷ niệm ngắn tiếng Việt, chỉ mô tả trải nghiệm theo yêu cầu */}
              <div className="bg-[#fffdf8] border border-[#e5d6c5] rounded-xl p-3 text-xs text-[#543825] italic leading-relaxed">
                {currentGarment.eventId === 'cho_xuan'
                  ? '"Du xuân, thử bảng màu và lưu lại bộ đồ mình chọn."'
                  : `"Kỷ niệm diện ${activeLook?.name} tham gia ${currentGarment.eventName}."`}
              </div>

              {/* Save status notification */}
              {saveToAlbumStatus && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center justify-center gap-2 border ${
                    saveToAlbumStatus.success
                      ? 'bg-[#eef7f4] border-[#c6e6dd] text-[#2d7a6b]'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {saveToAlbumStatus.success ? (
                    <Check size={15} className="shrink-0" />
                  ) : (
                    <AlertTriangle size={15} className="shrink-0" />
                  )}
                  <span>{saveToAlbumStatus.message}</span>
                </div>
              )}

              {/* Action buttons: Quay lại sự kiện vs Lưu vào album */}
              <div className="pt-1 flex flex-wrap gap-2.5 justify-center">
                <button
                  onClick={() => setShowPhotoPreviewModal(false)}
                  className="px-5 py-2.5 bg-[#f0e7d8] hover:bg-[#e6dcce] text-[#543825] font-medium text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Quay lại sự kiện
                </button>

                <button
                  onClick={handleSaveToMemoryAlbum}
                  disabled={!!saveToAlbumStatus?.savedId}
                  className={`px-6 py-2.5 font-medium text-xs sm:text-sm rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs ${
                    saveToAlbumStatus?.savedId
                      ? 'bg-[#2d7a6b] text-white opacity-90 cursor-default'
                      : 'bg-[#3d8b7a] hover:bg-[#347869] text-white'
                  }`}
                >
                  {saveToAlbumStatus?.savedId ? (
                    <>
                      <Check size={15} />
                      <span>Đã lưu vào album</span>
                    </>
                  ) : (
                    <>
                      <BookOpen size={15} />
                      <span>Lưu vào album</span>
                    </>
                  )}
                </button>

                {saveToAlbumStatus?.savedId && (
                  <>
                    <button
                      onClick={() => {
                        setShowPhotoPreviewModal(false);
                        handleReturnToRoom();
                        setShowAlbumModal(true);
                      }}
                      className="px-5 py-2.5 bg-[#543825] hover:bg-[#3f2a1b] text-white font-medium text-xs sm:text-sm rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <BookOpen size={15} />
                      <span>Về phòng & Mở Album</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowPhotoPreviewModal(false);
                        handleReturnToRoom();
                      }}
                      className="px-5 py-2.5 bg-[#f0e7d8] hover:bg-[#e6dcce] text-[#543825] font-medium text-xs sm:text-sm rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Home size={15} />
                      <span>Về phòng</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Bước 2 - MÀN HÌNH CHỌN BẢN PHỐI (#remix-screen)
  // -------------------------------------------------------------
  if (currentView === 'remix') {
    return (
      <div
        id="remix-screen"
        data-design="atelier"
        className="min-h-screen w-full bg-[#fbf7ee] text-[#4a3425] flex flex-col items-center justify-between p-3 sm:p-6 overflow-y-auto"
      >
        <header className="w-full max-w-4xl flex items-center justify-between pb-3 border-b border-[#e5d6c5] mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleBackToWardrobe}
              className="p-2 text-[#8c6d54] hover:text-[#4a3425] hover:bg-[#f2ece0] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm font-medium"
              title="Quay lại tủ đồ"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Quay lại tủ</span>
            </button>
            <button
              onClick={handleReturnToRoom}
              className="p-2 text-[#8c6d54] hover:text-[#4a3425] hover:bg-[#f2ece0] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm font-medium"
              title="Về phòng chính"
            >
              <Home size={16} />
              <span className="hidden sm:inline">Về phòng</span>
            </button>
            <div className="space-y-0.5">
              <h1 className="font-semibold text-lg sm:text-2xl text-[#543825]">
                Hôm nay mình mặc gì?
              </h1>
              <p className="text-xs text-[#8c6d54] flex items-center gap-1.5">
                <Calendar size={13} className="text-[#3d8b7a]" />
                <span>
                  Sự kiện: <strong className="text-[#2d7a6b] font-semibold">{savedSelection?.eventName}</strong>
                </span>
                <span className="text-[#d0beaa]">•</span>
                <span>{savedSelection?.garmentName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleEnterEventMap}
            className="px-4 py-2 sm:px-5 sm:py-2.5 bg-[#3d8b7a] hover:bg-[#347869] text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-98"
          >
            <Sparkles size={16} />
            <span>Đến {currentGarment.eventName}</span>
          </button>
        </header>

        {/* Map Entry Error Notice if bg_ngayhoitruong.png is missing */}
        {mapEntryError && (
          <div className="w-full max-w-4xl mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500 shrink-0" />
              <span>{mapEntryError}</span>
            </div>
            <button
              onClick={() => {
                setAssetManagerTab('step3');
                setShowAssetManager(true);
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shrink-0 cursor-pointer"
            >
              Nạp ảnh ngay
            </button>
          </div>
        )}

        <main className="w-full max-w-4xl flex-1 flex flex-col md:flex-row items-center md:items-stretch gap-6 my-auto">
          {/* Left Column (Desktop) / Top (Mobile): Large Preview */}
          <section className="w-full md:w-5/12 flex flex-col items-center justify-center">
            <div className="w-full max-w-[280px] md:max-w-none h-72 sm:h-96 bg-[#fdfbf6] border-2 border-[#d9c4af] rounded-2xl p-4 flex flex-col items-center justify-center relative shadow-xs">
              <div className="absolute inset-4 rounded-xl bg-[#f5ede0]/50 -z-0" />

              {activeLook && imagesRef.current[activeLook.imageFileName] && (
                <div className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden">
                  <img
                    src={imagesRef.current[activeLook.imageFileName].src}
                    alt={activeLook.name}
                    className="max-h-full max-w-full object-contain pixel-art drop-shadow-sm transition-all duration-200"
                  />
                </div>
              )}

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3.5 py-1 bg-[#fdfbf6] border border-[#d9c4af] rounded-full shadow-xs text-center whitespace-nowrap max-w-[90%] truncate">
                <span className="text-xs font-semibold text-[#543825]">
                  {activeLook?.name}
                </span>
              </div>
            </div>
          </section>

          {/* Right Column: Look Cards */}
          <section className="w-full md:w-7/12 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-[#8c6d54] uppercase tracking-wider">
                  Bản phối cho {savedSelection?.garmentName}
                </h2>
                <span className="text-[11px] text-[#8c6d54]">
                  {availableLooksForGarment.length} bản phối có sẵn
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {availableLooksForGarment.map((look) => {
                  const isSelected = look.id === activeLookId;
                  const img = imagesRef.current[look.imageFileName];

                  return (
                    <button
                      key={look.id}
                      onClick={() => handleSelectLook(look)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#f3faf7] border-2 border-[#3d8b7a] shadow-xs'
                          : 'bg-[#fdfbf6] hover:bg-[#f6f0e3] border-[#e2d5c3] hover:border-[#b58b68] active:scale-98'
                      }`}
                    >
                      <div className="w-14 h-20 bg-[#f2ebd9] border border-[#ded0bd] rounded-lg p-1 shrink-0 flex items-center justify-center overflow-hidden">
                        {img && (
                          <img
                            src={img.src}
                            alt={look.name}
                            className="max-h-full max-w-full object-contain pixel-art"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="font-semibold text-xs sm:text-sm text-[#4a3425] truncate block">
                          {look.name}
                        </span>
                        <p className="text-[11px] text-[#8c6d54] leading-relaxed line-clamp-2">
                          {look.description}
                        </p>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2d7a6b]">
                            <Check size={11} /> Đang chọn
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* "+ Thêm bản phối mới" Card */}
                <button
                  onClick={handleOpenAddLookModal}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-[#d9c4af] hover:border-[#3d8b7a] bg-[#faf6ee] hover:bg-[#f3faf7] transition-all duration-200 text-center cursor-pointer min-h-[96px] group active:scale-98"
                >
                  <div className="w-8 h-8 rounded-full bg-[#f0e7d8] group-hover:bg-[#d8f3ec] text-[#8c6d54] group-hover:text-[#2d7a6b] flex items-center justify-center mb-1.5 transition-colors">
                    <Plus size={18} />
                  </div>
                  <span className="font-semibold text-xs text-[#543825] group-hover:text-[#2d7a6b] transition-colors">
                    Thêm bản phối mới
                  </span>
                  <span className="text-[10px] text-[#8c6d54]">
                    Nạp ảnh nguyên bộ từ máy
                  </span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-[#ebdcca] flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={handleBackToWardrobe}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#f0e7d8] hover:bg-[#e6dcce] text-[#543825] rounded-xl font-medium text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Quay lại tủ
              </button>

              <button
                onClick={handleEnterEventMap}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#3d8b7a] hover:bg-[#347869] text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Sparkles size={16} />
                <span>Đến {selectedGarment?.eventName || currentGarment.eventName}</span>
              </button>
            </div>
          </section>
        </main>

        {/* Modal: Thêm bản phối */}
        {showAddLookModal && (
          <div className="fixed inset-0 z-50 bg-[#3a2719]/45 backdrop-blur-[2px] flex items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-[#fdfbf6] border border-[#d9c4af] rounded-2xl p-6 shadow-xl text-[#4a3425] space-y-4">
              <button
                onClick={() => setShowAddLookModal(false)}
                className="absolute top-4 right-4 p-1.5 text-[#8c6d54] hover:text-[#4a3425] rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div>
                <h3 className="font-semibold text-base sm:text-lg text-[#543825]">
                  Thêm bản phối cho {selectedGarment?.name}
                </h3>
                <p className="text-xs text-[#8c6d54] mt-0.5">
                  Nạp ảnh nguyên bộ nhân vật mặc {selectedGarment?.name}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#543825]">
                  Ảnh nhân vật nguyên bộ:
                </label>
                {newLookPreviewUrl ? (
                  <div className="flex items-center gap-4 p-3 bg-[#f7f2e6] rounded-xl border border-[#e2d5c3]">
                    <div className="w-16 h-24 bg-[#fdfbf6] border border-[#d6c5b0] rounded-lg p-1 flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src={newLookPreviewUrl}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain pixel-art"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-semibold text-[#4a3425] truncate">
                        {newLookFile?.name}
                      </p>
                      <label className="inline-block text-[11px] text-[#3d8b7a] hover:underline cursor-pointer">
                        Đổi ảnh khác
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={handleNewLookFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="block p-5 border-2 border-dashed border-[#d9c4af] hover:border-[#3d8b7a] bg-[#faf6ee] hover:bg-[#f3faf7] rounded-xl text-center cursor-pointer transition-colors">
                    <Upload size={22} className="mx-auto text-[#8c6d54] mb-1.5" />
                    <span className="text-xs font-semibold text-[#543825] block">
                      Chọn tệp ảnh từ máy
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleNewLookFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#543825]">
                  Tên bản phối:
                </label>
                <input
                  type="text"
                  value={newLookName}
                  onChange={(e) => setNewLookName(e.target.value)}
                  placeholder={`VD: ${selectedGarment?.name} hoa sen`}
                  className="w-full px-3 py-2 bg-[#faf6ee] border border-[#d9c4af] focus:border-[#3d8b7a] rounded-xl text-xs sm:text-sm text-[#4a3425] outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#543825]">
                  Mô tả các món đồ trong ảnh:
                </label>
                <input
                  type="text"
                  value={newLookDesc}
                  onChange={(e) => setNewLookDesc(e.target.value)}
                  placeholder="VD: Áo màu hồng, quần trắng, giày nâu, trâm cài..."
                  className="w-full px-3 py-2 bg-[#faf6ee] border border-[#d9c4af] focus:border-[#3d8b7a] rounded-xl text-xs sm:text-sm text-[#4a3425] outline-none transition-colors"
                />
              </div>

              {addLookError && (
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                  {addLookError}
                </p>
              )}

              <div className="pt-2 flex gap-2.5">
                <button
                  onClick={() => setShowAddLookModal(false)}
                  className="flex-1 py-2.5 bg-[#f0e7d8] hover:bg-[#e6dcce] text-[#543825] rounded-xl font-medium text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmAddLook}
                  className="flex-1 py-2.5 bg-[#3d8b7a] hover:bg-[#347869] text-white rounded-xl font-medium text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
                >
                  Xác nhận thêm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Main Game Screen (Phòng - Bước 1)
  // -------------------------------------------------------------
  return (
    <div className="relative w-screen h-screen bg-[#fbf7ee] text-[#4a3425] flex flex-col items-center justify-between p-2 sm:p-4 overflow-hidden select-none tnm-game">
      {/* Top Header */}
      <header className="w-full max-w-[min(96vw,170.6vh)] flex items-center justify-between py-1 px-1 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <h1 className="font-semibold text-base sm:text-lg text-[#4a3425] tracking-tight">
              Tủ Nhà Mình
            </h1>
            <span className="hidden sm:inline-block text-xs text-[#8c6d54]">
              — Mở tủ, bước vào một câu chuyện
            </span>
          </div>

          {savedSelection && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-[#eef7f4] text-[#2d7a6b] border border-[#c6e6dd]">
              <Check size={12} /> {savedSelection.lookName || savedSelection.garmentName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Nút Album kỷ niệm tại phòng chính */}
          <button
            onClick={() => {
              clearMovementKeys();
              setShowAlbumModal(true);
            }}
            className="text-xs text-[#543825] bg-[#fffdf8] hover:bg-[#f2ece0] border border-[#d9c4af] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Mở Album kỷ niệm đã lưu"
          >
            <BookOpen size={13} className="text-[#3d8b7a]" />
            <span>Album kỷ niệm</span>
            {memoryAlbum.length > 0 && (
              <span className="bg-[#3d8b7a] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {memoryAlbum.length}
              </span>
            )}
          </button>

          {savedSelection && (
            <button
              onClick={() => {
                clearMovementKeys();
                setCurrentView('remix');
              }}
              className="text-xs text-[#3d8b7a] font-medium hover:bg-[#eef7f4] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Shirt size={13} />
              <span>Phối đồ</span>
            </button>
          )}

          <button
            onClick={() => {
              clearMovementKeys();
              setAssetManagerTab('step3');
              setShowAssetManager(true);
            }}
            className="text-xs text-[#8c6d54] hover:text-[#4a3425] px-2.5 py-1 rounded-lg hover:bg-[#f2ece0] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Upload size={13} className="text-[#3d8b7a]" />
            <span>Nạp ảnh</span>
          </button>
        </div>
      </header>

      {/* Main Room Viewport */}
      <main className="relative w-full max-w-[min(96vw,170.6vh)] max-h-[min(84vh,54vw)] aspect-[16/9] border-2 border-[#b58b68] rounded-2xl shadow-lg shadow-[#845634]/10 overflow-hidden bg-[#e8dac7] flex items-center justify-center my-auto tnm-viewport">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="w-full h-full object-contain pixel-art block"
        />

        {isNearWardrobe && !isModalOpen && (
          <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
            <button
              onClick={handleOpenWardrobe}
              className="bg-[#3d8b7a] hover:bg-[#347869] text-white font-medium text-sm sm:text-base px-6 py-2.5 rounded-full shadow-md shadow-[#3d8b7a]/25 border border-[#a2d5cb] flex items-center gap-2 cursor-pointer transition-all duration-200 transform hover:scale-103 active:scale-97"
            >
              <Sparkles size={17} className="text-[#d8f3ec]" />
              <span>Mở tủ</span>
              <span className="hidden sm:inline text-xs opacity-80 font-normal pl-1 border-l border-white/30">
                Phím E
              </span>
            </button>
          </div>
        )}
      </main>

      {/* Footer Instruction */}
      <footer className="w-full max-w-[min(96vw,170.6vh)] py-1 px-1 z-20 flex justify-center text-center">
        <p className="text-xs text-[#8c6d54] hidden sm:block">
          Sử dụng phím <kbd className="px-1.5 py-0.5 bg-[#f0e7d8] border border-[#d6c5b0] rounded text-[11px] font-mono text-[#543825]">W A S D</kbd> hoặc <kbd className="px-1.5 py-0.5 bg-[#f0e7d8] border border-[#d6c5b0] rounded text-[11px] font-mono text-[#543825]">Mũi tên</kbd> để di chuyển • Đến gần tủ để mở
        </p>
      </footer>

      {/* Touch Controls (Mobile) */}
      <div className="absolute bottom-3 left-3 z-30 sm:hidden flex flex-col items-center gap-1 bg-[#fbf7ee]/90 p-1.5 rounded-xl border border-[#d9c4af] shadow-xs">
        <button
          onTouchStart={() => handleTouchStart('up')}
          onTouchEnd={() => handleTouchEnd('up')}
          className="w-9 h-9 bg-[#f0e7d8] active:bg-[#3d8b7a] active:text-white rounded-lg flex items-center justify-center text-[#543825]"
        >
          <ChevronUp size={20} />
        </button>
        <div className="flex gap-1">
          <button
            onTouchStart={() => handleTouchStart('left')}
            onTouchEnd={() => handleTouchEnd('left')}
            className="w-9 h-9 bg-[#f0e7d8] active:bg-[#3d8b7a] active:text-white rounded-lg flex items-center justify-center text-[#543825]"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onTouchStart={() => handleTouchStart('down')}
            onTouchEnd={() => handleTouchEnd('down')}
            className="w-9 h-9 bg-[#f0e7d8] active:bg-[#3d8b7a] active:text-white rounded-lg flex items-center justify-center text-[#543825]"
          >
            <ChevronDown size={20} />
          </button>
          <button
            onTouchStart={() => handleTouchStart('right')}
            onTouchEnd={() => handleTouchEnd('right')}
            className="w-9 h-9 bg-[#f0e7d8] active:bg-[#3d8b7a] active:text-white rounded-lg flex items-center justify-center text-[#543825]"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {isNearWardrobe && !isModalOpen && (
        <div className="absolute bottom-3 right-3 z-30 sm:hidden">
          <button
            onClick={handleOpenWardrobe}
            className="px-5 py-3 bg-[#3d8b7a] active:bg-[#347869] text-white font-medium text-sm rounded-xl shadow-md border border-[#a2d5cb] flex items-center gap-1.5"
          >
            <Sparkles size={17} />
            Mở tủ
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: TỦ ĐỒ (Bước 1)                                         */}
      {/* ------------------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#3a2719]/45 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6 transition-opacity duration-250">
          <div className="relative w-full max-w-2xl bg-[#fdfbf6] border border-[#d9c4af] rounded-2xl shadow-xl p-5 sm:p-7 text-[#4a3425] flex flex-col max-h-[92vh] overflow-y-auto">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-2 text-[#8c6d54] hover:text-[#4a3425] hover:bg-[#f2ece0] rounded-full transition-colors cursor-pointer"
              aria-label="Đóng tủ"
            >
              <X size={20} />
            </button>

            {modalLayer === 1 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-xl sm:text-2xl font-semibold text-[#543825]">
                    Tủ Nhà Mình
                  </h2>
                  <p className="text-xs sm:text-sm text-[#8c6d54]">
                    Chọn một chiếc áo để nhớ lại những kỷ niệm thân thương
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                  {GARMENTS_DATA.map((garment) => {
                    const img = imagesRef.current[garment.imageFileName];
                    const isSelected = savedSelection?.garmentId === garment.id;

                    return (
                      <button
                        key={garment.id}
                        onClick={() => handleSelectGarmentCard(garment)}
                        className={`group flex flex-col items-center rounded-xl p-3.5 transition-all duration-200 cursor-pointer text-center relative ${
                          isSelected
                            ? 'bg-[#f3faf7] border-2 border-[#3d8b7a] shadow-xs'
                            : 'bg-[#faf6ee] hover:bg-[#f6f0e3] border border-[#e2d5c3] hover:border-[#b58b68] hover:-translate-y-1 hover:shadow-xs active:scale-98'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 px-2 py-0.5 bg-[#3d8b7a] text-white text-[10px] font-medium rounded-full">
                            Đang chọn
                          </span>
                        )}

                        <div className="w-full h-44 sm:h-48 bg-[#f2ebd9] border border-[#ded0bd] rounded-lg p-2 flex items-center justify-center mb-2.5 overflow-hidden">
                          {img && (
                            <img
                              src={img.src}
                              alt={garment.name}
                              className="max-h-full max-w-full object-contain pixel-art group-hover:scale-104 transition-transform duration-200"
                            />
                          )}
                        </div>

                        <span className="font-semibold text-sm sm:text-base text-[#4a3425] group-hover:text-[#3d8b7a] transition-colors">
                          {garment.name}
                        </span>
                        <span className="text-xs text-[#8c6d54] mt-0.5 line-clamp-1">
                          {garment.shortIntro}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {modalLayer === 2 && selectedGarment && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#ebdcca]">
                  <button
                    onClick={() => setModalLayer(1)}
                    className="flex items-center gap-1.5 text-xs sm:text-sm text-[#8c6d54] hover:text-[#4a3425] font-medium transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={16} /> Quay lại tủ đồ
                  </button>
                  <h3 className="text-base sm:text-lg font-semibold text-[#543825]">
                    {selectedGarment.name}
                  </h3>
                  <div className="w-12" />
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  <div className="w-40 h-56 sm:w-44 sm:h-60 bg-[#f2ebd9] border border-[#ded0bd] rounded-xl p-2.5 flex items-center justify-center shrink-0 shadow-xs">
                    {imagesRef.current[selectedGarment.imageFileName] && (
                      <img
                        src={imagesRef.current[selectedGarment.imageFileName].src}
                        alt={selectedGarment.name}
                        className="max-h-full max-w-full object-contain pixel-art"
                      />
                    )}
                  </div>

                  <div className="flex-1 space-y-3.5 w-full">
                    <div className="bg-[#fffdf8] border border-[#e5d6c5] rounded-xl p-4 shadow-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#543825]">
                          Ký ức gia đình
                        </span>
                        <span className="text-[11px] text-[#8c6d54] italic">
                          (Câu chuyện minh họa)
                        </span>
                      </div>
                      <p className="text-sm sm:text-base text-[#4a3425] leading-relaxed pt-1">
                        "{selectedGarment.memoryText}"
                      </p>
                    </div>

                    <div className="bg-[#f7f2e6] rounded-lg px-3 py-2 text-xs text-[#8c6d54] border border-[#e2d5c3] flex items-center justify-between">
                      <span>Thông tin văn hóa:</span>
                      <span className="font-medium text-[#735238] bg-[#ecdfcc] px-2 py-0.5 rounded">
                        {selectedGarment.originText}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={() => setModalLayer(1)}
                    className="py-2.5 px-4 bg-[#f0e7d8] hover:bg-[#e6dcce] text-[#543825] rounded-xl font-medium text-sm transition-colors cursor-pointer"
                  >
                    Chọn áo khác
                  </button>

                  <button
                    onClick={handleConfirmGarmentToRemix}
                    className="flex-1 py-2.5 px-5 bg-[#3d8b7a] hover:bg-[#347869] text-white font-medium rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer active:scale-98"
                  >
                    <Sparkles size={17} />
                    <span>{selectedGarment.actionButtonLabel}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: QUẢN LÝ & NẠP ẢNH (BƯỚC 1, 2 VÀ 3 RIÊNG BIỆT)           */}
      {/* ------------------------------------------------------------- */}
      {showAssetManager && (
        <div className="fixed inset-0 z-50 bg-[#3a2719]/45 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-2xl bg-[#fdfbf6] border border-[#d9c4af] rounded-2xl p-5 sm:p-7 shadow-xl text-[#4a3425] flex flex-col max-h-[92vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setShowAssetManager(false)}
              className="absolute top-4 right-4 p-1.5 text-[#8c6d54] hover:text-[#4a3425] rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="font-semibold text-base sm:text-lg text-[#543825]">
                Quản lý & Nạp ảnh trò chơi
              </h3>
              <p className="text-xs text-[#8c6d54] mt-0.5">
                Nạp tệp ảnh từ máy tính theo từng vai trò cụ thể, có xem trước và xác nhận
              </p>
            </div>

            {/* Tabs: Tài nguyên dùng chung (Mới) vs Bước 3 vs Bước 1 & 2 */}
            <div className="flex border-b border-[#ebdcca] gap-2 pt-1 flex-wrap">
              <button
                onClick={() => setAssetManagerTab('shared')}
                className={`pb-2 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
                  assetManagerTab === 'shared'
                    ? 'border-[#3d8b7a] text-[#2d7a6b]'
                    : 'border-transparent text-[#8c6d54] hover:text-[#543825]'
                }`}
              >
                Tài nguyên dùng chung (14 ảnh demo)
              </button>
              <button
                onClick={() => setAssetManagerTab('step3')}
                className={`pb-2 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
                  assetManagerTab === 'step3'
                    ? 'border-[#3d8b7a] text-[#2d7a6b]'
                    : 'border-transparent text-[#8c6d54] hover:text-[#543825]'
                }`}
              >
                Bước 3: Ngày hội trường (Nền, NPC & Minigame)
              </button>
              <button
                onClick={() => setAssetManagerTab('step1_2')}
                className={`pb-2 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
                  assetManagerTab === 'step1_2'
                    ? 'border-[#3d8b7a] text-[#2d7a6b]'
                    : 'border-transparent text-[#8c6d54] hover:text-[#543825]'
                }`}
              >
                Bước 1 & 2: Phòng & Trang phục
              </button>
            </div>

            {/* TAB 1: TÀI NGUYÊN DÙNG CHUNG (TẤT CẢ 14 TÀI NGUYÊN DEMO GỐC) */}
            {assetManagerTab === 'shared' && (
              <div className="space-y-4 pt-1">
                <div className="p-3.5 bg-[#eef7f4] border border-[#c6e6dd] rounded-xl text-xs text-[#2d7a6b] space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm flex items-center gap-1.5">
                      <span>✓ 14/14 Tài nguyên Demo đã lưu trữ trong dự án</span>
                    </p>
                    <button
                      onClick={handleCheckServerStatus}
                      className="px-2.5 py-1 bg-[#3d8b7a] text-white rounded-lg text-[11px] font-medium hover:bg-[#327365] transition-colors cursor-pointer"
                    >
                      Kiểm tra máy chủ
                    </button>
                  </div>
                  <p className="text-[11px] text-[#426c61] leading-relaxed">
                    Ảnh mặc định được tải trực tiếp từ thư mục public đóng gói trong bản build. Để người khác mở link chia sẻ thấy đúng ảnh mới, các file ảnh phải được lưu thật vào thư mục public của dự án trước khi đóng gói sản phẩm (build).
                  </p>
                  {serverCheckResult && (
                    <div className="text-[11px] font-semibold text-[#1f6356] bg-white/70 p-2 rounded-lg border border-[#b2dfd5]">
                      Kết quả kiểm tra: {serverCheckResult.ready}/{serverCheckResult.total} tệp demo đã sẵn sàng và sẵn sàng phục vụ trên máy chủ!
                    </div>
                  )}
                </div>

                {/* Batch Upload Section */}
                <div className="p-3.5 bg-[#fdfbf7] border-2 border-dashed border-[#d9c4af] rounded-xl text-center space-y-2">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl">📁</span>
                    <span className="font-bold text-xs sm:text-sm text-[#543825]">
                      Nạp nhanh toàn bộ ảnh gốc từ máy tính (Thay thế ảnh AI mô phỏng)
                    </span>
                    <p className="text-[11px] text-[#8c6d54] max-w-md mx-auto">
                      Chọn cùng lúc nhiều file ảnh gốc của bạn để xem trước và nạp nhanh trên máy bạn. Lưu ý: Để mọi người mở link chia sẻ thấy được ảnh này, cần cập nhật file thật vào thư mục public của dự án và build lại.
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <label className="py-2 px-4 bg-[#3d8b7a] hover:bg-[#327365] text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm inline-flex items-center gap-1.5">
                      <span>{batchUploadProgress ? batchUploadProgress : '⚡ Bấm để chọn cùng lúc toàn bộ ảnh gốc của bạn'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp"
                        disabled={!!batchUploadProgress}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleBatchUploadFiles(e.target.files);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {batchUploadSummary && (
                    <div className="mt-2 text-left bg-white p-2.5 rounded-lg border border-[#e2d5c3] text-[11px] space-y-1">
                      <p className="font-bold text-[#2d7a6b]">
                        Kết quả nạp: Thành công {batchUploadSummary.success}/{batchUploadSummary.total} tệp (Lỗi/chưa khớp: {batchUploadSummary.failed})
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-0.5 text-[10px] text-[#6b4e36]">
                        {batchUploadSummary.details.map((d, i) => (
                          <div key={i}>{d}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {[
                    { id: 'all', label: 'Tất cả (14)' },
                    { id: 'room', label: 'Phòng & Nhân vật (2)' },
                    { id: 'look', label: '6 Bản phối (6)' },
                    { id: 'event', label: 'Sự kiện & NPC (3)' },
                    { id: 'minigame', label: 'Minigame (3)' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setSharedCategoryFilter(filter.id)}
                      className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer text-xs ${
                        sharedCategoryFilter === filter.id
                          ? 'bg-[#3d8b7a] text-white font-medium shadow-xs'
                          : 'bg-[#faf6ee] text-[#705540] hover:bg-[#f3ece0] border border-[#d9c4af]'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* 14 Shared Assets Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {SHARED_DEMO_ASSETS_MANIFEST.filter(
                    (item) =>
                      sharedCategoryFilter === 'all' ||
                      (sharedCategoryFilter === 'room' && (item.category === 'room' || item.category === 'character')) ||
                      (sharedCategoryFilter === 'event' && (item.category === 'event' || item.category === 'npc')) ||
                      item.category === sharedCategoryFilter
                  ).map((item) => {
                    const img = imagesRef.current[item.fileName];
                    const displayUrl = img?.src || `/${encodeURI(item.fileName)}`;
                    const uploadStatus = sharedUploadStatus[item.key];
                    const isUploading = isUploadingShared[item.key];

                    return (
                      <div
                        key={item.key}
                        className="bg-[#faf6ee] border border-[#d9c4af] rounded-xl p-3 flex flex-col justify-between space-y-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-xs text-[#543825] truncate">
                              {item.name}
                            </span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-medium shrink-0">
                              Dùng chung ✓
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8c6d54] leading-tight line-clamp-2">
                            {item.description}
                          </p>
                          <code className="text-[10px] text-[#78593d] bg-[#f0e4d2] px-1 py-0.5 rounded block truncate">
                            {item.fileName}
                          </code>
                        </div>

                        {/* Image Preview Box */}
                        <div className="w-full h-24 bg-[#fdfbf6] border border-[#d9c4af] rounded-lg p-1.5 flex items-center justify-center overflow-hidden relative">
                          <img
                            src={displayUrl}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain pixel-art"
                            onError={(e) => {
                              // Fallback display
                              (e.target as HTMLElement).style.opacity = '0.5';
                            }}
                          />
                        </div>

                        {uploadStatus && (
                          <p
                            className={`text-[10px] text-center font-medium ${
                              uploadStatus.startsWith('Lỗi') ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            {uploadStatus}
                          </p>
                        )}

                        {/* Replace / Upload to Shared */}
                        <div className="pt-1">
                          <label className="w-full py-1.5 px-2 bg-[#f0e7d8] hover:bg-[#e6dcce] text-[#543825] rounded-lg text-[11px] font-medium text-center cursor-pointer transition-colors block truncate">
                            <span>{isUploading ? 'Đang lưu...' : 'Tải ảnh mới & Lưu dùng chung'}</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadSharedDemoAsset(item, file);
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB BƯỚC 3: 3 Ô RIÊNG CHO NỀN, NPC TRUYỀN THÔNG & NPC THỢ ẢNH (+ MINIGAMES) */}
            {assetManagerTab === 'step3' && (
              <div className="space-y-4 pt-1">
                <div className="p-3 bg-[#eef7f4] border border-[#c6e6dd] rounded-xl text-xs text-[#2d7a6b]">
                  <p className="font-semibold">3 vai trò chính Bước 3:</p>
                  <p className="text-[11px] text-[#4a7268] mt-0.5">
                    Nền Ngày hội trường là bắt buộc để vào map. Nếu chưa có ảnh minigame, game sẽ khóa nhiệm vụ nhưng vẫn cho bạn di chuyển và trò chuyện với NPC bình thường! Ảnh bạn tự nạp chỉ dùng để thử trên trình duyệt này; bộ hình mặc định được tạo từ code và đi cùng bản triển khai.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {EVENT_ASSETS_CONFIG.map((roleDef) => {
                    const currentImg = imagesRef.current[roleDef.fileName];
                    const tempPreview = slotTempPreviews[roleDef.key];
                    const displayUrl = tempPreview || currentImg?.src;
                    const success = slotSuccessMsg[roleDef.key];

                    return (
                      <div
                        key={roleDef.key}
                        className="bg-[#faf6ee] border border-[#d9c4af] rounded-xl p-3.5 flex flex-col justify-between space-y-2.5"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs sm:text-sm text-[#543825]">
                              {roleDef.name}
                            </span>
                            {roleDef.requiredForMapEntry && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                                Cần để vào map
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#8c6d54] leading-tight">
                            {roleDef.description}
                          </p>
                          <code className="text-[10px] text-[#78593d] bg-[#f0e4d2] px-1 py-0.5 rounded block truncate">
                            {roleDef.fileName}
                          </code>
                        </div>

                        {/* Image Preview Box */}
                        <div className="w-full h-28 bg-[#fdfbf6] border border-[#d9c4af] rounded-lg p-1.5 flex items-center justify-center overflow-hidden relative">
                          {displayUrl ? (
                            <img
                              src={displayUrl}
                              alt={roleDef.name}
                              className="max-h-full max-w-full object-contain pixel-art"
                            />
                          ) : (
                            <span className="text-xs text-[#8c6d54] italic">Chưa có ảnh</span>
                          )}

                          {tempPreview && (
                            <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-amber-600 text-white text-[9px] rounded font-bold">
                              Chờ xác nhận
                            </span>
                          )}
                        </div>

                        {success && (
                          <p className="text-[11px] text-[#2d7a6b] font-medium text-center">
                            {success}
                          </p>
                        )}

                        {/* Action buttons for slot */}
                        <div className="flex items-center gap-2 pt-1">
                          <label className="flex-1 py-1.5 px-2 bg-[#f0e7d8] hover:bg-[#e6dcce] text-[#543825] rounded-lg text-xs font-medium text-center cursor-pointer transition-colors truncate">
                            <span>{tempPreview ? 'Đổi tệp' : 'Chọn tệp'}</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg"
                              onChange={(e) => handleSlotFileSelect(roleDef.key, e)}
                              className="hidden"
                            />
                          </label>

                          {tempPreview && (
                            <button
                              onClick={() => handleConfirmSlotUpload(roleDef)}
                              className="py-1.5 px-3 bg-[#3d8b7a] hover:bg-[#347869] text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors shrink-0"
                            >
                              Lưu dùng chung
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB BƯỚC 1 & 2: PHÒNG & TRANG PHỤC */}
            {assetManagerTab === 'step1_2' && (
              <div className="space-y-3 pt-1">
                <div className="p-3 bg-[#f7f2e6] rounded-xl border border-[#e2d5c3] text-xs text-[#6e533d] space-y-1">
                  <p className="font-semibold">Tài nguyên Bước 1 & 2:</p>
                  <p className="text-[11px] text-[#8c6d54]">
                    Gồm ảnh phòng <code className="bg-[#ecdfcc] px-1 rounded">Gemini_Generated_Image...</code> và 6 bản phối Việt phục (mỗi áo 2 bản phối nguyên bộ).
                  </p>
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {ALL_REQUIRED_FILES.map((fileName) => {
                    const img = imagesRef.current[fileName];
                    return (
                      <div
                        key={fileName}
                        className="flex items-center justify-between p-2.5 bg-[#faf6ee] rounded-xl border border-[#e2d5c3]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#fdfbf6] rounded-lg border border-[#d9c4af] p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                            {img && (
                              <img
                                src={img.src}
                                alt={fileName}
                                className="max-h-full max-w-full object-contain pixel-art"
                              />
                            )}
                          </div>
                          <span className="text-xs font-medium text-[#543825] truncate max-w-[280px]">
                            {fileName}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#2d7a6b] font-medium">Sẵn sàng dùng chung ✓</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Modal Close */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAssetManager(false)}
                className="px-6 py-2.5 bg-[#f0e7d8] hover:bg-[#e6dcce] text-[#543825] font-medium text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ALBUM KỶ NIỆM (BƯỚC 4 - DANH SÁCH THẺ KỶ NIỆM) */}
      {/* ------------------------------------------------------------- */}
      {showAlbumModal && (
        <div className="fixed inset-0 z-50 bg-[#3a2719]/55 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-3xl bg-[#fdfbf6] border border-[#d9c4af] rounded-2xl p-5 sm:p-7 shadow-2xl text-[#4a3425] flex flex-col max-h-[92vh] overflow-hidden space-y-4">
            <button
              onClick={() => setShowAlbumModal(false)}
              className="absolute top-4 right-4 p-1.5 text-[#8c6d54] hover:text-[#4a3425] rounded-full transition-colors cursor-pointer"
              title="Đóng Album"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center justify-between pr-8">
              <div>
                <h3 className="font-semibold text-base sm:text-xl text-[#543825] flex items-center gap-2">
                  <BookOpen size={20} className="text-[#3d8b7a]" />
                  <span>Album kỷ niệm</span>
                </h3>
                <p className="text-xs text-[#8c6d54] mt-0.5">
                  Lưu lại những bức ảnh trang phục bạn đã diện qua các sự kiện
                </p>
              </div>

              {memoryAlbum.length > 0 && (
                <span className="px-3 py-1 bg-[#eef7f4] border border-[#c6e6dd] text-[#2d7a6b] rounded-full text-xs font-semibold shrink-0">
                  {memoryAlbum.length} bức ảnh
                </span>
              )}
            </div>

            {/* Storage notice - Lưu trên trình duyệt máy bạn */}
            <div className="p-2.5 bg-[#fbf7ee] border border-[#ebdcca] rounded-xl text-[11px] text-[#8c6d54] flex items-center gap-2">
              <span className="text-[#3d8b7a]">💾</span>
              <span>
                Ảnh kỷ niệm được lưu trữ trong bộ nhớ trình duyệt của bạn (localStorage) và được giữ nguyên sau khi tải lại trang.
              </span>
            </div>

            {/* Content: Empty state vs Card grid */}
            {memoryAlbum.length === 0 ? (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-3 bg-[#faf6ee] rounded-xl border border-dashed border-[#d9c4af]">
                <div className="w-16 h-16 rounded-2xl bg-[#f0e7d8] border border-[#d9c4af] flex items-center justify-center text-[#8c6d54]">
                  <Camera size={32} />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="font-semibold text-sm sm:text-base text-[#543825]">
                    Chưa có bức ảnh kỷ niệm nào
                  </h4>
                  <p className="text-xs text-[#8c6d54] leading-relaxed">
                    Hãy mở tủ đồ, chọn bộ trang phục truyền thống yêu thích và hoàn thành 2 hoạt động tại sự kiện bạn chọn để chụp và lưu bức ảnh kỷ niệm đầu tiên nhé!
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAlbumModal(false);
                    handleOpenWardrobe();
                  }}
                  className="mt-2 px-5 py-2.5 bg-[#3d8b7a] hover:bg-[#347869] text-white font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Shirt size={14} />
                  <span>Mở tủ đồ ngay</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto max-h-[58vh] pr-1">
                {memoryAlbum.map((item) => {
                  const hasLookImage = !!imagesRef.current[item.outfitSnapshot.imageFileName];
                  const isItemChoXuan = item.outfitSnapshot.eventId === 'cho_xuan';
                  const hasBgImage = isItemChoXuan
                    ? !!imagesRef.current['bg_choxuan.png']
                    : !!imagesRef.current[eventBackground(item.outfitSnapshot.eventId)];

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedAlbumItemForDetail(item)}
                      className="bg-[#fffdf8] border border-[#e2d5c3] hover:border-[#3d8b7a] rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-3"
                    >
                      {/* Photo preview container */}
                      <div className="relative w-full aspect-[16/10] bg-[#f0e7d8] border border-[#d9c4af] rounded-lg overflow-hidden flex items-center justify-center">
                        {isItemChoXuan ? (
                          imagesRef.current['bg_choxuan.png'] ? (
                            <img
                              src={imagesRef.current['bg_choxuan.png'].src}
                              alt="Nền Chợ Xuân"
                              className="absolute inset-0 w-full h-full object-cover pixel-art filter blur-[0.5px]"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-b from-[#fbf2e3] via-[#f7e6ce] to-[#ebd2b5] flex items-center justify-center">
                              <span className="text-[10px] text-[#b45309] font-medium opacity-60">
                                🌸 Chợ Xuân 🏮
                              </span>
                            </div>
                          )
                        ) : imagesRef.current[eventBackground(item.outfitSnapshot.eventId)] ? (
                          <img
                            src={imagesRef.current[eventBackground(item.outfitSnapshot.eventId)].src}
                            alt="Nền sự kiện"
                            className="absolute inset-0 w-full h-full object-cover pixel-art filter blur-[0.5px]"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[#e8dac7]" />
                        )}
                        <div className="absolute inset-0 bg-amber-900/10 pointer-events-none" />

                        {hasLookImage ? (
                          <div className="relative z-10 h-32 flex items-center justify-center">
                            <img
                              src={imagesRef.current[item.outfitSnapshot.imageFileName].src}
                              alt={item.outfitSnapshot.lookName}
                              className="max-h-full max-w-full object-contain pixel-art drop-shadow-sm group-hover:scale-105 transition-transform"
                            />
                          </div>
                        ) : (
                          <div className="relative z-10 bg-white/95 border border-amber-300 rounded-lg p-2.5 text-[11px] text-amber-800 flex flex-col items-center gap-1 shadow-xs text-center max-w-[90%]">
                            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                            <span className="font-medium truncate max-w-full">Thiếu file ảnh: {item.outfitSnapshot.imageFileName}</span>
                            <span className="text-[10px] text-[#8c6d54]">Thông tin kỷ niệm vẫn được giữ nguyên</span>
                          </div>
                        )}

                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium backdrop-blur-xs">
                          {item.outfitSnapshot.eventName}
                        </span>
                      </div>

                      {/* Info & Caption */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-[#8c6d54]">
                          <span className="font-semibold text-[#2d7a6b]">{item.outfitSnapshot.garmentName}</span>
                          <span>{item.createdAtFormatted}</span>
                        </div>
                        <h4 className="font-semibold text-xs sm:text-sm text-[#543825] group-hover:text-[#2d7a6b] transition-colors truncate">
                          {item.outfitSnapshot.lookName}
                        </h4>
                        <p className="text-[11px] text-[#6b503a] italic line-clamp-2 leading-relaxed bg-[#faf6ee] p-2 rounded-lg border border-[#ebdcca]">
                          "{item.memoryCaption}"
                        </p>
                      </div>

                      {/* Card actions */}
                      <div className="pt-1 flex items-center justify-between border-t border-[#f0e6d8]">
                        <span className="text-[11px] text-[#3d8b7a] font-medium flex items-center gap-1">
                          <Eye size={12} /> Bấm để xem lớn
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmItem(item);
                          }}
                          className="p-1 text-[#a57c5e] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa kỷ niệm này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal Bottom Footer */}
            <div className="pt-2 flex justify-end border-t border-[#f0e6d8]">
              <button
                onClick={() => setShowAlbumModal(false)}
                className="px-6 py-2 bg-[#f0e7d8] hover:bg-[#e6dcce] text-[#543825] font-medium text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: XEM LỚN CHI TIẾT ẢNH KỶ NIỆM */}
      {/* ------------------------------------------------------------- */}
      {selectedAlbumItemForDetail && (
        <div className="fixed inset-0 z-50 bg-[#3a2719]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-lg bg-[#fdfbf6] border border-[#d9c4af] rounded-2xl p-5 sm:p-6 shadow-2xl text-[#4a3425] space-y-4 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setSelectedAlbumItemForDetail(null)}
              className="absolute top-4 right-4 p-1.5 text-[#8c6d54] hover:text-[#4a3425] rounded-full transition-colors cursor-pointer"
              title="Đóng xem lớn"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#eef7f4] text-[#2d7a6b] border border-[#c6e6dd]">
                <Camera size={13} /> {selectedAlbumItemForDetail.outfitSnapshot.eventName}
              </span>
              <h3 className="font-semibold text-base sm:text-lg text-[#543825]">
                {selectedAlbumItemForDetail.outfitSnapshot.lookName}
              </h3>
              <p className="text-xs text-[#8c6d54]">
                Trang phục: <span className="font-medium text-[#2d7a6b]">{selectedAlbumItemForDetail.outfitSnapshot.garmentName}</span> — Chụp lúc {selectedAlbumItemForDetail.createdAtFormatted}
              </p>
            </div>

            {/* Large photo frame */}
            <div className="relative w-full h-64 sm:h-72 bg-[#f0e7d8] border-4 border-white rounded-xl shadow-md overflow-hidden flex items-center justify-center">
              {selectedAlbumItemForDetail.outfitSnapshot.eventId === 'cho_xuan' ? (
                imagesRef.current['bg_choxuan.png'] ? (
                  <img
                    src={imagesRef.current['bg_choxuan.png'].src}
                    alt="Nền Chợ Xuân"
                    className="absolute inset-0 w-full h-full object-cover pixel-art filter blur-[0.5px]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-b from-[#fbf2e3] via-[#f7e6ce] to-[#ebd2b5] flex flex-col items-center justify-between p-3 select-none">
                    <div className="w-full flex justify-between items-center text-xs text-[#b45309] font-medium opacity-80">
                      <span>🌸 Hoa mai đào nở</span>
                      <span>🏮 Đèn lồng Chợ Xuân</span>
                    </div>
                    <span className="text-xs font-bold text-[#8c5026] uppercase">
                      Chợ Xuân Dân Gian
                    </span>
                    <span className="text-[10px] text-[#8c6d54]">
                      Gian hàng vải & Góc du xuân
                    </span>
                  </div>
                )
              ) : imagesRef.current[eventBackground(selectedAlbumItemForDetail.outfitSnapshot.eventId)] ? (
                <img
                  src={imagesRef.current[eventBackground(selectedAlbumItemForDetail.outfitSnapshot.eventId)].src}
                  alt="Nền sự kiện"
                  className="absolute inset-0 w-full h-full object-cover pixel-art filter blur-[0.5px]"
                />
              ) : (
                <div className="absolute inset-0 bg-[#e8dac7]" />
              )}
              <div className="absolute inset-0 bg-amber-900/10 pointer-events-none" />

              {imagesRef.current[selectedAlbumItemForDetail.outfitSnapshot.imageFileName] ? (
                <div className="relative z-10 h-48 sm:h-52 flex items-center justify-center">
                  <img
                    src={imagesRef.current[selectedAlbumItemForDetail.outfitSnapshot.imageFileName].src}
                    alt={selectedAlbumItemForDetail.outfitSnapshot.lookName}
                    className="max-h-full max-w-full object-contain pixel-art drop-shadow-md"
                  />
                </div>
              ) : (
                <div className="relative z-10 bg-white/95 border border-amber-300 rounded-xl p-3 text-xs text-amber-800 flex flex-col items-center gap-1 shadow-sm text-center">
                  <AlertTriangle size={20} className="text-amber-600" />
                  <span className="font-medium">Thiếu file ảnh: {selectedAlbumItemForDetail.outfitSnapshot.imageFileName}</span>
                  <span className="text-[11px] text-[#8c6d54]">Thông tin kỷ niệm vẫn được giữ nguyên vẹn</span>
                </div>
              )}
            </div>

            {/* Memory caption & metadata */}
            <div className="bg-[#fffdf8] border border-[#e5d6c5] rounded-xl p-3.5 text-xs space-y-1.5 leading-relaxed">
              <p className="text-[#543825] italic font-medium">
                "{selectedAlbumItemForDetail.memoryCaption}"
              </p>
              {selectedAlbumItemForDetail.outfitSnapshot.lookDescription && (
                <p className="text-[11px] text-[#8c6d54]">
                  Mô tả bản phối: {selectedAlbumItemForDetail.outfitSnapshot.lookDescription}
                </p>
              )}
              <div className="text-[11px] text-[#2d7a6b] font-medium flex items-center gap-1 pt-0.5">
                <Check size={12} /> Đã hoàn thành nhiệm vụ tại {selectedAlbumItemForDetail.outfitSnapshot.eventName}
              </div>
            </div>

            {/* Action buttons: Quay lại & Xóa kỷ niệm */}
            <div className="pt-1 flex items-center justify-between">
              <button
                onClick={() => setDeleteConfirmItem(selectedAlbumItemForDetail)}
                className="px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-red-200"
              >
                <Trash2 size={13} />
                <span>Xóa kỷ niệm</span>
              </button>

              <button
                onClick={() => setSelectedAlbumItemForDetail(null)}
                className="px-6 py-2 bg-[#3d8b7a] hover:bg-[#347869] text-white font-medium text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
              >
                Quay lại album
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: XÁC NHẬN XÓA KỶ NIỆM */}
      {/* ------------------------------------------------------------- */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-[60] bg-[#3a2719]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-[#fdfbf6] border border-[#d9c4af] rounded-2xl p-5 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <Trash2 size={22} />
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold text-base text-[#543825]">
                Xác nhận xóa kỷ niệm?
              </h4>
              <p className="text-xs text-[#8c6d54] leading-relaxed">
                Bạn có chắc chắn muốn xóa bức ảnh kỷ niệm{' '}
                <strong className="text-[#543825]">"{deleteConfirmItem.outfitSnapshot.lookName}"</strong> khỏi album không?
                Thao tác này sẽ xóa vĩnh viễn trên trình duyệt của bạn.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="flex-1 py-2 bg-[#f0e7d8] hover:bg-[#e6dcce] text-[#543825] font-medium text-xs rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteAlbumItem(deleteConfirmItem.id)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
