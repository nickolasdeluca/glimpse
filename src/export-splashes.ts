import JSZip from "jszip";
import { ANDROID_SAFE_RATIO, canvasToBlob, createArtworkCanvas } from "./render";
import {
  androidColorsXml,
  androidThemesXml,
  iosArtworkContents,
  iosColorContents,
  launchScreenStoryboard,
  packageReadme
} from "./templates";
import type { ArtworkAsset, ArtworkVariants, EditorState } from "./types";

const androidDensities = [
  { name: "mdpi", ratio: 1 },
  { name: "hdpi", ratio: 1.5 },
  { name: "xhdpi", ratio: 2 },
  { name: "xxhdpi", ratio: 3 },
  { name: "xxxhdpi", ratio: 4 }
] as const;

export async function exportSplashPackage(editor: EditorState, artwork: ArtworkVariants) {
  const zip = new JSZip();
  const root = zip.folder("Glimpse-Assets")!;

  if (editor.exportTarget === "ios" || editor.exportTarget === "both") {
    await addIosAssets(root, editor, artwork);
  }

  if (editor.exportTarget === "android" || editor.exportTarget === "both") {
    await addAndroidAssets(root, editor, artwork);
  }

  root.file("README.txt", packageReadme(editor.exportTarget));

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

async function addIosAssets(root: JSZip, editor: EditorState, artwork: ArtworkVariants) {
  const assetCatalog = root.folder("ios/Assets.xcassets")!;
  const artworkSet = assetCatalog.folder("SplashArtwork.imageset")!;
  const colorSet = assetCatalog.folder("SplashBackground.colorset")!;
  const scales = [1, 2, 3] as const;

  for (const scale of scales) {
    const filename = scale === 1 ? "SplashArtwork.png" : `SplashArtwork@${scale}x.png`;
    artworkSet.file(
      filename,
      await canvasToBlob(
        createArtworkCanvas(200 * scale, artwork.light, editor.artworkSettings.ios, 1)
      )
    );
  }

  const darkArtwork = editor.darkModeEnabled ? artwork.dark : null;
  if (darkArtwork) {
    for (const scale of scales) {
      const filename = scale === 1 ? "SplashArtworkDark.png" : `SplashArtworkDark@${scale}x.png`;
      artworkSet.file(
        filename,
        await canvasToBlob(
          createArtworkCanvas(200 * scale, darkArtwork, editor.artworkSettings.ios, 1)
        )
      );
    }
  }

  artworkSet.file("Contents.json", iosArtworkContents(Boolean(darkArtwork)));
  colorSet.file(
    "Contents.json",
    iosColorContents(
      editor.backgroundLight,
      editor.darkModeEnabled ? editor.backgroundDark : undefined
    )
  );
  root.file("ios/LaunchScreen.storyboard", launchScreenStoryboard(editor.backgroundLight));
}

async function addAndroidAssets(root: JSZip, editor: EditorState, artwork: ArtworkVariants) {
  const res = root.folder("android/app/src/main/res")!;

  await addAndroidArtwork(res, "drawable", artwork.light, editor);
  if (editor.darkModeEnabled && artwork.dark) {
    await addAndroidArtwork(res, "drawable-night", artwork.dark, editor);
  }

  res.folder("values")!.file("glimpse_splash_colors.xml", androidColorsXml(editor.backgroundLight));
  if (editor.darkModeEnabled) {
    res
      .folder("values-night")!
      .file("glimpse_splash_colors.xml", androidColorsXml(editor.backgroundDark));
  }
  res.folder("values")!.file("glimpse_splash_themes.xml", androidThemesXml());
}

async function addAndroidArtwork(
  res: JSZip,
  folderPrefix: "drawable" | "drawable-night",
  artwork: ArtworkAsset,
  editor: EditorState
) {
  for (const density of androidDensities) {
    const size = Math.round(288 * density.ratio);
    const folder = res.folder(`${folderPrefix}-${density.name}`)!;
    folder.file(
      "glimpse_splash_artwork.png",
      await canvasToBlob(
        createArtworkCanvas(
          size,
          artwork,
          editor.artworkSettings.android,
          ANDROID_SAFE_RATIO
        )
      )
    );
  }
}

export const outputSummary = {
  ios: "3–6 PNGs + metadata + storyboard",
  android: "5–10 density PNGs + themes"
};
