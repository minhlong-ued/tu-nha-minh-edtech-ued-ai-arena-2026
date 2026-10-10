export type GarmentId = 'aodai' | 'tuthan' | 'nguthan';
export type EventId = 'ngay_hoi' | 'cho_xuan' | 'ky_yeu';

export interface GarmentConfig {
  id: GarmentId;
  name: string;
  shortIntro: string;
  imageFileName: string;
  memoryText: string;
  originText: string;
  eventId: EventId;
  eventName: string;
  actionButtonLabel: string;
  summaryPhrase: string;
}

export interface LookTargetColor {
  r: number;
  g: number;
  b: number;
  name: string;
  hint: string;
}

export interface LookConfig {
  id: string;
  garmentId: GarmentId;
  name: string;
  description: string;
  imageFileName: string;
  imageSrc?: string;
  isCustom?: boolean;
  targetColor?: LookTargetColor;
}

export interface HitboxRect {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GameSelectionState {
  garmentId: GarmentId;
  eventId: EventId;
  lookId: string;
  garmentName: string;
  eventName: string;
  lookName: string;
  lookDescription: string;
  imageSrc: string;
}

export interface EventProgressState {
  [eventId: string]: {
    mg1Completed: boolean;
    mg2Completed: boolean;
  };
}

export interface NPCConfig {
  id: 'truyenthong' | 'thoanh';
  name: string;
  title: string;
  imageFileName: string;
  x: number;
  y: number;
  triggerX: number;
  triggerY: number;
  triggerW: number;
  triggerH: number;
}

export interface MemoryOutfitSnapshot {
  garmentId: GarmentId;
  garmentName: string;
  eventId: EventId;
  eventName: string;
  lookId: string;
  lookName: string;
  lookDescription: string;
  imageFileName: string;
  imageSrc?: string;
}

export interface MemoryAlbumItem {
  id: string;
  garmentId: GarmentId;
  lookId: string;
  eventId: EventId;
  outfitSnapshot: MemoryOutfitSnapshot;
  taskProgress: {
    mg1Completed: boolean;
    mg2Completed: boolean;
  };
  createdAt: number;
  createdAtFormatted: string;
  memoryCaption: string;
}
