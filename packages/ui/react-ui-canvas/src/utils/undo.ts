//
// Copyright 2026 DXOS.org
//

//
// Undo as a per-view log of projection snapshots (§8): every `apply` that changes the model pushes the
// snapshot taken before it, so the undo unit is the intent, whatever the projection made of it. The
// snapshot is opaque to the view; each projection knows how to take and restore its own.
//

import type * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { type Projection } from '../model/projection.ts';
import { type SceneStore } from '../model/store.ts';
import { type Scene, type SceneId } from '../model/types.ts';

/** Entries older than this are dropped rather than growing without bound. */
export const UNDO_LIMIT = 100;

/**
 * The scenes a step added or removed, each as it was before the step (`undefined`: it did not exist). Only those
 * scenes, so undoing the step leaves edits to every other scene in place.
 */
export type ScenePatch = Readonly<Record<SceneId, Scene | undefined>>;

/**
 * One undo step: the projection's snapshot from before it, and, for a step that also added or removed scenes (a
 * group into a new scene), those scenes from before it, so undo takes the new scene away and redo returns it.
 */
export type UndoEntry = { model: unknown; scenes?: ScenePatch };

export type UndoState = {
  /** Which projection the snapshots belong to; a different one starts an empty log. */
  key: string;
  past: UndoEntry[];
  future: UndoEntry[];
};

export const emptyUndo = (key = ''): UndoState => ({ key, past: [], future: [] });

const stateFor = (registry: Registry.AtomRegistry, atom: Atom.Writable<UndoState>, key: string): UndoState => {
  const current = registry.get(atom);
  return current.key === key ? current : emptyUndo(key);
};

/**
 * The projection with `apply` recording into `atom` under `key`; a rejected intent (same snapshot
 * before and after) records nothing.
 */
export const withUndo = (
  projection: Projection,
  registry: Registry.AtomRegistry,
  atom: Atom.Writable<UndoState>,
  key: string,
): Projection => ({
  ...projection,
  apply: (intent) => {
    const before = projection.snapshot();
    projection.apply(intent);
    if (projection.snapshot() === before) {
      return;
    }
    const state = stateFor(registry, atom, key);
    registry.set(atom, { key, past: [...state.past.slice(-(UNDO_LIMIT - 1)), { model: before }], future: [] });
  },
});

/** Marks the step just recorded as one that also added or removed the scenes of `scenes`, as they were before it. */
export const recordScenes = (
  registry: Registry.AtomRegistry,
  atom: Atom.Writable<UndoState>,
  key: string,
  scenes: ScenePatch,
): void => {
  const state = stateFor(registry, atom, key);
  const last = state.past[state.past.length - 1];
  if (last) {
    registry.set(atom, { ...state, past: [...state.past.slice(0, -1), { ...last, scenes }] });
  }
};

/** Swaps the model (and the store's scenes, for a step that changed them) for `entry`, returning what it replaced. */
const swap = (
  projection: Projection,
  registry: Registry.AtomRegistry,
  store: SceneStore | undefined,
  entry: UndoEntry,
): UndoEntry => {
  const patch = entry.scenes;
  const live = patch && store ? registry.get(store.scenes) : undefined;
  const scenes = patch && live ? Object.fromEntries(Object.keys(patch).map((id) => [id, live[id]])) : undefined;
  const replaced: UndoEntry = { model: projection.snapshot(), ...(scenes ? { scenes } : {}) };
  if (patch && live && store) {
    const next: Record<SceneId, Scene> = { ...live };
    for (const [id, scene] of Object.entries(patch)) {
      if (scene) {
        next[id] = scene;
      } else {
        delete next[id];
      }
    }
    registry.set(store.scenes, next);
  }
  projection.restore(entry.model);
  return replaced;
};

export const undo = (
  projection: Projection,
  registry: Registry.AtomRegistry,
  atom: Atom.Writable<UndoState>,
  key: string,
  store?: SceneStore,
): boolean => {
  const state = stateFor(registry, atom, key);
  const entry = state.past[state.past.length - 1];
  if (!entry) {
    return false;
  }
  const replaced = swap(projection, registry, store, entry);
  registry.set(atom, { key, past: state.past.slice(0, -1), future: [...state.future, replaced] });
  return true;
};

export const redo = (
  projection: Projection,
  registry: Registry.AtomRegistry,
  atom: Atom.Writable<UndoState>,
  key: string,
  store?: SceneStore,
): boolean => {
  const state = stateFor(registry, atom, key);
  const entry = state.future[state.future.length - 1];
  if (!entry) {
    return false;
  }
  const replaced = swap(projection, registry, store, entry);
  registry.set(atom, { key, past: [...state.past, replaced], future: state.future.slice(0, -1) });
  return true;
};
