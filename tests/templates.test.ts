import { describe, expect, test } from "bun:test";
import { assetCatalogComponents, hexToRgb } from "../src/color";
import {
  androidColorsXml,
  androidThemesXml,
  iosArtworkContents,
  iosColorContents,
  launchScreenStoryboard,
  packageReadme
} from "../src/templates";
import { ANDROID_SAFE_RATIO, getArtworkGeometry } from "../src/render";
import {
  createDefaultEditor,
  defaultArtworkSettings,
  needsDarkArtwork,
  resolveArtworkSettings
} from "../src/types";

describe("color conversion", () => {
  test("converts hex colors for native exports", () => {
    expect(hexToRgb("#315DE8")).toEqual({ red: 49, green: 93, blue: 232 });
    expect(assetCatalogComponents("#FFFFFF")).toEqual({
      red: "1.000",
      green: "1.000",
      blue: "1.000",
      alpha: "1.000"
    });
  });

  test("rejects malformed colors", () => {
    expect(() => hexToRgb("#fff")).toThrow("Invalid six-digit hex color");
  });
});

describe("native resource templates", () => {
  test("inscribes arbitrary artwork inside Android's visible circle", () => {
    const artworkSquare = 288 * ANDROID_SAFE_RATIO;
    expect(artworkSquare * Math.SQRT2).toBeCloseTo(192, 8);
  });

  test("trims and contains artwork without changing its aspect ratio", () => {
    const geometry = getArtworkGeometry(
      1000,
      500,
      { x: 0.1, y: 0.2, width: 0.8, height: 0.6 },
      { ...defaultArtworkSettings, scale: 100 },
      288,
      ANDROID_SAFE_RATIO
    );

    expect(geometry.sourceX).toBe(100);
    expect(geometry.sourceY).toBe(100);
    expect(geometry.sourceWidth).toBe(800);
    expect(geometry.sourceHeight).toBe(300);
    expect(geometry.width / geometry.height).toBeCloseTo(800 / 300, 8);
  });

  test("uses the selected color in every iOS representation", () => {
    const contents = JSON.parse(iosColorContents("#315DE8"));
    expect(contents.colors[0].color.components).toEqual({
      red: "0.192",
      green: "0.365",
      blue: "0.910",
      alpha: "1.000"
    });

    const storyboard = launchScreenStoryboard("#315DE8");
    expect(storyboard).toContain('image="SplashArtwork"');
    expect(storyboard).toContain('name="SplashBackground"');
    expect(storyboard).toContain('red="0.192" green="0.365" blue="0.910"');
  });

  test("adds native dark appearance metadata when requested", () => {
    const colors = JSON.parse(iosColorContents("#FFFFFF", "#000000"));
    const images = JSON.parse(iosArtworkContents(true));
    expect(colors.colors[1].appearances[0]).toEqual({ appearance: "luminosity", value: "dark" });
    expect(images.images).toHaveLength(6);
    expect(images.images[3].filename).toBe("SplashArtworkDark.png");
  });

  test("generates Android SplashScreen theme resources", () => {
    expect(androidColorsXml("#315de8")).toContain("#315DE8");
    expect(androidThemesXml()).toContain('parent="Theme.SplashScreen"');
    expect(androidThemesXml()).toContain("windowSplashScreenAnimatedIcon");
    expect(androidThemesXml()).toContain("postSplashScreenTheme");
  });

  test("documents only selected targets", () => {
    expect(packageReadme("ios")).toContain("iOS / iPadOS");
    expect(packageReadme("ios")).not.toContain("Android\n");
    expect(packageReadme("android")).toContain("Android\n");
    expect(packageReadme("android")).not.toContain("iOS / iPadOS");
  });
});

describe("appearance colors", () => {
  const darkColors = { tintColor: "#FFFFFF", tintAmount: 100, outlineColor: "#0A0A0A" };

  test("keeps light colors when dark overrides are off", () => {
    const settings = { ...defaultArtworkSettings, tintColor: "#111111", darkColors };
    expect(resolveArtworkSettings(settings, "dark", true)).toBe(settings);
  });

  test("swaps only the color group for the dark appearance", () => {
    const settings = {
      ...defaultArtworkSettings,
      tintColor: "#111111",
      tintAmount: 100,
      scale: 64,
      darkColorsEnabled: true,
      darkColors
    };

    expect(resolveArtworkSettings(settings, "light", true).tintColor).toBe("#111111");

    const dark = resolveArtworkSettings(settings, "dark", true);
    expect(dark.tintColor).toBe("#FFFFFF");
    expect(dark.outlineColor).toBe("#0A0A0A");
    expect(dark.scale).toBe(64);
  });

  test("ignores dark overrides while dark appearance is disabled", () => {
    const settings = { ...defaultArtworkSettings, darkColorsEnabled: true, darkColors };
    expect(resolveArtworkSettings(settings, "dark", false).tintColor).toBe(
      defaultArtworkSettings.tintColor
    );
  });

  test("exports a dark artwork variant for dark-only colors without dark artwork", () => {
    const editor = createDefaultEditor();
    expect(needsDarkArtwork(editor, "ios", false)).toBe(false);

    editor.darkModeEnabled = true;
    expect(needsDarkArtwork(editor, "ios", false)).toBe(false);
    expect(needsDarkArtwork(editor, "ios", true)).toBe(true);

    editor.artworkSettings.ios = { ...editor.artworkSettings.ios, darkColorsEnabled: true };
    expect(needsDarkArtwork(editor, "ios", false)).toBe(true);
    expect(needsDarkArtwork(editor, "android", false)).toBe(false);

    editor.darkModeEnabled = false;
    expect(needsDarkArtwork(editor, "ios", true)).toBe(false);
  });
});
