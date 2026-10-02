//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Entity, type QueryResult } from '@dxos/echo';
import { filterMatchEntity } from '@dxos/echo-host/filter';
import { type QueryAST } from '@dxos/echo-protocol';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';

import { type FeedHandle } from '../feed/feed-handle.ts';
import { type QuerySource } from './graph-query-context.ts';
import { getUnindexedFeedScopes, isSimpleSelectionQuery } from './util.ts';

/** Resolves the handle of a feed, or `undefined` when its space is not open here. */
export type FeedHandleResolver = (feedUri: EID.EID, namespace: string) => FeedHandle | undefined;

/**
 * QuerySource for feeds in namespaces the index does not ingest (see {@link getUnindexedFeedScopes}):
 * reads them straight from the feed store through each feed's {@link FeedHandle}, and follows a live
 * query through the handle's subscription, which after its first snapshot ships only new blocks.
 *
 * Serves simple selections (a filter, no ordering, windowing or traversal), matched in memory.
 */
export class DirectFeedQuerySource implements QuerySource {
  public readonly changed = new Event<void>();

  readonly #resolveHandle: FeedHandleResolver;
  #open = false;
  #filter: QueryAST.Filter | undefined = undefined;
  #handles: FeedHandle[] = [];
  #ctx: Context | undefined = undefined;

  constructor(resolveHandle: FeedHandleResolver) {
    this.#resolveHandle = resolveHandle;
  }

  /** Subscribes nothing itself: the context starting it follows with {@link update}. */
  open(): void {
    this.#open = true;
  }

  close(): void {
    this.#open = false;
    this.#unsubscribe();
  }

  getResults(): QueryResult.EntityEntry[] {
    const filter = this.#filter;
    if (!filter) {
      return [];
    }
    return this.#match(
      filter,
      this.#handles.flatMap((handle) => handle.objects),
    );
  }

  /** Feed reads are asynchronous: a live query has nothing until each handle's first push. */
  isSynchronous(): boolean {
    return false;
  }

  isPending(): boolean {
    return this.#filter !== undefined && this.#handles.some((handle) => !handle.subscriptionReady && !handle.error);
  }

  async run(_ctx: Context, query: QueryAST.Query): Promise<QueryResult.EntityEntry[]> {
    const target = this.#target(query);
    if (!target) {
      return [];
    }
    const objects = await Promise.all(target.handles.map((handle) => handle.queryObjects()));
    return this.#match(target.filter, objects.flat());
  }

  update(query: QueryAST.Query): void {
    this.#unsubscribe();
    if (this.#open) {
      this.#subscribe(query);
    }
  }

  #subscribe(query: QueryAST.Query): void {
    const target = this.#target(query);
    if (!target) {
      return;
    }
    this.#ctx = new Context();
    this.#filter = target.filter;
    this.#handles = target.handles;
    for (const handle of target.handles) {
      handle.updated.on(this.#ctx, () => this.changed.emit());
      this.#ctx.onDispose(handle.beginPolling());
    }
    this.changed.emit();
  }

  #unsubscribe(): void {
    void this.#ctx?.dispose().catch(() => {});
    this.#ctx = undefined;
    this.#filter = undefined;
    this.#handles = [];
  }

  /** The filter and feed handles a query reads, when this source serves it. */
  #target(query: QueryAST.Query): { filter: QueryAST.Filter; handles: FeedHandle[] } | undefined {
    const scopes = getUnindexedFeedScopes(query);
    if (!scopes) {
      return undefined;
    }
    const simple = isSimpleSelectionQuery(query);
    if (!simple) {
      // No other source reads these feeds, so a shape this source cannot evaluate would read as empty.
      log.warn('unsupported query over unindexed feeds; returning no results', { query });
      return undefined;
    }
    const handles = scopes.flatMap((scope) => {
      const feedUri = EID.tryParse(scope.feedUri);
      // `getUnindexedFeedScopes` only returns scopes carrying a namespace.
      const handle = feedUri && scope.namespace ? this.#resolveHandle(feedUri, scope.namespace) : undefined;
      return handle ? [handle] : [];
    });
    return { filter: simple.filter, handles };
  }

  #match(filter: QueryAST.Filter, objects: readonly Entity.Unknown[]): QueryResult.EntityEntry[] {
    return objects.flatMap((object) =>
      filterMatchEntity(filter, object)
        ? [{ id: object.id, result: object, match: { rank: 1 }, resolution: { source: 'local' as const, time: 0 } }]
        : [],
    );
  }
}
