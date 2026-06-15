//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { type AnyProperties, type RefSource } from '@dxos/echo/internal';
import { type URI } from '@dxos/keys';

/**
 * Resolution states of a load op's BODY tier (never the closure):
 * - `pending`: created, not yet started (one-way entry state; never re-entered).
 * - `requesting`: the backend is loading the body.
 * - `ready`: the body is materialized in the working set; {@link LoadOp.result} is non-null.
 * - `unavailable`: unreachable at the pursued ceiling.
 */
export type LoadOpState = 'pending' | 'requesting' | 'ready' | 'unavailable';

/**
 * Result of a working-set probe / completed load: the materialized entity plus its direct
 * strong-dependency URIs (computed store-side, where the raw references are reliably readable).
 */
export interface LoadResult {
  result: AnyProperties;
  strongDeps: URI.URI[];
}

/**
 * A coalesced, per-URI body-loading operation shared by all live requests referencing the URI.
 * Tracks only the body tier; closure satisfaction lives in the request layer.
 */
export interface LoadOp {
  readonly uri: URI.URI;
  /** Highest ceiling currently pursued; only ever escalated, never lowered. */
  maxCeiling: RefSource;
  state: LoadOpState;
  result: AnyProperties | null;
  /** Direct strong-dep URIs of {@link result}; empty unless `state === 'ready'`. */
  strongDeps: URI.URI[];
  /** Fires on any state / result / strongDeps change. */
  readonly changed: Event<void>;
  /** Number of live requests referencing this op. */
  refcount: number;
  /** Backend IO cancellation, set while loading. */
  cancel?: () => void;
}

/**
 * Drives a {@link LoadOp}'s state. Each backend owns a URI kind / space.
 */
export interface LoadBackend {
  /** Synchronous working-set probe; never performs IO. */
  probe(uri: URI.URI): LoadResult | undefined;

  /**
   * Begin loading the body at the given ceiling (always ≥ `disk`); drives the op via `set`.
   * Returns a cancellation function.
   */
  load(uri: URI.URI, source: RefSource, set: (state: LoadOpState, result: LoadResult | undefined) => void): () => void;
}

const CEILING_RANK: Record<RefSource, number> = { 'working-set': 0, disk: 1, network: 2 };

const isHigherCeiling = (a: RefSource, b: RefSource): boolean => CEILING_RANK[a] > CEILING_RANK[b];

/**
 * Owns the set of coalesced {@link LoadOp}s. Dedup lives here, below the resolver: each URI has at
 * most one in-flight op; requests share it and refcount it.
 */
export class LoadOpTable {
  readonly #ops = new Map<URI.URI, LoadOp>();

  constructor(private readonly _routeBackend: (uri: URI.URI) => LoadBackend | undefined) {}

  /**
   * Acquire (create-or-reuse) the op for `uri` at the given ceiling, incrementing its refcount.
   * Escalates the ceiling (and re-invokes the backend) when a higher tier is requested.
   */
  acquire(uri: URI.URI, source: RefSource): LoadOp {
    const existing = this.#ops.get(uri);
    if (existing) {
      existing.refcount++;
      if (isHigherCeiling(source, existing.maxCeiling)) {
        existing.maxCeiling = source;
        if (existing.state !== 'ready') {
          this.#startLoad(existing, source);
        }
      }
      return existing;
    }

    const op: LoadOp = {
      uri,
      maxCeiling: source,
      state: 'pending',
      result: null,
      strongDeps: [],
      changed: new Event<void>(),
      refcount: 1,
    };
    this.#ops.set(uri, op);

    const backend = this._routeBackend(uri);
    // Always probe the working set first.
    const probed = backend?.probe(uri);
    if (probed) {
      op.state = 'ready';
      op.result = probed.result;
      op.strongDeps = probed.strongDeps;
      return op;
    }

    if (source === 'working-set' || backend == null) {
      op.state = 'unavailable';
      return op;
    }

    this.#startLoad(op, source);
    return op;
  }

  /**
   * Decrement the refcount; at zero, cancel IO and drop the op (does not evict the entity from its
   * backing store's working set).
   */
  release(op: LoadOp): void {
    if (--op.refcount > 0) {
      return;
    }
    op.cancel?.();
    op.cancel = undefined;
    this.#ops.delete(op.uri);
  }

  /** @internal Testing / introspection. */
  get size(): number {
    return this.#ops.size;
  }

  #startLoad(op: LoadOp, source: RefSource): void {
    const backend = this._routeBackend(op.uri);
    if (backend == null) {
      this.#set(op, 'unavailable', undefined);
      return;
    }
    op.cancel?.();
    op.state = 'requesting';
    op.cancel = backend.load(op.uri, source, (state, result) => this.#set(op, state, result));
  }

  #set(op: LoadOp, state: LoadOpState, result: LoadResult | undefined): void {
    // `pending` is a one-way entry state; never re-enter it.
    const nextState = state === 'pending' ? 'requesting' : state;
    const nextResult = result?.result ?? null;
    const nextDeps = result?.strongDeps ?? [];
    if (op.state === nextState && op.result === nextResult && sameUris(op.strongDeps, nextDeps)) {
      return;
    }
    op.state = nextState;
    op.result = nextResult;
    op.strongDeps = nextDeps;
    op.changed.emit();
  }
}

const sameUris = (a: URI.URI[], b: URI.URI[]): boolean =>
  a.length === b.length && a.every((uri, index) => uri === b[index]);
