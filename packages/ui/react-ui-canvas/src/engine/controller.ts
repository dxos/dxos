//
// Copyright 2026 DXOS.org
//

import type * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import {
  type BackgroundGrid,
  type Bounds,
  type Camera,
  type Capabilities,
  type ElementId,
  type Intent,
  type Node,
  type NodeRegistry,
  OPACITY_PATH,
  type Point,
  type Size,
  type StyleClass,
  type Tool,
  type View,
  type ViewId,
  type ViewMap,
  type ViewStore,
  clampTime,
  createTimeline,
  getElement,
  getPath,
  isInstanceNode,
  isLink,
  isViewNode,
  keyTimes,
  moveKeys,
  nodeAnimatable,
  nodeDef,
  pruneOrphaned,
  removeKey as removeTimelineKey,
  setKey,
  storeVersions,
  timelineFps,
} from '../model/index.ts';
import {
  DRILL_ANIMATION_MS,
  EMPTY_FRAME,
  NOMINAL_ZOOM,
  activeLayer,
  between,
  childFrame,
  classedLink,
  classedNode,
  clipboardBounds,
  composeSelection,
  compositeBounds,
  compositeViews,
  contentBounds,
  copySelection,
  createId,
  duplicateSelection,
  enterPortal,
  exitPortal,
  fitBounds,
  fitFrame,
  nodeBounds,
  pastedRecords,
  pasteFragment,
  promotedBy,
  restackZ,
  topZ,
  ungroupInstance,
  unionBounds,
  zoomAt,
} from '../utils/index.ts';
import { type CanvasAtoms, type HistoryEntry } from './atoms.ts';
import { type CanvasHistory, createCommitter } from './history.ts';
import { type Projection, readonlyCapabilities, reduceIntent } from './projection.ts';

/** The grid a paste steps along and snaps to, which depends on the zoom. */
export type ControllerGrid = { major: number; snap: (value: number) => number };

/** How the view moves its camera; without one the camera jumps, as nothing animates it. */
export type CameraMotion = {
  /** Animates to `target`, calling `done` when the last frame lands; `duration` fixes its length in ms. */
  animateTo: (target: Camera, done?: () => void, duration?: number) => void;
  /** Where the camera is headed: an animation's target while one is in flight, else the camera itself. */
  target: () => Camera;
  /** The portal a drill-in is zooming into, while it is. */
  setOpening: (id: ElementId | undefined) => void;
};

/** What the view does around a camera move: it owns fit mode and whether the user has taken the camera over. */
export type ViewFit = {
  enterFit: () => void;
  exitFit: () => void;
  /** The user took the camera over, so the view stops fitting itself as it settles. */
  takeOver: () => void;
};

/** The host's handlers for the look; a command whose handler is absent does nothing, as the host owns the value. */
export type LookHandlers = {
  onThemeChange?: (theme: string | undefined) => void;
  onBackgroundGridChange?: (grid: BackgroundGrid | undefined) => void;
};

export type CanvasControllerOptions = {
  registry: Registry.AtomRegistry;
  atoms: CanvasAtoms;
  store: ViewStore;
  /** The open View's projection, read when a command runs: it changes as the View changes. */
  projection: () => Projection;
  /** The projection under the animated one, which keys and timeline edits are written through. */
  baseProjection: () => Projection;
  /** What each node type animates, for keying the selection. */
  nodeRegistry: () => NodeRegistry;
  /** Read when a command runs: the host may toggle it. */
  readonly: () => boolean;
  grid: () => ControllerGrid;
  /** The view's size in screen px. */
  viewport: () => Size;
  /** Least gap between a fitted frame and each viewport edge, in scene units. */
  inset: () => number;
  /** What Fit frames instead of the scene's shapes, when the host gives one. */
  frame?: () => Bounds | undefined;
  camera?: () => CameraMotion;
  fit?: () => ViewFit;
  look?: () => LookHandlers;
  /** Runs each edit as one undo step; without one, edits are applied and nothing is recorded. */
  history?: () => Pick<CanvasHistory, 'commit'>;
  /** Fresh ids; injectable so tests are deterministic. */
  createId?: (prefix: string) => string;
};

