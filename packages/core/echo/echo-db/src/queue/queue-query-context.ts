//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { Entity, type QueryResult } from '@dxos/echo';
import { filterMatchObjectJSON } from '@dxos/echo-pipeline/filter';
import { type QueryAST } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';

import {
  type QueryContext,
  type SchemaResolvers,
  assertQueryTypenamesResolvable,
  filterEntriesWithResolvableSchema,
  isSimpleSelectionQuery,
} from '../query';
import { type QueueImpl } from './queue';

export class QueueQueryContext<T extends Entity.Unknown = Entity.Unknown> implements QueryContext<T> {
  readonly #queue: QueueImpl;
  readonly #parentCtx: Context;
  readonly #schemaResolvers?: SchemaResolvers;
  #runCtx: Context | null = null;

  // Extracted from query.
  #query?: QueryAST.Query = undefined;
  #filter?: QueryAST.Filter = undefined;

  readonly changed = new Event();

  constructor(queue: QueueImpl<T>, parentCtx: Context, schemaResolvers?: SchemaResolvers) {
    this.#queue = queue;
    this.#parentCtx = parentCtx;
    this.#schemaResolvers = schemaResolvers;
  }

  /**
   * One-shot run.
   */
  async run(_ctx: Context, query: QueryAST.Query): Promise<QueryResult.EntityEntry<T>[]> {
    const trivial = isSimpleSelectionQuery(query);
    if (!trivial) {
      throw new Error('Query not supported.');
    }
    const { filter } = trivial;

    this.#assertTypenamesResolvable(query);

    const objects = await Function.pipe(
      await this.#queue.fetchObjectsJSON(),
      Array.filter((obj) => filterMatchObjectJSON(filter, obj)),
      Array.map(async (obj) => this.#queue.hydrateObject(obj)),
      (_) => Promise.all(_),
    );

    const entries = objects.map((object) => ({
      id: object.id,
      result: object as T,
    }));
    return this.#filterResolvable(entries, query);
  }

  /**
   * Start reactive query.
   */
  start(): void {
    this.#runCtx = this.#parentCtx.derive();
    this.#runCtx.onDispose(this.#queue.beginPolling());
    this.#queue.updated.on(this.#runCtx, () => {
      this.changed.emit();
    });
  }

  /**
   * Stop reactive query.
   */
  stop(): void {
    void this.#runCtx?.dispose();
    this.#runCtx = null;
  }

  /**
   * Update the filter (for reactive queries).
   */
  update(query: QueryAST.Query): void {
    const trivial = isSimpleSelectionQuery(query);
    if (!trivial) {
      throw new Error('Query not supported.');
    }
    const { filter } = trivial;
    this.#query = query;
    this.#filter = filter;
    this.changed.emit();
  }

  /**
   * Synchronously get the results.
   */
  getResults(): QueryResult.EntityEntry<T>[] {
    invariant(this.#filter);

    // NOTE: No assertion here; see the note on GraphQueryContext.getResults.

    const entries = Function.pipe(
      this.#queue.getObjectsSync(),
      // TODO(dmaretskyi): We end-up marshaling objects from JSON and back.
      Array.filter((obj) => filterMatchObjectJSON(this.#filter!, Entity.toJSON(obj))),
      Array.map((object) => ({
        id: object.id,
        result: object as T,
      })),
    );
    return this.#filterResolvable(entries, this.#query);
  }

  #assertTypenamesResolvable(query: QueryAST.Query): void {
    if (this.#schemaResolvers == null) return;
    assertQueryTypenamesResolvable(query, this.#schemaResolvers);
  }

  #filterResolvable(
    entries: QueryResult.EntityEntry<T>[],
    query: QueryAST.Query | undefined,
  ): QueryResult.EntityEntry<T>[] {
    if (this.#schemaResolvers == null || query == null) return entries;
    return filterEntriesWithResolvableSchema(query, entries, this.#schemaResolvers);
  }
}
