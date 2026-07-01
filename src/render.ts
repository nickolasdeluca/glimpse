import type { ArtworkAsset, ArtworkSettings, NormalizedRect } from "./types";

// A square inscribed in Android's 192 dp visible circle on a 288 dp icon canvas.
// Keeping arbitrary rectangular artwork inside this square prevents corner clipping.
export const ANDROID_SAFE_RATIO = Math.SQRT2 / 3;

interface ArtworkGeometry {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  width: number;
  height: number;
}

export function getArtworkGeometry(
  imageWidth: number,
  imageHeight: number,
  trimRect: NormalizedRect,
  settings: ArtworkSettings,
  size: number,
  safeRatio: number
): ArtworkGeometry {
  const source = settings.autoTrim ? trimRect : { x: 0, y: 0, width: 1, height: 1 };
  let sourceX = source.x * imageWidth;
  let sourceY = source.y * imageHeight;
  let sourceWidth = source.width * imageWidth;
  let sourceHeight = source.height * imageHeight;
  const maxDimension = size * safeRatio * (settings.scale / 100);
  const aspect = sourceWidth / sourceHeight;
  let width = aspect >= 1 ? maxDimension : maxDimension * aspect;
  let height = aspect >= 1 ? maxDimension / aspect : maxDimension;

  if (settings.fitMode === "cover") {
    if (aspect > 1) {
      const crop = sourceWidth - sourceHeight;
      sourceX += crop / 2;
      sourceWidth = sourceHeight;
    } else {
      const crop = sourceHeight - sourceWidth;
      sourceY += crop / 2;
      sourceHeight = sourceWidth;
    }
    width = maxDimension;
    height = maxDimension;
  } else if (settings.fitMode === "stretch") {
    width = maxDimension;
    height = maxDimension;
  }

  return { sourceX, sourceY, sourceWidth, sourceHeight, width, height };
}

export function createArtworkCanvas(
  size: number,
  artwork: ArtworkAsset,
  settings: ArtworkSettings,
  safeRatio = ANDROID_SAFE_RATIO
) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  renderArtwork(canvas, artwork, settings, safeRatio);
  return canvas;
}

export function renderArtwork(
  canvas: HTMLCanvasElement,
  artwork: ArtworkAsset,
  settings: ArtworkSettings,
  safeRatio = ANDROID_SAFE_RATIO
) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is not available in this browser.");

  const size = canvas.width;
  const layer = document.createElement("canvas");
  layer.width = size;
  layer.height = size;
  const layerContext = layer.getContext("2d");
  if (!layerContext) throw new Error("Canvas rendering is not available in this browser.");

  drawArtworkLayer(layerContext, size, artwork, settings, safeRatio);
  context.clearRect(0, 0, size, size);

  if (settings.glow > 0) {
    context.drawImage(
      createShadowLayer(layer, settings.tintColor, size * (settings.glow / 100) * 0.18, 0),
      0,
      0
    );
  }

  if (settings.shadow > 0) {
    context.drawImage(
      createShadowLayer(
        layer,
        "rgba(0, 0, 0, 0.62)",
        size * (settings.shadow / 100) * 0.16,
        size * (settings.shadow / 100) * 0.055
      ),
      0,
      0
    );
  }

  context.drawImage(layer, 0, 0);
}

function drawArtworkLayer(
  context: CanvasRenderingContext2D,
  size: number,
  artwork: ArtworkAsset,
  settings: ArtworkSettings,
  safeRatio: number
) {
  const geometry = getArtworkGeometry(
    artwork.image.naturalWidth,
    artwork.image.naturalHeight,
    artwork.trimRect,
    settings,
    size,
    safeRatio
  );
  const x = -geometry.width / 2;
  const y = -geometry.height / 2;
  const radius = Math.min(geometry.width, geometry.height) * (settings.borderRadius / 100);

  context.save();
  context.translate(
    size / 2 + (settings.offsetX / 100) * size,
    size / 2 + (settings.offsetY / 100) * size
  );
  context.rotate((settings.rotation * Math.PI) / 180);
  context.scale(settings.flipX ? -1 : 1, settings.flipY ? -1 : 1);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.save();
  roundedRectPath(context, x, y, geometry.width, geometry.height, radius);
  context.clip();
  context.globalAlpha = settings.opacity / 100;
  context.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`;
  context.drawImage(
    artwork.image,
    geometry.sourceX,
    geometry.sourceY,
    geometry.sourceWidth,
    geometry.sourceHeight,
    x,
    y,
    geometry.width,
    geometry.height
  );

  if (settings.tintAmount > 0) {
    context.filter = "none";
    context.globalCompositeOperation = "source-atop";
    context.globalAlpha = settings.tintAmount / 100;
    context.fillStyle = settings.tintColor;
    context.fillRect(x, y, geometry.width, geometry.height);
  }
  context.restore();

  if (settings.outline > 0) {
    context.globalAlpha = settings.opacity / 100;
    context.strokeStyle = settings.outlineColor;
    context.lineWidth = size * (settings.outline / 100);
    roundedRectPath(context, x, y, geometry.width, geometry.height, radius);
    context.stroke();
  }

  context.restore();
}

function createShadowLayer(
  source: HTMLCanvasElement,
  color: string,
  blur: number,
  offsetY: number
) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d")!;
  context.shadowColor = color;
  context.shadowBlur = blur;
  context.shadowOffsetY = offsetY;
  context.drawImage(source, 0, 0);
  context.globalCompositeOperation = "destination-out";
  context.shadowColor = "transparent";
  context.drawImage(source, 0, 0);
  return canvas;
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

export function computeTrimRect(image: HTMLImageElement): NormalizedRect {
  const maxDimension = 512;
  const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { x: 0, y: 0, width: 1, height: 1 };
  context.drawImage(image, 0, 0, width, height);

  const pixels = context.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] > 4) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) return { x: 0, y: 0, width: 1, height: 1 };
  return {
    x: minX / width,
    y: minY / height,
    width: (maxX - minX + 1) / width,
    height: (maxY - minY + 1) / height
  };
}

export function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The browser could not encode the splash artwork as PNG."));
    }, "image/png");
  });
}
