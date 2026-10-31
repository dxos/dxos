//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { type ActiveTool, type FaceSelection } from '@dxos/react-ui-canvas';
import { type LayoutIntent } from '@dxos/scene';

/** An in-flight gesture's edit, drawn but not yet written (decision 8). */
export type EditorPreview = { layout: string; intent: LayoutIntent };

/** Where the context menu opened, and over what. */
export type MenuAnchor = { at: { x: number; y: number }; kind: 'element' | 'canvas' };

/**
 * The editor's state every part reads: the viewport, the panels and the inspectors. It is view state, never the
 * document; the document changes only through `onIntent`.
 */
export type EditorAtoms = {
  selection: Atom.Writable<readonly string[]>;
  tool: Atom.Writable<ActiveTool>;
  /** The drill path into the scene's layouts: the root layout first; empty when the scene's own layout is open. */
  editing: Atom.Writable<readonly string[]>;
  /** Dimension-specific: only 3D selects a face. */
  face: Atom.Writable<FaceSelection | undefined>;
  preview: Atom.Writable<EditorPreview | undefined>;
  menu: Atom.Writable<MenuAnchor | undefined>;
  /** A message about the last command (a refused paste, a failed import). */
  notice: Atom.Writable<string | undefined>;
  /** The Timeline panel's shot, playhead (seconds) and whether it plays; sampled for the viewport, never written. */
  shot: Atom.Writable<string | undefined>;
  time: Atom.Writable<number>;
  playing: Atom.Writable<boolean>;
};

export type EditorStoreOptions = {
  /** Writes an edit to the document; previews never reach it. */
  onIntent?: (layout: string, intent: LayoutIntent) => void;
};

export type EditorStore = {
  atoms: EditorAtoms;
  select: (ids: readonly string[]) => void;
  setTool: (tool: ActiveTool) => void;
  /**
   * Opens a layout by its drill path, the scene's own layout first; the selection is cleared, since its elements are no
   * longer drawn.
   */
  open: (path: readonly string[]) => void;
  setFace: (face: FaceSelection | undefined) => void;
  /** Shows a gesture's edit without writing it; undefined drops it. */
  preview: (layout: string | undefined, intent?: LayoutIntent) => void;
  /** Writes the previewed edit, once, and drops the preview. */
  commit: () => void;
  setMenu: (menu: MenuAnchor | undefined) => void;
  setNotice: (notice: string | undefined) => void;
  setShot: (shot: string | undefined) => void;
  setTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
};

/**
 * The drill path once `layout` is opened from `path`: out to it when it is on the path, otherwise one level further in;
 * the scene's own layout (`root`, or undefined) is no drill, so the path is empty.
 */
export const drillPath = (path: readonly string[], root: string, layout: string | undefined): readonly string[] => {
  if (layout === undefined || layout === root) {
    return [];
  }
  const index = path.indexOf(layout);
  return index >= 0 ? path.slice(0, index + 1) : [...(path.length > 0 ? path : [root]), layout];
};

/** Fresh editor state, kept alive for the editor's lifetime (strict-mode remounts reuse it). */
export const createEditorStore = (registry: Registry.AtomRegistry, options: EditorStoreOptions = {}): EditorStore => {
  const atoms: EditorAtoms = {
    selection: Atom.keepAlive(Atom.make<readonly string[]>([])),
    tool: Atom.keepAlive(Atom.make<ActiveTool>({ id: 'select' })),
    editing: Atom.keepAlive(Atom.make<readonly string[]>([])),
    face: Atom.keepAlive(Atom.make<FaceSelection | undefined>(undefined)),
    preview: Atom.keepAlive(Atom.make<EditorPreview | undefined>(undefined)),
    menu: Atom.keepAlive(Atom.make<MenuAnchor | undefined>(undefined)),
    notice: Atom.keepAlive(Atom.make<string | undefined>(undefined)),
    shot: Atom.keepAlive(Atom.make<string | undefined>(undefined)),
    time: Atom.keepAlive(Atom.make(0)),
    playing: Atom.keepAlive(Atom.make(false)),
  };
  const select = (ids: readonly string[]) => {
    registry.set(atoms.selection, ids);
    const face = registry.get(atoms.face);
    face && !ids.includes(face.element) && registry.set(atoms.face, undefined);
  };
  return {
    atoms,
    select,
    setTool: (tool) => registry.set(atoms.tool, tool),
    open: (path) => {
      // The scene's own layout alone is no drill.
      registry.set(atoms.editing, path.length > 1 ? path : []);
      select([]);
    },
    setFace: (face) => registry.set(atoms.face, face),
    preview: (layout, intent) => registry.set(atoms.preview, layout && intent ? { layout, intent } : undefined),
    commit: () => {
      const preview = registry.get(atoms.preview);
      registry.set(atoms.preview, undefined);
      preview && options.onIntent?.(preview.layout, preview.intent);
    },
    setMenu: (menu) => registry.set(atoms.menu, menu),
    setNotice: (notice) => registry.set(atoms.notice, notice),
    setShot: (shot) => {
      registry.set(atoms.shot, shot);
      registry.set(atoms.time, 0);
      registry.set(atoms.playing, false);
    },
    setTime: (time) => registry.set(atoms.time, Math.max(0, time)),
    setPlaying: (playing) => registry.set(atoms.playing, playing),
  };
};
