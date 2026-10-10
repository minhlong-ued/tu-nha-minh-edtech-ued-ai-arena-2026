import { GarmentConfig, LookConfig } from '../types';

export const BG_IMAGE_FILENAME = 'bg_room_original.png';
export const BASE_CHAR_FILENAME = 'Nhân vật pixel chính diện toàn thân.png';

export const ALL_REQUIRED_FILES = [
  BG_IMAGE_FILENAME,
  BASE_CHAR_FILENAME,
  'Nhân vật pixel áo dài xanh ngọc-3.png',
  'aodai_look2.png',
  'Nhân vật pixel áo tứ thân chính diện-1.png',
  'tuthan_look2.png',
  'Nhân vật pixel áo ngũ thân-2.png',
  'nguthan_look2.png',
  'bg_ngayhoitruong.png',
  'npc_truyenthong.png',
  'npc_thoanh.png',
  'mg1_sketch.png',
  'mg1_line.png',
  'mg2_mannequins.png',
];

export interface SharedAssetInfo {
  key: string;
  name: string;
  fileName: string;
  category: 'room' | 'character' | 'look' | 'event' | 'npc' | 'minigame';
  description: string;
}

export const SHARED_DEMO_ASSETS_MANIFEST: SharedAssetInfo[] = [
  {
    key: 'bg_room',
    name: 'Nền phòng ngủ ấm áp',
    fileName: BG_IMAGE_FILENAME,
    category: 'room',
    description: 'Bối cảnh phòng ngủ góc nhìn từ trên xuống, tủ gỗ ở giữa',
  },
  {
    key: 'base_char',
    name: 'Nhân vật cơ bản (Đồ thường)',
    fileName: BASE_CHAR_FILENAME,
    category: 'character',
    description: 'Nhân vật pixel chính diện toàn thân trang phục ở nhà',
  },
  // 6 Bản phối demo chốt
  {
    key: 'look_aodai_1',
    name: 'Áo dài - Bản phối 1 (Xanh ngọc truyền thống)',
    fileName: 'Nhân vật pixel áo dài xanh ngọc-3.png',
    category: 'look',
    description: 'Tà áo dài lụa xanh ngọc, quần trắng, hoa cài tóc đào',
  },
  {
    key: 'look_aodai_2',
    name: 'Áo dài - Bản phối 2 (Hồng phấn thanh lịch)',
    fileName: 'aodai_look2.png',
    category: 'look',
    description: 'Tà áo dài lụa hồng phấn nhạt, quần trắng hồng, hoa cài tóc đào',
  },
  {
    key: 'look_tuthan_1',
    name: 'Áo tứ thân - Bản phối 1 (Mộc mạc truyền thống)',
    fileName: 'Nhân vật pixel áo tứ thân chính diện-1.png',
    category: 'look',
    description: 'Áo khoác nâu mộc mạc, yếm hồng, váy đen dài',
  },
  {
    key: 'look_tuthan_2',
    name: 'Áo tứ thân - Bản phối 2 (Hội xuân duyên dáng)',
    fileName: 'tuthan_look2.png',
    category: 'look',
    description: 'Áo khoác xanh rêu, yếm đào thắm, dải lưng lụa vàng, váy đen xếp ly',
  },
  {
    key: 'look_nguthan_1',
    name: 'Áo ngũ thân - Bản phối 1 (Lam thẫm truyền thống)',
    fileName: 'Nhân vật pixel áo ngũ thân-2.png',
    category: 'look',
    description: 'Áo ngũ thân xanh lam thẫm khuy cài chéo, quần trắng',
  },
  {
    key: 'look_nguthan_2',
    name: 'Áo ngũ thân - Bản phối 2 (Gấm vàng hoàng yến)',
    fileName: 'nguthan_look2.png',
    category: 'look',
    description: 'Áo ngũ thân gấm vàng hoàng yến khuy cài chéo đĩnh đạc, quần lụa trắng',
  },
  // Nền sự kiện Bước 3 & NPC
  {
    key: 'bg_event',
    name: 'Nền Ngày hội trường (Bước 3)',
    fileName: 'bg_ngayhoitruong.png',
    category: 'event',
    description: 'Bản đồ sân trường với cờ hoa, gian hàng văn hóa truyền thống',
  },
  {
    key: 'npc_truyenthong',
    name: 'NPC Ban Truyền thông',
    fileName: 'npc_truyenthong.png',
    category: 'npc',
    description: 'NPC phụ trách tìm hiểu phom áo và minigame ráp tay',
  },
  {
    key: 'npc_thoanh',
    name: 'NPC Thợ ảnh',
    fileName: 'npc_thoanh.png',
    category: 'npc',
    description: 'NPC phụ trách gian tiệm ảnh và ma-nơ-canh cổ áo',
  },
  // Minigame
  {
    key: 'mg1_sketch',
    name: 'Phác thảo phom áo Raglan (MG1)',
    fileName: 'mg1_sketch.png',
    category: 'minigame',
    description: 'Bản vẽ phác thảo phom áo dài Raglan cho minigame 1',
  },
  {
    key: 'mg1_line',
    name: 'Đường ráp tay xéo (MG1)',
    fileName: 'mg1_line.png',
    category: 'minigame',
    description: 'Nét đứt ráp tay xéo Raglan nối từ cổ nách',
  },
  {
    key: 'mg2_mannequins',
    name: '3 Ma-nơ-canh cổ áo (MG2)',
    fileName: 'mg2_mannequins.png',
    category: 'minigame',
    description: '3 ma-nơ-canh trưng bày cổ trụ, cổ thuyền, cổ chữ V',
  },
];

