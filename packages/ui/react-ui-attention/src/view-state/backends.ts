//
// Copyright 2026 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';

import { type BackendName, type SliceDef, type ViewStateBackend } from './view-state';

// Only the stable `key` string is needed to form the map key; avoids variance issues with SliceDef<T>.
const cacheKey = (slice: { key: string }, contextId: string) => `${slice.key}:${contextId}`;

/** In-memory backend: reproduces the legacy `SelectionManager` behaviour. */
export class MemoryBackend implements ViewStateBackend {
  readonly #atoms = new Map<string, Atom.Writable<unknown>>();

  atom<T>(slice: SliceDef<T>, contextId: string): Atom.Writable<T> {
    const key = cacheKey(slice, contextId);
    let atom = this.#atoms.get(key);
    if (!atom) {
      atom = Atom.make<unknown>(slice.defaultValue());
      this.#atoms.set(key, atom);
    }
    // Cast bridges the per-slice value type erased by the shared atom map; safe by construction.
    return atom as Atom.Writable<T>;
  }

  contexts<T>(slice: SliceDef<T>): string[] {
    const prefix = `${slice.key}:`;
    return [...this.#atoms.keys()].filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
  }
}

export const createDefaultBackends = (_registry: Registry.Registry): Record<BackendName, ViewStateBackend> => {
  const memory = new MemoryBackend();
  return { memory, local: memory };
};
