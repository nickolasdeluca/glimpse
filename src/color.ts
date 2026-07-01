export interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

export function hexToRgb(hex: string): RgbColor {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[\da-f]{6}$/i.test(normalized)) {
    throw new Error(`Invalid six-digit hex color: ${hex}`);
  }

  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

export function assetCatalogComponents(hex: string) {
  const color = hexToRgb(hex);
  return {
    red: (color.red / 255).toFixed(3),
    green: (color.green / 255).toFixed(3),
    blue: (color.blue / 255).toFixed(3),
    alpha: "1.000"
  };
}
