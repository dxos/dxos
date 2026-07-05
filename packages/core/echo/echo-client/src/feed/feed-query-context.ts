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

import { type QueryContext, analyzeFeedQuery } from '../query';
import { type FeedHandle } from './feed-handle';

// A sync appends a page (~10 items) roughly twice a second and the feed also polls every second; each
// fires `updated`. Recomputing (and re-rendering) on every one is a render storm. Coalesce them into
// at most one recompute per window (leading + trailing edge), keeping latency low while capping the
// re-render rate during a burst.
const FEED_UPDATE_THROTTLE = 250;

export class FeedQueryContext implements QueryContext {
  readonly #feed: FeedHandle;
  readonly #parentCtx: Context;
  #runCtx: Context | null = null;

  // Extracted from query.
  #filter?: QueryAST.Filter = undefined;
  // Bounded tail window: when set, results are the newest `#limit` matching items (see `analyzeFeedQuery`).
  #limit?: number = undefined;

  // Throttle bookkeeping for coalescing `updated` bursts (see `FEED_UPDATE_THROTTLE`).
  #throttleTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  #throttlePending = false;

  readonly changed = new Event();

  constructor(feed: FeedHandle, parentCtx: Context) {
    this.#feed = feed;
    this.#parentCtx = parentCtx;
  }

  /**
   * One-shot run.
   */
  async run(_ctx: Context, query: QueryAST.Query): Promise<QueryResult.EntityEntry[]> {
    const analyzed = analyzeFeedQuery(query);
    if (!analyzed) {
      throw new Error('Query not supported.');
    }
    const { filter, limit } = analyzed;

    // A windowed query reads only the tail (newest `limit`) instead of decoding the whole feed.
    // `fetchLatestObjects` yields newest-first; reverse back to ascending (append) order to match
    // the unbounded path (and `getResults`).
    if (limit !== undefined) {
      const tail = (await this.#feed.fetchLatestObjects(limit)).reverse();
      return tail
        .filter((object) => filterMatchObjectJSON(filter, Entity.toJSON(object)))
        .map((object) => ({ id: object.id, result: object }));
    }

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
    // Register this query's window so the feed retains (at least) the newest `#limit` items; the
    // matching unregister is tied to the same ctx, so `stop()` (which disposes it) balances it.
    this.#feed.registerWindow(this.#limit);
    this.#runCtx.onDispose(() => this.#feed.unregisterWindow(this.#limit));
    this.#feed.updated.on(this.#runCtx, this.#onFeedUpdated);
    this.#runCtx.onDispose(() => {
      if (this.#throttleTimer !== undefined) {
        clearTimeout(this.#throttleTimer);
        this.#throttleTimer = undefined;
        this.#throttlePending = false;
      }
    });
  }

  // Coalesce a burst of feed `updated` events into one recompute per `FEED_UPDATE_THROTTLE`: emit
  // immediately (leading edge), then swallow further events for the window and emit once more at the
  // end if any arrived (trailing edge).
  readonly #onFeedUpdated = (): void => {
    if (this.#throttleTimer !== undefined) {
      this.#throttlePending = true;
      return;
    }
    this.changed.emit();
    this.#throttleTimer = setTimeout(() => {
      this.#throttleTimer = undefined;
      if (this.#throttlePending) {
        this.#throttlePending = false;
        this.#onFeedUpdated();
      }
    }, FEED_UPDATE_THROTTLE);
  };

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
    const analyzed = analyzeFeedQuery(query);
    if (!analyzed) {
      throw new Error('Query not supported.');
    }
    this.#filter = analyzed.filter;
    this.#limit = analyzed.limit;
    this.changed.emit();
  }

  /**
   * Synchronously get the results.
   */
  getResults(): QueryResult.EntityEntry[] {
    invariant(this.#filter);

    const matches = Function.pipe(
      this.#feed.getObjectsSync(),
      // TODO(dmaretskyi): We end-up marshaling objects from JSON and back.
      Array.filter((obj) => filterMatchObjectJSON(this.#filter!, Entity.toJSON(obj))),
    );
    // Bounded tail window: `getObjectsSync` is in ascending (append) order, so the newest `#limit`
    // are the last `#limit`. This bounds the data handed to consumers (not just rendered DOM); as
    // the feed grows during sync the oldest fall out of the window.
    const windowed = this.#limit !== undefined ? matches.slice(-this.#limit) : matches;
    return windowed.map((object) => ({
      id: object.id,
      result: object,
    }));
  }
}
