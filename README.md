# Glimpse

Glimpse is a focused splash-art generator for iOS, iPadOS, and Android. Add one artwork file, place it on an opaque background color, preview the native platform treatment, and export project-ready resources.

Everything runs locally in the browser. Artwork is never uploaded.

## Current capabilities

- PNG, JPG, WebP, and SVG artwork import by picker, drag and drop, or paste.
- Live iOS and Android phone previews plus adaptive tablet thumbnails.
- Direct drag positioning and scroll or pinch scaling.
- Scale, offset, rotation, flipping, fit mode, opacity, and transparent-margin trimming.
- Rounded artwork clipping, tint, brightness, contrast, saturation, shadow, glow, and outline controls.
- Linked settings by default with optional independent iOS and Android adjustments.
- Undo, redo, reset, and before/after comparison.
- Native light and dark appearance colors with optional alternate dark artwork.
- Background color presets and platform-safe default placement.
- Optional Android 192 dp safe-area overlay.
- Xcode-ready artwork and color asset sets with an adaptive `LaunchScreen.storyboard`.
- Android density artwork from mdpi through xxxhdpi plus `Theme.SplashScreen` resources.
- Selective iOS, Android, or combined ZIP exports with every adjustment baked into each density.

## Platform model

Glimpse generates native layout resources instead of fixed full-screen screenshots. That keeps one design adaptive across phone and tablet sizes, resolutions, and orientations.

### iOS and iPadOS

The export contains:

- `SplashArtwork.imageset` at 1x, 2x, and 3x.
- `SplashBackground.colorset` using the selected sRGB color.
- `LaunchScreen.storyboard` with centered, aspect-fit artwork.

Apple treats a launch screen as a short-lived placeholder for the first app screen, not advertising. The exported color and artwork should therefore match fixed elements in the app's first rendered screen. See [Apple's launch-screen guidance](https://developer.apple.com/design/human-interface-guidelines/launching) and [Xcode configuration documentation](https://developer.apple.com/documentation/xcode/specifying-your-apps-launch-screen).

### Android

The export uses the Android SplashScreen model introduced in Android 12 and supported back to API 23 by AndroidX Core SplashScreen. It contains:

- A 288 dp transparent icon canvas for all five density buckets.
- Artwork constrained to a square inscribed in the official 192 dp visible circle, preventing corner clipping for arbitrary artwork.
- An opaque background color resource.
- A starter `Theme.App.Starting` theme referencing the generated assets.

The consuming app still needs to apply the starting theme and call `installSplashScreen()` before `super.onCreate()`. See the [Android SplashScreen documentation](https://developer.android.com/develop/ui/views/launch/splash-screen).

## Development

```sh
bun install
bun run dev
```

Build and test with:

```sh
bun run build
bun test
```