/** Where the camera is and which View is open (DESIGN.md §13.1, the Navigation aspect). */
export type NavigationCommands = {
  /** Opens a node: an instance's composite in isolation, a frame's scene by drilling in, or the host's own view of it. */
  drillIn: (node: Node, animate?: boolean) => void;
  /** Backs out `levels` scenes, each through the frame it was entered with. */
  drillOut: (levels?: number, animate?: boolean) => void;
  /** Backs out a level: out of isolation first. */
  back: () => void;
  goHistory: (offset: number) => void;
  /**
   * Opens the View at `path` (root first) from wherever the view is: out to the shared ancestor, then in through each
   * frame, animating only the last step; then selects `select` there. A path the canvas cannot reach stops where it can.
   */
  openView: (path: readonly ViewId[], options?: { animate?: boolean; select?: Iterable<ElementId> }) => void;
  /**
   * Opens `path` as `openView` does or, with `isolate`, inside that Object opened on its own (`path` then starts with the
   * Object); then selects `select` there.
   */
  openPlace: (
    place: { path: readonly ViewId[]; isolate?: ViewId },
    options?: { animate?: boolean; select?: Iterable<ElementId> },
  ) => void;
  /** Opens the breadcrumb at `index`; in isolation the first leads back out. */
  openPath: (index: number) => void;
  /** Opens a composite on its own: its definition scene, fitted, on a plain background; Escape returns. */
  isolate: (composite: ViewId) => void;
  exitIsolation: () => void;
  /** Frames the scene and keeps it framed (fit mode) until the user pans or zooms. */
  fit: () => void;
  /** Frames the selected nodes, leaving fit mode. */
  fitSelection: () => void;
  /** Zooms about the view's centre from where the camera is headed, so quick clicks compound rather than jump. */
  zoomTo: (zoom: number) => void;
  zoomBy: (factor: number) => void;
  /** Back to true size about the view's centre, from where the camera is now. */
  resetZoom: () => void;
  /** A child scene's frame inside its portal, as drilling in maps it. */
  childFrame: (portal: Node, child: View) => Bounds;
  /** The frame of the scene at the head of `path`: once entered through a portal, the one it arrived with. */
  frame: (path: ViewId[], scene: View) => Bounds;
};

/** Theme and background (DESIGN.md §13.1, the Look aspect). */
export type LookCommands = {
  /** Picks the drawing's theme, or `undefined` for the default. */
  setTheme: (theme: string | undefined) => void;
  /** Picks the background's grid, or `undefined` for the background's own. */
  setBackgroundGrid: (grid: BackgroundGrid | undefined) => void;
};

/** What is selected (DESIGN.md §13.1, the Selection aspect). */
export type SelectionCommands = {
  select: (ids: Iterable<ElementId>) => void;
  clear: () => void;
  /**
   * Deletes the selection, and the records it leaves nothing pointing at (a View, an anonymous Object), in one undo
   * step; false when there was nothing to delete or deleting is not allowed.
   */
  delete: () => boolean;
  /** Groups the selection as an anonymous Object, replaced by one Instance of it; returns the Instance's id. */
  group: () => ElementId | undefined;
  /**
   * Replaces each selected Instance with its Object's contents, drawn where it drew them, and selects them; an
   * anonymous Object's definition goes with its Instance. Returns the new nodes' ids.
   */
  ungroup: () => ElementId[];
  /** A new style class with the one selected element's look, which the element then follows. */
  classFrom: () => string | undefined;
};

/** The intent helpers on the open View's document (DESIGN.md §13.1, the Document aspect). */
export type DocumentIntentCommands = {
  /**
   * Moves `element` just before or after its sibling `target` in the drawing order of `container`, which must be the
   * open View, as one intent (one undo step); false when nothing moved.
   */
  restack: (container: ViewId, element: ElementId, target: ElementId, position: 'before' | 'after') => boolean;
  /**
   * Drops a copy of the nodes `ids` and the links between them `delta` away, as one undo step, and selects it; an
   * anonymous Object placed again this way joins the library. False when nothing was copied.
   */
  duplicate: (ids: Iterable<ElementId>, delta: Point) => boolean;
};

