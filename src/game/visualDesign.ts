/** Original game illustrations generated in code; not historical reconstructions. */
type Scene = 'room' | 'school' | 'market' | 'yearbook';
type Outfit = 'base' | 'aodai' | 'tuthan' | 'nguthan' | 'reporter' | 'photographer';
type Ink = ReturnType<typeof painter>;

function painter(ctx: CanvasRenderingContext2D) {
  const box = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const outlined = (x: number, y: number, w: number, h: number, c: string) => {
    box(x - 1, y - 1, w + 2, h + 2, '#654c3c');
    box(x, y, w, h, c);
  };
  const label = (v: string, x: number, y: number, size = 5, c = '#644f3c') => {
    ctx.fillStyle = c;
    ctx.textAlign = 'center';
    ctx.font = `600 ${size}px sans-serif`;
    ctx.fillText(v, x, y);
  };
  return { box, outlined, label };
}

function pot(a: Ink, x: number, y: number, pink = false) {
  const { box: b, outlined: o } = a;
  o(x - 5, y - 6, 10, 7, '#bd8a68');
  b(x - 6, y - 7, 12, 2, '#deb68a');
  b(x - 1, y - 29, 2, 22, '#796348');
  [[-5, -18], [5, -23], [-2, -29], [7, -14], [-8, -12]].forEach(([dx, dy], i) => {
    b(x + dx - 4, y + dy - 3, 8, 6, i % 2 ? '#91a578' : '#778d64');
    const c = pink ? '#dc9aab' : '#e9c779';
    b(x + dx - 1, y + dy - 4, 2, 8, c);
    b(x + dx - 4, y + dy - 1, 8, 2, c);
    b(x + dx, y + dy, 1, 1, '#fff1bd');
  });
}

function lantern(a: Ink, x: number, y: number) {
  const { box: b, outlined: o } = a;
  b(x, y - 9, 1, 9, '#7c674c');
  o(x - 4, y, 9, 9, '#cc7963');
  b(x - 5, y + 2, 11, 5, '#dc9470');
  b(x - 2, y + 1, 2, 7, '#f1c690');
  b(x - 3, y + 9, 7, 1, '#95714b');
  b(x, y + 10, 1, 4, '#c29162');
}

function fence(a: Ink, y: number) {
  const { box: b } = a;
  b(0, y, 320, 2, '#bd9870');
  b(0, y + 12, 320, 2, '#997950');
  for (let x = 0; x < 320; x += 8) b(x, y, 2, 14, '#d7b88e');
}

function stall(a: Ink, x: number, name: string, color: string) {
  const { box: b, outlined: o, label: t } = a;
  b(x + 2, 105, 77, 4, '#86694c25');
  o(x + 2, 65, 2, 41, '#937052');
  o(x + 74, 65, 2, 41, '#937052');
  o(x, 54, 78, 8, color);
  for (let i = 0; i < 8; i++) b(x + i * 10, 62, 10, 5, i % 2 ? '#f1e1bd' : color);
  o(x + 12, 71, 54, 9, '#fff5dc');
  t(name, x + 39, 77, 5);
  o(x + 1, 89, 77, 5, '#bb9670');
  o(x + 4, 94, 70, 10, '#d2b08a');
  b(x + 8, 104, 3, 3, '#8c6a4b');
  b(x + 66, 104, 3, 3, '#8c6a4b');
  ['#739b91', '#d3a0a0', '#d4b777', '#8196ab'].forEach((c, i) => {
    o(x + 8 + i * 16, 82, 12, 7, c);
    b(x + 9 + i * 16, 83, 2, 6, '#ffffff45');
  });
}

