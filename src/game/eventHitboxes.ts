import { HitboxRect } from '../types';

export const EVENT_GAME_WIDTH = 960;
export const EVENT_GAME_HEIGHT = 540;

// Obstacle hitboxes for School Festival Map (bg_ngayhoitruong.png)
export const EVENT_MAP_HITBOXES: HitboxRect[] = [
  // 1. Tòa nhà trường học phía trên (Top building boundary)
  {
    id: 'school_building',
    name: 'Tòa nhà trường học',
    x: 0,
    y: 0,
    w: 960,
    h: 220,
  },
  // 2. Gian hàng Truyền thông bên trái (Left booth)
  {
    id: 'booth_truyenthong',
    name: 'Gian hàng Truyền thông',
    x: 85,
    y: 200,
    w: 240,
    h: 120,
  },
  // 3. Gian hàng Tiệm ảnh bên phải (Right booth)
  {
    id: 'booth_thoanh',
    name: 'Gian hàng Tiệm ảnh',
    x: 635,
    y: 200,
    w: 240,
    h: 120,
  },
  // 4. Viền bên trái (Left barrier)
  {
    id: 'event_left_wall',
    name: 'Viền trái sân trường',
    x: 0,
    y: 0,
    w: 25,
    h: 540,
  },
  // 5. Viền bên phải (Right barrier)
  {
    id: 'event_right_wall',
    name: 'Viền phải sân trường',
    x: 935,
    y: 0,
    w: 25,
    h: 540,
  },
  // 6. Viền dưới (Bottom boundary)
  {
    id: 'event_bottom_wall',
    name: 'Viền dưới sân trường',
    x: 0,
    y: 518,
    w: 960,
    h: 25,
  },
];

// Trigger zone for NPC Truyền thông
export const TRIGGER_NPC_TRUYENTHONG: HitboxRect = {
  id: 'trigger_npc_truyenthong',
  name: 'Vùng tương tác NPC Truyền thông',
  x: 180,
  y: 290,
  w: 100,
  h: 80,
};

// Trigger zone for NPC Thợ ảnh
export const TRIGGER_NPC_THOANH: HitboxRect = {
  id: 'trigger_npc_thoanh',
  name: 'Vùng tương tác NPC Thợ ảnh',
  x: 660,
  y: 290,
  w: 100,
  h: 80,
};

// =============================================================
// Chợ Xuân (eventId: cho_xuan) Hitboxes & Triggers
// =============================================================
export const CHO_XUAN_HITBOXES: HitboxRect[] = [
  // 1. Dãy gian hàng & tường hoa phía trên
  {
    id: 'choxuan_top_boundary',
    name: 'Cổng chợ và hàng rào hoa phía trên',
    x: 0,
    y: 0,
    w: 960,
    h: 210,
  },
  // 2. Gian hàng vải bên trái (Left booth - Fabric stall)
  {
    id: 'choxuan_booth_vai',
    name: 'Gian hàng vải',
    x: 85,
    y: 195,
    w: 240,
    h: 125,
  },
  // 3. Gian hàng Góc du xuân bên phải (Right booth - Spring pavilion)
  {
    id: 'choxuan_booth_mau',
    name: 'Góc du xuân',
    x: 635,
    y: 195,
    w: 240,
    h: 125,
  },
  // 4. Bờ tường / rào tre bên trái
  {
    id: 'choxuan_left_wall',
    name: 'Hàng rào tre bên trái',
    x: 0,
    y: 0,
    w: 25,
    h: 540,
  },
  // 5. Bờ tường / rào tre bên phải
  {
    id: 'choxuan_right_wall',
    name: 'Hàng rào tre bên phải',
    x: 935,
    y: 0,
    w: 25,
    h: 540,
  },
  // 6. Viền dưới sân chợ
  {
    id: 'choxuan_bottom_wall',
    name: 'Viền dưới sân Chợ Xuân',
    x: 0,
    y: 518,
    w: 960,
    h: 25,
  },
];

// Trigger zone for Gian hàng vải (Chủ sạp vải)
export const TRIGGER_CHO_XUAN_VAI: HitboxRect = {
  id: 'trigger_cho_xuan_vai',
  name: 'Vùng tương tác Gian hàng vải',
  x: 180,
  y: 285,
  w: 110,
  h: 85,
};

// Trigger zone for Góc du xuân (Khách tham quan)
export const TRIGGER_CHO_XUAN_MAU: HitboxRect = {
  id: 'trigger_cho_xuan_mau',
  name: 'Vùng tương tác Góc du xuân',
  x: 655,
  y: 285,
  w: 110,
  h: 85,
};

// Yearbook map: upper building, preparation table, backdrop and tripod.
export const YEARBOOK_HITBOXES: HitboxRect[] = [
 {id:'ky-building',name:'Tòa nhà',x:0,y:0,w:960,h:200},
 {id:'ky-table',name:'Bàn chuẩn bị',x:72,y:246,w:222,h:78},
 {id:'ky-backdrop',name:'Phông ảnh',x:642,y:200,w:216,h:103},
 {id:'ky-camera',name:'Máy ảnh',x:714,y:360,w:72,h:70},
 {id:'ky-left',name:'Viền trái',x:0,y:0,w:25,h:540},
 {id:'ky-right',name:'Viền phải',x:935,y:0,w:25,h:540},
 {id:'ky-bottom',name:'Viền dưới',x:0,y:518,w:960,h:25},
];
