//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';

import { type CleanupFn, type ReadOnlyEvent } from '@dxos/async';
import { type Entity, type QueryResult } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';

/**
 * A query result re-evaluated synchronously against the working set on every read.
 *
 * Subscribers are notified when `changed` fires and the result list differs (by identity) from the
 * one they last saw, so an unrelated write does not wake them.
 */
export class LiveQueryResult<T> implements QueryResult.QueryResult<T> {
  readonly #changed: ReadOnlyEvent<void>;
  readonly #evaluate: () => Entity.Unknown[];
  readonly #source: QueryResult.Source;
  #atom: Atom.Atom<T[]> | undefined;

  constructor(options: {
    ast: QueryAST.Query;
    changed: ReadOnlyEvent<void>;
    evaluate: (ast: QueryAST.Query) => Entity.Unknown[];
    source: QueryResult.Source;
  }) {
    this.#changed = options.changed;
    this.#evaluate = () => options.evaluate(options.ast);
    this.#source = options.source;
  }

  get entries(): QueryResult.Entry<T>[] {
    return this.runSyncEntries();
  }

  get results(): T[] {
    return this.runSync();
  }

  get atom(): Atom.Atom<T[]> {
    this.#atom ??= Atom.make((get) => {
      get.addFinalizer(this.subscribe(() => get.setSelf(this.runSync())));
      return this.runSync();
    });
    return this.#atom;
  }

  async run(): Promise<T[]> {
    return this.runSync();
  }

  async runEntries(): Promise<QueryResult.Entry<T>[]> {
    return this.runSyncEntries();
  }

  runSync(): T[] {
    return this.runSyncEntries().flatMap((entry) => (entry.result === undefined ? [] : [entry.result]));
  }

  runSyncEntries(): QueryResult.Entry<T>[] {
    return this.#evaluate().map((entity) => ({
      id: entity.id,
      // The query AST constrains the result type; the engine only knows `Entity.Unknown`.
      result: entity as T,
      resolution: { source: this.#source, time: 0 },
    }));
  }

  async first(): Promise<T> {
    const [first] = this.runSync();
    if (first === undefined) {
      throw new Error('No results');
    }
    return first;
  }

  async firstOrUndefined(): Promise<T | undefined> {
    return this.runSync()[0];
  }

  subscribe(callback?: (query: QueryResult.QueryResult<T>) => void, opts?: QueryResult.SubscriptionOptions): CleanupFn {
    let last = this.runSync();
    if (opts?.fire) {
      callback?.(this);
    }
    return this.#changed.on(() => {
      const next = this.runSync();
      if (next.length !== last.length || next.some((item, index) => item !== last[index])) {
        last = next;
        callback?.(this);
      }
    });
  }
}