export const GARMENTS_DATA: GarmentConfig[] = [
  {
    id: 'aodai',
    name: 'Áo dài',
    shortIntro: 'Tà áo thướt tha, trang nhã',
    imageFileName: 'Nhân vật pixel áo dài xanh ngọc-3.png',
    memoryText: 'Mẹ giữ chiếc áo này từ những ngày còn đi học.',
    originText: 'Chờ kiểm chứng',
    eventId: 'ngay_hoi',
    eventName: 'Ngày hội trường',
    actionButtonLabel: 'Phối đồ đi Ngày hội trường',
    summaryPhrase: 'Phối Áo dài để đến Ngày hội trường',
  },
  {
    id: 'tuthan',
    name: 'Áo tứ thân',
    shortIntro: 'Nét mộc mạc, duyên dáng',
    imageFileName: 'Nhân vật pixel áo tứ thân chính diện-1.png',
    memoryText: 'Trong tủ của bà có một chiếc áo cùng những tấm ảnh cũ.',
    originText: 'Chờ kiểm chứng',
    eventId: 'cho_xuan',
    eventName: 'Chợ Xuân',
    actionButtonLabel: 'Phối đồ đi Chợ Xuân',
    summaryPhrase: 'Phối Áo tứ thân để đến Chợ Xuân',
  },
  {
    id: 'nguthan',
    name: 'Áo ngũ thân',
    shortIntro: 'Phom dáng đĩnh đạc, kín đáo',
    imageFileName: 'Nhân vật pixel áo ngũ thân-2.png',
    memoryText: 'Ông cất chiếc áo này bên cuốn album gia đình.',
    originText: 'Chờ kiểm chứng',
    eventId: 'ky_yeu',
    eventName: 'Kỷ yếu',
    actionButtonLabel: 'Phối đồ chụp Kỷ yếu',
    summaryPhrase: 'Phối Áo ngũ thân để đến Kỷ yếu',
  },
];

