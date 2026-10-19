//
// Copyright 2026 DXOS.org
//

//
// Root view of the scene engine (§6–§8): owns the camera, the scene path, selection and the pointer
// state machine; renders the current scene through `SceneLayer` under one CSS transform and drills
// in and out of portals with a camera transition then a root swap. Every model change goes through
// the projection as an intent; the view never writes coordinates itself (decision 11).
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import {
  type CanvasAtoms,
  type ControllerGrid,
  type Drag,
  type FreehandProjectionOptions,
  type InspectorMode,
  type Projection,
  animate,
  createCanvasAtoms,
  createCanvasController,
  readonlyCapabilities,
  reduceIntent,
} from '../../engine/index.ts';
import { type GeneratorCompiler, type GeneratorSource } from '../../generator/index.ts';
import {
  SCENE_OVERLAY_ATTRIBUTE,
  SceneLookContext,
  isTrackpadScroll,
  useClock,
  useGeneratorFrames,
  useRegistry,
  useSceneProjection,
  useViewport,
  useWheel,
} from '../../hooks/index.ts';
import {
  type BackgroundGrid,
  type Bounds,
  type Camera,
  DEFAULT_GRID,
  type Endpoint,
  type InstanceNode,
  type Intent,
  type LinkId,
  type LinkRegistry,
  MAJOR_GRID_RATIO,
  type Node,
  type NodeId,
  type NodeRegistry,
  type NodeType,
  type Point,
  type Scene,
  type SceneId,
  type SceneStore,
  type ThemeRegistry,
  type Timeline,
  applyCameraKey,
  defaultThemeRegistry,
  getElement,
  isInstanceNode,
  isLink,
  isPointEndpoint,
  keyAction,
  nodeAnimatable,
  nodeDef,
  exposeClock as publishClock,
  resolveBackground,
  resolveLook,
  sampleCamera,
  timelineFps,
} from '../../model/index.ts';
import {
  NOMINAL_ZOOM,
  type PartKey,
  activeLayer,
  composeSelection,
  compositeBounds,
  compositeScenes,
  copyComposite,
  createId,
  createLink,
  duplicateSelection,
  fitBounds,
  hitTest,
  instanceCounts,
  instancePorts,
  nodeBounds,
  nodeDragType,
  nominalSize,
  panBy,
  partText,
  partValues,
  recordScenes,
  recordStoreStep,
  redo,
  renamePortLinks,
  retargetInstance,
  screenToScene,
  topZ,
  undo,
  ungroupInstance,
  visibleScene,
  zoomAt,
} from '../../utils/index.ts';
import { InspectorPanel } from '../panels/index.ts';
import { type ElementHandlers, defaultLinkRegistry, defaultNodeRegistry } from '../SceneLayer/index.ts';
import { type ToolbarActions } from '../Toolbar/index.ts';
import { CanvasProvider } from './CanvasContext.ts';
import {
  CAMERA_SETTLE_MS,
  DEFAULT_MARGIN,
  FIT_DEBOUNCE_MS,
  LIGHT_MODE,
  LINK_HOVER_GRACE_MS,
  OBJECTS_CRUMB,
  PREVIEW_LINK_ID,
  type SceneDisplay,
  SETTLE_MS,
  ZOOM_STEP,
} from './constants.ts';
import { PREVIEW_NODE_ID, isLinkDrawn, usePointerMachine } from './usePointerMachine.ts';
import { useSceneCamera } from './useSceneCamera.ts';
import { useSceneKeys } from './useSceneKeys.ts';
import { useSceneNavigation } from './useSceneNavigation.ts';
import { useSceneSnap } from './useSceneSnap.ts';

export type CanvasRootProps = Util.ThemedClassName<{
  store: SceneStore;
  root: SceneId;
  nodes?: NodeRegistry;
  links?: LinkRegistry;
  /** Projection per scene; freehand (identity) by default. */
  createProjection?: (options: FreehandProjectionOptions) => Projection;
  /** A host-owned projection instead, shared with the host's panels (see `useSceneProjection`). */
  projection?: Projection;
  /** Externally owned view state, e.g. to drive two views or persist the camera. */
  atoms?: CanvasAtoms;
  /** Where the camera starts on the root scene, e.g. as last left; the scene is fitted when unset. */
  initialCamera?: Camera;
  /** Called once the camera settles on the root scene, so a host can persist it. */
  onCameraChange?: (camera: Camera) => void;
  /**
   * The display toggles as last left; each is on when unset. With fit on, `initialCamera` is not restored: the view
   * opens fitted.
   */
  initialDisplay?: Partial<SceneDisplay>;
  /** Called when a display toggle changes, so a host can persist it. */
  onDisplayChange?: (display: SceneDisplay) => void;
  /** Minor grid spacing in scene px; moves snap to it, creation and resizing to the major grid, `MAJOR_GRID_RATIO` times it. */
  grid?: number;
  /** Least gap between the scene's frame and each viewport edge when fitting, in major cells. */
  margin?: number;
  /**
   * Look, select and navigate only: no gesture or key reaches the model, and no handle or port is drawn,
   * whatever the projection would allow.
   */
  readonly?: boolean;
  /** Called when the palette's read-only toggle is pressed; the toggle shows only when given, as the host owns `readonly`. */
  onReadonlyChange?: (readonly: boolean) => void;
  /** Where the inspectors (properties, layers, about) sit: floating over the canvas (the default), or docked in a column beside it. */
  inspectors?: InspectorMode;
  /**
   * Called when the dock is closed or an inspector's menu docks or floats them; the dock's close button and the menu
   * item show only when given, as the host owns `inspectors`.
   */
  onInspectorsChange?: (mode: InspectorMode) => void;
  /** The themes offered, and the style sets and backgrounds they name; the built-ins by default. */
  themes?: ThemeRegistry;
  /**
   * Changing it asks fit mode to animate to the scene's frame as it now stands: an edit never refits by itself, so a
   * host that grows or reveals content on purpose says so with a new value.
   */
  refitKey?: string | number;
  /** Milliseconds a refit asked for by `refitKey` takes, so it can keep time with the host's own reveal. */
  refitDuration?: number;
  /**
   * While set, the view travels across the scene at this velocity (scene units per second, positive rightward and
   * downward), taking the camera out of fit mode: a slow pan a host can start and stop, as in a presentation.
   */
  drift?: Point;
  /** Called with the stretch of the scene in view (scene coordinates) whenever the camera or the view's size changes. */
  onViewChange?: (view: Bounds) => void;
  /** The theme chosen for this drawing, over `defaultTheme`; the theme bar picks it. */
  theme?: string;
  /** The theme drawn when `theme` is unset; flat when this is unset too or unknown. */
  defaultTheme?: string;
  /** Overrides the theme's style set. */
  styleSet?: string;
  /** Overrides the theme's background. */
  background?: string;
  /** Overrides the background's grid; the theme bar picks it. */
  backgroundGrid?: BackgroundGrid;
  /** Called when the theme bar picks a theme, or `undefined` to take the default; the picker shows only when given. */
  onThemeChange?: (theme: string | undefined) => void;
  /** Called when the theme bar picks a grid, or `undefined` to take the background's own. */
  onBackgroundGridChange?: (grid: BackgroundGrid | undefined) => void;
  /** What Fit frames instead of the scene's shapes, e.g. a film's frame; the inset still applies. */
  frame?: Bounds;
  /**
   * Publishes the view's clock for a frame renderer (`scripts/render-story.mjs`), which seeks it frame by frame and waits
   * on `data-frame-time` (ANIMATION.md §7.2).
   */
  exportable?: boolean;
  /** The generators the scene's generator nodes reference, by reference (ANIMATION.md §6.6). */
  generators?: Readonly<Record<string, GeneratorSource>>;
  /** Compiles a generator's source (`createEsbuildCompiler`); without it generator nodes draw nothing. */
  compileGenerator?: GeneratorCompiler;
  /** Starts the generator worker; without it generators run in the page. */
  createGeneratorWorker?: () => Worker;
  children?: ReactNode;
}>;

