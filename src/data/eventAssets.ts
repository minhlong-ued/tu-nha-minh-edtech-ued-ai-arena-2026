export interface AssetRoleDefinition {
  key: string;
  fileName: string;
  name: string;
  role: 'background' | 'npc' | 'minigame';
  description: string;
  requiredForMapEntry: boolean;
}

export const EVENT_ASSETS_CONFIG: AssetRoleDefinition[] = [
  {
    key: 'bg_ngayhoitruong',
    fileName: 'bg_ngayhoitruong.png',
    name: 'Nền Ngày hội trường',
    role: 'background',
    description: 'Bản đồ nền sân trường với các gian hàng văn hóa',
    requiredForMapEntry: true,
  },
  {
    key: 'bg_choxuan',
    fileName: 'bg_choxuan.png',
    name: 'Nền Chợ Xuân (Bước 5)',
    role: 'background',
    description: 'Bản đồ nền Chợ Xuân với gian hàng vải và góc du xuân (tùy chọn nạp thêm)',
    requiredForMapEntry: false,
  },
  {
    key: 'npc_truyenthong',
    fileName: 'npc_truyenthong.png',
    name: 'NPC Truyền thông',
    role: 'npc',
    description: 'Học sinh phụ trách ban truyền thông và tìm hiểu phom áo',
    requiredForMapEntry: false,
  },
  {
    key: 'npc_thoanh',
    fileName: 'npc_thoanh.png',
    name: 'NPC Thợ ảnh',
    role: 'npc',
    description: 'Học sinh phụ trách tiệm ảnh và ma-nơ-canh cổ áo',
    requiredForMapEntry: false,
  },
  {
    key: 'mg1_sketch',
    fileName: 'mg1_sketch.png',
    name: 'Phác thảo phom áo (MG1)',
    role: 'minigame',
    description: 'Bản vẽ phác thảo phom áo dài Raglan',
    requiredForMapEntry: false,
  },
  {
    key: 'mg1_line',
    fileName: 'mg1_line.png',
    name: 'Đường ráp tay (MG1)',
    role: 'minigame',
    description: 'Nét đứt ráp tay xéo ghép vào phác thảo',
    requiredForMapEntry: false,
  },
  {
    key: 'mg2_mannequins',
    fileName: 'mg2_mannequins.png',
    name: '3 Ma-nơ-canh (MG2)',
    role: 'minigame',
    description: 'Ảnh trưng bày 3 dáng cổ áo dài: Cổ trụ, Cổ thuyền, Cổ chữ V',
    requiredForMapEntry: false,
  },
];
