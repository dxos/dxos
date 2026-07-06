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

import { type QueryContext, isSimpleFeedWindowQuery } from '../query';
import { type FeedHandle } from './feed-handle';

export class FeedQueryContext implements QueryContext {
  readonly #feed: FeedHandle;
  readonly #parentCtx: Context;
  #runCtx: Context | null = null;

  // Extracted from query.
  #filter?: QueryAST.Filter = undefined;
  #order?: readonly QueryAST.Order[] = undefined;
  #skip = 0;
  #limit?: number = undefined;

  readonly changed = new Event();

  constructor(feed: FeedHandle, parentCtx: Context) {
    this.#feed = feed;
    this.#parentCtx = parentCtx;
  }

  /**
   * One-shot run.
   */
  async run(_ctx: Context, query: QueryAST.Query): Promise<QueryResult.EntityEntry[]> {
    const trivial = isSimpleFeedWindowQuery(query);
    if (!trivial) {
      throw new Error('Query not supported.');
    }
    const { filter, order, skip = 0, limit } = trivial;

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

    const filtered = objects.filter((object): object is Entity.Unknown => object !== undefined);
    const paged = applyOrderSkipLimit(filtered, order, skip, limit);

    return paged.map((object) => ({
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
    const trivial = isSimpleFeedWindowQuery(query);
    if (!trivial) {
      throw new Error('Query not supported.');
    }
    this.#filter = trivial.filter;
    this.#order = trivial.order;
    this.#skip = trivial.skip ?? 0;
    this.#limit = trivial.limit;
    this.changed.emit();
  }

  /**
   * Synchronously get the results.
   */
  getResults(): QueryResult.EntityEntry[] {
    invariant(this.#filter);

    const filtered = Function.pipe(
      this.#feed.getObjectsSync(),
      // TODO(dmaretskyi): We end-up marshaling objects from JSON and back.
      Array.filter((obj) => filterMatchObjectJSON(this.#filter!, Entity.toJSON(obj))),
    );
    const paged = applyOrderSkipLimit(filtered, this.#order, this.#skip, this.#limit);

    return paged.map((object) => ({
      id: object.id,
      result: object,
    }));
  }
}

/**
 * Applies order/skip/limit over the feed's already-filtered, fully-fetched in-memory item list.
 * `natural` order means feed/insertion order here (the order `getObjectsSync()`/`fetchObjectsJSON()`
 * already return objects in) rather than the by-id ordering used elsewhere in the query engine --
 * feed object ids are not sequential, so insertion order is the only sensible reading of "natural"
 * for a feed.
 *
 * TODO(dxos): This always fetches and decodes the entire feed before slicing, for every
 * ordering including natural-desc -- a prior version of this path had a `FeedWindow` that made
 * natural-desc reads truly lazy (bounded cursor fetches), but it was reverted because a
 * partial-laziness story (fast for one ordering, a full decode for every other) wasn't judged
 * worth the complexity. Revisit as a general, index-backed keyset-pagination feature covering all
 * orderings uniformly (see `EntityMetaIndex`/`QueryExecutor` -- content-based ordering has the same
 * full-scan-then-sort limitation there today) rather than re-adding a feed-only special case.
 */
const applyOrderSkipLimit = (
  entities: Entity.Unknown[],
  order: readonly QueryAST.Order[] | undefined,
  skip: number | undefined,
  limit: number | undefined,
): Entity.Unknown[] => {
  let ordered = entities;
  if (order && order.length > 0) {
    // `natural` needs each element's original array position (it has no content to compare), so
    // sort (entity, index) pairs rather than bare entities.
    const indexed = entities.map((entity, index) => ({ entity, index }));
    indexed.sort((a, b) => compareByOrders(a.entity, a.index, b.entity, b.index, order));
    ordered = indexed.map((item) => item.entity);
  }
  const start = skip ?? 0;
  return limit !== undefined ? ordered.slice(start, start + limit) : ordered.slice(start);
};

const compareByOrders = (
  a: Entity.Unknown,
  aIndex: number,
  b: Entity.Unknown,
  bIndex: number,
  orders: readonly QueryAST.Order[],
): number => {
  for (const order of orders) {
    const comparison = compareByOrder(a, aIndex, b, bIndex, order);
    if (comparison !== 0) {
      return comparison;
    }
  }
  return 0;
};

const compareByOrder = (
  a: Entity.Unknown,
  aIndex: number,
  b: Entity.Unknown,
  bIndex: number,
  order: QueryAST.Order,
): number => {
  switch (order.kind) {
    case 'natural':
      // Feed/insertion order is the entities' position in the already-ordered source array.
      return order.direction === 'desc' ? bIndex - aIndex : aIndex - bIndex;
    case 'rank':
      // No relevance rank available outside indexer-backed text search; treat as equal.
      return 0;
    case 'timestamp': {
      const aValue = (order.field === 'updatedAt' ? Entity.getMeta(a).updatedAt : Entity.getMeta(a).createdAt) ?? 0;
      const bValue = (order.field === 'updatedAt' ? Entity.getMeta(b).updatedAt : Entity.getMeta(b).createdAt) ?? 0;
      const comparison = aValue - bValue;
      return order.direction === 'desc' ? -comparison : comparison;
    }
    case 'property': {
      // `order.property` is an arbitrary runtime-supplied path with no static type -- Entity
      // proxies support dynamic property access, but the type system has no way to express that.
      const aValue = (a as unknown as Record<string, unknown>)[order.property];
      const bValue = (b as unknown as Record<string, unknown>)[order.property];
      const comparison =
        aValue == null && bValue == null
          ? 0
          : aValue == null
            ? -1
            : bValue == null
              ? 1
              : aValue < bValue
                ? -1
                : aValue > bValue
                  ? 1
                  : 0;
      return order.direction === 'desc' ? -comparison : comparison;
    }
    default:
      return 0;
  }
};
