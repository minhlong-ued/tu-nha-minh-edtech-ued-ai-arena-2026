/**
 * Helper to compute the non-transparent bounding box of a sprite image
 * so transparent margins are discarded, allowing accurate scaling and feet anchoring.
 */

export interface SpriteBounds {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

const boundsCache = new Map<HTMLImageElement, SpriteBounds>();

export function getSpriteBounds(img: HTMLImageElement): SpriteBounds {
  if (boundsCache.has(img)) {
    return boundsCache.get(img)!;
  }

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  if (!w || !h) {
    return { cropX: 0, cropY: 0, cropW: 1, cropH: 1 };
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const def = { cropX: 0, cropY: 0, cropW: w, cropH: h };
      boundsCache.set(img, def);
      return def;
    }

    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h).data;

    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let hasOpaque = false;

    // Sample pixels
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = imgData[(y * w + x) * 4 + 3];
        if (alpha > 15) {
          hasOpaque = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!hasOpaque) {
      const def = { cropX: 0, cropY: 0, cropW: w, cropH: h };
      boundsCache.set(img, def);
      return def;
    }

    const bounds: SpriteBounds = {
      cropX: minX,
      cropY: minY,
      cropW: Math.max(1, maxX - minX + 1),
      cropH: Math.max(1, maxY - minY + 1),
    };
    boundsCache.set(img, bounds);
    return bounds;
  } catch (e) {
    console.warn('Unable to compute sprite bounds (possibly cross-origin):', e);
    const def = { cropX: 0, cropY: 0, cropW: w, cropH: h };
    boundsCache.set(img, def);
    return def;
  }
}
