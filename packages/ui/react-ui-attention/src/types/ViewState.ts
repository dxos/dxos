//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';

/**
 * Persistence backend identifier. `personal` (ECHO/personal-space) is reserved for a future backend.
 */
export type BackendName = 'memory' | 'local';

/**
 * How a session following another takes the leader's values of an aspect: `write` sets them into its own view state,
 * which the view already reads; `reveal` leaves them to the follow, for state a view reports but does not read back.
 */
export type FollowPolicy = 'write' | 'reveal';

/**
 * Declares a kind of per-context UI state. The value type `T` and its persisted wire type `Encoded`
 * are inferred from the schema; `Encoded` defaults to `T` for the common no-transform case.
 */
export interface Aspect<T, Encoded = T> {
  readonly key: string;
  readonly backend: BackendName;
  readonly schema: Schema.Codec<T, Encoded>;
  readonly defaultValue: () => T;
  /** Set for state a follower takes from the session it follows; contexts are then EIDs of the space or its objects. */
  readonly follow?: FollowPolicy;
}

/**
 * Identity helper that pins the value type from the schema while keeping the literal `key`/`backend`.
 * Declares an aspect of per-context UI state (selection, scroll, view mode, split) read/written via
 * {@link Manager} — through `useViewState`/`useViewStateActions` in React or the
 * `AttentionCapabilities.ViewState` capability in operations. Durability is the `backend`'s: `local`
 * survives reloads (best-effort — degrades to in-memory when storage is blocked), `memory` is
 * session-only.
 *
 * @idiom org.dxos.react-ui-attention.viewState
 *   applies: Holding per-context UI state (selection, view mode, scroll, split) that survives navigation (and reloads with the `local` backend)
 *   instead-of: ad-hoc `useState` that resets on remount, or stuffing per-context state into the plugin Settings store
 *   uses: {@link define}, {@link Manager}
 *   related: org.dxos.effect.kvsStore
 */
export const define = <T, Encoded = T>(def: Aspect<T, Encoded>): Aspect<T, Encoded> => def;

/**
 * A backend produces a reactive, writable atom for each `(aspect, contextId)` pair. Backends may
 * hydrate asynchronously (an ECHO backend would), yielding `aspect.defaultValue()` until loaded;
 * the memory and local backends resolve synchronously.
 */
export interface Backend {
  /** Stable atom for the pair; created (and seeded) on first access, cached thereafter. */
  atom: <T, Encoded>(aspect: Aspect<T, Encoded>, contextId: string) => Atom.Writable<T>;
  /** Persist a value after the atom is updated. No-op for in-memory backends. */
  persist?: <T, Encoded>(aspect: Aspect<T, Encoded>, contextId: string, value: T) => void;
  /** Context ids that currently hold a value for the aspect. */
  contexts: <T, Encoded>(aspect: Aspect<T, Encoded>) => string[];
  /** Release listeners/timers (used by tests; app-lifetime managers do not call this). */
  dispose?: () => void;
}

export interface ManagerOptions {
  readonly registry: Registry.AtomRegistry;
  readonly backends: Record<BackendName, Backend>;
}

/**
 * Routes per-context UI state to the backend declared by each aspect. Reads/writes go through the
 * effect-atom registry so React hooks and graph atoms observe changes uniformly.
 */
export class Manager {
  readonly #registry: Registry.AtomRegistry;
  readonly #backends: Record<BackendName, Backend>;
  // Aspects are declared where they are used, so the manager learns them from the calls that pass them.
  readonly #aspects = new Map<string, Aspect<any, any>>();
  // A leader's encoded values of an aspect this session has not used yet, decoded when it first is.
  readonly #pending = new Map<string, Map<string, unknown>>();
  readonly #followListeners = new Set<(key: string, contextId: string) => void>();

  constructor({ registry, backends }: ManagerOptions) {
    this.#registry = registry;
    this.#backends = backends;
  }

