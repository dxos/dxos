//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Database, Obj } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { filterMatchObjectJSON } from '@dxos/echo-pipeline/filter';
import { type QueryAST } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';

import { type QueryContext, isSimpleSelectionQuery } from '../query';

import { type QueueImpl } from './queue';

export class QueueQueryContext implements QueryContext {
  readonly #queue: QueueImpl;
  #runCtx: Context | null = null;

  // Extracted from query.
  #filter?: QueryAST.Filter = undefined;

  readonly changed = new Event();

  constructor(queue: QueueImpl) {
    this.#queue = queue;
  }

  /**
   * One-shot run.
   */
  async run(query: QueryAST.Query): Promise<Database.QueryResultEntry<AnyProperties>[]> {
    const trivial = isSimpleSelectionQuery(query);
    if (!trivial) {
      throw new Error('Query not supported.');
    }
    const { filter } = trivial;

    const spaceId = this.#queue.dxn.asQueueDXN()!.spaceId;

    const objects = await Function.pipe(
      await this.#queue.fetchObjectsJSON(),
      Array.filter((obj) => filterMatchObjectJSON(filter, obj)),
      Array.map(async (obj) => this.#queue.hydrateObject(obj)),
      (_) => Promise.all(_),
    );

    return objects.map((object) => ({
      id: object.id,
      spaceId,
      object,
    }));
  }

  /**
   * Start reactive query.
   */
  start(): void {
    this.#runCtx = Context.default();
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
    this.#filter = filter;
    this.changed.emit();
  }

  /**
   * Synchronously get the results.
   */
  getResults(): Database.QueryResultEntry<AnyProperties>[] {
    invariant(this.#filter);

    const spaceId = this.#queue.dxn.asQueueDXN()!.spaceId;
    return Function.pipe(
      this.#queue.getObjectsSync(),
      // TODO(dmaretskyi): We end-up marshaling objects from JSON and back.
      Array.filter((obj) => filterMatchObjectJSON(this.#filter!, Obj.toJSON(obj))),
      Array.map((object) => ({
        id: object.id,
        spaceId,
        object,
      })),
    );
  }
}