/** Text editing and the clipboard (DESIGN.md §13.1, the Editing aspect). */
export type EditingCommands = {
  /** Whether anything was copied: a cut only deletes once the fragment is safely in the clipboard. */
  copy: () => boolean;
  cut: () => void;
  /** Pastes one grid step further each time, or with the fragment's top-left at `at` when given. */
  paste: (at?: Point) => void;
};

/** The active tool and the grid aids (DESIGN.md §13.1, the Tools aspect). */
export type ToolsCommands = {
  /** A creation tool clears the selection, whose outline would only sit over the drawing; a link tool sets the type. */
  setTool: (tool: Tool) => void;
  toggleSnap: () => void;
  toggleGuides: () => void;
  toggleDebug: () => void;
};

/** The clock and keyframing (DESIGN.md §13.1, the Time aspect). */
export type TimeCommands = {
  /** Pauses and moves the playhead, kept within the timeline. */
  seek: (t: number) => void;
  /** Plays from the start when stopped at the end. */
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setAutoKey: (autoKey: boolean) => void;
  /** Moves the playhead by whole frames. */
  step: (frames: number) => void;
  /** Moves the playhead to the selection's next (1) or previous (-1) key, or to the end (or start) when there is none. */
  jumpKey: (direction: 1 | -1) => void;
  /** Keys the selected nodes' animatable properties at the playhead, as they are drawn there. */
  addKey: () => void;
  /** Removes the selected nodes' keys at the playhead, on every one of their tracks. */
  removeKey: () => void;
  /** Moves the selected nodes' keys at `from` to `to`, and the playhead with them. */
  moveKey: (from: number, to: number) => void;
};

/**
 * The canvas's commands, organised by aspect. Each reads the state it needs from the registry when it runs, so the
 * controller is created once per canvas and its identity never changes with the state (DESIGN.md §13).
 */
export type CanvasController = {
  document: DocumentIntentCommands;
  navigation: NavigationCommands;
  look: LookCommands;
  selection: SelectionCommands;
  editing: EditingCommands;
  tools: ToolsCommands;
  time: TimeCommands;
};

