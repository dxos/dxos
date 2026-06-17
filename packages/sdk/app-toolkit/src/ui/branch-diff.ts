//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';

/** A branch-diff view request for an object: compare its current branch against `compareTo`. */
export type BranchDiffRequest = { compareTo: string };

// Registry of active branch-diff requests keyed by object id. The value must be observable across
// surfaces — the Branches companion (plugin-space) writes it and a *separate* plank (plugin-deck)
// reads it. Time-travel and branch-state stay consistent across surfaces because their source is a
// single shared instance reached through the object (an object symbol / CoreDatabase); plain
// module-scoped state would NOT be shared if `@dxos/app-toolkit` resolves as more than one module
// instance across the plugin boundary. So the state is anchored on `globalThis` via a global symbol
// (the same technique the app uses elsewhere, e.g. `__zod_globalRegistry`) — one instance, always.
type BranchDiffState = {
  requests: Map<string, BranchDiffRequest | undefined>;
  listeners: Map<string, Set<() => void>>;
};
const STATE_KEY = Symbol.for('@dxos/app-toolkit/branch-diff');
// Untyped global augmentation — a deliberate cross-module-instance singleton boundary.
const globalState = globalThis as unknown as { [STATE_KEY]?: BranchDiffState };
const { requests, listeners } = (globalState[STATE_KEY] ??= {
  requests: new Map<string, BranchDiffRequest | undefined>(),
  listeners: new Map<string, Set<() => void>>(),
});

const notify = (objectId: string): void => {
  listeners.get(objectId)?.forEach((listener) => listener());
};

/** Show the object's article as a diff of its current branch against `compareTo` (device-local). */
export const setBranchDiff = (objectId: string, compareTo: string): void => {
  requests.set(objectId, { compareTo });
  notify(objectId);
};

/** Clear any active branch-diff request for the object. */
export const clearBranchDiff = (objectId: string): void => {
  if (requests.get(objectId)) {
    requests.set(objectId, undefined);
    notify(objectId);
  }
};

/**
 * Reactive per-object branch-diff request. The plank maps a set request to the distinct `'diff'`
 * article mode; the companion sets it via {@link setBranchDiff} and clears it on unmount / branch
 * switch. `keepAlive` so a request set by the companion survives until the reader subscribes.
 */
export const branchDiffAtom = Atom.family((objectId: string) =>
  Atom.make<BranchDiffRequest | undefined>((get) => {
    const listener = () => get.setSelf(requests.get(objectId));
    let set = listeners.get(objectId);
    if (!set) {
      set = new Set();
      listeners.set(objectId, set);
    }
    set.add(listener);
    get.addFinalizer(() => set!.delete(listener));
    return requests.get(objectId);
  }).pipe(Atom.keepAlive),
);
