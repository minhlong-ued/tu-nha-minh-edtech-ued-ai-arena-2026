/**
 * IndexedDB storage for original game assets and custom looks
 * Persists user-provided PNG assets and looks across refreshes.
 */

import { GarmentId, LookConfig, MemoryAlbumItem } from '../types';

const DB_NAME = 'TuNhaMinhGameDB';
const DB_VERSION = 1;
const STORE_NAME = 'game_assets';
const LOOKS_STORAGE_KEY = 'tu_nha_minh_custom_looks';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAssetBlob(filename: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(blob, filename);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Failed to save asset to IndexedDB:', e);
  }
}

export async function getAssetBlob(filename: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(filename);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to get asset from IndexedDB:', e);
    return null;
  }
}

export interface StoredLookMeta {
  id: string;
  garmentId: GarmentId;
  name: string;
  description: string;
  imageFileName: string;
}

export function getStoredCustomLooks(): StoredLookMeta[] {
  try {
    const data = localStorage.getItem(LOOKS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to read custom looks from localStorage:', e);
    return [];
  }
}

export function saveStoredCustomLook(look: StoredLookMeta): void {
  try {
    const existing = getStoredCustomLooks();
    const filtered = existing.filter((l) => l.id !== look.id);
    filtered.push(look);
    localStorage.setItem(LOOKS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save custom look to localStorage:', e);
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an asset directly to project shared storage (/api/upload-shared)
 * so it is served permanently to all users across any browser/incognito session.
 */
export async function uploadSharedAsset(
  filename: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const base64 = await fileToBase64(file);
    const res = await fetch('/api/upload-shared', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, base64Data: base64 }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, url: data.url };
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || 'Lỗi lưu tệp lên máy chủ' };
    }
  } catch (e: any) {
    return { success: false, error: e.message || 'Không kết nối được máy chủ' };
  }
}

// -------------------------------------------------------------
// SEPARATION: Player Personal Progress & Selection (Per-session)
// Kept separate from shared system demo assets
// -------------------------------------------------------------
const PLAYER_SESSION_KEY = 'tu_nha_minh_player_session';

export interface PlayerSessionState {
  currentView?: string;
  selectedGarmentId?: string;
  activeLookId?: string;
  mg1Completed?: boolean;
  mg2Completed?: boolean;
}

export function getPlayerSession(): PlayerSessionState | null {
  try {
    const data = sessionStorage.getItem(PLAYER_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export function savePlayerSession(state: Partial<PlayerSessionState>): void {
  try {
    const existing = getPlayerSession() || {};
    const updated = { ...existing, ...state };
    sessionStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save player session:', e);
  }
}

export function resetPlayerSession(): void {
  try {
    sessionStorage.removeItem(PLAYER_SESSION_KEY);
  } catch (e) {}
}

// -------------------------------------------------------------
// STEP 4: ALBUM KỶ NIỆM (Memory Album Storage in localStorage)
// Persisted across page reloads on the same browser.
// Includes error handling and quota management.
// -------------------------------------------------------------
export const MEMORY_ALBUM_STORAGE_KEY = 'tu_nha_minh_memory_album';

export function getMemoryAlbum(): MemoryAlbumItem[] {
  try {
    const raw = localStorage.getItem(MEMORY_ALBUM_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter valid items to safeguard against corrupt data
    const validItems: MemoryAlbumItem[] = parsed.filter(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        item.outfitSnapshot &&
        typeof item.outfitSnapshot.lookName === 'string'
    );

    // Sort newest first
    return validItems.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (e) {
    console.error('Lỗi khi đọc Album kỷ niệm từ localStorage:', e);
    return [];
  }
}

export function saveMemoryAlbumItem(item: MemoryAlbumItem): { success: boolean; error?: string } {
  try {
    const existing = getMemoryAlbum();
    // Prevent duplicate entries by id
    const filtered = existing.filter((it) => it.id !== item.id);
    const updated = [item, ...filtered];

    const serialized = JSON.stringify(updated);
    localStorage.setItem(MEMORY_ALBUM_STORAGE_KEY, serialized);
    return { success: true };
  } catch (e: any) {
    console.error('Lỗi khi lưu ảnh kỷ niệm vào localStorage:', e);
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
      return {
        success: false,
        error: 'Trình duyệt của bạn đã hết dung lượng lưu trữ (QuotaExceededError). Vui lòng xóa bớt kỷ niệm cũ để lưu thêm!',
      };
    }
    return {
      success: false,
      error: `Không thể lưu vào bộ nhớ trình duyệt: ${e.message || 'Lỗi không xác định'}`,
    };
  }
}

export function deleteMemoryAlbumItem(id: string): { success: boolean; error?: string } {
  try {
    const existing = getMemoryAlbum();
    const filtered = existing.filter((it) => it.id !== id);
    localStorage.setItem(MEMORY_ALBUM_STORAGE_KEY, JSON.stringify(filtered));
    return { success: true };
  } catch (e: any) {
    console.error('Lỗi khi xóa ảnh kỷ niệm khỏi localStorage:', e);
    return {
      success: false,
      error: `Không thể xóa khỏi bộ nhớ: ${e.message || 'Lỗi không xác định'}`,
    };
  }
}