export const LOOK_TARGET_COLORS: Record<string, { r: number; g: number; b: number; name: string; hint: string }> = {
  look_tuthan_1: {
    r: 147,
    g: 90,
    b: 56,
    name: 'Nâu mộc mạc (Áo khoác nâu)',
    hint: 'Tông màu ấm dân gian: Tăng màu Đỏ (khoảng 140-155), Xanh lá vừa phải (khoảng 85-95), giảm Lam (khoảng 50-65).',
  },
  look_tuthan_2: {
    r: 74,
    g: 124,
    b: 89,
    name: 'Xanh rêu trổ xuân (Áo khoác rêu)',
    hint: 'Tông lá xuân: Kéo Xanh lá lên cao (khoảng 115-130), Đỏ (khoảng 65-80), Lam (khoảng 80-95).',
  },
  look_aodai_1: {
    r: 45,
    g: 122,
    b: 107,
    name: 'Xanh ngọc truyền thống',
    hint: 'Tông ngọc bích: Kéo Xanh lá và Lam cân bằng, Đỏ thấp.',
  },
  look_aodai_2: {
    r: 220,
    g: 155,
    b: 165,
    name: 'Hồng phấn thanh lịch',
    hint: 'Tông hoa đào: Kéo Đỏ cao, Xanh lá và Lam trung bình.',
  },
  look_nguthan_1: {
    r: 40,
    g: 75,
    b: 130,
    name: 'Lam thẫm truyền thống',
    hint: 'Tông lam đậm: Kéo Lam cao, Đỏ và Xanh lá thấp.',
  },
  look_nguthan_2: {
    r: 215,
    g: 165,
    b: 45,
    name: 'Gấm vàng hoàng yến',
    hint: 'Tông hoàng yến: Kéo Đỏ và Xanh lá cao, Lam thấp.',
  },
};

export const DEFAULT_LOOKS: LookConfig[] = [
  // 1. ÁO DÀI (2 bản phối)
  {
    id: 'look_aodai_1',
    garmentId: 'aodai',
    name: 'Áo dài xanh ngọc truyền thống',
    description: 'Áo dài lụa xanh ngọc thướt tha, quần lụa trắng, hoa cài tóc đào, giày nâu',
    imageFileName: 'Nhân vật pixel áo dài xanh ngọc-3.png',
    targetColor: LOOK_TARGET_COLORS['look_aodai_1'],
  },
  {
    id: 'look_aodai_2',
    garmentId: 'aodai',
    name: 'Áo dài hồng phấn thanh lịch',
    description: 'Áo dài lụa hồng phấn nhạt, quần lụa trắng hồng, hoa cài tóc đào, giày nâu',
    imageFileName: 'aodai_look2.png',
    targetColor: LOOK_TARGET_COLORS['look_aodai_2'],
  },

  // 2. ÁO TỨ THÂN (2 bản phối)
  {
    id: 'look_tuthan_1',
    garmentId: 'tuthan',
    name: 'Áo tứ thân mộc mạc truyền thống',
    description: 'Áo khoác nâu mộc, yếm hồng duyên dáng, váy đen dài, hoa cài tóc đào, giày nâu',
    imageFileName: 'Nhân vật pixel áo tứ thân chính diện-1.png',
    targetColor: LOOK_TARGET_COLORS['look_tuthan_1'],
  },
  {
    id: 'look_tuthan_2',
    garmentId: 'tuthan',
    name: 'Áo tứ thân hội xuân duyên dáng',
    description: 'Áo khoác xanh rêu, yếm đào thắm, dải lưng lụa vàng hoàng yến, váy đen xếp ly, giày nâu',
    imageFileName: 'tuthan_look2.png',
    targetColor: LOOK_TARGET_COLORS['look_tuthan_2'],
  },

  // 3. ÁO NGŨ THÂN (2 bản phối)
  {
    id: 'look_nguthan_1',
    garmentId: 'nguthan',
    name: 'Áo ngũ thân lam thẫm truyền thống',
    description: 'Áo ngũ thân xanh lam thẫm khuy cài chéo, quần trắng, hoa cài tóc đào, giày nâu',
    imageFileName: 'Nhân vật pixel áo ngũ thân-2.png',
    targetColor: LOOK_TARGET_COLORS['look_nguthan_1'],
  },
  {
    id: 'look_nguthan_2',
    garmentId: 'nguthan',
    name: 'Áo ngũ thân gấm vàng hoàng yến',
    description: 'Áo ngũ thân gấm vàng hoàng yến khuy cài chéo đĩnh đạc, quần lụa trắng, giày nâu',
    imageFileName: 'nguthan_look2.png',
    targetColor: LOOK_TARGET_COLORS['look_nguthan_2'],
  },
];
