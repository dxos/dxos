//
// Copyright 2026 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { ViewState } from '../types';

// Only the stable `key` string is needed to form the map key; avoids variance issues with Aspect<T>.
const cacheKey = (aspect: { key: string }, contextId: string) => `${aspect.key}:${contextId}`;

/** In-memory backend: state is ephemeral and scoped to the session (never persisted). */
export class MemoryBackend implements ViewState.Backend {
  readonly #atoms = new Map<string, Atom.Writable<unknown>>();

  atom<T, Encoded>(aspect: ViewState.Aspect<T, Encoded>, contextId: string): Atom.Writable<T> {
    const key = cacheKey(aspect, contextId);
    let atom = this.#atoms.get(key);
    if (!atom) {
      atom = Atom.make<unknown>(aspect.defaultValue());
      this.#atoms.set(key, atom);
    }
    // Cast bridges the per-aspect value type erased by the shared atom map; safe by construction.
    return atom as Atom.Writable<T>;
  }

  contexts<T, Encoded>(aspect: ViewState.Aspect<T, Encoded>): string[] {
    const prefix = `${aspect.key}:`;
    return [...this.#atoms.keys()].filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
  }
}

const STORAGE_PREFIX = 'dxos:view-state:';

const storageKeyFor = (aspect: { key: string }, contextId: string) => `${STORAGE_PREFIX}${aspect.key}:${contextId}`;

// Accessing `globalThis.localStorage` can throw a SecurityError in sandboxed iframes or when
// storage is blocked; degrade to in-memory behaviour instead of crashing.
const safeLocalStorage = (): Storage | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export interface LocalBackendOptions {
  readonly registry: Registry.Registry;
  /** Injectable for tests; defaults to `window.localStorage`. */
  readonly storage?: Storage;
}

/** localStorage-backed backend: seeds atoms from storage, persists on set, syncs across tabs. */
export class LocalBackend implements ViewState.Backend {
  readonly #registry: Registry.Registry;
  // Absent in non-browser contexts (SSR/tests without injection); the backend then degrades to
  // ephemeral, in-memory behaviour rather than crashing on a missing `localStorage`.
  readonly #storage: Storage | undefined;
  readonly #atoms = new Map<string, Atom.Writable<unknown>>();
  // Reverse map: storage key -> (aspect, contextId) so `storage` events can target the right atom.
  readonly #byStorageKey = new Map<string, { aspect: ViewState.Aspect<unknown, unknown>; contextId: string }>();
  #storageListener?: (event: StorageEvent) => void;

  constructor({ registry, storage }: LocalBackendOptions) {
    this.#registry = registry;
    this.#storage = storage ?? safeLocalStorage();
    if (this.#storage && typeof globalThis.addEventListener === 'function') {
      this.#storageListener = (event) => {
        if (!event.key || !event.key.startsWith(STORAGE_PREFIX)) {
          return;
        }
        const entry = this.#byStorageKey.get(event.key);
        const atom = entry && this.#atoms.get(cacheKey(entry.aspect, entry.contextId));
        if (entry && atom) {
          this.#registry.set(atom, this.#read(entry.aspect, event.key));
        }
      };
      globalThis.addEventListener('storage', this.#storageListener);
    }
  }

  atom<T, Encoded>(aspect: ViewState.Aspect<T, Encoded>, contextId: string): Atom.Writable<T> {
    const key = cacheKey(aspect, contextId);
    let atom = this.#atoms.get(key);
    if (!atom) {
      const storageKey = storageKeyFor(aspect, contextId);
      atom = Atom.make<unknown>(this.#read(aspect, storageKey));
      this.#atoms.set(key, atom);
      // Cast erases the per-aspect value type so the reverse map can hold aspects of any `T`; the
      // stored aspect is only used to re-read/decode its own value, so the erasure is safe.
      this.#byStorageKey.set(storageKey, { aspect: aspect as ViewState.Aspect<unknown, unknown>, contextId });
    }
    // Cast bridges the per-aspect value type erased by the shared atom map; safe by construction.
    return atom as Atom.Writable<T>;
  }

  persist<T, Encoded>(aspect: ViewState.Aspect<T, Encoded>, contextId: string, value: T): void {
    this.#storage?.setItem(storageKeyFor(aspect, contextId), JSON.stringify(Schema.encodeSync(aspect.schema)(value)));
  }

  contexts<T, Encoded>(aspect: ViewState.Aspect<T, Encoded>): string[] {
    if (!this.#storage) {
      // No persistent storage: fall back to the in-memory atoms (mirrors `atom()`'s ephemeral path).
      const prefix = `${aspect.key}:`;
      return [...this.#atoms.keys()].filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
    }
    const prefix = storageKeyFor(aspect, '');
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
    // Allow safe reuse after disposal: drop cached atoms and their reverse-key entries.
    this.#atoms.clear();
    this.#byStorageKey.clear();
  }

  #read<T, Encoded>(aspect: ViewState.Aspect<T, Encoded>, storageKey: string): T {
    const raw = this.#storage?.getItem(storageKey);
    if (raw == null) {
      return aspect.defaultValue();
    }
    try {
      return Schema.decodeUnknownSync(aspect.schema)(JSON.parse(raw));
    } catch {
      // Tolerate stale/corrupt entries (e.g., a prior schema shape) by falling back to the default.
      return aspect.defaultValue();
    }
  }
}

export const createDefaultBackends = (
  registry: Registry.Registry,
): Record<ViewState.BackendName, ViewState.Backend> => ({
  memory: new MemoryBackend(),
  local: new LocalBackend({ registry }),
});
