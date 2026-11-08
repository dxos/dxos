//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import { type CleanupFn } from '@dxos/async';
import { type Entity, type QueryResult } from '@dxos/echo';

/**
 * A query result answered by one synchronous bridge call per execution.
 *
 * Nothing in the guest outlives an evaluation's program, and the host owns change notification, so a
 * subscription fires once with the current result and never again.
 */
export class BridgeQueryResult<T> implements QueryResult.QueryResult<T> {
  readonly #execute: () => Entity.Unknown[] | Promise<Entity.Unknown[]>;
  readonly #source: QueryResult.Source;
  #results: Entity.Unknown[] | undefined;
  #atom: Atom.Atom<T[]> | undefined;

  constructor(options: { execute: () => Entity.Unknown[] | Promise<Entity.Unknown[]>; source: QueryResult.Source }) {
    this.#execute = options.execute;
    this.#source = options.source;
  }

  get entries(): QueryResult.Entry<T>[] {
    return this.runSyncEntries();
  }

  get results(): T[] {
    return this.runSync();
  }

  get atom(): Atom.Atom<T[]> {
    this.#atom ??= Atom.make(() => this.runSync());
    return this.#atom;
  }

  get completeness(): QueryResult.Completeness {
    return this.#results === undefined ? 'pending' : 'complete';
  }

  get sources(): readonly QueryResult.SourceState[] {
    return [{ source: this.#source, state: this.#results === undefined ? 'pending' : 'answered', answers: 1 }];
  }

  async run(): Promise<T[]> {
    return (await this.runEntries()).flatMap((entry) => (entry.result === undefined ? [] : [entry.result]));
  }

  async runEntries(): Promise<QueryResult.Entry<T>[]> {
    this.#results = await this.#execute();
    return this.#entries(this.#results);
  }

  runSync(): T[] {
    return this.runSyncEntries().flatMap((entry) => (entry.result === undefined ? [] : [entry.result]));
  }

  /** Answers from the last execution; the first call has none to answer from, as with any ECHO query. */
  runSyncEntries(): QueryResult.Entry<T>[] {
    if (this.#results === undefined) {
      void this.runEntries();
      return [];
    }
    return this.#entries(this.#results);
  }

  async first(): Promise<T> {
    const [first] = await this.run();
    if (first === undefined) {
      throw new Error('No results');
    }
    return first;
  }

  async firstOrUndefined(): Promise<T | undefined> {
    return (await this.run())[0];
  }

  subscribe(callback?: (query: QueryResult.QueryResult<T>) => void, opts?: QueryResult.SubscriptionOptions): CleanupFn {
    void this.runEntries().then(() => {
      if (!opts?.fire) {
        callback?.(this);
      }
    });
    if (opts?.fire) {
      callback?.(this);
    }
    return () => {};
  }

  #entries(results: Entity.Unknown[]): QueryResult.Entry<T>[] {
    return results.map((entity) => ({
      id: entity.id,
      // The query AST constrains the result type; the executor only knows `Entity.Unknown`.
      result: entity as T,
      resolution: { source: this.#source, time: 0 },
    }));
  }
}