function scene(kind: Scene): string {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(3, 3);
  ctx.imageSmoothingEnabled = false;
  const a = painter(ctx),
    { box: b, outlined: o, label: t } = a;
  b(0, 0, 320, 180, '#efe1c7');
  for (let y = 0; y < 180; y += 14) {
    for (let x = 0; x < 320; x += 24) {
      b(x + (y % 28 ? 12 : 0), y, 22, 12, (x + y) % 3 ? '#f3e6ce' : '#ecdbbb');
      b(x + (y % 28 ? 12 : 0), y + 12, 22, 1, '#ddc8a8');
    }
  }
  if (kind === 'room') {
    b(0, 0, 320, 79, '#f6ebd2');
    b(0, 55, 320, 24, '#a6b698');
    b(0, 76, 320, 3, '#789178');
    for (let x = 5; x < 320; x += 10) b(x, 57, 1, 18, '#8da78a');
    // Window, shelf and warm cloth details.
    o(220, 12, 62, 40, '#bc9877');
    b(223, 15, 56, 34, '#fff8da');
    b(249, 15, 3, 34, '#b69876');
    b(223, 31, 56, 2, '#b69876');
    b(215, 9, 12, 45, '#e2c9b8');
    b(279, 9, 9, 45, '#e2c9b8');
    b(223, 40, 23, 9, '#b9c7a0');
    b(253, 42, 24, 7, '#b9c7a0');
    o(27, 27, 53, 4, '#aa805b');
    pot(a, 39, 28);
    b(52, 16, 3, 10, '#7b9687');
    b(57, 17, 3, 9, '#c49685');
    // Wardrobe footprint: 330..595, top ..290 world pixels.
    o(111, 15, 85, 79, '#b98d65');
    b(114, 18, 79, 6, '#d4ad7f');
    o(116, 29, 34, 50, '#f0d9b6');
    o(156, 29, 34, 50, '#ecd1a7');
    b(147, 54, 2, 5, '#765a3e');
    b(157, 54, 2, 5, '#765a3e');
    o(118, 82, 69, 8, '#c79c70');
    b(147, 85, 10, 2, '#85674b');
    b(114, 94, 5, 4, '#85674b');
    b(187, 94, 5, 4, '#85674b');
    t('TỦ NHÀ MÌNH', 153, 24, 5, '#755638');
    // Mirror, desk, bed occupy actual collision zones.
    o(61, 52, 29, 49, '#b68c6e');
    b(64, 55, 23, 43, '#b8d5d0');
    b(67, 58, 3, 33, '#e4f0dc');
    pot(a, 47, 95);
    o(5, 103, 66, 8, '#b38963');
    o(9, 111, 58, 35, '#cdab84');
    o(22, 86, 25, 17, '#637779');
    b(25, 88, 19, 12, '#b1c7bd');
    b(18, 104, 34, 3, '#e4d7bd');
    o(54, 95, 9, 8, '#f9ecd1');
    b(56, 98, 5, 1, '#a88d6c');
    pot(a, 12, 104);
    o(53, 129, 22, 6, '#a98462');
    b(55, 135, 3, 27, '#a98462');
    b(70, 135, 3, 27, '#a98462');
    o(244, 96, 66, 80, '#ad8567');
    b(247, 102, 60, 70, '#e8d8b6');
    o(251, 103, 23, 12, '#f5ebce');
    o(280, 103, 23, 12, '#f5ebce');
    b(247, 119, 60, 46, '#8da990');
    b(247, 119, 60, 7, '#a8bea1');
    for (let y = 132; y < 160; y += 13)
      for (let x = 255; x < 303; x += 16) b(x, y, 5, 5, '#b2c49e');
    b(247, 165, 60, 4, '#dbc9a6');
    pot(a, 300, 89);
    // Small rug below the entry path, not a wall.
    b(105, 144, 96, 27, '#ead0b7');
    b(109, 147, 88, 21, '#f4e3c9');
    b(151, 151, 6, 12, '#c5ae8c');
    b(141, 155, 26, 4, '#c5ae8c');
  } else {
    b(0, 0, 320, 51, '#94a87d');
    b(0, 48, 320, 5, '#768d67');
    for (let x = 0; x < 320; x += 13) {
      b(x, 29 + (x % 3) * 3, 16, 18, '#829869');
      b(x + 4, 26, 9, 7, '#a7b68b');
    }
    if (kind === 'market') {
      // Spring market roof, lanterns, fabric and flower stalls.
      o(125, 14, 68, 37, '#bf9b76');
      b(119, 10, 80, 5, '#ad805b');
      b(116, 15, 86, 4, '#cc9e70');
      o(136, 26, 46, 15, '#fff1cb');
      t('CHỢ XUÂN', 159, 36, 8);
      stall(a, 28, 'GIAN HÀNG VẢI', '#8ea99c');
      stall(a, 212, 'GÓC DU XUÂN', '#caa098');
      [18, 52, 86, 113, 206, 239, 271, 302].forEach((x) => lantern(a, x, 45));
      pot(a, 15, 104, true);
      pot(a, 303, 104);
      pot(a, 128, 77);
      pot(a, 193, 77, true);
      fence(a, 173);
      pot(a, 24, 177);
      pot(a, 293, 177, true);
    } else {
      // School courtyard; yearbook uses photo props instead of stalls.
      o(56, 5, 209, 58, '#e1caae');
      b(59, 8, 203, 8, '#bc9677');
      for (let x = 68; x < 255; x += 30) {
        o(x, 23, 18, 23, '#9faeaa');
        b(x + 8, 24, 2, 21, '#e9dfc8');
      }
      o(145, 30, 32, 32, '#a7b8b0');
      b(144, 62, 36, 3, '#c4ad91');
      for (let x = 23; x < 309; x += 26) {
        b(x, 15, 14, 6, x % 3 ? '#e5bd98' : '#a3bdba');
      }
      if (kind === 'school') {
        stall(a, 28, 'CHUYỆN ÁO DÀI', '#a7b8a8');
        stall(a, 212, 'GÓC KỶ NIỆM', '#d0a7a8');
        [143, 160, 177].forEach((x, i) => {
          o(x, 76, 13, 4, '#b38d68');
          b(x + 6, 55, 1, 21, '#a08263');
          o(x + 1, 58, 11, 15, ['#6b9b94', '#ce9ba4', '#768d9b'][i]);
        });
      } else {
        o(24, 82, 74, 8, '#b8916d');
        b(29, 90, 3, 18, '#8e7052');
        b(88, 90, 3, 18, '#8e7052');
        t('CHUẨN BỊ', 61, 78, 6);
        [36, 53, 70].forEach((x, i) => o(x, 75, 13, 7, ['#789e98', '#d8b779', '#cc9da3'][i]));
        o(214, 61, 72, 40, '#e4ceb1');
        b(218, 65, 64, 32, '#f8ead0');
        t('KỶ YẾU', 250, 85, 10);
        o(237, 112, 16, 10, '#697c78');
        b(244, 122, 2, 17, '#735e4b');
        for (let i = 0; i < 10; i++) {
          b(244 - i, 134 + i, 2, 2, '#735e4b');
          b(245 + i, 134 + i, 2, 2, '#735e4b');
        }
      }
      pot(a, 15, 105, true);
      pot(a, 303, 106, true);
      fence(a, 173);
    }
    [[123, 124], [194, 130], [145, 163], [245, 148], [67, 149], [208, 163]].forEach(([x, y], i) =>
      b(x, y, 2, 1, i % 2 ? '#d7a5a4' : '#ddc194')
    );
  }
  return canvas.toDataURL('image/png');
}

