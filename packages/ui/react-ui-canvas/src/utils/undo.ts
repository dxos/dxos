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
import { type SceneMap, type SceneStore } from '../model/store.ts';

/** Entries older than this are dropped rather than growing without bound. */
export const UNDO_LIMIT = 100;

/**
 * One undo step: the projection's snapshot from before it, and, for a step that also added or removed scenes (a
 * group into a new scene), the store's scenes from before it, so undo takes the new scene away and redo returns it.
 */
export type UndoEntry = { model: unknown; scenes?: SceneMap };

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

/** Marks the step just recorded as one that also changed the store's scenes, which were `scenes` before it. */
export const recordScenes = (
  registry: Registry.AtomRegistry,
  atom: Atom.Writable<UndoState>,
  key: string,
  scenes: SceneMap,
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
  const scenes = entry.scenes && store ? registry.get(store.scenes) : undefined;
  const replaced: UndoEntry = { model: projection.snapshot(), ...(scenes ? { scenes } : {}) };
  if (entry.scenes && store) {
    registry.set(store.scenes, entry.scenes);
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
