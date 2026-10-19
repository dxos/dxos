//
// Copyright 2026 DXOS.org
//

import type * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import {
  type Capabilities,
  type ElementId,
  type NodeRegistry,
  OPACITY_PATH,
  type Point,
  type SceneId,
  type SceneStore,
  type StyleClass,
  type Tool,
  clampTime,
  createTimeline,
  getElement,
  getPath,
  isLink,
  keyTimes,
  moveKeys,
  nodeAnimatable,
  removeKey as removeTimelineKey,
  setKey,
  timelineFps,
} from '../model/index.ts';
import {
  activeLayer,
  between,
  classedLink,
  classedNode,
  clipboardBounds,
  copySelection,
  createId,
  groupIntoScene,
  pasteFragment,
  recordScenes,
  topZ,
} from '../utils/index.ts';
import { type CanvasAtoms } from './atoms.ts';
import { type Projection } from './projection.ts';

/** The grid a paste steps along and snaps to, which depends on the zoom. */
export type ControllerGrid = { major: number; snap: (value: number) => number };

export type CanvasControllerOptions = {
  registry: Registry.AtomRegistry;
  atoms: CanvasAtoms;
  store: SceneStore;
  /** The open View's projection, read when a command runs: it changes as the View changes. */
  projection: () => Projection;
  /** The projection under the animated one, which keys and timeline edits are written through. */
  baseProjection: () => Projection;
  /** What each node type animates, for keying the selection. */
  nodeRegistry: () => NodeRegistry;
  /** Read when a command runs: the host may toggle it. */
  readonly: () => boolean;
  grid: () => ControllerGrid;
  /** Fresh ids; injectable so tests are deterministic. */
  createId?: (prefix: string) => string;
};

/** What is selected (DESIGN.md §13.1, the Selection aspect). */
export type SelectionCommands = {
  select: (ids: Iterable<ElementId>) => void;
  clear: () => void;
  /** Deletes the selection; false when there was nothing to delete or deleting is not allowed. */
  delete: () => boolean;
  /** Moves the selection into a new scene opened by a frame where it was; returns the frame's id. */
  group: () => ElementId | undefined;
  /** A new style class with the one selected element's look, which the element then follows. */
  classFrom: () => string | undefined;
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
  toggleLattice: () => void;
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
  /** Moves the playhead to the selection's next (1) or previous (-1) key. */
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
  createId: newId = createId,
}: CanvasControllerOptions): CanvasController => {
  const capabilities = (): Capabilities => projection().capabilities;
  const currentScene = () => registry.get(projection().scene);
  const currentView = (): SceneId | undefined => registry.get(atoms.path).at(-1);

  const select = (ids: Iterable<ElementId>) => {
    registry.set(atoms.selection, new Set(readonly() ? [] : ids));
    registry.set(atoms.point, undefined);
  };

  const selection: SelectionCommands = {
    select,
    clear: () => select([]),
    delete: () => {
      const ids = [...registry.get(atoms.selection)];
      if (ids.length === 0 || !capabilities().delete) {
        return false;
      }
      projection().apply({ kind: 'delete', ids });
      select([]);
      return true;
    },
    group: () => {
      const id = newId('scene');
      const current = currentScene();
      const group = groupIntoScene(
        current,
        registry.get(atoms.selection),
        id,
        activeLayer(current, registry.get(atoms.layer)),
      );
      if (!group) {
        return undefined;
      }
      const before = registry.get(store.scenes);
      registry.set(store.scenes, { ...before, [id]: group.child });
      projection().apply({ kind: 'batch', intents: group.intents });
      // A projection may refuse the batch (`apply` reports nothing), so the frame's presence is the result: without
      // it the new scene would be an orphan, so it goes and the selection stays.
      if (!currentScene().nodes[id]) {
        const { [id]: _, ...scenes } = registry.get(store.scenes);
        registry.set(store.scenes, scenes);
        return undefined;
      }
      // One undo step takes the new scene away with the frame that opens it.
      const view = currentView();
      if (view) {
        recordScenes(registry, atoms.undo, view, before);
      }
      select([id]);
      return id;
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
    const fragment = copySelection(currentScene(), registry.get(atoms.selection));
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
      projection().apply({ kind: 'delete', ids: [...registry.get(atoms.selection)] });
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
      projection().apply(intent);
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
    toggleLattice: toggle(atoms.lattice),
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
      const target = direction > 0 ? times.find((t) => t > now + 1e-6) : times.findLast((t) => t < now - 1e-6);
      if (target !== undefined) {
        seek(target);
      }
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

  return { selection, editing, tools, time };
};