/** No generators: what a view given none reads. */
const NO_GENERATORS: Readonly<Record<string, GeneratorSource>> = {};

export const CanvasRoot = ({
  classNames,
  store,
  root,
  nodes: nodeRegistry = defaultNodeRegistry,
  links: linkRegistry = defaultLinkRegistry,
  createProjection,
  projection: projectionProp,
  atoms: atomsProp,
  initialCamera,
  onCameraChange,
  initialDisplay,
  onDisplayChange,
  grid = DEFAULT_GRID,
  margin = DEFAULT_MARGIN,
  readonly = false,
  onReadonlyChange,
  inspectors = 'floating',
  onInspectorsChange,
  themes = defaultThemeRegistry,
  theme,
  defaultTheme,
  styleSet,
  background,
  backgroundGrid,
  refitKey,
  refitDuration,
  drift,
  onViewChange,
  onThemeChange,
  onBackgroundGridChange,
  frame,
  exportable,
  generators = NO_GENERATORS,
  compileGenerator,
  createGeneratorWorker,
  children,
}: CanvasRootProps) => {
  const look = useMemo(() => {
    const resolved = resolveLook(themes, { theme: theme ?? defaultTheme, styleSet, background });
    return backgroundGrid && backgroundGrid !== resolved.background.grid
      ? { ...resolved, background: { ...resolved.background, grid: backgroundGrid } }
      : resolved;
  }, [themes, theme, defaultTheme, styleSet, background, backgroundGrid]);
  // The grid the theme's own background draws, so the bar can tell an override from it.
  const themeGrid = useMemo(
    () => resolveBackground(themes, background ?? look.theme.background).grid,
    [themes, background, look.theme.background],
  );
  const registry = useRegistry();
  const atoms = useMemo(() => atomsProp ?? createCanvasAtoms(root), [atomsProp, root]);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport(rootRef);

  const path = useAtomValue(atoms.path);
  const baseProjection = useSceneProjection({ store, atoms, createProjection, projection: projectionProp });
  // Sampled at the view's clock; an edit away from the start becomes keys (ANIMATION.md §5.3, §5.4).
  const projection = useMemo(
    () =>
      animate(baseProjection, {
        registry,
        clock: atoms.clock,
        autoKey: () => registry.get(atoms.autoKey),
        animatable: (node) => nodeAnimatable(nodeRegistry, node),
      }),
    [baseProjection, registry, atoms, nodeRegistry],
  );
  const scene = useAtomValue(projection.scene);
  // The commands read the latest projection, mode and grid when they run, so the controller is made once per canvas.
  const projectionRef = useRef(projection);
  projectionRef.current = projection;
  const readonlyRef = useRef(readonly);
  readonlyRef.current = readonly;
  const baseProjectionRef = useRef(baseProjection);
  baseProjectionRef.current = baseProjection;
  const nodeRegistryRef = useRef(nodeRegistry);
  nodeRegistryRef.current = nodeRegistry;
  const gridRef = useRef<ControllerGrid>({ major: 0, snap: (value) => value });
  const controller = useMemo(
    () =>
      createCanvasController({
        registry,
        atoms,
        store,
        projection: () => projectionRef.current,
        baseProjection: () => baseProjectionRef.current,
        nodeRegistry: () => nodeRegistryRef.current,
        readonly: () => readonlyRef.current,
        grid: () => gridRef.current,
      }),
    [registry, atoms, store],
  );
  const baseScene = useAtomValue(baseProjection.scene);
  const timeline = baseScene.timeline;
  const time = useAtomValue(atoms.clock.time);
  const generated = useGeneratorFrames({
    scene: baseScene,
    time,
    sources: generators,
    compile: compileGenerator,
    createWorker: createGeneratorWorker,
  });
  const playing = useAtomValue(atoms.clock.playing);
  const isolation = useAtomValue(atoms.isolation);
  useClock(atoms.clock, { duration: timeline?.duration, loop: timeline?.loop });
  const visible = useMemo(() => visibleScene(scene), [scene]);
  const scenes = useAtomValue(store.scenes);
  const camera = useAtomValue(atoms.camera);
  const selection = useAtomValue(atoms.selection);
  const tool = useAtomValue(atoms.tool);
  const snapEnabled = useAtomValue(atoms.snap);
  // The margin is in major cells, taken from the model's grid rather than the level currently drawn,
  // so a fit puts the same gap around the scene whatever the zoom.
  const inset = margin * grid * MAJOR_GRID_RATIO;
  // A new node's default size is nominal: major cells of the model's grid, not of the level drawn at this zoom.
  const cell = grid * MAJOR_GRID_RATIO;

  const drag = useAtomValue(atoms.drag);
  const undoState = useAtomValue(atoms.undo);
  const clipboard = useAtomValue(atoms.clipboard);
  const editing = useAtomValue(atoms.editing);
  const active = useAtomValue(atoms.active);
  // A node's content stays live only while the node is the selection; selecting anything else makes it inert again.
  useEffect(() => {
    if (active !== undefined && (selection.size !== 1 || !selection.has(active))) {
      registry.set(atoms.active, undefined);
    }
  }, [active, selection, registry, atoms.active]);
  const debug = useAtomValue(atoms.debug);
  const guides = useAtomValue(atoms.guides);
  // Fit mode keeps the current scene framed as the view resizes or opens another scene, until the user pans or zooms.
  // A view opens fitted, in fit mode, unless the host restores it with fit mode off (and then its camera).
  const [fitting, setFitting] = useState(() => initialDisplay?.fit ?? true);
  const exitFit = useCallback(() => setFitting(false), []);
  // Seeded once per atoms, before the host hears of any change, so restoring the toggles reports nothing back.
  const reportedRef = useRef<SceneDisplay | undefined>(undefined);
  useLayoutEffect(() => {
    if (initialDisplay?.snap !== undefined) {
      registry.set(atoms.snap, initialDisplay.snap);
    }
    if (initialDisplay?.guides !== undefined) {
      registry.set(atoms.guides, initialDisplay.guides);
    }
    reportedRef.current = { snap: registry.get(atoms.snap), guides: registry.get(atoms.guides), fit: fitting };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atoms]);
  useEffect(() => {
    const reported = reportedRef.current;
    if (
      !onDisplayChange ||
      !reported ||
      (reported.snap === snapEnabled && reported.guides === guides && reported.fit === fitting)
    ) {
      return;
    }
    reportedRef.current = { snap: snapEnabled, guides, fit: fitting };
    onDisplayChange({ snap: snapEnabled, guides, fit: fitting });
  }, [onDisplayChange, snapEnabled, guides, fitting]);
  const latticeOn = useAtomValue(atoms.lattice);
  const sceneId = path[path.length - 1];
  const canUndo = !readonly && undoState.key === sceneId && undoState.past.length > 0;
  const canRedo = !readonly && undoState.key === sceneId && undoState.future.length > 0;

  // Every gesture, key and control is gated on these, so a read-only view is the projection with nothing allowed.
  const capabilities = readonly ? readonlyCapabilities : projection.capabilities;

  //
  // Camera.
  //

  const {
    setCamera,
    animateTo,
    cancelAnimation,
    navigating,
    isNavigating,
    isAnimating,
    cameraTarget,
    setNavigation,
    touchNavigation,
    opening,
    setOpening,
  } = useSceneCamera(registry, atoms, viewport);

  // Keep the scene fitted while the viewport settles, until the user takes the camera over. A layout
  // effect, so the fit lands before the first paint instead of one frame after it.
  // A restored camera counts as taken over, so the fit leaves it where it was.
  const interactedRef = useRef(initialCamera !== undefined);

  // Read-only, nothing is selected: a selection only exists to be edited.
  const select = controller.selection.select;
  useEffect(() => {
    if (readonly) {
      select([]);
    }
  }, [readonly, select]);

  const {
    nameOf,
    portalTo,
    bounds,
    childFrame,
    fitTarget: sceneFitTarget,
    pushHistory,
    drillIn: drillInto,
    drillOut,
    goHistory,
  } = useSceneNavigation({
    registry,
    atoms,
    nodeRegistry,
    store,
    scenes,
    scene,
    path,
    camera,
    viewport,
    inset,
    drag,
    interactedRef,
    select,
    animateTo,
    setCamera,
    setOpening,
    isAnimating,
  });
  const fitTarget = frame ?? sceneFitTarget;

  const measured = viewport.width > 0 && viewport.height > 0;
  useLayoutEffect(() => {
    if (initialCamera && !fitting) {
      setCamera(initialCamera);
    }
    // Only the camera the view opened with is restored; later values are the host echoing ours back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCamera]);

  // In fit mode the first fit lands before the first paint; opening another scene animates to its frame, and a resize
  // animates to the new fit once the view has stopped changing size for `FIT_DEBOUNCE_MS`.
  // What the last fit framed: the scene and the view size. Only a resize refits; an edit to the scene does not, so the
  // camera holds still under someone editing.
  const fitKey = `${viewport.width}x${viewport.height}:${refitKey ?? ''}`;
  const fittedRef = useRef<{ scene: SceneId; key: string } | undefined>(undefined);
  useLayoutEffect(() => {
    if (fitting && measured && !fittedRef.current) {
      // Measured now, not from the observed size: a docked inspector mounting in the same frame narrows the canvas
      // before the observer reports it, and fitting the stale size would animate a refit straight after load.
      const element = rootRef.current;
      const size = element ? { width: element.clientWidth, height: element.clientHeight } : viewport;
      fittedRef.current = { scene: sceneId, key: `${size.width}x${size.height}:${refitKey ?? ''}` };
      setCamera(fitBounds(fitTarget, size, inset, NOMINAL_ZOOM));
    }
  }, [fitting, measured, viewport, fitTarget, inset, setCamera, sceneId, refitKey]);
  // Keyed on values, not identities: the scene and the camera helpers are rebuilt on unrelated renders, and each rerun
  // would restart the debounce before it fires. The latest helpers and frame are read when it does.
  const fitLatestRef = useRef({
    animateTo,
    isAnimating,
    frame: () => fitBounds(fitTarget, viewport, inset, NOMINAL_ZOOM),
  });
  fitLatestRef.current = { animateTo, isAnimating, frame: () => fitBounds(fitTarget, viewport, inset, NOMINAL_ZOOM) };
  useEffect(() => {
    const fitted = fittedRef.current;
    if (!fitting || !measured || !fitted) {
      return;
    }
    // Another scene opened: frame it now.
    if (fitted.scene !== sceneId) {
      fittedRef.current = { scene: sceneId, key: fitKey };
      fitLatestRef.current.animateTo(fitLatestRef.current.frame());
      return;
    }
    if (fitted.key === fitKey) {
      return;
    }
    // A resize refits once it settles; an animation in flight (a drill) finishes first, since `animateTo` would cancel
    // it before it lands.
    let timeout: ReturnType<typeof setTimeout>;
    // A refit the host asked for starts at once and takes its time; a resize waits for the size to settle.
    const asked = fitted.key.slice(fitted.key.indexOf(':') + 1) !== String(refitKey ?? '');
    const fit = () => {
      if (fitLatestRef.current.isAnimating()) {
        timeout = setTimeout(fit, FIT_DEBOUNCE_MS);
        return;
      }
      fittedRef.current = { scene: sceneId, key: fitKey };
      fitLatestRef.current.animateTo(fitLatestRef.current.frame(), undefined, asked ? refitDuration : undefined);
    };
    timeout = setTimeout(fit, asked ? 0 : FIT_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [fitting, measured, sceneId, fitKey, refitDuration]);
  useEffect(() => {
    if (onViewChange && viewport.width > 0) {
      onViewChange({
        x: -camera.x,
        y: -camera.y,
        width: viewport.width / camera.zoom,
        height: viewport.height / camera.zoom,
      });
    }
  }, [onViewChange, camera, viewport]);
  // The pan advances with the view's clock rather than a loop of its own (ANIMATION.md §2.1): while drifting the clock
  // plays, and each tick moves the camera by the velocity times the time it advanced. The velocity is read from a ref,
  // so a change of speed neither restarts anything nor loses a frame.
  const driftRef = useRef<Point>({ x: 0, y: 0 });
  driftRef.current = { x: drift?.x ?? 0, y: drift?.y ?? 0 };
  const drifting = driftRef.current.x !== 0 || driftRef.current.y !== 0;
  useEffect(() => {
    if (!drifting) {
      return;
    }
    exitFit();
    const started = !registry.get(atoms.clock.playing);
    registry.set(atoms.clock.playing, true);
    let last = registry.get(atoms.clock.time);
    const unsubscribe = registry.subscribe(atoms.clock.time, (time) => {
      const seconds = time - last;
      last = time;
      if (seconds > 0) {
        // The camera offsets the content, so the view moves right as it moves left.
        const { x, y } = driftRef.current;
        setCamera((camera) => panBy(camera, { x: -x * seconds, y: -y * seconds }));
      }
    });
    return () => {
      unsubscribe();
      if (started) {
        registry.set(atoms.clock.playing, false);
      }
    };
  }, [drifting, exitFit, setCamera, registry, atoms.clock]);

  // A camera track drives the camera as the clock moves (ANIMATION.md §5.5); keys hold the view's centre, so the same
  // point is framed whatever the viewport's size.
  const hasCameraTrack = sampleCamera(timeline, 0) !== undefined;
  useLayoutEffect(() => {
    const key = sampleCamera(timeline, time);
    if (key && measured) {
      setCamera((camera) => applyCameraKey(camera, key, viewport.width, viewport.height));
    }
  }, [timeline, time, measured, viewport.width, viewport.height, setCamera]);
  useEffect(() => {
    if (hasCameraTrack) {
      exitFit();
    }
  }, [hasCameraTrack, exitFit]);

  // Published for a frame renderer, which seeks the clock rather than faking the browser's (ANIMATION.md §7.2).
  const timelineRef = useRef<Timeline | undefined>(timeline);
  timelineRef.current = timeline;
  useEffect(
    () =>
      exportable
        ? publishClock(registry, atoms.clock, () => ({
            duration: timelineRef.current?.duration ?? 0,
            fps: timelineFps(timelineRef.current),
          }))
        : undefined,
    [exportable, registry, atoms.clock],
  );

  // Dragging the canvas takes the camera over.
  useEffect(() => {
    if (drag?.kind === 'pan') {
      exitFit();
      if (hasCameraTrack) {
        registry.set(atoms.clock.playing, false);
      }
    }
  }, [drag?.kind, exitFit, hasCameraTrack, registry, atoms.clock]);
  // Fit frames the scene now and keeps it framed (fit mode) until the user pans or zooms.
  const enterFit = useCallback(() => {
    setFitting(true);
    fittedRef.current = { scene: sceneId, key: fitKey };
    animateTo(fitBounds(fitTarget, viewport, inset, NOMINAL_ZOOM));
  }, [fitTarget, viewport, inset, animateTo, sceneId, fitKey]);

  // Reported after a quiet beat, so a wheel gesture or an animation is persisted once, where it ends.
  const atRoot = path.length === 1;
  useEffect(() => {
    if (!onCameraChange || !atRoot || !interactedRef.current) {
      return;
    }
    const timeout = setTimeout(() => onCameraChange(camera), CAMERA_SETTLE_MS);
    return () => clearTimeout(timeout);
  }, [onCameraChange, atRoot, camera]);

  useWheel(
    rootRef,
    useCallback(
      (event, pointer) => {
        interactedRef.current = true;
        exitFit();
        cancelAnimation();
        touchNavigation();
        // A camera the user moves during playback stops the camera track driving it.
        if (hasCameraTrack) {
          registry.set(atoms.clock.playing, false);
        }
        if (event.ctrlKey || event.metaKey) {
          // A trackpad pinch: small deltas, so a steeper rate.
          setCamera((camera) => zoomAt(camera, pointer, camera.zoom * Math.exp(-event.deltaY * 0.006)));
        } else if (event.shiftKey || isTrackpadScroll(event)) {
          // A two-finger swipe pans both ways, as on any trackpad canvas.
          setCamera((camera) => panBy(camera, { x: -event.deltaX / camera.zoom, y: -event.deltaY / camera.zoom }));
        } else {
          // Mouse-wheel notches up and down zoom about the pointer; a sideways scroll still pans.
          setCamera((camera) =>
            zoomAt(
              panBy(camera, { x: -event.deltaX / camera.zoom, y: 0 }),
              pointer,
              camera.zoom * Math.exp(-event.deltaY * 0.001),
            ),
          );
        }
      },
      [setCamera, cancelAnimation, touchNavigation, exitFit, hasCameraTrack, registry, atoms.clock],
    ),
  );

  //
  // Isolation (ANIMATION.md §4.3).
  //

  /** Opens a composite on its own: its definition scene, fitted, on a plain background; Escape returns. */
  const isolate = useCallback(
    (composite: SceneId) => {
      const definition = registry.get(store.scenes)[composite];
      if (!definition) {
        return;
      }
      const back = registry.get(atoms.isolation)?.back ?? {
        path: registry.get(atoms.path),
        camera: registry.get(atoms.camera),
      };
      registry.set(atoms.isolation, { composite, back });
      exitFit();
      select([]);
      registry.set(atoms.path, [composite]);
      const content = compositeBounds(definition);
      if (content) {
        setCamera(fitBounds(content, viewport, inset, NOMINAL_ZOOM));
      }
    },
    [registry, store.scenes, atoms, exitFit, select, setCamera, viewport, inset],
  );
  const exitIsolation = useCallback(() => {
    const current = registry.get(atoms.isolation);
    if (!current) {
      return;
    }
    registry.set(atoms.isolation, undefined);
    select([]);
    registry.set(atoms.path, current.back.path);
    setCamera(current.back.camera);
  }, [registry, atoms, select, setCamera]);
  /** Opens a node: an instance in isolation, a frame by drilling in. */
  const drillIn = useCallback(
    (node: Node, animated?: boolean) => (isInstanceNode(node) ? isolate(node.composite) : drillInto(node, animated)),
    [isolate, drillInto],
  );
  /** Backs out a level: out of isolation first. */
  const back = useCallback(
    () => (registry.get(atoms.isolation) ? exitIsolation() : drillOut()),
    [registry, atoms.isolation, exitIsolation, drillOut],
  );

  //
  // Timeline.
  //

  const fps = timelineFps(timeline);
  const { seek } = controller.time;
  const timelineKeys = useMemo(
    () => ({
      active: timeline !== undefined,
      togglePlay: controller.time.togglePlay,
      step: controller.time.step,
      jumpKey: controller.time.jumpKey,
      addKey: controller.time.addKey,
      removeKey: controller.time.removeKey,
    }),
    [timeline, controller],
  );

  //
  // Composite objects (ANIMATION.md §4.2). Each action is one undo step; one that adds a scene records it with the step.
  //

  const objectActions = useMemo(() => {
    const sceneId = () => registry.get(atoms.path).at(-1) ?? root;
    /** Writes `scenes` into the store, applies `intents`, and records both as one undo step. */
    const commit = (scenes: Record<SceneId, Scene>, intents: Intent[]) => {
      const before = registry.get(store.scenes);
      const model = baseProjection.snapshot();
      registry.set(store.scenes, { ...before, ...scenes });
      if (intents.length > 0) {
        baseProjection.apply({ kind: 'batch', intents });
      }
      // A refused (or empty) batch recorded no step to attach the scenes to, so the change is a step of its own.
      if (baseProjection.snapshot() === model) {
        recordStoreStep(registry, atoms.undo, sceneId(), model, before);
      } else {
        recordScenes(registry, atoms.undo, sceneId(), before);
      }
    };
    return {
      /** Groups the selection as a new object, replaced by one instance of it. */
      compose: () => {
        const current = registry.get(baseProjection.scene);
        const count = compositeScenes(registry.get(store.scenes)).length;
        const instanceId = createId('instance');
        const composition = composeSelection(current, registry.get(atoms.selection), {
          compositeId: createId('object'),
          instanceId,
          name: `Object ${count + 1}`,
          layer: activeLayer(current, registry.get(atoms.layer)),
        });
        if (!composition) {
          return;
        }
        commit({ [composition.composite.id]: composition.composite }, composition.intents);
        select([instanceId]);
      },
      /** Replaces an instance with its composite's nodes. */
      ungroup: (id: NodeId) => {
        const current = registry.get(baseProjection.scene);
        const instance = current.nodes[id];
        const composite =
          instance && isInstanceNode(instance) ? registry.get(store.scenes)[instance.composite] : undefined;
        if (!instance || !isInstanceNode(instance) || !composite) {
          return;
        }
        const intents = ungroupInstance(current, instance, composite, createId);
        baseProjection.apply({ kind: 'batch', intents });
        select(intents.flatMap((intent) => (intent.kind === 'create' ? [intent.node.id] : [])));
      },
      /** Points an instance at a copy of its composite, so editing one no longer edits the other. */
      makeUnique: (id: NodeId) => {
        const current = registry.get(baseProjection.scene);
        const instance = current.nodes[id];
        const composite =
          instance && isInstanceNode(instance) ? registry.get(store.scenes)[instance.composite] : undefined;
        if (!instance || !isInstanceNode(instance) || !composite) {
          return;
        }
        const copy = copyComposite(composite, createId('object'), createId);
        const unique = retargetInstance(instance, copy.composite.id, copy.rename);
        commit({ [copy.composite.id]: copy.composite }, [
          {
            kind: 'update',
            id,
            values: { composite: unique.composite, overrides: unique.overrides, ports: unique.ports },
          },
          ...renamePortLinks(current, instance, unique),
        ]);
      },
      /** Copies a composite's definition; no instance changes. */
      duplicate: (composite: SceneId) => {
        const definition = registry.get(store.scenes)[composite];
        if (!definition) {
          return;
        }
        const copy = copyComposite(definition, createId('object'), createId);
        commit({ [copy.composite.id]: copy.composite }, []);
      },
      /** Places an instance of a composite at the centre of the view, at its own size. */
      place: (composite: SceneId) => {
        const definition = registry.get(store.scenes)[composite];
        const content = definition && compositeBounds(definition);
        if (!definition || !content || registry.get(atoms.isolation)) {
          return;
        }
        const camera = registry.get(atoms.camera);
        const center = screenToScene(camera, { x: viewport.width / 2, y: viewport.height / 2 });
        const frame = {
          x: center.x - content.width / 2,
          y: center.y - content.height / 2,
          width: content.width,
          height: content.height,
        };
        const current = registry.get(baseProjection.scene);
        const instance: InstanceNode = {
          type: 'instance',
          id: createId('instance'),
          z: topZ(Object.values(current.nodes)),
          center,
          size: { width: content.width, height: content.height },
          composite,
          ports: instancePorts(frame, definition),
          layer: activeLayer(current, registry.get(atoms.layer)),
        };
        baseProjection.apply({ kind: 'create', node: instance });
        select([instance.id]);
      },
      rename: (composite: SceneId, name: string) => {
        const definition = registry.get(store.scenes)[composite];
        if (definition) {
          commit({ [composite]: { ...definition, name } }, []);
        }
      },
      /** Removes a composite; with `instances`, every instance of it in the drawing too, else only an unused one. */
      remove: (composite: SceneId, instances: boolean) => {
        const before = registry.get(store.scenes);
        if (!instances && (instanceCounts(before)[composite] ?? 0) > 0) {
          return;
        }
        const { [composite]: _, ...rest } = before;
        const scenes: Record<SceneId, Scene> = {};
        for (const [id, scene] of Object.entries(rest)) {
          const used = Object.values(scene.nodes).filter(
            (node) => isInstanceNode(node) && node.composite === composite,
          );
          scenes[id] =
            used.length > 0 ? reduceIntent(scene, { kind: 'delete', ids: used.map((node) => node.id) }) : scene;
        }
        if (registry.get(atoms.isolation)?.composite === composite) {
          exitIsolation();
        }
        const model = baseProjection.snapshot();
        registry.set(store.scenes, scenes);
        recordStoreStep(registry, atoms.undo, sceneId(), model, before);
      },
    };
  }, [registry, atoms, store.scenes, baseProjection, root, select, viewport, exitIsolation]);

  //
  // Navigation.
  //

  // Undo restores a whole model snapshot, so the selection may name elements that no longer exist.
  const onUndo = useCallback(() => {
    if (!readonly && undo(projection, registry, atoms.undo, sceneId, store)) {
      select([]);
    }
  }, [readonly, projection, registry, atoms.undo, sceneId, store, select]);
  const onRedo = useCallback(() => {
    if (!readonly && redo(projection, registry, atoms.undo, sceneId, store)) {
      select([]);
    }
  }, [readonly, projection, registry, atoms.undo, sceneId, store, select]);

  //
  // Pointer state machine.
  //

  const { minor, major, snap, snapMinor } = useSceneSnap(grid, camera.zoom, snapEnabled);
  gridRef.current = { major, snap };
  const { setTool, toggleSnap, toggleGuides, toggleLattice, toggleDebug } = controller.tools;
  const {
    onBackgroundPointerDown,
    onPointerMove,
    onPointerUp,
    onContextMenu,
    cancelDrag,
    updateHover,
    onNodePointerDown,
    onLinkPointerDown,
    onLinkDoubleClick,
    onLinkContextMenu,
    onHandlePointerDown,
    onPortPointerDown,
    onEndPointerDown,
    onPointPointerDown,
    onMidpointPointerDown,
    onPointContextMenu,
    setDrag,
    toScene,
    removePoint,
    createdNode,
    commitCreated,
    menu,
    closeMenu,
    menuAnchorRef,
  } = usePointerMachine({
    registry,
    atoms,
    setTool: controller.tools.setTool,
    store,
    // A hidden layer's elements are not hit: gestures see the scene as drawn.
    scene: visible,
    nodeRegistry,
    projection,
    capabilities,
    camera,
    rootRef,
    interactedRef,
    select,
    setCamera,
    cancelAnimation,
    isNavigating,
    cell,
    minor,
    major,
    snap,
    snapMinor,
  });

  // A gesture begun before the view turned read-only is dropped, not committed on release, and a drawing tool gives way
  // to select, since read-only offers only select and pan.
  useEffect(() => {
    if (readonly) {
      cancelDrag();
      if (registry.get(atoms.tool).kind !== 'hand') {
        setTool({ kind: 'select' });
      }
    }
  }, [readonly, cancelDrag, registry, atoms.tool, setTool]);

  //
  // Clipboard.
  //

  const { copy, cut, paste } = controller.editing;

  const onSceneKey = useSceneKeys({
    registry,
    atoms,
    scene,
    nodeRegistry,
    linkRegistry,
    projection,
    capabilities,
    viewport,
    inset,
    grid,
    select,
    toggleSnap,
    toggleGuides,
    toggleLattice,
    toggleDebug,
    onUndo,
    onRedo,
    onFit: enterFit,
    onExitFit: exitFit,
    animateTo,
    drillIn,
    drillOut: back,
    goHistory,
    major,
    copy,
    cut,
    paste,
    cancelDrag,
    removePoint,
    setTool,
    timeline: timelineKeys,
  });

  // Shortcuts belong to the canvas itself: keys typed into a control the view hosts (the properties
  // panel, a toolbar) bubble here too, and must not toggle debug or delete the selection.
  const onKeyDown = useCallback<typeof onSceneKey>(
    (event) => {
      if (event.target === event.currentTarget) {
        onSceneKey(event);
      } else if (keyAction(event) === 'cancel' && registry.get(atoms.active) !== undefined) {
        // Escape out of a node's live content leaves it inert and the node selected, as a click outside would not.
        registry.set(atoms.active, undefined);
        rootRef.current?.focus();
      }
    },
    [onSceneKey, registry, atoms.active],
  );

  //
  // Render.
  //

  /** The node a create gesture would land while one is in flight; the ghost and the frame both read it. */
  const createPreview = useMemo(
    () => (drag?.kind === 'create' ? createdNode(drag, PREVIEW_NODE_ID) : undefined),
    [drag, createdNode],
  );

  // Transient drag state is rendered by projecting it onto a copy, so links re-route while dragging and
  // a link being drawn or re-attached over a drop target looks exactly as it will once dropped. Geometry
  // previews pass through the projection's `constrain`, so a drag shows where the drop will land, and
  // `blocked` says when the drop would be refused (drawn as is, outlined in red).
  // A move follows the pointer while it moves; once it rests for `SETTLE_MS`, the shapes snap to where they will land.
  const moveRaw = drag?.kind === 'move' ? drag.raw : undefined;
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    if (!moveRaw) {
      return;
    }
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [moveRaw?.x, moveRaw?.y]);

  const { displayScene, blocked, landing } = useMemo<{
    displayScene: Scene;
    blocked: boolean;
    /** Where a move in flight will land (snapped and constrained), while the nodes follow the pointer. */
    landing?: Bounds[];
  }>(() => {
    const preview = (intent: Intent) => {
      const constrained = projection.constrain ? projection.constrain(intent) : intent;
      return { displayScene: reduceIntent(scene, constrained ?? intent), blocked: constrained === undefined };
    };
    if (drag?.kind === 'move') {
      // A copy previews beside the originals, which stay; the drop mints the copies' real ids.
      const { ids, copy } = drag;
      const moveBy = (delta: Point): Intent => {
        let next = 0;
        const duplicate = copy
          ? duplicateSelection(scene, ids, delta, (prefix) => `${PREVIEW_NODE_ID}-${prefix}-${next++}`)
          : undefined;
        return duplicate ? duplicate.intent : { kind: 'move', ids, delta };
      };
      // The nodes follow the pointer smoothly; the frames they will snap to on the drop are drawn under them.
      const landed = preview(moveBy(drag.delta));
      const moved = copy
        ? Object.values(landed.displayScene.nodes).filter((node) => !scene.nodes[node.id])
        : ids.flatMap((id) => landed.displayScene.nodes[id] ?? []);
      return settled
        ? { displayScene: landed.displayScene, blocked: landed.blocked }
        : {
            displayScene: reduceIntent(scene, moveBy(drag.raw ?? drag.delta)),
            blocked: landed.blocked,
            // The landing is drawn only when the drop would be refused, the one thing following the pointer hides.
            landing: landed.blocked ? moved.map(nodeBounds) : undefined,
          };
    }
    if (drag?.kind === 'resize') {
      return preview({ kind: 'resize', id: drag.id, bounds: drag.bounds });
    }
    // A node being created previews as the type's own view inside its frame, whether drawn on the canvas
    // or dragged in from the palette (whose drag carries no image of its own).
    if (drag?.kind === 'create') {
      return createPreview ? preview({ kind: 'create', node: createPreview }) : { displayScene: scene, blocked: false };
    }
    if (drag?.kind === 'point') {
      return {
        displayScene: reduceIntent(scene, { kind: 'update', id: drag.id, values: { points: drag.points } }),
        blocked: false,
      };
    }
    // A link previews only once it has gone a grid cell, so a click with a link tool draws nothing.
    if (drag?.kind === 'link' && isLinkDrawn(drag, minor) && (drag.target || isPointEndpoint(drag.source))) {
      // A port drag previews once it reaches a target; a free-ended link previews as it will land.
      const link = createLink({
        type: drag.type,
        id: PREVIEW_LINK_ID,
        z: topZ(Object.values(scene.links)),
        source: drag.source,
        target: drag.target ?? { point: drag.to },
        midpoint: { x: (drag.from.x + drag.to.x) / 2, y: (drag.from.y + drag.to.y) / 2 },
      });
      return { displayScene: reduceIntent(scene, { kind: 'link', link }), blocked: false };
    }
    if (drag?.kind === 'end') {
      // The link is drawn as it will land: re-attached over a target, free-ended over empty canvas.
      const end: Endpoint = drag.target ?? { point: drag.to };
      return {
        displayScene: reduceIntent(scene, { kind: 'update', id: drag.id, values: { [drag.end]: end } }),
        blocked: false,
      };
    }
    return { displayScene: scene, blocked: false };
  }, [scene, drag, settled, createPreview, projection, minor]);

  /** The bounds a create gesture would land, drawn as a frame whether or not the node itself previews. */
  const createFrame = useMemo(() => {
    const preview = createPreview && displayScene.nodes[createPreview.id];
    return preview ? nodeBounds(preview) : undefined;
  }, [createPreview, displayScene]);

  const onPartCommit = useCallback(
    (node: Node, part: PartKey, text: string) => {
      registry.set(atoms.editing, undefined);
      const values = partValues(nodeRegistry, node, part, text);
      if (values && capabilities.update && text !== partText(nodeRegistry, node, part)) {
        projection.apply({ kind: 'update', id: node.id, values });
      }
    },
    [registry, atoms.editing, capabilities.update, projection, nodeRegistry],
  );
  const onPartCancel = useCallback(() => registry.set(atoms.editing, undefined), [registry, atoms.editing]);

  // Leaving a link waits a moment before it clears, so the pointer can reach the end handles drawn over it.
  const linkHover = useAtomValue(atoms.linkHover);
  const linkHoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onLinkHover = useCallback(
    (id: LinkId | undefined) => {
      clearTimeout(linkHoverTimer.current);
      if (id) {
        registry.set(atoms.linkHover, id);
      } else {
        linkHoverTimer.current = setTimeout(() => registry.set(atoms.linkHover, undefined), LINK_HOVER_GRACE_MS);
      }
    },
    [registry, atoms.linkHover],
  );
  useEffect(() => () => clearTimeout(linkHoverTimer.current), []);

  const handlers = useMemo<ElementHandlers>(
    () => ({
      onNodePointerDown,
      onLinkHover,
      onLinkPointerDown,
      onLinkDoubleClick,
      onLinkContextMenu,
      onPartCommit,
      onPartCancel,
      onNodeOpen: drillIn,
    }),
    [
      onNodePointerDown,
      onLinkHover,
      onLinkPointerDown,
      onLinkDoubleClick,
      onLinkContextMenu,
      onPartCommit,
      onPartCancel,
      drillIn,
    ],
  );

  // Resolved at the root from the model: pointer capture during a drag retargets the click, so a
  // double-click never reaches the node element itself. A text part under the pointer opens its editor;
  // the DOM is asked only which part, and the node comes from the model, so a part of a nested (live)
  // scene never matches the root node over it.
  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const node = hitTest(scene, toScene(event));
      if (!node) {
        return;
      }
      const target = document.elementFromPoint(event.clientX, event.clientY);
      // A floating panel over the node took the clicks, so the node beneath is not the one meant; content embedded in
      // the node (an editor) keeps its own double-click (selecting a word).
      if (
        !(target instanceof Element) ||
        !target.closest('[data-node-id]') ||
        target.closest(`[${SCENE_OVERLAY_ATTRIBUTE}]`)
      ) {
        return;
      }
      const partElement = target.closest('[data-part]');
      const part =
        partElement?.closest('[data-node-id]')?.getAttribute('data-node-id') === node.id
          ? (partElement?.getAttribute('data-part') ?? undefined)
          : undefined;
      if (part && capabilities.update && partText(nodeRegistry, node, part) !== undefined) {
        select([node.id]);
        registry.set(atoms.editing, { id: node.id, part });
      } else if (nodeDef(nodeRegistry, node)?.openable) {
        drillIn(node);
      }
    },
    [scene, toScene, nodeRegistry, drillIn, capabilities.update, select, registry, atoms.editing],
  );

  // A node type dragged in (from the palette or a host's draggable) previews as a create drag would and
  // lands through the same drop, so what the ghost shows is what is created.
  const onPointerUpRef = useRef(onPointerUp);
  onPointerUpRef.current = onPointerUp;
  useEffect(() => {
    const element = rootRef.current;
    if (!element) {
      return;
    }
    // The pointer is the shape's centre; its top-left snaps to the minor grid, as a move does, so the shape
    // lands where it was dropped rather than up to half a major cell away.
    const dragAt = (type: NodeType, input: { clientX: number; clientY: number }): Drag => {
      const point = toScene(input);
      const def = nodeRegistry[type];
      const size = def ? nominalSize(def.defaultSize, cell) : { width: 0, height: 0 };
      const from = { x: snapMinor(point.x - size.width / 2), y: snapMinor(point.y - size.height / 2) };
      return { kind: 'create', type, from, to: from, dropped: true };
    };
    return dropTargetForElements({
      element,
      canDrop: ({ source }) => capabilities.create === true && nodeDragType(source.data) !== undefined,
      onDragEnter: ({ source, location }) => {
        const type = nodeDragType(source.data);
        if (type !== undefined) {
          setDrag(dragAt(type, location.current.input));
        }
      },
      onDrag: ({ source, location }) => {
        const type = nodeDragType(source.data);
        if (type !== undefined) {
          setDrag(dragAt(type, location.current.input));
        }
      },
      onDragLeave: cancelDrag,
      // Placed where it is released: the last drag-over can lag the pointer by a step.
      onDrop: ({ source, location }) => {
        const type = nodeDragType(source.data);
        if (type !== undefined) {
          setDrag(dragAt(type, location.current.input));
        }
        onPointerUpRef.current();
      },
    });
  }, [capabilities.create, nodeRegistry, cell, toScene, snapMinor, setDrag, cancelDrag]);

  const zoomTo = useCallback(
    (zoom: number) => {
      interactedRef.current = true;
      exitFit();
      const centre = { x: viewport.width / 2, y: viewport.height / 2 };
      // From where the camera is headed, so a click during an animation retargets it rather than stepping from midway.
      animateTo(zoomAt(cameraTarget(), centre, zoom));
    },
    [viewport, animateTo, cameraTarget, exitFit],
  );
  // Steps from the in-flight target: clicks in quick succession compound into one move instead of several jumps.
  const zoomBy = useCallback((factor: number) => zoomTo(cameraTarget().zoom * factor), [zoomTo, cameraTarget]);

  const deleteSelection = controller.selection.delete;

  /** A default-sized node of `type` centred in the view, its top-left on the grid. */
  const createAtCentre = useCallback(
    (type: NodeType) => {
      const def = nodeRegistry[type];
      if (!def || !capabilities.create) {
        return;
      }
      const size = nominalSize(def.defaultSize, cell);
      // The camera is read when the command runs, so the command keeps its identity while the view moves.
      const centre = screenToScene(registry.get(atoms.camera), { x: viewport.width / 2, y: viewport.height / 2 });
      const from = { x: snapMinor(centre.x - size.width / 2), y: snapMinor(centre.y - size.height / 2) };
      // `dropped`: there is no drawn box, so the type's default size applies, as for a palette drop.
      const node = createdNode({ kind: 'create', type, from, to: from, dropped: true }, createId(type));
      if (node) {
        commitCreated(node);
      }
    },
    [nodeRegistry, capabilities.create, cell, snapMinor, registry, atoms.camera, viewport, createdNode, commitCreated],
  );

  const toolbarActions = useMemo<ToolbarActions>(
    () => ({
      // In isolation the crumbs read `Objects › <name>`, and the first leads back out.
      path: isolation ? [OBJECTS_CRUMB, isolation.composite] : path,
      nameOf: (id) => (id === OBJECTS_CRUMB ? 'Objects' : nameOf(id)),
      onPath: (index) => (isolation ? index === 0 && exitIsolation() : drillOut(path.length - 1 - index)),
      fit: enterFit,
      fitting,
      zoomReset: () => zoomTo(NOMINAL_ZOOM),
      zoomIn: () => zoomBy(ZOOM_STEP),
      zoomOut: () => zoomBy(1 / ZOOM_STEP),
      snap: snapEnabled,
      toggleSnap,
      // Only a lattice scene has a lattice to snap to.
      ...(projection.lattice ? { lattice: latticeOn, toggleLattice } : {}),
      debug,
      toggleDebug,
      canUndo,
      canRedo,
      undo: onUndo,
      redo: onRedo,
      hasSelection: selection.size > 0,
      hasClipboard: clipboard !== undefined,
      cut,
      copy,
      paste: () => paste(),
      delete: deleteSelection,
      create: createAtCentre,
      // A selection of two or more is what the user asked to tidy; one node alone means the board.
      layout: capabilities.layout
        ? () => projection.apply({ kind: 'layout', ids: selection.size > 1 ? [...selection] : undefined })
        : undefined,
    }),
    [
      path,
      nameOf,
      drillOut,
      isolation,
      exitIsolation,
      enterFit,
      fitting,
      zoomBy,
      zoomTo,
      snapEnabled,
      toggleSnap,
      latticeOn,
      toggleLattice,
      debug,
      toggleDebug,
      canUndo,
      canRedo,
      onUndo,
      onRedo,
      selection,
      clipboard,
      cut,
      copy,
      paste,
      deleteSelection,
      createAtCentre,
      capabilities.layout,
      projection,
    ],
  );

  // Commands on the selection, at the start of the inspector panel's toolbar.
  const selectedElements = [...selection].flatMap((id) => getElement(scene, id) ?? []);
  const canGroup =
    capabilities.create &&
    capabilities.delete &&
    selectedElements.length > 1 &&
    selectedElements.some((element) => !isLink(element));
  const canClass = store.styles !== undefined && capabilities.update && selectedElements.length === 1;
  const inspectorActions =
    readonly || (!canGroup && !canClass) ? undefined : (
      <>
        {canGroup && (
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--frame-corners--regular'
            label='New scene from selection'
            data-testid='inspector-group'
            onClick={controller.selection.group}
          />
        )}
        {canClass && (
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--swatches--regular'
            label='New class from selection'
            data-testid='inspector-new-class'
            onClick={controller.selection.classFrom}
          />
        )}
      </>
    );

  return (
    <CanvasProvider
      registry={registry}
      controller={controller}
      atoms={atoms}
      store={store}
      projection={projection}
      capabilities={capabilities}
      readonly={readonly}
      onReadonlyChange={onReadonlyChange}
      nodeRegistry={nodeRegistry}
      linkRegistry={linkRegistry}
      scene={scene}
      displayScene={displayScene}
      blocked={blocked}
      bounds={bounds}
      path={path}
      measured={measured}
      viewport={viewport}
      grid={grid}
      snapEnabled={snapEnabled}
      guides={guides}
      toggleGuides={toggleGuides}
      latticeOn={latticeOn}
      selection={selection}
      editing={editing}
      active={active}
      clipboard={clipboard}
      drag={drag}
      tool={tool}
      debug={debug}
      // Read-only, nothing is edited, so there is no dock taking room from the canvas and no inspector floats over it.
      createFrame={createFrame}
      landing={landing}
      handlers={handlers}
      linkHover={linkHover}
      select={select}
      toolbarActions={toolbarActions}
      navigating={navigating}
      opening={opening}
      drillIn={drillIn}
      childFrame={childFrame}
      copy={copy}
      cut={cut}
      paste={paste}
      onHandlePointerDown={onHandlePointerDown}
      onPortPointerDown={onPortPointerDown}
      onEndPointerDown={onEndPointerDown}
      onPointPointerDown={onPointPointerDown}
      onMidpointPointerDown={onMidpointPointerDown}
      onPointContextMenu={onPointContextMenu}
      setTool={setTool}
      removePoint={removePoint}
      menu={menu}
      closeMenu={closeMenu}
      menuAnchorRef={menuAnchorRef}
      look={look}
      themes={themes}
      themeOverride={theme}
      themeGrid={themeGrid}
      onThemeChange={onThemeChange}
      onBackgroundGridChange={onBackgroundGridChange}
      baseProjection={baseProjection}
      timeline={timeline}
      time={time}
      playing={playing}
      fps={fps}
      seek={seek}
      timelineKeys={timelineKeys}
      isolation={isolation}
      isolate={isolate}
      objectActions={objectActions}
      generated={generated}
    >
      <SceneLookContext.Provider value={look}>
        <InspectorPanel.Root
          docked={!readonly && inspectors === 'docked'}
          readonly={readonly}
          selected={selection.size > 0}
          actions={inspectorActions}
          onDockedChange={onInspectorsChange && ((docked) => onInspectorsChange(docked ? 'docked' : 'floating'))}
        >
          {/* The canvas beside the dock, which docked inspectors move into; with none docked, it takes no space.
            Clipped rather than hidden: a hidden box still scrolls, so focusing content embedded in a node (an editor's
            caret) would scroll the whole canvas to reveal it, out from under the camera. */}
          <div className={mx('relative flex dx-fill overflow-clip bg-base-surface', classNames)}>
            <div
              ref={rootRef}
              tabIndex={0}
              className={mx(
                'relative grow h-full overflow-clip outline-none touch-none select-none bg-base-surface',
                // A theme with a mode takes it over the app's, for everything over the canvas.
                look.tone === 'dark' && 'dark',
                tool.kind === 'hand' && 'cursor-grab',
                tool.kind === 'node' && 'cursor-crosshair',
              )}
              style={look.tone === 'light' ? { ...LIGHT_MODE, contain: 'strict' } : { contain: 'strict' }}
              data-testid='scene-view'
              data-mode={look.tone === 'theme' ? undefined : look.tone}
              onPointerDown={onBackgroundPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              // A cancelled pointer (a touch the browser took over) abandons the gesture rather than landing it.
              onPointerCancel={cancelDrag}
              onPointerLeave={() => updateHover(undefined)}
              onDoubleClick={onDoubleClick}
              onContextMenu={onContextMenu}
              onKeyDown={onKeyDown}
            >
              {children}
            </div>
            <InspectorPanel.Content />
          </div>
        </InspectorPanel.Root>
      </SceneLookContext.Provider>
    </CanvasProvider>
  );
};

CanvasRoot.displayName = 'Canvas.Root';
