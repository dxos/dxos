//
// Copyright 2026 DXOS.org
//

//
// Undo as a per-view log of projection snapshots (§8): every `apply` that changes the model pushes the
// snapshot taken before it, so the undo unit is the intent, whatever the projection made of it. The
// snapshot is opaque to the view; each projection knows how to take and restore its own.
//

import type * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { type Projection } from '../model/projection.ts';

/** Entries older than this are dropped rather than growing without bound. */
export const UNDO_LIMIT = 100;

export type UndoState = {
  /** Which projection the snapshots belong to; a different one starts an empty log. */
  key: string;
  past: unknown[];
  future: unknown[];
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
    registry.set(atom, { key, past: [...state.past.slice(-(UNDO_LIMIT - 1)), before], future: [] });
  },
});

export const undo = (
  projection: Projection,
  registry: Registry.AtomRegistry,
  atom: Atom.Writable<UndoState>,
  key: string,
): boolean => {
  const state = stateFor(registry, atom, key);
  const snapshot = state.past[state.past.length - 1];
  if (state.past.length === 0) {
    return false;
  }
  const current = projection.snapshot();
  projection.restore(snapshot);
  registry.set(atom, { key, past: state.past.slice(0, -1), future: [...state.future, current] });
  return true;
};

export const redo = (
  projection: Projection,
  registry: Registry.AtomRegistry,
  atom: Atom.Writable<UndoState>,
  key: string,
): boolean => {
  const state = stateFor(registry, atom, key);
  const snapshot = state.future[state.future.length - 1];
  if (state.future.length === 0) {
    return false;
  }
  const current = projection.snapshot();
  projection.restore(snapshot);
  registry.set(atom, { key, past: [...state.past, current], future: state.future.slice(0, -1) });
  return true;
};
