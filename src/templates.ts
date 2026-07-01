import { assetCatalogComponents } from "./color";
import type { ExportTarget } from "./types";

export function iosArtworkContents(includeDark = false) {
  const images: Array<Record<string, unknown>> = [
    { filename: "SplashArtwork.png", idiom: "universal", scale: "1x" },
    { filename: "SplashArtwork@2x.png", idiom: "universal", scale: "2x" },
    { filename: "SplashArtwork@3x.png", idiom: "universal", scale: "3x" }
  ];

  if (includeDark) {
    for (const scale of [1, 2, 3]) {
      images.push({
        appearances: [{ appearance: "luminosity", value: "dark" }],
        filename: scale === 1 ? "SplashArtworkDark.png" : `SplashArtworkDark@${scale}x.png`,
        idiom: "universal",
        scale: `${scale}x`
      });
    }
  }

  return JSON.stringify(
    {
      images,
      info: { author: "glimpse", version: 1 }
    },
    null,
    2
  );
}

export function iosColorContents(backgroundColor: string, darkBackgroundColor?: string) {
  const colors: Array<Record<string, unknown>> = [
    {
      color: {
        "color-space": "srgb",
        components: assetCatalogComponents(backgroundColor)
      },
      idiom: "universal"
    }
  ];

  if (darkBackgroundColor) {
    colors.push({
      appearances: [{ appearance: "luminosity", value: "dark" }],
      color: {
        "color-space": "srgb",
        components: assetCatalogComponents(darkBackgroundColor)
      },
      idiom: "universal"
    });
  }

  return JSON.stringify(
    {
      colors,
      info: { author: "glimpse", version: 1 }
    },
    null,
    2
  );
}

export function launchScreenStoryboard(backgroundColor: string) {
  const color = assetCatalogComponents(backgroundColor);
  return `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="23094" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="GLM-view-controller">
    <device id="retina6_12" orientation="portrait" appearance="light"/>
    <dependencies>
        <deployment identifier="iOS"/>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="23084"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
        <capability name="Named colors" minToolsVersion="9.0"/>
        <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
    </dependencies>
    <scenes>
        <scene sceneID="GLM-scene">
            <objects>
                <viewController id="GLM-view-controller" sceneMemberID="viewController">
                    <view key="view" contentMode="scaleToFill" id="GLM-root-view">
                        <rect key="frame" x="0.0" y="0.0" width="393" height="852"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <subviews>
                            <imageView clipsSubviews="YES" userInteractionEnabled="NO" contentMode="scaleAspectFit" image="SplashArtwork" translatesAutoresizingMaskIntoConstraints="NO" id="GLM-artwork">
                                <rect key="frame" x="96.5" y="326" width="200" height="200"/>
                                <constraints>
                                    <constraint firstAttribute="width" constant="200" id="GLM-artwork-width"/>
                                    <constraint firstAttribute="height" constant="200" id="GLM-artwork-height"/>
                                </constraints>
                            </imageView>
                        </subviews>
                        <viewLayoutGuide key="safeArea" id="GLM-safe-area"/>
                        <color key="backgroundColor" name="SplashBackground"/>
                        <constraints>
                            <constraint firstItem="GLM-artwork" firstAttribute="centerX" secondItem="GLM-root-view" secondAttribute="centerX" id="GLM-center-x"/>
                            <constraint firstItem="GLM-artwork" firstAttribute="centerY" secondItem="GLM-root-view" secondAttribute="centerY" id="GLM-center-y"/>
                        </constraints>
                    </view>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="GLM-first-responder" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
            <point key="canvasLocation" x="53" y="375"/>
        </scene>
    </scenes>
    <resources>
        <image name="SplashArtwork" width="200" height="200"/>
        <namedColor name="SplashBackground">
            <color red="${color.red}" green="${color.green}" blue="${color.blue}" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>
        </namedColor>
    </resources>
</document>
`;
}

export function androidColorsXml(backgroundColor: string) {
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="glimpse_splash_background">${backgroundColor.toUpperCase()}</color>
</resources>
`;
}

export function androidThemesXml() {
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Rename Theme.App below if your application theme uses a different name. -->
    <style name="Theme.App.Starting" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">@color/glimpse_splash_background</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/glimpse_splash_artwork</item>
        <item name="postSplashScreenTheme">@style/Theme.App</item>
    </style>
</resources>
`;
}

export function packageReadme(target: ExportTarget) {
  const sections = [
    "GLIMPSE SPLASH ART EXPORT",
    "==========================",
    "",
    "The artwork stays on your device. Glimpse generated these files locally in your browser.",
    ""
  ];

  if (target === "ios" || target === "both") {
    sections.push(
      "iOS / iPadOS",
      "1. Copy SplashArtwork.imageset and SplashBackground.colorset into Assets.xcassets.",
      "2. Add LaunchScreen.storyboard to the app target.",
      "3. Set Launch Screen File (UILaunchStoryboardName) to LaunchScreen.",
      "4. Keep the first app screen background aligned with SplashBackground for a seamless transition.",
      ""
    );
  }

  if (target === "android" || target === "both") {
    sections.push(
      "Android",
      "1. Merge android/app/src/main/res into your app module's res directory.",
      "2. Add androidx.core:core-splashscreen:1.0.0 or newer to the app dependencies.",
      "3. Rename Theme.App in values/glimpse_splash_themes.xml if your post-splash theme differs.",
      "4. Apply @style/Theme.App.Starting to your application or launch activity in AndroidManifest.xml.",
      "5. Call installSplashScreen() before super.onCreate() in the launch activity.",
      ""
    );
  }

  sections.push(
    "Artwork transformations and effects are baked into the exported PNGs.",
    "When enabled, dark appearance colors and alternate artwork are included as native variants.",
    "The Android assets use the official 288 dp canvas and keep default artwork inside the 192 dp safe circle.",
    "Generated by Glimpse."
  );
  return sections.join("\n");
}
