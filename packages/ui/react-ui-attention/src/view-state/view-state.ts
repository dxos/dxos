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
export interface AspectDef<T> {
  readonly key: string;
  readonly backend: BackendName;
  // Encoded type is intentionally unconstrained: persisted backends serialize `T` through the
  // schema to an arbitrary wire form, and only the decoded `T` matters to consumers.
  readonly schema: Schema.Schema<T, any>;
  readonly defaultValue: () => T;
}

/**
 * Identity helper that pins the value type from the schema while keeping the literal `key`/`backend`.
 * Declares an aspect of per-context UI state (selection, scroll, view mode, split) read/written via
 * {@link ViewStateManager} — through `useViewState`/`useViewStateActions` in React or the
 * `AttentionCapabilities.ViewState` capability in operations. Durability is the `backend`'s: `local`
 * survives reloads (best-effort — degrades to in-memory when storage is blocked), `memory` is
 * session-only.
 *
 * @idiom org.dxos.react-ui-attention.viewState
 *   applies: Holding per-context UI state (selection, view mode, scroll, split) that survives navigation (and reloads with the `local` backend)
 *   instead-of: ad-hoc `useState` that resets on remount, or stuffing per-context state into the plugin Settings store
 *   uses: {@link defineViewState}, {@link ViewStateManager}
 *   related: org.dxos.effect.kvsStore
 */
export const defineViewState = <T>(def: AspectDef<T>): AspectDef<T> => def;

/**
 * A backend produces a reactive, writable atom for each `(aspect, contextId)` pair. Backends may
 * hydrate asynchronously (an ECHO backend would), yielding `aspect.defaultValue()` until loaded;
 * the memory and local backends resolve synchronously.
 */
export interface ViewStateBackend {
  /** Stable atom for the pair; created (and seeded) on first access, cached thereafter. */
  atom: <T>(aspect: AspectDef<T>, contextId: string) => Atom.Writable<T>;
  /** Persist a value after the atom is updated. No-op for in-memory backends. */
  persist?: <T>(aspect: AspectDef<T>, contextId: string, value: T) => void;
  /** Context ids that currently hold a value for the aspect. */
  contexts: <T>(aspect: AspectDef<T>) => string[];
  /** Release listeners/timers (used by tests; app-lifetime managers do not call this). */
  dispose?: () => void;
}

export interface ViewStateManagerOptions {
  readonly registry: Registry.Registry;
  readonly backends: Record<BackendName, ViewStateBackend>;
}

/**
 * Routes per-context UI state to the backend declared by each aspect. Reads/writes go through the
 * effect-atom registry so React hooks and graph atoms observe changes uniformly.
 */
export class ViewStateManager {
  readonly #registry: Registry.Registry;
  readonly #backends: Record<BackendName, ViewStateBackend>;

  constructor({ registry, backends }: ViewStateManagerOptions) {
    this.#registry = registry;
    this.#backends = backends;
  }

  /** Reactive atom for `(aspect, contextId)`; pass to `registry.get` inside derived atoms/hooks. */
  atom<T>(aspect: AspectDef<T>, contextId: string): Atom.Writable<T> {
    return this.#backends[aspect.backend].atom(aspect, contextId);
  }

  get<T>(aspect: AspectDef<T>, contextId: string): T {
    return this.#registry.get(this.atom(aspect, contextId));
  }

  set<T>(aspect: AspectDef<T>, contextId: string, value: T): void {
    const backend = this.#backends[aspect.backend];
    this.#registry.set(backend.atom(aspect, contextId), value);
    backend.persist?.(aspect, contextId, value);
  }

  update<T>(aspect: AspectDef<T>, contextId: string, fn: (prev: T) => T): void {
    this.set(aspect, contextId, fn(this.get(aspect, contextId)));
  }

  subscribe<T>(aspect: AspectDef<T>, contextId: string, cb: (value: T) => void): () => void {
    const atom = this.atom(aspect, contextId);
    return this.#registry.subscribe(atom, () => cb(this.#registry.get(atom)));
  }

  contexts<T>(aspect: AspectDef<T>): string[] {
    return this.#backends[aspect.backend].contexts(aspect);
  }
}