function character(kind: Outfit, color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 144;
  const ctx = canvas.getContext('2d')!;
  const { box: b, outlined: o } = painter(ctx);
  const hair = '#34323d',
    skin = '#efd0b3',
    shade = '#dba98e';
  // Hair behind body; same face and anchor across all outfits.
  b(27, 15, 42, 8, hair);
  b(22, 23, 52, 44, hair);
  b(19, 38, 58, 47, hair);
  b(23, 78, 8, 19, hair);
  b(65, 78, 8, 19, hair);
  b(28, 33, 40, 27, skin);
  b(24, 37, 5, 15, skin);
  b(67, 37, 5, 15, skin);
  b(32, 28, 32, 7, skin);
  b(32, 58, 32, 7, skin);
  b(42, 64, 12, 8, skin);
  b(24, 24, 48, 10, hair);
  b(27, 32, 12, 7, hair);
  b(58, 32, 12, 6, hair);
  b(36, 30, 10, 5, hair);
  b(47, 31, 12, 3, hair);
  // Eyes with highlights, small coral cheeks and flower.
  b(33, 43, 9, 10, '#4d3d36');
  b(54, 43, 9, 10, '#4d3d36');
  b(34, 43, 3, 4, '#fff7e4');
  b(55, 43, 3, 4, '#fff7e4');
  b(30, 54, 7, 3, '#e4a18f');
  b(59, 54, 7, 3, '#e4a18f');
  b(44, 58, 8, 2, '#bd8270');
  b(46, 60, 4, 1, '#bd8270');
  b(67, 24, 4, 13, '#d99591');
  b(62, 28, 14, 4, '#d99591');
  b(67, 28, 4, 4, '#f0cf89');
  const modern = ['base', 'reporter', 'photographer'].includes(kind);
  o(31, 112, 13, 17, modern ? '#8395a2' : '#f4ead7');
  o(52, 112, 13, 17, modern ? '#8395a2' : '#f4ead7');
  o(29, 129, 17, 6, '#795d4c');
  o(50, 129, 17, 6, '#795d4c');
  b(30, 129, 14, 2, '#a17b5e');
  b(51, 129, 14, 2, '#a17b5e');
  // Sleeves and hands sit at identical coordinates.
  o(24, 73, 8, 31, color);
  o(64, 73, 8, 31, color);
  b(22, 99, 9, 7, skin);
  b(65, 99, 9, 7, skin);
  b(23, 105, 6, 2, shade);
  b(67, 105, 6, 2, shade);
  o(32, 71, 32, modern ? 39 : 54, color);
  b(35, 74, 4, modern ? 33 : 47, '#ffffff16');
  if (kind === 'tuthan') {
    o(29, 100, 38, 28, '#55515b');
    b(32, 100, 32, 3, '#8a7670');
    b(40, 72, 16, 28, '#ddb0a6');
    b(40, 75, 16, 3, '#edc4b1');
    b(32, 72, 7, 43, color);
    b(57, 72, 7, 43, color);
    b(36, 99, 24, 4, '#dec58d');
    b(44, 101, 4, 20, '#dec58d');
    b(53, 102, 4, 17, '#dec58d');
  } else if (kind === 'nguthan') {
    b(41, 68, 14, 6, color);
    b(44, 71, 8, 3, '#f3e3c7');
    [[54, 75], [59, 80], [60, 89], [60, 98], [60, 107]].forEach(([x, y]) => b(x, y, 2, 2, '#efddb2'));
    b(58, 81, 1, 33, '#514e5c35');
  } else if (kind === 'aodai') {
    b(42, 68, 12, 5, color);
    b(46, 113, 4, 12, '#f4ead7');
    b(34, 87, 28, 2, '#00000015');
  } else {
    b(40, 72, 16, 3, '#f0e2c9');
    b(33, 107, 30, 3, '#8c7c68');
    if (kind === 'reporter') {
      o(56, 87, 16, 19, '#ebd8b5');
      b(59, 91, 10, 1, '#a89071');
      b(59, 96, 8, 1, '#a89071');
    }
    if (kind === 'photographer') {
      b(41, 75, 2, 17, '#6c6053');
      o(37, 91, 22, 13, '#53696a');
      o(44, 94, 8, 7, '#a4b7ae');
    }
  }
  return canvas.toDataURL('image/png');
}