  /** Reactive atom for `(aspect, contextId)`; pass to `registry.get` inside derived atoms/hooks. */
  atom<T, Encoded>(aspect: Aspect<T, Encoded>, contextId: string): Atom.Writable<T> {
    this.#learn(aspect);
    return this.#backends[aspect.backend].atom(aspect, contextId);
  }

  get<T, Encoded>(aspect: Aspect<T, Encoded>, contextId: string): T {
    return this.#registry.get(this.atom(aspect, contextId));
  }

  set<T, Encoded>(aspect: Aspect<T, Encoded>, contextId: string, value: T): void {
    const backend = this.#backends[aspect.backend];
    this.#registry.set(this.atom(aspect, contextId), value);
    backend.persist?.(aspect, contextId, value);
    if (aspect.follow) {
      this.#followListeners.forEach((listener) => listener(aspect.key, contextId));
    }
  }

  update<T, Encoded>(aspect: Aspect<T, Encoded>, contextId: string, fn: (prev: T) => T): void {
    this.set(aspect, contextId, fn(this.get(aspect, contextId)));
  }

  subscribe<T, Encoded>(aspect: Aspect<T, Encoded>, contextId: string, cb: (value: T) => void): () => void {
    const atom = this.atom(aspect, contextId);
    return this.#registry.subscribe(atom, () => cb(this.#registry.get(atom)));
  }

  contexts<T, Encoded>(aspect: Aspect<T, Encoded>): string[] {
    this.#learn(aspect);
    return this.#backends[aspect.backend].contexts(aspect);
  }

  /** The aspect with `key`, once this session has used it. */
  aspect(key: string): Aspect<unknown, unknown> | undefined {
    return this.#aspects.get(key);
  }

  /** This session's values of every followed aspect it has used, encoded as JSON, by aspect key and then context. */
  followed(contextIds: readonly string[]): Record<string, Record<string, Schema.Json>> {
    return Object.fromEntries(
      [...this.#aspects.values()].flatMap((aspect) => {
        if (!aspect.follow) {
          return [];
        }
        const held = new Set(this.contexts(aspect));
        const encode = Schema.encodeUnknownOption(Schema.toCodecJson(aspect.schema));
        const values = Object.fromEntries(
          contextIds.flatMap((contextId) =>
            held.has(contextId)
              ? Option.match(encode(this.get(aspect, contextId)), {
                  onNone: () => [],
                  onSome: (json) => [[contextId, json]],
                })
              : [],
          ),
        );
        return Object.keys(values).length > 0 ? [[aspect.key, values]] : [];
      }),
    );
  }

  /** Calls `listener` when a followed aspect's value is set. */
  subscribeFollowed(listener: (key: string, contextId: string) => void): () => void {
    this.#followListeners.add(listener);
    return () => this.#followListeners.delete(listener);
  }

  /** Sets a leader's encoded value of a `write` aspect; one not used yet is held until it is, and one that does not decode is dropped. */
  setEncoded(key: string, contextId: string, value: unknown): void {
    const aspect = this.#aspects.get(key);
    if (aspect) {
      this.#decodeInto(aspect, contextId, value);
    } else {
      this.#pending.set(key, (this.#pending.get(key) ?? new Map()).set(contextId, value));
    }
  }

  #learn(aspect: Aspect<any, any>): void {
    if (this.#aspects.has(aspect.key)) {
      return;
    }
    this.#aspects.set(aspect.key, aspect);
    const pending = this.#pending.get(aspect.key);
    this.#pending.delete(aspect.key);
    pending?.forEach((value, contextId) => this.#decodeInto(aspect, contextId, value));
  }

  // Only a `write` aspect takes a leader's value; a `reveal` one is the follow's to apply.
  #decodeInto(aspect: Aspect<any, any>, contextId: string, value: unknown): void {
    if (aspect.follow !== 'write') {
      return;
    }
    Option.match(Schema.decodeUnknownOption(Schema.toCodecJson(aspect.schema))(value), {
      onNone: () => {},
      onSome: (decoded) => this.set(aspect, contextId, decoded),
    });
  }
}
