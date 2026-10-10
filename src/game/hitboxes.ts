import { HitboxRect } from '../types';

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// Solid obstacle hitboxes covering Wardrobe, Bed, Desk, Mirror, and Room boundaries
export const COLLISION_HITBOXES: HitboxRect[] = [
  { id: 'wardrobe', name: 'Tủ đồ', x: 330, y: 30, w: 265, h: 260 },
  { id: 'mirror_plant', name: 'Gương và cây', x: 100, y: 130, w: 210, h: 185 },
  { id: 'desk_chair', name: 'Bàn học', x: 0, y: 275, w: 236, h: 265 },
  { id: 'bed', name: 'Giường', x: 724, y: 280, w: 236, h: 260 },
  { id: 'top_wall', name: 'Tường trên', x: 0, y: 0, w: 960, h: 235 },
  { id: 'left_wall', name: 'Viền trái', x: 0, y: 0, w: 24, h: 540 },
  { id: 'right_wall', name: 'Viền phải', x: 936, y: 0, w: 24, h: 540 },
  { id: 'bottom_wall', name: 'Viền dưới', x: 0, y: 522, w: 960, h: 18 },
];

export const WARDROBE_TRIGGER_ZONE: HitboxRect = {
  id: 'wardrobe_trigger',
  name: 'Mở tủ',
  x: 355,
  y: 293,
  w: 218,
  h: 64,
};

// Check AABB collision between two rectangles
export function rectIntersect(
  r1: { x: number; y: number; w: number; h: number },
  r2: { x: number; y: number; w: number; h: number }
): boolean {
  return (
    r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y
  );
}
