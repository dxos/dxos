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
import React, {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as Menu from '@dxos/react-ui/Menu';
import type * as Util from '@dxos/react-ui/Util';
import * as VirtualAnchor from '@dxos/react-ui/VirtualAnchor';
import { mx } from '@dxos/ui-theme';

import {
  SCENE_OVERLAY_ATTRIBUTE,
  SceneLookContext,
  useChanging,
  useRegistry,
  useSceneProjection,
  useViewport,
  useWheel,
} from '../../hooks/index.ts';
import {
  type Drag,
  type InspectorMode,
  type SceneViewAtoms,
  createSceneViewAtoms,
  isMoving,
} from '../../model/atoms.ts';
import { keyAction } from '../../model/keys.ts';
import { nodeDef } from '../../model/node-def.ts';
import {
  type FreehandProjectionOptions,
  type Projection,
  readonlyCapabilities,
  reduceIntent,
} from '../../model/projection.ts';
import {
  type LinkRegistry,
  type NodeRegistry,
  defaultLinkRegistry,
  defaultNodeRegistry,
} from '../../model/registry.ts';
import { type SceneStore } from '../../model/store.ts';
import {
  type BackgroundGrid,
  type ThemeRegistry,
  defaultThemeRegistry,
  resolveBackground,
  resolveLook,
} from '../../model/style-set.ts';
import {
  type Bounds,
  type Camera,
  DEFAULT_GRID,
  type ElementId,
  type Endpoint,
  type Intent,
  type Layer,
  type LayerId,
  type LinkId,
  MAJOR_GRID_RATIO,
  type Node,
  type NodeType,
  type Point,
  type Scene,
  type SceneId,
  isFrameNode,
  isPointEndpoint,
} from '../../model/types.ts';
import {
  MIN_ZOOM,
  NOMINAL_ZOOM,
  cameraTransform,
  fitBounds,
  layerOpacity,
  panBy,
  sceneToScreen,
  screenToScene,
  zoomAt,
} from '../../utils/camera.ts';
import { duplicateSelection } from '../../utils/clipboard.ts';
import { nodeDragType } from '../../utils/dnd.ts';
import { groupIntoScene } from '../../utils/group.ts';
import { boundsFromPoints, hitTest } from '../../utils/hit.ts';
import {
  activeLayer,
  createLayer,
  mergeLayersIntent,
  moveLayer,
  sceneLayers,
  visibleScene,
} from '../../utils/layers.ts';
import { topZ } from '../../utils/order.ts';
import { type PartKey, partText, partValues } from '../../utils/parts.ts';
import { sceneOptions } from '../../utils/scenes.ts';
import { createLink, nodeBounds, nominalSize } from '../../utils/shapes.ts';
import { recordScenes, redo, undo } from '../../utils/undo.ts';
import { About, type AboutStat } from '../About/About.tsx';
import {
  BackgroundField,
  BackgroundFill,
  GrainOverlay,
  backgroundField,
  drawsField,
} from '../Background/Background.tsx';
import { WashCanvas, supportsWashCanvas } from '../Background/WashCanvas.tsx';
import { ControlFrame } from '../ControlFrame/ControlFrame.tsx';
import { GridComponent } from '../Grid/index.ts';
import { LatticeGrid } from '../LatticeGrid/index.ts';
import { LayersPanel } from '../Layers/Layers.tsx';
import { Palette } from '../Palette/Palette.tsx';
import { Properties, type PropertiesProps } from '../Properties/Properties.tsx';
import { type ElementHandlers, MAX_LIVE_DEPTH, SceneLayer } from '../SceneLayer/SceneLayer.tsx';
import { ThemeBar } from '../ThemeBar/ThemeBar.tsx';
import { ActionToolbar, CameraToolbar, NavigationToolbar, type ToolbarActions } from '../Toolbar/Toolbar.tsx';
import { Dock, DockProvider } from './Dock.tsx';
import { INSPECTOR_CLASSES, type InspectorDef, useInspector } from './Inspector.tsx';
import { SceneViewProvider, useSceneViewContext } from './SceneViewContext.ts';
import { PREVIEW_NODE_ID, createId, isLinkDrawn, usePointerMachine } from './usePointerMachine.ts';
import { useSceneCamera } from './useSceneCamera.ts';
import { useSceneClipboard } from './useSceneClipboard.ts';
import { useSceneKeys } from './useSceneKeys.ts';
import { useSceneNavigation } from './useSceneNavigation.ts';
import { GRID_LEVELS, GRID_RANGE, useSceneSnap } from './useSceneSnap.ts';

/** The longest step a drifting view takes in one frame, in seconds, however long the frame was in coming. */
const MAX_DRIFT_STEP = 0.1;

/** Milliseconds the camera's zoom must hold still before the background grid fades back in. */
const ZOOM_SETTLE = 250;

/** Major cells between the scene's frame and the viewport edge when fitting; `margin` overrides it. */
const DEFAULT_MARGIN = 2;
/** Quiet time after the view's last resize before fit mode refits, so a drag-resize refits once, where it ends. */
const FIT_DEBOUNCE_MS = 150;

/** Quiet time after the camera's last move before `onCameraChange` reports it. */
const CAMERA_SETTLE_MS = 300;
/** Zoom factor of one toolbar step. */
const ZOOM_STEP = 1.25;
/** How long a link stays hovered after the pointer leaves it, so the pointer can reach its end handles. */
const LINK_HOVER_GRACE_MS = 150;

/** How long a move's pointer rests before the shapes snap to where they will land. */
const SETTLE_MS = 200;

/**
 * The light scheme scoped on the canvas under a dark app: the theme's tokens resolve with `light-dark()` against the
 * element's colour scheme, and the variables the `.dark` class sets go back to the root's light values.
 */
const LIGHT_MODE: CSSProperties & Record<`--${string}`, string> = {
  'colorScheme': 'light',
  'color': 'var(--color-fg)',
  '--surface-bg': 'var(--color-base-surface)',
  '--foreground': 'var(--color-fg)',
  '--description-text': 'var(--color-fg-muted)',
  '--dx-lift': '-1',
  '--dx-attenuate-state': '0.5',
  '--dx-attenuate-well': '0.5',
  '--dx-attenuate-separator': '0.75',
  '--dx-attenuate-separator-line': '0.45',
};

/** The link drawn as a preview during a drag; it never reaches the model. */
const PREVIEW_LINK_ID = 'preview-link';

/**
 * The view's display toggles a host may persist: snapping (which draws the grid), the lattice guides, and fit mode
 * (the camera keeps the scene framed until the user pans or zooms).
 */
export type SceneDisplay = { snap: boolean; guides: boolean; fit: boolean };

export type SceneViewRootProps = Util.ThemedClassName<{
  store: SceneStore;
  root: SceneId;
  nodes?: NodeRegistry;
  links?: LinkRegistry;
  /** Projection per scene; freehand (identity) by default. */
  createProjection?: (options: FreehandProjectionOptions) => Projection;
  /** A host-owned projection instead, shared with the host's panels (see `useSceneProjection`). */
  projection?: Projection;
  /** Externally owned view state, e.g. to drive two views or persist the camera. */
  atoms?: SceneViewAtoms;
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
  /** Where the inspectors (properties, layers, about) sit: docked in a column beside the canvas, or floating over it. */
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
  children?: ReactNode;
}>;

const SceneViewRoot = ({
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
  inspectors = 'docked',
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
  children,
}: SceneViewRootProps) => {
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
  const atoms = useMemo(() => atomsProp ?? createSceneViewAtoms(root), [atomsProp, root]);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport(rootRef);

  const path = useAtomValue(atoms.path);
  const projection = useSceneProjection({ store, atoms, createProjection, projection: projectionProp });
  const scene = useAtomValue(projection.scene);
  const visible = useMemo(() => visibleScene(scene), [scene]);
  const scenes = useAtomValue(store.scenes);
  const camera = useAtomValue(atoms.camera);
  const selection = useAtomValue(atoms.selection);
  const hover = useAtomValue(atoms.hover);
  const selectedPoint = useAtomValue(atoms.point);
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
  const select = useCallback(
    (ids: Iterable<ElementId>) => {
      registry.set(atoms.selection, new Set(readonly ? [] : ids));
      registry.set(atoms.point, undefined);
    },
    [registry, atoms.selection, atoms.point, readonly],
  );
  useEffect(() => {
    if (readonly) {
      select([]);
    }
  }, [readonly, select]);

  const { nameOf, portalTo, bounds, fitTarget, pushHistory, drillIn, drillOut, goHistory } = useSceneNavigation({
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
  // The loop reads the velocity from a ref and restarts only as the pan starts or stops: a restart's first step is
  // empty, so restarting on every change of speed would stall the view for a frame each time.
  const driftRef = useRef<Point>({ x: 0, y: 0 });
  driftRef.current = { x: drift?.x ?? 0, y: drift?.y ?? 0 };
  const drifting = driftRef.current.x !== 0 || driftRef.current.y !== 0;
  useEffect(() => {
    if (!drifting) {
      return;
    }
    exitFit();
    // Timed from one frame's callback to the next, read from the clock rather than the frame's timestamp, which a
    // scheduler may round (a fake clock's frames fall on a 16 ms grid). Long gaps (a throttled background tab) are
    // capped, so the view never leaps.
    let last: number | undefined;
    let frame = requestAnimationFrame(function step() {
      const now = performance.now();
      const seconds = last === undefined ? 0 : Math.min(MAX_DRIFT_STEP, Math.max(0, (now - last) / 1000));
      last = now;
      // The camera offsets the content, so the view moves right as it moves left.
      const { x, y } = driftRef.current;
      setCamera((camera) => panBy(camera, { x: -x * seconds, y: -y * seconds }));
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [drifting, exitFit, setCamera]);
  // Dragging the canvas takes the camera over.
  useEffect(() => {
    if (drag?.kind === 'pan') {
      exitFit();
    }
  }, [drag?.kind, exitFit]);
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
        if (event.ctrlKey || event.metaKey) {
          setCamera((camera) => zoomAt(camera, pointer, camera.zoom * Math.exp(-event.deltaY * 0.01)));
        } else {
          setCamera((camera) => panBy(camera, { x: -event.deltaX / camera.zoom, y: -event.deltaY / camera.zoom }));
        }
      },
      [setCamera, cancelAnimation, touchNavigation, exitFit],
    ),
  );

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
  const toggleSnap = useCallback(() => registry.set(atoms.snap, !registry.get(atoms.snap)), [registry, atoms.snap]);
  const toggleGuides = useCallback(
    () => registry.set(atoms.guides, !registry.get(atoms.guides)),
    [registry, atoms.guides],
  );
  const toggleLattice = useCallback(
    () => registry.set(atoms.lattice, !registry.get(atoms.lattice)),
    [registry, atoms.lattice],
  );
  const toggleDebug = useCallback(() => registry.set(atoms.debug, !registry.get(atoms.debug)), [registry, atoms.debug]);
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
    setTool,
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

  const { copy, cut, paste } = useSceneClipboard({
    registry,
    atoms,
    scene,
    projection,
    capabilities,
    select,
    createId,
    major,
    snap,
  });

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
    drillOut,
    goHistory,
    major,
    copy,
    cut,
    paste,
    cancelDrag,
    removePoint,
    setTool,
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

  const pointer = useMemo(
    () => screenToScene(camera, { x: viewport.width / 2, y: viewport.height / 2 }),
    [camera, viewport],
  );

  // Shapes may land on free cells beyond the scene's frame, so the cells cover what is in view; only the view,
  // since a union with a distant frame would exceed the grid's cell budget and hide the lattice.
  const latticeBounds = useMemo(
    () =>
      boundsFromPoints(
        screenToScene(camera, { x: 0, y: 0 }),
        screenToScene(camera, { x: viewport.width, y: viewport.height }),
      ),
    [camera, viewport],
  );

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

  const deleteSelection = useCallback(() => {
    const ids = [...registry.get(atoms.selection)];
    if (ids.length > 0 && capabilities.delete) {
      projection.apply({ kind: 'delete', ids });
      select([]);
    }
  }, [registry, atoms.selection, capabilities.delete, projection, select]);

  /** A default-sized node of `type` centred in the view, its top-left on the grid. */
  const createAtCentre = useCallback(
    (type: NodeType) => {
      const def = nodeRegistry[type];
      if (!def || !capabilities.create) {
        return;
      }
      const size = nominalSize(def.defaultSize, cell);
      const from = { x: snapMinor(pointer.x - size.width / 2), y: snapMinor(pointer.y - size.height / 2) };
      // `dropped`: there is no drawn box, so the type's default size applies, as for a palette drop.
      const node = createdNode({ kind: 'create', type, from, to: from, dropped: true }, createId(type));
      if (node) {
        commitCreated(node);
      }
    },
    [nodeRegistry, capabilities.create, cell, snapMinor, pointer, createdNode, commitCreated],
  );

  const toolbarActions = useMemo<ToolbarActions>(
    () => ({
      path,
      nameOf,
      onPath: (index) => drillOut(path.length - 1 - index),
      fit: enterFit,
      fitting,
      zoomReset: () => zoomTo(NOMINAL_ZOOM),
      zoomIn: () => zoomBy(ZOOM_STEP),
      zoomOut: () => zoomBy(1 / ZOOM_STEP),
      snap: snapEnabled,
      toggleSnap,
      guides,
      toggleGuides,
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
      animateTo,
      fitTarget,
      enterFit,
      fitting,
      viewport,
      inset,
      zoomBy,
      zoomTo,
      snapEnabled,
      toggleSnap,
      guides,
      toggleGuides,
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

  // The portal on screen that fills most of the view; the rest of the layer fades as it grows, so zooming into
  // a scene (by wheel or drill-in) fades out what surrounds it and zooming out fades it back in.
  const focus = useMemo(() => {
    let best: { id: ElementId; opacity: number } | undefined;
    for (const node of Object.values(displayScene.nodes)) {
      // A frame the host opens itself (one showing an object) is no scene to zoom into, so it keeps its frame.
      if (!isFrameNode(node) || nodeDef(nodeRegistry, node)?.hostOpen?.(node)) {
        continue;
      }
      const bounds = nodeBounds(node);
      const centre = sceneToScreen(camera, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
      if (centre.x < 0 || centre.y < 0 || centre.x > viewport.width || centre.y > viewport.height) {
        continue;
      }
      const opacity = layerOpacity(camera, bounds, viewport);
      if (!best || opacity < best.opacity) {
        best = { id: node.id, opacity };
      }
    }
    return best;
  }, [displayScene.nodes, nodeRegistry, camera, viewport]);

  /** One screen pixel in scene units, for chrome that should not grow with the camera. */
  const frameUnit = 1 / Math.max(camera.zoom, MIN_ZOOM);

  return (
    <SceneViewProvider
      registry={registry}
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
      latticeBounds={latticeBounds}
      path={path}
      camera={camera}
      pointer={pointer}
      measured={measured}
      frameUnit={frameUnit}
      focus={focus}
      grid={grid}
      snapEnabled={snapEnabled}
      guides={guides}
      latticeOn={latticeOn}
      selection={selection}
      hover={hover}
      selectedPoint={selectedPoint}
      editing={editing}
      active={active}
      clipboard={clipboard}
      drag={drag}
      tool={tool}
      debug={debug}
      // Read-only, nothing is edited, so there is no dock taking room from the canvas and no inspector floats over it.
      inspectors={readonly ? 'floating' : inspectors}
      onInspectorsChange={onInspectorsChange}
      createFrame={createFrame}
      landing={landing}
      handlers={handlers}
      linkHover={linkHover}
      select={select}
      toolbarActions={toolbarActions}
      navigating={navigating}
      opening={opening}
      drillIn={drillIn}
      copy={copy}
      cut={cut}
      paste={paste}
      onBackgroundPointerDown={onBackgroundPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={onContextMenu}
      cancelDrag={cancelDrag}
      updateHover={updateHover}
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
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      rootRef={rootRef}
      look={look}
      themes={themes}
      themeOverride={theme}
      themeGrid={themeGrid}
      onThemeChange={onThemeChange}
      onBackgroundGridChange={onBackgroundGridChange}
    >
      <SceneLookContext.Provider value={look}>
        <DockProvider>
          {/* The canvas beside the dock, which docked inspectors move into; with none docked, it takes no space.
            Clipped rather than hidden: a hidden box still scrolls, so focusing content embedded in a node (an editor's
            caret) would scroll the whole canvas to reveal it, out from under the camera. */}
          <div className={mx('flex dx-fill overflow-clip bg-base-surface', classNames)}>
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
            <Dock onClose={onInspectorsChange && (() => onInspectorsChange('floating'))} />
          </div>
        </DockProvider>
      </SceneLookContext.Provider>
    </SceneViewProvider>
  );
};

SceneViewRoot.displayName = 'SceneView.Root';

//
// Canvas
//

export type SceneViewCanvasProps = {
  /** Nested levels below the root that may mount live; deeper portals stay previews (decision 10). */
  liveDepth?: number;
  /** Extra layers drawn in scene coordinates under the camera, above the scene (e.g. a host's animations). */
  overlay?: ReactNode;
  /** What the background's field covers before its padding, in scene coordinates; the scene's bounds by default. */
  backgroundBounds?: Bounds;
};

/** The scene itself under the camera: the grid, the layer, the control frame and the menu a gesture opens. */
const SceneViewCanvas = ({ liveDepth = MAX_LIVE_DEPTH, overlay, backgroundBounds }: SceneViewCanvasProps) => {
  const {
    registry,
    atoms,
    store,
    capabilities,
    readonly,
    projection,
    nodeRegistry,
    displayScene,
    blocked,
    bounds,
    latticeBounds,
    camera,
    measured,
    frameUnit,
    focus,
    grid,
    snapEnabled,
    guides,
    latticeOn,
    selection,
    hover,
    selectedPoint,
    editing,
    active,
    clipboard,
    drag,
    debug,
    createFrame,
    landing,
    handlers,
    linkHover,
    select,
    navigating,
    opening,
    copy,
    cut,
    paste,
    onHandlePointerDown,
    onPortPointerDown,
    onEndPointerDown,
    onPointPointerDown,
    onMidpointPointerDown,
    onPointContextMenu,
    removePoint,
    menu,
    closeMenu,
    menuAnchorRef,
    look,
  } = useSceneViewContext('SceneView.Canvas');

  // Handles and ports belong to what is drawn: a hidden layer's elements show none.
  const shownScene = useMemo(() => visibleScene(displayScene), [displayScene]);

  const field = useMemo(
    () => backgroundField(look.background, backgroundBounds ?? bounds, latticeBounds),
    [look.background, backgroundBounds, bounds, latticeBounds],
  );
  const zooming = useChanging(camera.zoom, ZOOM_SETTLE);
  // While editing, a lines grid is the snap grid, which adapts its levels to the zoom, so the field draws no lines too.
  const snapLines = !readonly && look.background.grid === 'lines';
  // With WebGL, the surface and washes are drawn per pixel on the GPU (smooth, with no grain needed); the SVG field then
  // draws only the grid. Without it (a test DOM), the SVG draws the washes as before.
  const gpuWashes = look.background.washes.length > 0 && supportsWashCanvas();
  const fieldBackground = useMemo(
    () => ({
      ...look.background,
      ...(snapLines && { grid: 'none' as const }),
      ...(gpuWashes && { washes: [] }),
    }),
    [snapLines, gpuWashes, look.background],
  );

  return (
    <>
      {gpuWashes ? (
        <WashCanvas background={look.background} field={field} camera={camera} />
      ) : (
        <BackgroundFill background={look.background} />
      )}
      {/* Under the snap grid, in its own camera layer, so the grid a gesture lands on stays on top. */}
      {measured && drawsField(fieldBackground) && (
        <div
          className='absolute pointer-events-none'
          style={{ transform: cameraTransform(camera), transformOrigin: '0 0' }}
        >
          <BackgroundField
            background={fieldBackground}
            tone={look.tone}
            field={field}
            grid={grid}
            gridHidden={zooming}
          />
        </div>
      )}
      {/* Only while snapping: the lines are what a gesture lands on, so drawing them when nothing snaps
          states a constraint the canvas is not applying. The minor level goes when its cells get too
          small to read. Read-only, nothing snaps, so neither grid nor guides are drawn. A lattice scene snaps to its
          cells, not the lines, so its cells are its grid. The theme bar's grid choice decides whether they show. */}
      {snapEnabled && snapLines && !(latticeOn && projection.lattice) && (
        <GridComponent
          size={grid}
          scale={camera.zoom}
          offset={{ x: camera.x * camera.zoom, y: camera.y * camera.zoom }}
          showAxes={false}
          ratios={GRID_LEVELS}
          range={GRID_RANGE}
        />
      )}
      <div
        className={mx('absolute pointer-events-none', !measured && 'invisible')}
        style={{ transform: cameraTransform(camera), transformOrigin: '0 0' }}
      >
        {/* A lattice scene shows its cells: the places a shape may land, separated by the gutters. */}
        {guides && !readonly && latticeOn && projection.lattice && (
          <LatticeGrid spec={projection.lattice} bounds={latticeBounds} unit={frameUnit} />
        )}
        <div className='pointer-events-auto'>
          <SceneLayer
            store={store}
            scene={displayScene}
            registry={nodeRegistry}
            zoom={camera.zoom}
            depth={0}
            liveDepth={liveDepth}
            selected={selection}
            plain={isMoving(drag)}
            hover={hover}
            hoveredLink={linkHover}
            opening={opening}
            focus={focus}
            editing={editing}
            active={active}
            ghost={drag?.kind === 'create' ? PREVIEW_NODE_ID : undefined}
            debug={debug}
            handlers={handlers}
            // Routes follow the gutters in lattice mode, whether or not snap is on.
            lattice={latticeOn ? projection.lattice : undefined}
            cell={grid * MAJOR_GRID_RATIO}
          />
        </div>
        {/* Read-only, nothing is edited, so no selection frame, handle or port is drawn. */}
        {!readonly && (
          <ControlFrame
            scene={shownScene}
            registry={nodeRegistry}
            selection={selection}
            hover={hover}
            hoveredLink={drag ? undefined : linkHover}
            onLinkHover={handlers.onLinkHover}
            selectedPoint={selectedPoint}
            zoom={camera.zoom}
            drag={drag}
            capabilities={capabilities}
            createFrame={createFrame}
            landing={landing}
            blocked={blocked}
            lattice={latticeOn ? projection.lattice : undefined}
            onHandlePointerDown={onHandlePointerDown}
            onPortPointerDown={onPortPointerDown}
            onEndPointerDown={onEndPointerDown}
            onPointPointerDown={onPointPointerDown}
            onMidpointPointerDown={onMidpointPointerDown}
            onPointContextMenu={onPointContextMenu}
          />
        )}
        {overlay}
      </div>
      <GrainOverlay background={look.background} offset={{ x: camera.x * camera.zoom, y: camera.y * camera.zoom }} />
      {/* Wheel events still bubble to the root through the shield, so a zoom keeps zooming. */}
      {navigating && <div className='dx-cover' data-testid='navigation-shield' />}
      <span
        ref={menuAnchorRef}
        className='absolute size-0 pointer-events-none'
        style={{ left: menu?.at.x ?? 0, top: menu?.at.y ?? 0 }}
      />
      <Menu.Root
        open={menu !== undefined}
        onOpenChange={({ open }) => !open && closeMenu()}
        positioning={{
          ...VirtualAnchor.virtualAnchor(menuAnchorRef),
          placement: 'right',
          gutter: 4,
          overflowPadding: 8,
        }}
      >
        <Menu.Content>
          {menu?.kind === 'point' && (
            <Menu.Item
              data-testid='remove-point'
              onSelect={() => {
                const point = registry.get(atoms.point);
                if (point) {
                  removePoint(point);
                }
              }}
              item={{ value: 'Remove control point', label: 'Remove control point' }}
            />
          )}
          {menu?.kind === 'element' && (
            <>
              <Menu.Item
                data-testid='menu-cut'
                disabled={!capabilities.delete}
                onSelect={cut}
                item={{ value: 'Cut', label: 'Cut' }}
              />
              <Menu.Item data-testid='menu-copy' onSelect={copy} item={{ value: 'Copy', label: 'Copy' }} />
              <Menu.Item
                data-testid='menu-delete'
                disabled={!capabilities.delete}
                onSelect={() => {
                  projection.apply({ kind: 'delete', ids: [...registry.get(atoms.selection)] });
                  select([]);
                }}
                item={{ value: 'Delete', label: 'Delete' }}
              />
            </>
          )}
          {menu?.kind === 'canvas' && (
            <Menu.Item
              data-testid='menu-paste'
              disabled={!clipboard || !capabilities.create}
              onSelect={() => paste(menu.scene)}
              item={{ value: 'Paste', label: 'Paste' }}
            />
          )}
        </Menu.Content>
      </Menu.Root>
    </>
  );
};

SceneViewCanvas.displayName = 'SceneView.Canvas';

//
// Toolbars
//

export type SceneViewBarProps = Util.ThemedClassName<{}>;

/**
 * The frame a bar floats in: its content's width, but half the view at most (the bar scrolls beyond that).
 * The toolbar's own scroll frame is zero-height in flow, so `classNames` positions this frame, not the bar.
 */
const barFrame = 'absolute w-max max-w-[50%]';

/** Where the view is in the scene tree. */
const SceneViewNavigation = ({ classNames = 'top-2 left-2' }: SceneViewBarProps) => {
  const { toolbarActions } = useSceneViewContext('SceneView.Navigation');
  return (
    <div className={mx(barFrame, classNames)}>
      <NavigationToolbar actions={toolbarActions} />
    </div>
  );
};

SceneViewNavigation.displayName = 'SceneView.Navigation';

/** Everything that changes the view or the scene. */
const SceneViewActions = ({ classNames = 'bottom-2 left-1/2 -translate-x-1/2' }: SceneViewBarProps) => {
  const { toolbarActions, nodeRegistry, capabilities, readonly } = useSceneViewContext('SceneView.Actions');
  // Every action here edits the scene or how edits snap.
  if (readonly) {
    return null;
  }
  return (
    // Centred, it keeps clear of the camera bar (about 15rem with its inset) on both sides, scrolling beyond that.
    <div className={mx(barFrame, 'max-w-[calc(100%-30rem)]', classNames)}>
      <ActionToolbar actions={toolbarActions} nodes={nodeRegistry} capabilities={capabilities} />
    </div>
  );
};

SceneViewActions.displayName = 'SceneView.Actions';

/** The camera's controls and numbers; nothing here changes the scene. */
const SceneViewDebug = ({ classNames = 'bottom-2 left-2' }: SceneViewBarProps) => {
  const { toolbarActions, camera } = useSceneViewContext('SceneView.Debug');
  return (
    <div className={mx(barFrame, classNames)}>
      <CameraToolbar actions={toolbarActions}>{Math.round(camera.zoom * 100)}%</CameraToolbar>
    </div>
  );
};

SceneViewDebug.displayName = 'SceneView.Debug';

//
// Theme
//

/** The theme picker and the grid over its background, at the bottom right. */
const SceneViewTheme = ({ classNames = 'bottom-2 right-2' }: SceneViewBarProps) => {
  const { look, themes, themeOverride, themeGrid, onThemeChange, onBackgroundGridChange } =
    useSceneViewContext('SceneView.Theme');
  return (
    <div className={mx(barFrame, classNames)}>
      <ThemeBar
        registry={themes}
        theme={look.theme}
        override={themeOverride}
        grid={look.background.grid}
        themeGrid={themeGrid}
        onThemeChange={onThemeChange}
        onGridChange={onBackgroundGridChange}
      />
    </div>
  );
};

SceneViewTheme.displayName = 'SceneView.Theme';

//
// Palette
//

/** The tool rail: what the next gesture will draw. */
const SceneViewPalette = ({ classNames = 'absolute top-14 bottom-14 left-2' }: SceneViewBarProps) => {
  const { tool, nodeRegistry, linkRegistry, capabilities, readonly, onReadonlyChange, setTool } =
    useSceneViewContext('SceneView.Palette');
  return (
    // Spans the room the rail may take, so it can fold its groups to fit; the canvas below the rail keeps the pointer.
    <div className={mx('pointer-events-none', classNames)}>
      <Palette
        tool={tool}
        nodes={nodeRegistry}
        links={linkRegistry}
        capabilities={capabilities}
        readonly={readonly}
        onReadonlyChange={onReadonlyChange}
        onToolChange={setTool}
      />
    </div>
  );
};

SceneViewPalette.displayName = 'SceneView.Palette';

//
// Properties
//

export type SceneViewPropertiesProps = Util.ThemedClassName<
  Pick<PropertiesProps, 'fields' | 'db' | 'getOptions' | 'overrides'> & {
    /** Narrows the scenes a scene shape may open (e.g. to the host's own, not those it shows from elsewhere). */
    sceneFilter?: (id: SceneId) => boolean;
  }
>;

/** The selected element's properties: an inspector that floats only while something is selected. */
const SceneViewProperties = ({
  classNames = INSPECTOR_CLASSES,
  fields,
  db,
  getOptions,
  overrides,
  sceneFilter,
}: SceneViewPropertiesProps) => {
  const { projection, atoms, nodeRegistry, capabilities, selection, store, path } =
    useSceneViewContext('SceneView.Properties');
  const registry = useRegistry();
  const scenes = useAtomValue(store.scenes);
  const options = useMemo(() => sceneOptions(scenes, path, sceneFilter), [scenes, path, sceneFilter]);

  // The selection moves into a new scene, opened by a shape where it was; the shape is then the selection.
  const onGroup = useCallback(() => {
    const id = createId('scene');
    const current = registry.get(projection.scene);
    const group = groupIntoScene(current, selection, id, activeLayer(current, registry.get(atoms.layer)));
    if (!group) {
      return;
    }
    const before = registry.get(store.scenes);
    registry.set(store.scenes, { ...before, [id]: { ...group.child, name: 'Untitled' } });
    projection.apply({ kind: 'batch', intents: group.intents });
    // A projection may refuse the batch (`apply` reports nothing), so the shape's presence is the result: without
    // it the new scene would be an orphan, so it goes and the selection stays.
    if (!registry.get(projection.scene).nodes[id]) {
      const { [id]: _, ...scenes } = registry.get(store.scenes);
      registry.set(store.scenes, scenes);
      return;
    }
    // One undo step takes the new scene away with the shape that opens it.
    recordScenes(registry, atoms.undo, path[path.length - 1], before);
    registry.set(atoms.selection, new Set([id]));
    registry.set(atoms.point, undefined);
  }, [registry, projection, selection, store.scenes, atoms.layer, atoms.selection, atoms.point, atoms.undo, path]);

  // Docked, the panel stays in its section whatever is selected (it says when nothing is).
  return useInspector(
    PROPERTIES_INSPECTOR,
    ({ docked, classNames: chrome, onDockedChange }) => (
      <Properties
        classNames={chrome}
        docked={docked}
        onDockedChange={onDockedChange}
        projection={projection}
        atoms={atoms}
        nodes={nodeRegistry}
        fields={fields}
        db={db}
        getOptions={getOptions}
        overrides={overrides}
        sceneOptions={options}
        styles={store.styles}
        onGroup={capabilities.create && capabilities.delete ? onGroup : undefined}
        readonly={!capabilities.update}
      />
    ),
    classNames,
  );
};

SceneViewProperties.displayName = 'SceneView.Properties';

//
// Inspectors
//

const PROPERTIES_INSPECTOR: InspectorDef = {
  id: 'properties',
  title: 'Properties',
  icon: 'ph--sliders-horizontal--regular',
  order: 0,
  float: 'selection',
};

// Floating, the layers take the properties' place while nothing is selected.
const LAYERS_INSPECTOR: InspectorDef = {
  id: 'layers',
  title: 'Layers',
  icon: 'ph--stack--regular',
  order: 1,
  float: 'empty',
};

// The counts are a dock section only, so a floating or read-only view shows none.
const ABOUT_INSPECTOR: InspectorDef = {
  id: 'about',
  title: 'About',
  icon: 'ph--info--regular',
  order: 2,
  float: 'never',
};

//
// Layers
//

export type SceneViewLayersProps = Util.ThemedClassName<{}>;

/**
 * The current scene's layers: an inspector that floats where the properties go while nothing is selected (the two take
 * turns). Each edit is one intent, so one undo step.
 */
const SceneViewLayers = ({ classNames = INSPECTOR_CLASSES }: SceneViewLayersProps) => {
  const { projection, atoms, capabilities } = useSceneViewContext('SceneView.Layers');
  const registry = useRegistry();
  const scene = useAtomValue(projection.scene);
  const active = useAtomValue(atoms.layer);
  const layers = useMemo(() => sceneLayers(scene), [scene]);
  const readonly = !capabilities.update;
  const setLayer = useCallback((layer: Layer) => projection.apply({ kind: 'layer', layer }), [projection]);
  const byId = useCallback((id: LayerId) => layers.find((layer) => layer.id === id), [layers]);
  // The layers picked in the panel; the active layer (the top-most of them) is the one new shapes go on.
  const [picked, setPicked] = useState<LayerId[]>([]);
  const top = activeLayer(scene, active);
  const selected = useMemo(() => {
    const ids = picked.filter((id) => byId(id));
    return ids.includes(top) ? ids : [top];
  }, [picked, byId, top]);
  const select = useCallback(
    (ids: LayerId[]) => {
      setPicked(ids);
      const topMost = [...layers].reverse().find((layer) => ids.includes(layer.id));
      topMost && registry.set(atoms.layer, topMost.id);
    },
    [layers, registry, atoms],
  );
  return useInspector(
    LAYERS_INSPECTOR,
    ({ docked, classNames: chrome, onDockedChange }) => (
      <LayersPanel
        classNames={chrome}
        docked={docked}
        onDockedChange={onDockedChange}
        layers={layers}
        selected={selected}
        readonly={readonly}
        onSelectedChange={select}
        onToggle={(id) => {
          const layer = byId(id);
          layer && setLayer({ ...layer, hidden: !layer.hidden });
        }}
        onRename={(id, name) => {
          const layer = byId(id);
          layer && setLayer({ ...layer, name });
        }}
        onMove={(id, index) => {
          const layer = moveLayer(scene, id, index);
          layer && setLayer(layer);
        }}
        onCreate={() => {
          const layer = createLayer(scene, createId('layer'));
          setLayer(layer);
          select([layer.id]);
          return layer.id;
        }}
        onDelete={
          capabilities.delete
            ? (ids) => {
                projection.apply({ kind: 'batch', intents: ids.map((id): Intent => ({ kind: 'removeLayer', id })) });
                setPicked([]);
              }
            : undefined
        }
        onMerge={(ids, into) => {
          const merge = mergeLayersIntent(scene, ids, into);
          if (merge) {
            projection.apply(merge);
            select([into]);
          }
        }}
      />
    ),
    classNames,
  );
};

SceneViewLayers.displayName = 'SceneView.Layers';

//
// About
//

/** Counts of the scene's objects and the drawing's scenes: an inspector that never floats. */
const SceneViewAbout = () => {
  const { scene, store } = useSceneViewContext('SceneView.About');
  const scenes = useAtomValue(store.scenes);
  const stats = useMemo<AboutStat[]>(
    () => [
      { id: 'nodes', label: 'Nodes', value: Object.keys(scene.nodes).length },
      { id: 'links', label: 'Links', value: Object.keys(scene.links).length },
      { id: 'layers', label: 'Layers', value: Object.keys(scene.layers ?? {}).length },
      { id: 'scenes', label: 'Scenes', value: Object.keys(scenes).length },
    ],
    [scene, scenes],
  );
  return useInspector(ABOUT_INSPECTOR, ({ classNames, onDockedChange }) => (
    <About classNames={classNames} stats={stats} onDockedChange={onDockedChange} />
  ));
};

SceneViewAbout.displayName = 'SceneView.About';

export const SceneView = {
  Root: SceneViewRoot,
  Canvas: SceneViewCanvas,
  Navigation: SceneViewNavigation,
  Actions: SceneViewActions,
  Debug: SceneViewDebug,
  Theme: SceneViewTheme,
  Palette: SceneViewPalette,
  Properties: SceneViewProperties,
  Layers: SceneViewLayers,
  About: SceneViewAbout,
};
