import type { SpriteBounds } from '../utils/imageBounds';

export type SceneActor = {
  image: HTMLImageElement;
  bounds: SpriteBounds;
  feetX: number;
  feetY: number;
  height: number;
  moving?: boolean;
  phase?: number;
};

// One ground anchor for every outfit. Sorting uses feet, not image edges.
export function drawSceneActors(
  ctx: CanvasRenderingContext2D,
  actors: SceneActor[],
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const actor of [...actors].sort((a, b) => a.feetY - b.feetY)) {
    const { image, bounds: b, feetX, feetY, height } = actor;
    if (!image.complete || !image.naturalWidth || b.cropH <= 0) continue;
    const width = (b.cropW / b.cropH) * height;
    const bob = actor.moving ? Math.sin(actor.phase ?? 0) * 0.9 : 0;
    ctx.fillStyle = 'rgba(61, 43, 30, 0.18)';
    ctx.beginPath();
    ctx.ellipse(feetX, feetY - 1, Math.min(17, width * 0.24), 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(
      image,
      b.cropX,
      b.cropY,
      b.cropW,
      b.cropH,
      Math.round(feetX - width / 2),
      Math.round(feetY - height + bob),
      Math.round(width),
      height,
    );
  }
  ctx.restore();
}

export function drawSceneBackground(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  // Contain the complete composition; never stretch or crop the original.
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#ead9bd';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
  ctx.restore();
}
