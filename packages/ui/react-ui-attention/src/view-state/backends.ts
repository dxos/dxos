//
// Copyright 2026 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

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

const STORAGE_PREFIX = 'dxos:view-state:';

const storageKeyFor = (slice: { key: string }, contextId: string) => `${STORAGE_PREFIX}${slice.key}:${contextId}`;

export interface LocalBackendOptions {
  readonly registry: Registry.Registry;
  /** Injectable for tests; defaults to `window.localStorage`. */
  readonly storage?: Storage;
}

/** localStorage-backed backend: seeds atoms from storage, persists on set, syncs across tabs. */
export class LocalBackend implements ViewStateBackend {
  readonly #registry: Registry.Registry;
  readonly #storage: Storage;
  readonly #atoms = new Map<string, Atom.Writable<unknown>>();
  // Reverse map: storage key -> (slice, contextId) so `storage` events can target the right atom.
  readonly #byStorageKey = new Map<string, { slice: SliceDef<unknown>; contextId: string }>();
  #storageListener?: (event: StorageEvent) => void;

  constructor({ registry, storage = globalThis.localStorage }: LocalBackendOptions) {
    this.#registry = registry;
    this.#storage = storage;
    if (typeof globalThis.addEventListener === 'function') {
      this.#storageListener = (event) => {
        if (!event.key || !event.key.startsWith(STORAGE_PREFIX)) {
          return;
        }
        const entry = this.#byStorageKey.get(event.key);
        const atom = entry && this.#atoms.get(cacheKey(entry.slice, entry.contextId));
        if (entry && atom) {
          this.#registry.set(atom, this.#read(entry.slice, event.key));
        }
      };
      globalThis.addEventListener('storage', this.#storageListener);
    }
  }

  atom<T>(slice: SliceDef<T>, contextId: string): Atom.Writable<T> {
    const key = cacheKey(slice, contextId);
    let atom = this.#atoms.get(key);
    if (!atom) {
      const storageKey = storageKeyFor(slice, contextId);
      atom = Atom.make<unknown>(this.#read(slice, storageKey));
      this.#atoms.set(key, atom);
      this.#byStorageKey.set(storageKey, { slice: slice as SliceDef<unknown>, contextId });
    }
    // Cast bridges the per-slice value type erased by the shared atom map; safe by construction.
    return atom as Atom.Writable<T>;
  }

  persist<T>(slice: SliceDef<T>, contextId: string, value: T): void {
    this.#storage.setItem(storageKeyFor(slice, contextId), JSON.stringify(Schema.encodeSync(slice.schema)(value)));
  }

  contexts<T>(slice: SliceDef<T>): string[] {
    const prefix = storageKeyFor(slice, '');
    const ids: string[] = [];
    for (let index = 0; index < this.#storage.length; index++) {
      const key = this.#storage.key(index);
      if (key?.startsWith(prefix)) {
        ids.push(key.slice(prefix.length));
      }
    }
    return ids;
  }

  dispose(): void {
    if (this.#storageListener && typeof globalThis.removeEventListener === 'function') {
      globalThis.removeEventListener('storage', this.#storageListener);
    }
  }

  #read<T>(slice: SliceDef<T>, storageKey: string): T {
    const raw = this.#storage.getItem(storageKey);
    if (raw == null) {
      return slice.defaultValue();
    }
    try {
      return Schema.decodeUnknownSync(slice.schema)(JSON.parse(raw));
    } catch {
      // Tolerate stale/corrupt entries (e.g. a prior schema shape) by falling back to the default.
      return slice.defaultValue();
    }
  }
}

export const createDefaultBackends = (registry: Registry.Registry): Record<BackendName, ViewStateBackend> => ({
  memory: new MemoryBackend(),
  local: new LocalBackend({ registry }),
});
