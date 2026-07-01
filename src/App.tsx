import {
  Check,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FlipHorizontal2,
  FlipVertical2,
  Image as ImageIcon,
  Layers3,
  Link2,
  LoaderCircle,
  Palette,
  Redo2,
  RotateCcw,
  Scan,
  ShieldCheck,
  Sparkles,
  Undo2,
  Unlink2,
  Upload,
  WandSparkles,
  X
} from "lucide-react";
import {
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { exportSplashPackage, outputSummary } from "./export-splashes";
import { ANDROID_SAFE_RATIO, computeTrimRect, renderArtwork } from "./render";
import {
  createDefaultEditor,
  defaultArtworkSettings,
  getActiveBackground,
  type ArtworkAsset,
  type ArtworkSettings,
  type EditorState,
  type ExportTarget,
  type FitMode,
  type PreviewAppearance,
  type PreviewPlatform
} from "./types";
import { useEditorHistory } from "./use-editor-history";

const colorPresets = ["#315DE8", "#111318", "#F1EEE7", "#E84D5B", "#156A67", "#F07A35"];
const originalPreviewSettings: ArtworkSettings = {
  ...defaultArtworkSettings,
  scale: 100,
  autoTrim: false
};

export default function App() {
  const {
    editor,
    canUndo,
    canRedo,
    commit,
    beginInteraction,
    updateInteraction,
    finishInteraction,
    undo,
    redo
  } = useEditorHistory(createDefaultEditor());
  const [artwork, setArtwork] = useState<ArtworkAsset | null>(null);
  const [darkArtwork, setDarkArtwork] = useState<ArtworkAsset | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [previewOriginal, setPreviewOriginal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileTargetRef = useRef<PreviewAppearance>("light");

  const updateEditor = useCallback(
    (patch: Partial<EditorState>) => commit((current) => ({ ...current, ...patch })),
    [commit]
  );

  const updateSettings = useCallback(
    (patch: Partial<ArtworkSettings>, transient = false) => {
      const updater = (current: EditorState): EditorState => {
        const platforms: PreviewPlatform[] = current.platformOverrides
          ? [current.previewPlatform]
          : ["ios", "android"];
        const artworkSettings = { ...current.artworkSettings };
        for (const platform of platforms) {
          artworkSettings[platform] = { ...artworkSettings[platform], ...patch };
        }
        return { ...current, artworkSettings };
      };
      if (transient) updateInteraction(updater);
      else commit(updater);
    },
    [commit, updateInteraction]
  );

  const loadArtwork = useCallback((file: File, target: PreviewAppearance = "light") => {
    const supported =
      file.type.startsWith("image/") || /\.(png|jpe?g|webp|svg)$/i.test(file.name);
    if (!supported) {
      setError("Choose a PNG, JPG, WebP, or SVG artwork file.");
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const asset = { image, name: file.name, url, trimRect: computeTrimRect(image) };
      if (target === "dark") setDarkArtwork(asset);
      else setArtwork(asset);
      setError(null);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Glimpse could not read that artwork file.");
    };
    image.src = url;
  }, []);

  const pickArtwork = useCallback((target: PreviewAppearance = "light") => {
    fileTargetRef.current = target;
    inputRef.current?.click();
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const image = Array.from(event.clipboardData?.files ?? []).find((file) =>
        file.type.startsWith("image/")
      );
      if (image) loadArtwork(image);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadArtwork]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);

  useEffect(() => {
    return () => {
      if (artwork?.url.startsWith("blob:")) URL.revokeObjectURL(artwork.url);
    };
  }, [artwork]);

  useEffect(() => {
    return () => {
      if (darkArtwork?.url.startsWith("blob:")) URL.revokeObjectURL(darkArtwork.url);
    };
  }, [darkArtwork]);

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) loadArtwork(file, fileTargetRef.current);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = Array.from(event.dataTransfer.files).find(
      (candidate) =>
        candidate.type.startsWith("image/") || /\.(png|jpe?g|webp|svg)$/i.test(candidate.name)
    );
    if (file) loadArtwork(file);
  }

  function togglePlatformOverrides() {
    commit((current) => {
      if (!current.platformOverrides) return { ...current, platformOverrides: true };
      const active = current.artworkSettings[current.previewPlatform];
      return {
        ...current,
        platformOverrides: false,
        artworkSettings: { ios: { ...active }, android: { ...active } }
      };
    });
  }

  function resetDesign() {
    commit((current) => {
      const fresh = createDefaultEditor();
      return {
        ...fresh,
        exportTarget: current.exportTarget,
        previewPlatform: current.previewPlatform
      };
    });
  }

  async function downloadPackage() {
    if (!artwork) {
      pickArtwork();
      return;
    }

    setIsExporting(true);
    setError(null);
    try {
      const blob = await exportSplashPackage(editor, { light: artwork, dark: darkArtwork });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Glimpse-Assets.zip";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (exportError) {
      setError(
        exportError instanceof Error ? exportError.message : "The splash asset export failed."
      );
    } finally {
      setIsExporting(false);
    }
  }

  const settings = editor.artworkSettings[editor.previewPlatform];
  const displaySettings = previewOriginal ? originalPreviewSettings : settings;
  const activeArtwork =
    editor.darkModeEnabled && editor.previewAppearance === "dark" && darkArtwork
      ? darkArtwork
      : artwork;
  const activeBackground = getActiveBackground(editor);
  const visibleOutputs =
    editor.exportTarget === "both"
      ? "iOS + Android"
      : editor.exportTarget === "ios"
        ? "iOS"
        : "Android";
  const androidNeedsReview =
    settings.scale > 100 ||
    Math.abs(settings.offsetX) > 0.1 ||
    Math.abs(settings.offsetY) > 0.1 ||
    settings.shadow > 0 ||
    settings.glow > 0 ||
    settings.outline > 0;

  return (
    <main className="app-shell">
      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={onFileInput}
      />

      <section className="preview-pane">
        <header className="topbar">
          <div className="document-status">
            <span className={artwork ? "status-dot ready" : "status-dot"} />
            <span>{artwork ? artwork.name : "Untitled splash"}</span>
          </div>

          <Segmented<PreviewPlatform>
            ariaLabel="Preview platform"
            className="preview-switcher"
            value={editor.previewPlatform}
            options={[
              ["ios", "iOS"],
              ["android", "Android"]
            ]}
            onChange={(previewPlatform) => updateEditor({ previewPlatform })}
          />

          <div className="topbar-actions">
            <button
              className="icon-button"
              type="button"
              disabled={!canUndo}
              title="Undo (⌘Z)"
              aria-label="Undo"
              onClick={undo}
            >
              <Undo2 size={15} />
            </button>
            <button
              className="icon-button"
              type="button"
              disabled={!canRedo}
              title="Redo (⇧⌘Z)"
              aria-label="Redo"
              onClick={redo}
            >
              <Redo2 size={15} />
            </button>
            <button
              className={`icon-button ${previewOriginal ? "active" : ""}`}
              type="button"
              disabled={!artwork}
              title="Compare with original"
              aria-label="Compare with original"
              aria-pressed={previewOriginal}
              onClick={() => setPreviewOriginal((current) => !current)}
            >
              <Scan size={15} />
            </button>
            <button
              className="icon-button"
              type="button"
              title="Reset design"
              aria-label="Reset design"
              onClick={resetDesign}
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </header>

        <section
          className={`canvas-host ${isDragging ? "dragging" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) setIsDragging(false);
          }}
          onDrop={onDrop}
        >
          <div className="studio-orbit orbit-one" />
          <div className="studio-orbit orbit-two" />

          <div className="canvas-stage">
            <div className="stage-measure">
              <span />
              <b>{editor.previewPlatform === "ios" ? "393 × 852 pt" : "412 × 915 dp"}</b>
              <span />
            </div>

            <DevicePreview
              platform={editor.previewPlatform}
              background={activeBackground}
              settings={displaySettings}
              artwork={activeArtwork}
              showSafeZone={editor.showSafeZone}
              previewOriginal={previewOriginal}
              onPick={() => pickArtwork()}
              onSettingsChange={updateSettings}
              onInteractionStart={beginInteraction}
              onInteractionEnd={finishInteraction}
            />

            <div className="preview-meta">
              <span>Drag to move</span>
              <i />
              <span>Scroll or pinch to scale</span>
              <i />
              <span>{previewOriginal ? "Original" : "Live output"}</span>
            </div>
          </div>

          <div className="preview-dock" aria-label="Device previews">
            <MiniPreview
              label="Phone"
              detail="Portrait"
              platform={editor.previewPlatform}
              background={activeBackground}
              settings={displaySettings}
              artwork={activeArtwork}
            />
            <MiniPreview
              label="Tablet"
              detail="Adaptive"
              platform={editor.previewPlatform}
              background={activeBackground}
              settings={displaySettings}
              artwork={activeArtwork}
              tablet
            />
          </div>

          {isDragging && (
            <div className="drop-overlay">
              <Upload size={24} />
              <strong>Drop artwork to replace</strong>
            </div>
          )}
        </section>
      </section>

      <aside className="sidebar">
        <header className="brand-header">
          <div>
            <h1>glimpse.</h1>
            <p>Splash art studio</p>
          </div>
          <img className="brand-mark" src="/glimpse.svg" alt="" />
        </header>

        <div className="controls">
          <PanelSection icon={<ImageIcon size={15} />} title="Artwork" index="01">
            <ArtworkFile
              artwork={artwork}
              emptyLabel="Choose your artwork"
              onPick={() => pickArtwork()}
              onRemove={() => setArtwork(null)}
            />

            <button
              className={`scope-toggle ${editor.platformOverrides ? "custom" : ""}`}
              type="button"
              onClick={togglePlatformOverrides}
            >
              {editor.platformOverrides ? <Unlink2 size={14} /> : <Link2 size={14} />}
              <span>
                <strong>{editor.platformOverrides ? "Platform override" : "Platforms linked"}</strong>
                {editor.platformOverrides
                  ? `Editing ${editor.previewPlatform === "ios" ? "iOS" : "Android"} only`
                  : "Changes apply to iOS and Android"}
              </span>
            </button>

            <RangeControl
              label="Size"
              value={settings.scale}
              min={20}
              max={150}
              suffix="%"
              disabled={!artwork}
              onChange={(scale) => updateSettings({ scale })}
            />

            <div className="two-column-controls">
              <RangeControl
                label="Horizontal"
                value={settings.offsetX}
                min={-35}
                max={35}
                suffix="%"
                disabled={!artwork}
                onChange={(offsetX) => updateSettings({ offsetX })}
              />
              <RangeControl
                label="Vertical"
                value={settings.offsetY}
                min={-35}
                max={35}
                suffix="%"
                disabled={!artwork}
                onChange={(offsetY) => updateSettings({ offsetY })}
              />
            </div>

            <RangeControl
              label="Rotation"
              value={settings.rotation}
              min={-180}
              max={180}
              suffix="°"
              disabled={!artwork}
              onChange={(rotation) => updateSettings({ rotation })}
            />

            <div className="action-grid three">
              <ActionButton
                active={settings.flipX}
                disabled={!artwork}
                icon={<FlipHorizontal2 size={14} />}
                label="Flip X"
                onClick={() => updateSettings({ flipX: !settings.flipX })}
              />
              <ActionButton
                active={settings.flipY}
                disabled={!artwork}
                icon={<FlipVertical2 size={14} />}
                label="Flip Y"
                onClick={() => updateSettings({ flipY: !settings.flipY })}
              />
              <ActionButton
                disabled={!artwork}
                icon={<RotateCcw size={14} />}
                label="Reset"
                onClick={() => updateSettings({ ...defaultArtworkSettings })}
              />
            </div>

            {editor.previewPlatform === "android" && (
              <div className={`compliance-note ${androidNeedsReview ? "warning" : ""}`}>
                <ShieldCheck size={14} />
                <span>
                  <strong>{androidNeedsReview ? "Review safe-area clipping" : "Inside safe circle"}</strong>
                  {androidNeedsReview
                    ? "Use the overlay to verify transformed edges and effects."
                    : "Default placement fits the 192 dp visible circle."}
                </span>
              </div>
            )}
          </PanelSection>

          <PanelSection icon={<WandSparkles size={15} />} title="Shape & color" index="02">
            <Segmented<FitMode>
              ariaLabel="Artwork fit"
              value={settings.fitMode}
              options={[
                ["contain", "Fit"],
                ["cover", "Fill"],
                ["stretch", "Stretch"]
              ]}
              onChange={(fitMode) => updateSettings({ fitMode })}
            />

            <ToggleControl
              active={settings.autoTrim}
              label="Trim transparent margins"
              detail="Uses visible pixels for alignment"
              onClick={() => updateSettings({ autoTrim: !settings.autoTrim })}
            />

            <div className="two-column-controls">
              <RangeControl
                label="Opacity"
                value={settings.opacity}
                min={10}
                max={100}
                suffix="%"
                disabled={!artwork}
                onChange={(opacity) => updateSettings({ opacity })}
              />
              <RangeControl
                label="Corner radius"
                value={settings.borderRadius}
                min={0}
                max={50}
                suffix="%"
                disabled={!artwork}
                onChange={(borderRadius) => updateSettings({ borderRadius })}
              />
            </div>

            <div className="control-pair tint-controls">
              <ColorControl
                label="Tint"
                value={settings.tintColor}
                onChange={(tintColor) => updateSettings({ tintColor })}
              />
              <RangeControl
                label="Strength"
                value={settings.tintAmount}
                min={0}
                max={100}
                suffix="%"
                disabled={!artwork}
                onChange={(tintAmount) => updateSettings({ tintAmount })}
              />
            </div>

            <RangeControl
              label="Brightness"
              value={settings.brightness}
              min={50}
              max={150}
              suffix="%"
              disabled={!artwork}
              onChange={(brightness) => updateSettings({ brightness })}
            />
            <RangeControl
              label="Contrast"
              value={settings.contrast}
              min={50}
              max={150}
              suffix="%"
              disabled={!artwork}
              onChange={(contrast) => updateSettings({ contrast })}
            />
            <RangeControl
              label="Saturation"
              value={settings.saturation}
              min={0}
              max={200}
              suffix="%"
              disabled={!artwork}
              onChange={(saturation) => updateSettings({ saturation })}
            />
          </PanelSection>

          <PanelSection icon={<Sparkles size={15} />} title="Effects" index="03">
            <div className="two-column-controls">
              <RangeControl
                label="Shadow"
                value={settings.shadow}
                min={0}
                max={50}
                suffix="%"
                disabled={!artwork}
                onChange={(shadow) => updateSettings({ shadow })}
              />
              <RangeControl
                label="Glow"
                value={settings.glow}
                min={0}
                max={50}
                suffix="%"
                disabled={!artwork}
                onChange={(glow) => updateSettings({ glow })}
              />
            </div>
            <div className="control-pair">
              <RangeControl
                label="Outline"
                value={settings.outline}
                min={0}
                max={5}
                suffix="%"
                disabled={!artwork}
                onChange={(outline) => updateSettings({ outline })}
              />
              <ColorControl
                label="Outline color"
                value={settings.outlineColor}
                onChange={(outlineColor) => updateSettings({ outlineColor })}
              />
            </div>
          </PanelSection>

          <PanelSection icon={<Palette size={15} />} title="Background" index="04">
            <ToggleControl
              active={editor.darkModeEnabled}
              label="Dark appearance"
              detail="Exports native light and dark variants"
              onClick={() =>
                commit((current) => ({
                  ...current,
                  darkModeEnabled: !current.darkModeEnabled,
                  previewAppearance: current.darkModeEnabled ? "light" : current.previewAppearance
                }))
              }
            />

            {editor.darkModeEnabled && (
              <Segmented<PreviewAppearance>
                ariaLabel="Preview appearance"
                value={editor.previewAppearance}
                options={[
                  ["light", "Light"],
                  ["dark", "Dark"]
                ]}
                onChange={(previewAppearance) => updateEditor({ previewAppearance })}
              />
            )}

            <ColorControl
              label={editor.previewAppearance === "dark" ? "Dark background" : "Light background"}
              value={activeBackground}
              onChange={(color) =>
                updateEditor(
                  editor.previewAppearance === "dark"
                    ? { backgroundDark: color }
                    : { backgroundLight: color }
                )
              }
            />

            <div className="preset-row" aria-label="Background presets">
              {colorPresets.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={activeBackground === color ? "active" : ""}
                  style={{ background: color }}
                  title={color}
                  aria-label={`Use ${color} background`}
                  onClick={() =>
                    updateEditor(
                      editor.previewAppearance === "dark"
                        ? { backgroundDark: color }
                        : { backgroundLight: color }
                    )
                  }
                />
              ))}
            </div>

            {editor.darkModeEnabled && (
              <ArtworkFile
                compact
                artwork={darkArtwork}
                emptyLabel="Optional dark artwork"
                onPick={() => pickArtwork("dark")}
                onRemove={() => setDarkArtwork(null)}
              />
            )}

            <button
              className={`safe-zone-toggle ${editor.showSafeZone ? "active" : ""}`}
              type="button"
              onClick={() => updateEditor({ showSafeZone: !editor.showSafeZone })}
            >
              {editor.showSafeZone ? <Eye size={14} /> : <EyeOff size={14} />}
              Show Android safe zone
              <span>{editor.showSafeZone ? "On" : "Off"}</span>
            </button>
          </PanelSection>

          <PanelSection icon={<Layers3 size={15} />} title="Output" index="05">
            <Segmented<ExportTarget>
              ariaLabel="Export target"
              value={editor.exportTarget}
              options={[
                ["ios", "iOS"],
                ["android", "Android"],
                ["both", "Both"]
              ]}
              onChange={(exportTarget) => updateEditor({ exportTarget })}
            />

            <div className="output-list">
              <OutputRow
                active={editor.exportTarget !== "android"}
                label="iOS + iPadOS"
                detail={outputSummary.ios}
              />
              <OutputRow
                active={editor.exportTarget !== "ios"}
                label="Android"
                detail={outputSummary.android}
              />
            </div>

            <p className="output-note">
              Transformations, rounded clipping, tone adjustments, and effects are baked into each
              native density.
            </p>
          </PanelSection>
        </div>

        <footer className="export-footer">
          {error && <p className="error-message">{error}</p>}
          <div className="export-summary">
            <span>Export package</span>
            <strong>{visibleOutputs}</strong>
          </div>
          <button
            type="button"
            className="export-button"
            disabled={isExporting}
            onClick={() => void downloadPackage()}
          >
            {isExporting ? (
              <LoaderCircle className="spin" size={17} />
            ) : artwork ? (
              <Download size={17} />
            ) : (
              <Upload size={17} />
            )}
            {isExporting
              ? "Building package…"
              : artwork
                ? "Export splash assets"
                : "Add artwork to export"}
          </button>
        </footer>
      </aside>
    </main>
  );
}

function DevicePreview({
  platform,
  background,
  settings,
  artwork,
  showSafeZone,
  previewOriginal,
  onPick,
  onSettingsChange,
  onInteractionStart,
  onInteractionEnd
}: {
  platform: PreviewPlatform;
  background: string;
  settings: ArtworkSettings;
  artwork: ArtworkAsset | null;
  showSafeZone: boolean;
  previewOriginal: boolean;
  onPick: () => void;
  onSettingsChange: (patch: Partial<ArtworkSettings>, transient?: boolean) => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
}) {
  const style = { "--splash-color": background } as CSSProperties;

  return (
    <div className={`device-frame device-${platform}`}>
      <div className="device-hardware">
        <span className="device-speaker" />
        <div className="device-screen" style={style}>
          {platform === "android" && showSafeZone && (
            <div className="safe-zone-ring">
              <span>192 dp safe</span>
            </div>
          )}

          {artwork ? (
            <ArtworkCanvas
              artwork={artwork}
              settings={settings}
              platform={platform}
              interactive={!previewOriginal}
              onSettingsChange={onSettingsChange}
              onInteractionStart={onInteractionStart}
              onInteractionEnd={onInteractionEnd}
            />
          ) : (
            <button className="empty-artwork" type="button" onClick={onPick}>
              <span>
                <Upload size={20} />
              </span>
              <strong>Drop artwork here</strong>
              <small>or click to choose · paste works too</small>
            </button>
          )}

          {previewOriginal && <span className="comparison-badge">Before</span>}
          <span className="home-indicator" />
        </div>
      </div>
    </div>
  );
}

function ArtworkCanvas({
  artwork,
  settings,
  platform,
  interactive,
  onSettingsChange,
  onInteractionStart,
  onInteractionEnd
}: {
  artwork: ArtworkAsset;
  settings: ArtworkSettings;
  platform: PreviewPlatform;
  interactive: boolean;
  onSettingsChange: (patch: Partial<ArtworkSettings>, transient?: boolean) => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<
    | { mode: "drag"; x: number; y: number; offsetX: number; offsetY: number }
    | { mode: "pinch"; distance: number; scale: number }
    | null
  >(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) renderArtwork(canvas, artwork, settings, platform === "android" ? ANDROID_SAFE_RATIO : 1);
  }, [artwork, platform, settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !interactive) return;
    const handleWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      onSettingsChange({ scale: clamp(settings.scale - event.deltaY * 0.08, 20, 150) });
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [interactive, onSettingsChange, settings.scale]);

  function pointerDistance() {
    const points = [...pointers.current.values()];
    return points.length < 2 ? 0 : Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!interactive) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    onInteractionStart();

    if (pointers.current.size >= 2) {
      gesture.current = { mode: "pinch", distance: pointerDistance(), scale: settings.scale };
    } else {
      gesture.current = {
        mode: "drag",
        x: event.clientX,
        y: event.clientY,
        offsetX: settings.offsetX,
        offsetY: settings.offsetY
      };
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!interactive || !pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size >= 2 && gesture.current.mode === "pinch") {
      const ratio = pointerDistance() / Math.max(gesture.current.distance, 1);
      onSettingsChange({ scale: clamp(gesture.current.scale * ratio, 20, 150) }, true);
      return;
    }

    if (gesture.current.mode === "drag") {
      const rect = event.currentTarget.getBoundingClientRect();
      onSettingsChange(
        {
          offsetX: clamp(
            gesture.current.offsetX + ((event.clientX - gesture.current.x) / rect.width) * 100,
            -35,
            35
          ),
          offsetY: clamp(
            gesture.current.offsetY + ((event.clientY - gesture.current.y) / rect.height) * 100,
            -35,
            35
          )
        },
        true
      );
    }
  }

  function onPointerEnd(event: ReactPointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) {
      gesture.current = null;
      onInteractionEnd();
    } else if (pointers.current.size === 1) {
      const point = [...pointers.current.values()][0];
      gesture.current = {
        mode: "drag",
        x: point.x,
        y: point.y,
        offsetX: settings.offsetX,
        offsetY: settings.offsetY
      };
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className={`artwork-canvas ${interactive ? "interactive" : ""}`}
      width={720}
      height={720}
      aria-label="Splash artwork. Drag to reposition and scroll or pinch to resize."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    />
  );
}

function MiniPreview({
  platform,
  background,
  settings,
  artwork,
  label,
  detail,
  tablet = false
}: {
  platform: PreviewPlatform;
  background: string;
  settings: ArtworkSettings;
  artwork: ArtworkAsset | null;
  label: string;
  detail: string;
  tablet?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (canvasRef.current && artwork) {
      renderArtwork(
        canvasRef.current,
        artwork,
        settings,
        platform === "android" ? ANDROID_SAFE_RATIO : 1
      );
    }
  }, [artwork, platform, settings]);

  return (
    <div className="mini-preview">
      <div
        className={`mini-device mini-${platform} ${tablet ? "tablet" : ""}`}
        style={{ "--splash-color": background } as CSSProperties}
      >
        {artwork && <canvas ref={canvasRef} width={240} height={240} />}
      </div>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </div>
  );
}

function ArtworkFile({
  artwork,
  emptyLabel,
  compact = false,
  onPick,
  onRemove
}: {
  artwork: ArtworkAsset | null;
  emptyLabel: string;
  compact?: boolean;
  onPick: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={`artwork-file-group ${compact ? "compact" : ""}`}>
      <button
        type="button"
        className={`artwork-file ${artwork ? "has-artwork" : ""}`}
        onClick={onPick}
      >
        <span className="file-icon">{artwork ? <Check size={17} /> : <Upload size={17} />}</span>
        <span className="file-copy">
          <strong>{artwork ? artwork.name : emptyLabel}</strong>
          <small>{artwork ? "Click to replace" : "PNG, JPG, WebP or SVG"}</small>
        </span>
        <ChevronRight size={16} />
      </button>
      {artwork && (
        <button className="remove-artwork" type="button" onClick={onRemove}>
          <X size={13} /> Remove artwork
        </button>
      )}
    </div>
  );
}

function PanelSection({
  icon,
  title,
  index,
  children
}: {
  icon: ReactNode;
  title: string;
  index: string;
  children: ReactNode;
}) {
  return (
    <section className="panel-section">
      <header>
        <span className="section-icon">{icon}</span>
        <h2>{title}</h2>
        <small>{index}</small>
      </header>
      <div className="panel-content">{children}</div>
    </section>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = ""
}: {
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={`segmented ${className}`} role="group" aria-label={ariaLabel}>
      {options.map(([option, label]) => (
        <button
          key={option}
          type="button"
          className={value === option ? "active" : ""}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  onChange,
  suffix = "",
  disabled = false
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  suffix?: string;
  disabled?: boolean;
}) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <label className={`range-control ${disabled ? "disabled" : ""}`}>
      <span>
        <span className="range-label">{label}</span>
        <output>
          {Math.round(value)}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        style={{ "--range-progress": `${progress}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ColorControl({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="color-control">
      <span>{label}</span>
      <span className="color-input-wrap">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <code>{value.toUpperCase()}</code>
      </span>
    </label>
  );
}

function ToggleControl({
  active,
  label,
  detail,
  onClick
}: {
  active: boolean;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button className={`toggle-control ${active ? "active" : ""}`} type="button" onClick={onClick}>
      <span className="toggle-track">
        <i />
      </span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </button>
  );
}

function ActionButton({
  icon,
  label,
  active = false,
  disabled = false,
  onClick
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`action-button ${active ? "active" : ""}`}
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function OutputRow({ active, label, detail }: { active: boolean; label: string; detail: string }) {
  return (
    <div className={`output-row ${active ? "active" : ""}`}>
      <span className="output-check">{active && <Check size={12} strokeWidth={2.5} />}</span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