export const createCanvasController = ({
  registry,
  atoms,
  store,
  projection,
  baseProjection,
  nodeRegistry,
  readonly,
  grid,
  viewport,
  inset,
  frame,
  camera: cameraMotion,
  fit: viewFit,
  look: lookHandlers,
  history: historyOption,
  createId: newId = createId,
}: CanvasControllerOptions): CanvasController => {
  const unrecorded = createCommitter(
    {
      store: storeVersions(registry, store),
      model: () => baseProjection().model,
      context: () => ({ path: [], selection: [] }),
    },
    () => {},
  );
  const commit: CanvasHistory['commit'] = (change, options) =>
    (historyOption?.().commit ?? unrecorded)(change, options);
  // A read-only canvas edits nothing whatever its projection allows, as `CanvasRoot` gates its own controls.
  const capabilities = (): Capabilities => (readonly() ? readonlyCapabilities : projection().capabilities);
  const currentScene = () => registry.get(projection().scene);
  const currentView = (): ViewId | undefined => registry.get(atoms.path).at(-1);

  const select = (ids: Iterable<ElementId>) => {
    registry.set(atoms.selection, new Set(readonly() ? [] : ids));
    registry.set(atoms.point, undefined);
  };

  /** The Views kept with no node opening them: the drawing's root, and any root of its own the store declares. */
  const roots = (views: ViewMap): ViewId[] => {
    const path = registry.get(atoms.isolation)?.back.path ?? registry.get(atoms.path);
    return [...path.slice(0, 1), ...Object.keys(views).filter((id) => store.isRoot?.(id))];
  };

  /**
   * Applies `intent` through `target` with `edit`'s change to the store's records, then deletes the records it leaves
   * nothing pointing at (VIEWS.md §7.4), all as one undo step; false when the projection refused the intent, which
   * leaves the records as they were.
   */
  const applyWithRecords = (
    target: Projection,
    intent: Intent,
    edit: (views: ViewMap) => ViewMap = (views) => views,
  ): boolean =>
    commit(() => {
      const before = registry.get(store.views);
      if (!commit(() => target.apply(intent))) {
        return;
      }
      const after = registry.get(store.views);
      const edited = edit(after);
      const next = pruneOrphaned(before, edited, roots(edited));
      if (next !== after) {
        registry.set(store.views, next);
      }
    });

  const selection: SelectionCommands = {
    select,
    clear: () => select([]),
    delete: () => {
      const ids = [...registry.get(atoms.selection)];
      if (ids.length === 0 || !capabilities().delete) {
        return false;
      }
      applyWithRecords(projection(), { kind: 'delete', ids });
      select([]);
      return true;
    },
    group: () => {
      if (!capabilities().create || !capabilities().delete) {
        return undefined;
      }
      const base = baseProjection();
      const current = registry.get(base.scene);
      const instanceId = newId('instance');
      const composition = composeSelection(current, registry.get(atoms.selection), {
        compositeId: newId('object'),
        instanceId,
        name: `Group ${compositeViews(registry.get(store.views)).length + 1}`,
        layer: activeLayer(current, registry.get(atoms.layer)),
        anonymous: true,
      });
      if (!composition) {
        return undefined;
      }
      const { composite, intents } = composition;
      applyWithRecords(base, { kind: 'batch', intents }, (views) => ({ ...views, [composite.id]: composite }));
      // A projection may refuse the batch or drop the Instance, which leaves the definition an orphan, already gone.
      if (!registry.get(base.scene).nodes[instanceId]) {
        return undefined;
      }
      select([instanceId]);
      return instanceId;
    },
    ungroup: () => {
      if (!capabilities().create || !capabilities().delete) {
        return [];
      }
      const base = baseProjection();
      const views = registry.get(store.views);
      // Each Instance is exploded into the scene the ones before it left, so their new nodes stack in order.
      let scene = registry.get(base.scene);
      const intents: Intent[] = [];
      for (const id of registry.get(atoms.selection)) {
        const instance = scene.nodes[id];
        const composite = instance && isInstanceNode(instance) ? views[instance.composite] : undefined;
        if (instance && isInstanceNode(instance) && composite) {
          const exploded = ungroupInstance(scene, instance, composite, newId);
          intents.push(...exploded);
          scene = reduceIntent(scene, { kind: 'batch', intents: exploded });
        }
      }
      if (intents.length === 0 || !applyWithRecords(base, { kind: 'batch', intents })) {
        return [];
      }
      const created = intents.flatMap((intent) => (intent.kind === 'create' ? [intent.node.id] : []));
      select(created);
      return created;
    },
    classFrom: () => {
      const [only, ...rest] = registry.get(atoms.selection);
      const element = only !== undefined && rest.length === 0 ? getElement(currentScene(), only) : undefined;
      if (!store.styles || !element || !capabilities().update) {
        return undefined;
      }
      const styleMap = registry.get(store.styles);
      const id = newId('class');
      const name = `Class ${Object.keys(styleMap).length + 1}`;
      const style = isLink(element) ? classedLink(element, styleMap).style : classedNode(element, styleMap).style;
      const styleClass: StyleClass = { id, name, ...(style ? { style } : {}) };
      registry.set(store.styles, { ...styleMap, [id]: styleClass });
      projection().apply({ kind: 'update', id: element.id, values: { class: id, style: undefined } });
      return id;
    },
  };

  const copy = () => {
    const fragment = copySelection(currentScene(), registry.get(atoms.selection), registry.get(store.views));
    if (fragment) {
      registry.set(atoms.clipboard, fragment);
    }
    return fragment !== undefined;
  };

  const editing: EditingCommands = {
    copy,
    cut: () => {
      if (!capabilities().delete || !copy()) {
        return;
      }
      applyWithRecords(projection(), { kind: 'delete', ids: [...registry.get(atoms.selection)] });
      select([]);
    },
    paste: (at) => {
      const fragment = registry.get(atoms.clipboard);
      if (!fragment || !capabilities().create) {
        return;
      }
      const scene = currentScene();
      const { major, snap } = grid();
      const bounds = clipboardBounds(fragment);
      const step = major * (fragment.pasted + 1);
      const offset = at && bounds ? { x: snap(at.x) - bounds.x, y: snap(at.y) - bounds.y } : { x: step, y: step };
      let nodeZ = topZ(Object.values(scene.nodes));
      let linkZ = topZ(Object.values(scene.links));
      const { intent, ids } = pasteFragment({
        clipboard: fragment,
        offset,
        createId: newId,
        nodeZ: () => (nodeZ = between(nodeZ, undefined)),
        linkZ: () => (linkZ = between(linkZ, undefined)),
        layer: activeLayer(scene, registry.get(atoms.layer)),
      });
      const records = pastedRecords(registry.get(store.views), fragment);
      applyWithRecords(projection(), intent, (views) =>
        Object.keys(records).length > 0 ? { ...views, ...records } : views,
      );
      registry.set(atoms.clipboard, { ...fragment, pasted: at ? fragment.pasted : fragment.pasted + 1 });
      select(ids);
    },
  };

  const toggle = (atom: Atom.Writable<boolean>) => () => registry.set(atom, !registry.get(atom));
  const tools: ToolsCommands = {
    setTool: (tool) => {
      registry.set(atoms.tool, tool);
      if (tool.kind === 'link') {
        registry.set(atoms.linkType, tool.type);
      }
      if (tool.kind === 'node' || tool.kind === 'link') {
        select([]);
      }
    },
    toggleSnap: toggle(atoms.snap),
    toggleGuides: toggle(atoms.guides),
    toggleDebug: toggle(atoms.debug),
  };

  const timeline = () => registry.get(baseProjection().scene).timeline;
  const seek = (t: number) => {
    registry.set(atoms.clock.playing, false);
    registry.set(atoms.clock.time, clampTime(timeline(), t));
  };
  const time: TimeCommands = {
    seek,
    togglePlay: () => {
      const playing = registry.get(atoms.clock.playing);
      if (!playing && registry.get(atoms.clock.time) >= (timeline()?.duration ?? 0)) {
        registry.set(atoms.clock.time, 0);
      }
      registry.set(atoms.clock.playing, !playing);
    },
    setPlaying: (playing) => registry.set(atoms.clock.playing, playing),
    setAutoKey: (autoKey) => registry.set(atoms.autoKey, autoKey),
    step: (frames) => {
      const fps = timelineFps(timeline());
      seek(Math.round((registry.get(atoms.clock.time) + frames / fps) * fps) / fps);
    },
    jumpKey: (direction) => {
      const now = registry.get(atoms.clock.time);
      const times = keyTimes(timeline(), registry.get(atoms.selection));
      // No key that way: the end (or the start), so the jump always goes somewhere.
      const target =
        (direction > 0 ? times.find((t) => t > now + 1e-6) : times.findLast((t) => t < now - 1e-6)) ??
        (direction > 0 ? (timeline()?.duration ?? now) : 0);
      seek(target);
    },
    addKey: () => {
      const shown = currentScene();
      const t = registry.get(atoms.clock.time);
      const styles = store.styles ? registry.get(store.styles) : undefined;
      let next = timeline() ?? createTimeline();
      for (const id of registry.get(atoms.selection)) {
        const node = shown.nodes[id];
        if (!node) {
          continue;
        }
        // As drawn: a class's opacity is the node's until it sets its own.
        const drawn = classedNode(node, styles);
        for (const property of Object.keys(nodeAnimatable(nodeRegistry(), node))) {
          const value = getPath(drawn, property) ?? (property === OPACITY_PATH ? 1 : undefined);
          if (value !== undefined) {
            next = setKey(next, id, property, { t, value });
          }
        }
      }
      baseProjection().apply({ kind: 'timeline', timeline: next });
    },
    moveKey: (from, to) => {
      const current = timeline();
      const target = clampTime(current, to);
      if (!current || Math.abs(target - from) < 1e-6) {
        return;
      }
      const next = moveKeys(current, registry.get(atoms.selection), from, target, 0.5 / timelineFps(current));
      if (next !== current) {
        baseProjection().apply({ kind: 'timeline', timeline: next });
      }
      seek(target);
    },
    removeKey: () => {
      const current = timeline();
      if (!current) {
        return;
      }
      const t = registry.get(atoms.clock.time);
      const ids = registry.get(atoms.selection);
      const tolerance = 0.5 / timelineFps(current);
      let next = current;
      for (const track of Object.values(current.tracks)) {
        if (ids.has(track.target)) {
          for (const key of track.keys.filter((key) => Math.abs(key.t - t) < tolerance)) {
            next = removeTimelineKey(next, track.target, track.property, key.t);
          }
        }
      }
      if (next !== current) {
        baseProjection().apply({ kind: 'timeline', timeline: next });
      }
    },
  };

  const setCamera = (next: Camera) => registry.set(atoms.camera, next);
  const jump: CameraMotion = {
    animateTo: (target, done) => {
      setCamera(target);
      done?.();
    },
    target: () => registry.get(atoms.camera),
    setOpening: () => {},
  };
  const camera = () => cameraMotion?.() ?? jump;
  const noFit: ViewFit = { enterFit: () => {}, exitFit: () => {}, takeOver: () => {} };
  const fitMode = () => viewFit?.() ?? noFit;
  const centre = () => ({ x: viewport().width / 2, y: viewport().height / 2 });
  const frameIn = (portal: Node, child: View) => childFrame(portal, child, viewport());

  const portalTo = (parentId: ViewId | undefined, childId: ViewId): Node | undefined => {
    const parent = parentId ? registry.get(store.views)[parentId] : undefined;
    return parent ? Object.values(parent.nodes).find((node) => isViewNode(node) && node.scene === childId) : undefined;
  };
  const frameOf = (path: ViewId[], current: View): Bounds => {
    const portal = portalTo(path[path.length - 2], current.id);
    return portal ? frameIn(portal, current) : (contentBounds(current) ?? EMPTY_FRAME);
  };
  // A scene entered through a portal keeps the frame it arrived with. Deriving it from the content on every edit moves
  // the child under the user as they work, and maps a drill-out differently from the drill-in that opened it; the root
  // has no portal to sit in, so its bounds stay derived. Kept for every level of the path, so drilling back out of a
  // nested frame finds each parent as it was entered.
  const frames = new Map<string, Bounds>();

  const pushHistory = (entry: HistoryEntry) => {
    const history = registry.get(atoms.history);
    const entries = [...history.entries.slice(0, history.index + 1), entry];
    registry.set(atoms.history, { entries, index: entries.length - 1 });
  };

  const drillInto = (portal: Node, animate = true) => {
    const open = nodeDef(nodeRegistry(), portal)?.hostOpen?.(portal);
    if (open) {
      open();
      return;
    }
    const child = isViewNode(portal) ? registry.get(store.views)[portal.scene] : undefined;
    if (!child) {
      return;
    }
    fitMode().takeOver();
    // The zoom is into the child, so the portal's selection outline and ports go before it starts.
    select([]);
    registry.set(atoms.hover, undefined);
    registry.set(atoms.editing, undefined);
    const childBounds = frameIn(portal, child);
    const swap = (next: Camera) => {
      const entered = enterPortal(next, portal, childBounds);
      registry.set(atoms.path, [...registry.get(atoms.path), child.id]);
      setCamera(entered);
      camera().setOpening(undefined);
      pushHistory({ path: registry.get(atoms.path), camera: entered });
    };
    if (animate) {
      // Land the child where fitting it would, margin and all, but never past 1:1, so its text lands at its natural
      // size rather than magnified to fill the view. Expressed in the child's own space and mapped back out, so the
      // zoom ends exactly where the swap puts the camera. An empty child lands where Fit puts it (the origin at 1:1),
      // which its viewport-sized frame fills exactly, so fit mode has nothing left to animate once the scenes swap.
      const target = exitPortal(fitBounds(fitFrame(child), viewport(), inset(), NOMINAL_ZOOM), portal, childBounds);
      camera().animateTo(target, () => swap(target), DRILL_ANIMATION_MS);
      camera().setOpening(portal.id);
    } else {
      swap(registry.get(atoms.camera));
    }
  };

  const drillOut = (levels = 1, animate = true) => {
    const current = registry.get(atoms.path);
    if (current.length < 2 || levels < 1) {
      return;
    }
    const scenes = registry.get(store.views);
    let next = current;
    let exited = registry.get(atoms.camera);
    for (let level = 0; level < levels && next.length > 1; level++) {
      const child = scenes[next[next.length - 1]];
      const portal = child && portalTo(next[next.length - 2], child.id);
      if (!child || !portal) {
        break;
      }
      // The level being left exits through the frame it was entered with, so the camera lands where the drill-in took
      // it from however the child was edited in between.
      exited = exitPortal(exited, portal, frames.get(next.join(' ')) ?? frameIn(portal, child));
      next = next.slice(0, -1);
    }
    registry.set(atoms.path, next);
    select([]);
    setCamera(exited);
    const parent = scenes[next[next.length - 1]];
    if (animate && parent) {
      camera().animateTo(fitBounds(fitFrame(parent), viewport(), inset(), NOMINAL_ZOOM), undefined, DRILL_ANIMATION_MS);
    }
    pushHistory({ path: next, camera: exited });
  };

  const isolate = (composite: ViewId) => {
    const definition = registry.get(store.views)[composite];
    if (!definition) {
      return;
    }
    const back = registry.get(atoms.isolation)?.back ?? {
      path: registry.get(atoms.path),
      camera: registry.get(atoms.camera),
    };
    registry.set(atoms.isolation, { composite, back });
    fitMode().exitFit();
    select([]);
    registry.set(atoms.path, [composite]);
    const content = compositeBounds(definition);
    if (content) {
      setCamera(fitBounds(content, viewport(), inset(), NOMINAL_ZOOM));
    }
  };

  const exitIsolation = () => {
    const current = registry.get(atoms.isolation);
    if (!current) {
      return;
    }
    registry.set(atoms.isolation, undefined);
    select([]);
    registry.set(atoms.path, current.back.path);
    setCamera(current.back.camera);
  };

  const zoomTo = (zoom: number) => {
    fitMode().takeOver();
    fitMode().exitFit();
    // From where the camera is headed, so a click during an animation retargets it rather than stepping from midway.
    camera().animateTo(zoomAt(camera().target(), centre(), zoom));
  };

  /**
   * Out to the shared ancestor of the open path and `target`, then in through each frame, animating only the last step;
   * false when `target` starts elsewhere (another root, or out of isolation), so nothing is selected there.
   */
  const navigateTo = (target: readonly ViewId[], animate: boolean): boolean => {
    const current = registry.get(atoms.path);
    if (target[0] !== current[0]) {
      return false;
    }
    let shared = 1;
    while (shared < Math.min(current.length, target.length) && current[shared] === target[shared]) {
      shared++;
    }
    const descend = target.slice(shared);
    if (shared < current.length) {
      drillOut(current.length - shared, animate && descend.length === 0);
    }
    for (const [index, id] of descend.entries()) {
      const portal = portalTo(registry.get(atoms.path).at(-1), id);
      if (!portal) {
        break;
      }
      drillInto(portal, animate && index === descend.length - 1);
    }
    return true;
  };

  const openView: NavigationCommands['openView'] = (target, { animate = true, select: ids } = {}) => {
    if (registry.get(atoms.isolation)) {
      exitIsolation();
    }
    if (navigateTo(target, animate) && ids) {
      select(ids);
    }
  };

  const openPlace: NavigationCommands['openPlace'] = ({ path, isolate: composite }, options = {}) => {
    if (composite === undefined) {
      return openView(path, options);
    }
    if (registry.get(atoms.isolation)?.composite !== composite) {
      isolate(composite);
    }
    if (navigateTo(path, options.animate ?? true) && options.select) {
      select(options.select);
    }
  };

  const navigation: NavigationCommands = {
    openView,
    openPlace,
    drillIn: (node, animate) => (isInstanceNode(node) ? isolate(node.composite) : drillInto(node, animate)),
    drillOut,
    back: () => (registry.get(atoms.isolation) ? exitIsolation() : drillOut()),
    goHistory: (offset) => {
      const history = registry.get(atoms.history);
      const index = history.index + offset;
      const entry = history.entries[index];
      if (!entry) {
        return;
      }
      registry.set(atoms.history, { ...history, index });
      registry.set(atoms.path, entry.path);
      select([]);
      camera().animateTo(entry.camera);
    },
    openPath: (index) => {
      if (registry.get(atoms.isolation)) {
        if (index === 0) {
          exitIsolation();
        }
      } else {
        drillOut(registry.get(atoms.path).length - 1 - index);
      }
    },
    isolate,
    exitIsolation,
    fit: () => {
      fitMode().enterFit();
      camera().animateTo(fitBounds(frame?.() ?? fitFrame(currentScene()), viewport(), inset(), NOMINAL_ZOOM));
    },
    fitSelection: () => {
      const scene = currentScene();
      const nodes = [...registry.get(atoms.selection)].flatMap((id) => scene.nodes[id] ?? []);
      const union = unionBounds(nodes.map(nodeBounds));
      if (union) {
        fitMode().exitFit();
        camera().animateTo(fitBounds(union, viewport(), inset(), NOMINAL_ZOOM));
      }
    },
    zoomTo,
    // Steps from the in-flight target: clicks in quick succession compound into one move instead of several jumps.
    zoomBy: (factor) => zoomTo(camera().target().zoom * factor),
    resetZoom: () => {
      fitMode().exitFit();
      camera().animateTo(zoomAt(registry.get(atoms.camera), centre(), NOMINAL_ZOOM));
    },
    childFrame: frameIn,
    frame: (path, scene) => {
      const key = path.join(' ');
      for (const kept of [...frames.keys()]) {
        if (key !== kept && !key.startsWith(`${kept} `)) {
          frames.delete(kept);
        }
      }
      if (path.length < 2) {
        return frameOf(path, scene);
      }
      const kept = frames.get(key) ?? frameOf(path, scene);
      frames.set(key, kept);
      return kept;
    },
  };

  const look: LookCommands = {
    setTheme: (theme) => lookHandlers?.().onThemeChange?.(theme),
    setBackgroundGrid: (grid) => lookHandlers?.().onBackgroundGridChange?.(grid),
  };

  const document: DocumentIntentCommands = {
    restack: (container, element, target, position) => {
      if (!capabilities().update) {
        return false;
      }
      const scene = currentScene();
      if (scene.id === container) {
        const z = restackZ(scene, element, target, position);
        z !== undefined && projection().apply({ kind: 'reorder', id: element, z });
        return z !== undefined;
      }
      // Another View, or an Object's definition: written to the store, as the open View's projection draws only its own.
      const views = registry.get(store.views);
      const host = views[container];
      const z = host && restackZ(host, element, target, position);
      if (!host || z === undefined) {
        return false;
      }
      const node = host.nodes[element];
      const link = host.links[element];
      const moved: View = node
        ? { ...host, nodes: { ...host.nodes, [element]: { ...node, z } } }
        : link
          ? { ...host, links: { ...host.links, [element]: { ...link, z } } }
          : host;
      commit(() => registry.set(store.views, { ...views, [container]: moved }));
      return true;
    },
    duplicate: (ids, delta) => {
      const scene = currentScene();
      const selected = [...ids];
      const copy = capabilities().create ? duplicateSelection(scene, selected, delta, newId) : undefined;
      if (!copy) {
        return false;
      }
      const records = promotedBy(
        registry.get(store.views),
        selected.flatMap((id) => scene.nodes[id] ?? []),
      );
      applyWithRecords(projection(), copy.intent, (views) =>
        Object.keys(records).length > 0 ? { ...views, ...records } : views,
      );
      select(copy.ids);
      return true;
    },
  };

  return { document, navigation, look, selection, editing, tools, time };
};
