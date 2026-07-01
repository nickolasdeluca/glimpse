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
  outlineColor: "#FFFFFF"
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

export function getActiveBackground(editor: EditorState) {
  return editor.previewAppearance === "dark" && editor.darkModeEnabled
    ? editor.backgroundDark
    : editor.backgroundLight;
}
