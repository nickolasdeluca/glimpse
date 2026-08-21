export type ExportTarget = "ios" | "android" | "both";
export type PreviewPlatform = "ios" | "android";
export type PreviewAppearance = "light" | "dark";
export type FitMode = "contain" | "cover" | "stretch";

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Colors that can differ between light and dark appearance. Everything else
// (placement, scale, effect strength) stays shared so one design stays coherent.
export interface AppearanceColors {
  tintColor: string;
  tintAmount: number;
  outlineColor: string;
}

export interface ArtworkSettings {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  opacity: number;
  fitMode: FitMode;
  autoTrim: boolean;
  borderRadius: number;
  tintColor: string;
  tintAmount: number;
  brightness: number;
  contrast: number;
  saturation: number;
  shadow: number;
  glow: number;
  outline: number;
  outlineColor: string;
  darkColorsEnabled: boolean;
  darkColors: AppearanceColors;
}

export interface EditorState {
  backgroundLight: string;
  backgroundDark: string;
  darkModeEnabled: boolean;
  previewAppearance: PreviewAppearance;
  artworkSettings: Record<PreviewPlatform, ArtworkSettings>;
  platformOverrides: boolean;
  exportTarget: ExportTarget;
  previewPlatform: PreviewPlatform;
  showSafeZone: boolean;
}

export interface ArtworkAsset {
  image: HTMLImageElement;
  name: string;
  url: string;
  trimRect: NormalizedRect;
}

export interface ArtworkVariants {
  light: ArtworkAsset;
  dark?: ArtworkAsset | null;
}

export const defaultArtworkSettings: ArtworkSettings = {
  scale: 82,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  flipX: false,
  flipY: false,
  opacity: 100,
  fitMode: "contain",
  autoTrim: true,
  borderRadius: 0,
  tintColor: "#FFFFFF",
  tintAmount: 0,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  shadow: 0,
  glow: 0,
  outline: 0,
  outlineColor: "#FFFFFF",
  darkColorsEnabled: false,
  darkColors: {
    tintColor: "#FFFFFF",
    tintAmount: 0,
    outlineColor: "#FFFFFF"
  }
};

export function createDefaultEditor(): EditorState {
  return {
    backgroundLight: "#315DE8",
    backgroundDark: "#101933",
    darkModeEnabled: false,
    previewAppearance: "light",
    artworkSettings: {
      ios: { ...defaultArtworkSettings },
      android: { ...defaultArtworkSettings }
    },
    platformOverrides: false,
    exportTarget: "both",
    previewPlatform: "ios",
    showSafeZone: true
  };
}

export const defaultEditor = createDefaultEditor();

// Dark appearance reuses every placement value and swaps only the color group.
export function resolveArtworkSettings(
  settings: ArtworkSettings,
  appearance: PreviewAppearance,
  darkModeEnabled: boolean
): ArtworkSettings {
  if (appearance !== "dark" || !darkModeEnabled || !settings.darkColorsEnabled) return settings;
  return { ...settings, ...settings.darkColors };
}

// A dark artwork variant is exported when the user supplied dedicated dark
// artwork or asked for dark-only colors, which recolor the light artwork.
export function needsDarkArtwork(
  editor: EditorState,
  platform: PreviewPlatform,
  hasDarkAsset: boolean
) {
  if (!editor.darkModeEnabled) return false;
  return hasDarkAsset || editor.artworkSettings[platform].darkColorsEnabled;
}

export function getActiveBackground(editor: EditorState) {
  return editor.previewAppearance === "dark" && editor.darkModeEnabled
    ? editor.backgroundDark
    : editor.backgroundLight;
}
