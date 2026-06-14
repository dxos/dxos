//
// Copyright 2026 DXOS.org
//

import { type Atom, type Registry } from '@effect-atom/atom-react';
import type * as Schema from 'effect/Schema';

/**
 * Persistence backend identifier. `personal` (ECHO/personal-space) is reserved for a future backend.
 */
export type BackendName = 'memory' | 'local';

/**
 * Declares a kind of per-context UI state. The value type `T` is inferred from the schema.
 */
export interface SliceDef<T> {
  readonly key: string;
  readonly backend: BackendName;
  readonly schema: Schema.Schema<T, any>;
  readonly defaultValue: () => T;
}

/**
 * Identity helper that pins the value type from the schema while keeping the literal `key`/`backend`.
 */
export const defineViewState = <T>(def: SliceDef<T>): SliceDef<T> => def;

/**
 * A backend produces a reactive, writable atom for each `(slice, contextId)` pair. Backends may
 * hydrate asynchronously (an ECHO backend would), yielding `slice.defaultValue()` until loaded;
 * the memory and local backends resolve synchronously.
 */
export interface ViewStateBackend {
  /** Stable atom for the pair; created (and seeded) on first access, cached thereafter. */
  atom: <T>(slice: SliceDef<T>, contextId: string) => Atom.Writable<T>;
  /** Persist a value after the atom is updated. No-op for in-memory backends. */
  persist?: <T>(slice: SliceDef<T>, contextId: string, value: T) => void;
  /** Context ids that currently hold a value for the slice. */
  contexts: <T>(slice: SliceDef<T>) => string[];
  /** Release listeners/timers (used by tests; app-lifetime managers do not call this). */
  dispose?: () => void;
}

export interface ViewStateManagerOptions {
  readonly registry: Registry.Registry;
  readonly backends: Record<BackendName, ViewStateBackend>;
}

/**
 * Routes per-context UI state to the backend declared by each slice. Reads/writes go through the
 * effect-atom registry so React hooks and graph atoms observe changes uniformly.
 */
export class ViewStateManager {
  readonly #registry: Registry.Registry;
  readonly #backends: Record<BackendName, ViewStateBackend>;

  constructor({ registry, backends }: ViewStateManagerOptions) {
    this.#registry = registry;
    this.#backends = backends;
  }

  /** Reactive atom for `(slice, contextId)`; pass to `registry.get` inside derived atoms/hooks. */
  atom<T>(slice: SliceDef<T>, contextId: string): Atom.Writable<T> {
    return this.#backends[slice.backend].atom(slice, contextId);
  }

  get<T>(slice: SliceDef<T>, contextId: string): T {
    return this.#registry.get(this.atom(slice, contextId));
  }

  set<T>(slice: SliceDef<T>, contextId: string, value: T): void {
    const backend = this.#backends[slice.backend];
    this.#registry.set(backend.atom(slice, contextId), value);
    backend.persist?.(slice, contextId, value);
  }

  update<T>(slice: SliceDef<T>, contextId: string, fn: (prev: T) => T): void {
    this.set(slice, contextId, fn(this.get(slice, contextId)));
  }

  subscribe<T>(slice: SliceDef<T>, contextId: string, cb: (value: T) => void): () => void {
    const atom = this.atom(slice, contextId);
    return this.#registry.subscribe(atom, () => cb(this.#registry.get(atom)));
  }

  contexts<T>(slice: SliceDef<T>): string[] {
    return this.#backends[slice.backend].contexts(slice);
  }
}