let cache: Record<string, string> | undefined;
export function createVisualAssets(): Record<string, string> {
  if (cache) return cache;
  cache = {
    'bg_room_original.png': scene('room'),
    'Gemini_Generated_Image_4q18ep4q18ep4q18.png': scene('room'),
    'bg_ngayhoitruong.png': scene('school'),
    'bg_choxuan.png': scene('market'),
    'bg_kyyeu.png': scene('yearbook'),
    'Nhân vật pixel chính diện toàn thân.png': character('base', '#e5d6bc'),
    'Nhân vật pixel áo dài xanh ngọc-3.png': character('aodai', '#699f9b'),
    'aodai_look2.png': character('aodai', '#cf9baa'),
    'Nhân vật pixel áo tứ thân chính diện-1.png': character('tuthan', '#9a765d'),
    'tuthan_look2.png': character('tuthan', '#829578'),
    'Nhân vật pixel áo ngũ thân-2.png': character('nguthan', '#687f91'),
    'nguthan_look2.png': character('nguthan', '#cdb177'),
    'npc_truyenthong.png': character('reporter', '#94ad9a'),
    'npc_thoanh.png': character('photographer', '#c1a890'),
  };
  return cache;
}

function minigame(kind: 'sketch' | 'seam' | 'collars'): string {
  const canvas = document.createElement('canvas');
  canvas.width = kind === 'collars' ? 900 : 600;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const { box: b, outlined: o, label: t } = painter(ctx);
  if (kind === 'seam') {
    for (let i = 0; i < 10; i++) b(24 + i * 6, 24 + i * 6, 5, 5, '#628e87');
  } else {
    b(0, 0, canvas.width, 600, '#fbf1dc');
    b(12, 12, canvas.width - 24, 4, '#d7bd98');
    b(12, 584, canvas.width - 24, 4, '#d7bd98');
    const robe = (x: number, c: string, collar: number) => {
      o(x - 55, 172, 110, 290, c);
      o(x - 83, 183, 27, 160, c);
      o(x + 56, 183, 27, 160, c);
      b(x - 57, 440, 114, 4, '#ffffff22');
      if (collar === 0) {
        o(x - 18, 156, 36, 22, c);
        b(x - 10, 159, 20, 6, '#ebd9b9');
      }
      if (collar === 1) {
        b(x - 31, 172, 62, 10, '#ebd9b9');
        b(x - 25, 182, 50, 6, '#ebd9b9');
      }
      if (collar === 2) {
        for (let i = 0; i < 7; i++) b(x - 21 + i * 3, 172 + i * 3, 42 - i * 6, 3, '#ebd9b9');
      }
      b(x - 3, 414, 6, 48, '#eadcbe');
      o(x - 68, 465, 136, 17, '#bba17b');
    };
    if (kind === 'sketch') {
      t('PHOM ÁO MINH HỌA', 300, 75, 21);
      robe(300, '#9cbbb1', 0);
      for (let i = 0; i < 8; i++) b(300 + i * 7, 170 + i * 7, 5, 5, '#6c8e81');
      t('Quan sát và thử ghép theo mẫu', 300, 548, 17);
    } else {
      t('GÓC TRƯNG BÀY CỔ ÁO', 450, 75, 22);
      robe(150, '#9fbdb2', 0);
      robe(450, '#d4aab2', 1);
      robe(750, '#b1b5cc', 2);
      [150, 450, 750].forEach((x, i) => t(String(i + 1), x, 531, 20));
    }
  }
  return canvas.toDataURL('image/png');
}

export function createCompleteVisualAssets(): Record<string, string> {
  const assets = createVisualAssets();
  if (!assets['mg1_sketch.png']) {
    assets['mg1_sketch.png'] = minigame('sketch');
    assets['mg1_line.png'] = minigame('seam');
    assets['mg2_mannequins.png'] = minigame('collars');
  }
  return assets;
}
