//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { type AnyProperties, type RefResolverRequest, type RefSource } from '@dxos/echo/internal';
import { type URI } from '@dxos/keys';

import { type LoadOp, type LoadOpTable } from './load-op';

/**
 * A closure-aware {@link RefResolverRequest}: an un-coalesced per-call handle over a root
 * {@link LoadOp} plus the strong-dependency closure discovered by a cycle-safe BFS.
 *
 * `state` is derived: `unavailable` if the root or any closure member body is unavailable at the
 * requested ceiling; `ready` when the root and the whole closure are body-ready; otherwise
 * `requesting` / `pending`. The walker waits on member BODIES (not their closure-readiness), so
 * mutually-citing entities (`A.source→B, B.parent→A`) cannot deadlock.
 */
export class RequestImpl implements RefResolverRequest {
  readonly stateChanged = new Event<void>();

  #state: RefResolverRequest['state'];
  #emitScheduled = false;
  #aborted = false;

  /** Discovered closure members (excludes the root). */
  readonly #members = new Map<URI.URI, { op: LoadOp; unsub: () => void }>();
  readonly #rootUnsub: () => void;

  constructor(
    private readonly _table: LoadOpTable,
    private readonly _root: LoadOp,
    private readonly _source: RefSource,
  ) {
    this.#state = 'pending';
    this.#rootUnsub = this._root.changed.on(() => this.#recompute());
    // Discover the initial closure synchronously (so `getResult()` is correct immediately) but defer
    // the first `stateChanged` to a microtask per the resolver contract.
    this.#recompute();
  }

  get state(): RefResolverRequest['state'] {
    return this.#state;
  }

  getResult(): AnyProperties | undefined {
    return this.#state === 'ready' ? (this._root.result ?? undefined) : undefined;
  }

  async wait(): Promise<AnyProperties | undefined> {
    if (this.#state === 'ready' || this.#state === 'unavailable') {
      return this.getResult();
    }
    return new Promise((resolve) => {
      const unsub = this.stateChanged.on(() => {
        if (this.#state === 'ready' || this.#state === 'unavailable') {
          unsub();
          resolve(this.getResult());
        }
      });
    });
  }

  abort(): void {
    if (this.#aborted) {
      return;
    }
    this.#aborted = true;
    this.#rootUnsub();
    for (const { op, unsub } of this.#members.values()) {
      unsub();
      this._table.release(op);
    }
    this.#members.clear();
    this._table.release(this._root);
  }

  /**
   * Re-walk the closure from the root's materialized body, attach load ops for newly-discovered
   * dependency URIs, recompute the public state, and emit `stateChanged` (deferred) on change.
   */
  #recompute(): void {
    if (this.#aborted) {
      return;
    }

    // Cycle-safe BFS over already-materialized bodies; a node contributes its dep edges only once
    // its own body is ready, so cycles terminate against the `seen` set.
    const seen = new Set<URI.URI>([this._root.uri]);
    const queue: LoadOp[] = [this._root];
    while (queue.length > 0) {
      const op = queue.shift()!;
      if (op.state !== 'ready') {
        continue;
      }
      for (const depUri of op.strongDeps) {
        if (seen.has(depUri)) {
          continue;
        }
        seen.add(depUri);
        let member = this.#members.get(depUri);
        if (member == null) {
          const depOp = this._table.acquire(depUri, this._source);
          const unsub = depOp.changed.on(() => this.#recompute());
          member = { op: depOp, unsub };
          this.#members.set(depUri, member);
        }
        queue.push(member.op);
      }
    }

    // Release members that are no longer reachable (dep edges removed).
    for (const [uri, member] of this.#members) {
      if (!seen.has(uri)) {
        member.unsub();
        this._table.release(member.op);
        this.#members.delete(uri);
      }
    }

    // Derive the public state over the root + reachable members.
    let anyUnavailable = false;
    let allReady = true;
    for (const uri of seen) {
      const op = uri === this._root.uri ? this._root : this.#members.get(uri)?.op;
      if (op == null) {
        continue;
      }
      if (op.state === 'unavailable') {
        anyUnavailable = true;
      }
      if (op.state !== 'ready') {
        allReady = false;
      }
    }

    const nextState: RefResolverRequest['state'] = anyUnavailable
      ? 'unavailable'
      : allReady
        ? 'ready'
        : this._root.state === 'pending'
          ? 'pending'
          : 'requesting';

    if (nextState !== this.#state) {
      this.#state = nextState;
      this.#scheduleEmit();
    }
  }

  // Defer `stateChanged` to a microtask to avoid re-entrant listener storms during closure discovery.
  #scheduleEmit(): void {
    if (this.#emitScheduled) {
      return;
    }
    this.#emitScheduled = true;
    queueMicrotask(() => {
      this.#emitScheduled = false;
      if (!this.#aborted) {
        this.stateChanged.emit();
      }
    });
  }
}
