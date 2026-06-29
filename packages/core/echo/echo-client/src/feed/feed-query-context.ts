//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { Entity, type QueryResult } from '@dxos/echo';
import { filterMatchObjectJSON } from '@dxos/echo-host/filter';
import { type QueryAST } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type QueryContext, isSimpleSelectionQuery } from '../query';
import { type FeedHandle } from './feed-handle';

export class FeedQueryContext implements QueryContext {
  readonly #feed: FeedHandle;
  readonly #parentCtx: Context;
  #runCtx: Context | null = null;

  // Extracted from query.
  #filter?: QueryAST.Filter = undefined;

  readonly changed = new Event();

  constructor(feed: FeedHandle, parentCtx: Context) {
    this.#feed = feed;
    this.#parentCtx = parentCtx;
  }

  /**
   * One-shot run.
   */
  async run(_ctx: Context, query: QueryAST.Query): Promise<QueryResult.EntityEntry[]> {
    const trivial = isSimpleSelectionQuery(query);
    if (!trivial) {
      throw new Error('Query not supported.');
    }
    const { filter } = trivial;

    const objects = await Function.pipe(
      await this.#feed.fetchObjectsJSON(),
      Array.filter((obj) => filterMatchObjectJSON(filter, obj)),
      Array.map(async (obj) => {
        try {
          return await this.#feed.hydrateObject(obj);
        } catch (err) {
          // Silently skip items that fail to decode (e.g. tombstones from
          // `delete()` whose JSON lacks an `@type`).
          log.verbose('feed object hydration failed; object skipped', { obj, error: err });
          return undefined;
        }
      }),
      (_) => Promise.all(_),
    );

    return objects
      .filter((object): object is Entity.Unknown => object !== undefined)
      .map((object) => ({
        id: object.id,
        result: object,
      }));
  }

  /**
   * Start reactive query.
   */
  start(): void {
    this.#runCtx = this.#parentCtx.derive();
    this.#runCtx.onDispose(this.#feed.beginPolling());
    this.#feed.updated.on(this.#runCtx, () => {
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
  getResults(): QueryResult.EntityEntry[] {
    invariant(this.#filter);

    return Function.pipe(
      this.#feed.getObjectsSync(),
      // TODO(dmaretskyi): We end-up marshaling objects from JSON and back.
      Array.filter((obj) => filterMatchObjectJSON(this.#filter!, Entity.toJSON(obj))),
      Array.map((object) => ({
        id: object.id,
        result: object,
      })),
    );
  }
}
