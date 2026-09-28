//
// Copyright 2024 DXOS.org
//

import * as Array from 'effect/Array';
import * as EffectContext from 'effect/Context';

import { type CleanupFn, Event, type ReadOnlyEvent, TimeoutError, asyncTimeout, yieldOrContinue } from '@dxos/async';
import { Context } from '@dxos/context';
import { Entity, Feed, type Hypergraph, Obj, Query } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { ATTR_TYPE, makeDecodedEntityLive } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { EID, EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError, subscribeStream } from '@dxos/protocols';
import { QueryReactivity } from '@dxos/protocols/buf/dxos/echo/query_pb';
import { QueryService } from '@dxos/protocols/rpc';
import { chunkArray, isNonNullable } from '@dxos/util';

import { type FeedHandle } from '../feed/feed-handle.ts';
import { type QuerySourceProvider, recordObjectDiagnostic } from '../hypergraph.ts';
import { DatabaseImpl } from '../proxy-db/index.ts';
import {
  type QuerySource,
  type SourceEntry,
  getQueryDeletedOption,
  getTargetSpacesForQuery,
  queryTargetsSpacesOrFeeds,
} from '../query/index.ts';

const HYDRATE_RECORDS_PER_YIELD_CHECK = 64;

export type LoadObjectProps = {
  spaceId: SpaceId;
  objectId: string;
  documentId: string | undefined;
};

/**
 * Notification that objects became available (or changed) in the local working set.
 * Plumbed from `DatabaseImpl` update events so reactive index sources can re-hydrate.
 */
export type ObjectUpdate = {
  spaceId: SpaceId;
  objectIds: string[];
};

export interface ObjectLoader {
  loadObject(params: LoadObjectProps): Promise<Entity.Unknown | undefined>;

  /**
   * Hands over the index copies of documents a query response carried, before its records load, so
   * documents shown from the index need no second round trip.
   */
  primeDocumentCopies?(copies: readonly QueryService.DocumentCopy[]): void;

  /**
   * Fires when objects are added/updated locally. Lets reactive index results re-hydrate
   * index hits that previously failed to load (e.g. timed out before their document arrived).
   */
  readonly updateEvent: ReadOnlyEvent<ObjectUpdate>;
}

export type IndexQueryProviderProps = {
  service: QueryService.Client;
  runtime: EffectContext.Context<never>;
  objectLoader: ObjectLoader;
  graph: Hypergraph.Hypergraph;
  /** Overrides {@link QUERY_SERVICE_TIMEOUT}; tests drive the budget rather than waiting it out. */
  queryTimeout?: number;
  /** Overrides {@link RECORD_HYDRATION_TIMEOUT}; tests drive the budget rather than waiting it out. */
  hydrationTimeout?: number;
  /** Ask the host for the index copies of the results' documents, for a client that shows them from the index. */
  documentCopies?: boolean;
};

/**
 * Budget for the host's index response, and for that alone: it is cleared the moment the host
 * answers, so a query that timed out here genuinely means the index never responded.
 */
const QUERY_SERVICE_TIMEOUT = 20_000;

/**
 * Budget for hydrating ONE index hit into a live object. Hydration reaches document loading, which
 * waits on replication and so has no bound of its own; without this the one-shot budget above was
 * being spent on it, and a single unavailable document failed the whole query as an "index query"
 * timeout. A hit that exceeds it is dropped (reactive queries re-hydrate it once its document
 * arrives, via {@link ObjectLoader.updateEvent}) rather than taking the other hits down with it.
 */
const RECORD_HYDRATION_TIMEOUT = 10_000;

export class IndexQuerySourceProvider implements QuerySourceProvider {
  // TODO(burdon): OK for options, but not params. Pass separately and type readonly here.
  constructor(private readonly _params: IndexQueryProviderProps) {}

  // TODO(burdon): Rename createQuerySource
  create(): QuerySource {
    return new IndexQuerySource({
      service: this._params.service,
      runtime: this._params.runtime,
      objectLoader: this._params.objectLoader,
      graph: this._params.graph,
      queryTimeout: this._params.queryTimeout,
      hydrationTimeout: this._params.hydrationTimeout,
      documentCopies: this._params.documentCopies,
    });
  }
}

export type IndexQuerySourceProps = {
  service: QueryService.Client;
  runtime: EffectContext.Context<never>;
  objectLoader: ObjectLoader;
  graph: Hypergraph.Hypergraph;
  /** Overrides {@link QUERY_SERVICE_TIMEOUT}; tests drive the budget rather than waiting it out. */
  queryTimeout?: number;
  /** Overrides {@link RECORD_HYDRATION_TIMEOUT}; tests drive the budget rather than waiting it out. */
  hydrationTimeout?: number;
  /** Ask the host for the index copies of the results' documents; see {@link ObjectLoader.primeDocumentCopies}. */
  documentCopies?: boolean;
};

/**
 * Runs queries against an index.
 */
export class IndexQuerySource implements QuerySource {
  changed = new Event<void>();

  private _query?: QueryAST.Query = undefined;
  private _results?: SourceEntry[] = [];
  /** Cleanup for the active reactive query subscription. */
  private _streamCleanup?: () => void = undefined;
  private _open = false;

  /**
   * Raw records from the host's last reactive response. Retained so we can re-hydrate when the
   * objects they reference finish loading locally (see {@link _onObjectsUpdated}). Each record's
   * `documentJson` is dropped once it has been hydrated into a feed handle, since later passes
   * re-resolve the same live object by id from the handle's identity map — retaining it would keep
   * a full copy of every result's document (hundreds of KB per mail message) for the subscription's
   * lifetime.
   */
  private _lastRemoteResults?: readonly QueryService.QueryResult[] = undefined;

  /**
   * Ids of {@link _lastRemoteResults} records whose `documentJson` we released. Tracked explicitly
   * rather than inferred from its absence: a record that never carried JSON is not re-resolvable
   * from a feed handle and must still go through the generic object loader.
   */
  private _releasedDocumentJsonIds = new Set<string>();

  /** queryId of the active reactive stream, kept for log correlation on update-driven re-hydration. */
  private _reactiveQueryId?: number = undefined;

  /** Context of the in-flight hydration pass; disposed on close so its results are dropped. */
  private _hydrationCtx?: Context = undefined;

  /** True while {@link _hydrateLoop} is running, so concurrent triggers coalesce instead of racing. */
  private _hydrating = false;

  /** Whether the reactive stream has answered: its first response hydrated, or the stream failed. */
  private _answered = false;

  /** Set when a new trigger arrives mid-pass, causing {@link _hydrateLoop} to run one more iteration. */
  private _hydratePending = false;

  /** Subscription to local object-load updates (plumbed from `DatabaseImpl`). */
  private _updateSubscription?: CleanupFn = undefined;

  constructor(private readonly _params: IndexQuerySourceProps) {}

  open(): void {
    this._open = true;
    this._updateSubscription = this._params.objectLoader.updateEvent.on((event) => this._onObjectsUpdated(event));
  }

  close(): void {
    this._open = false;
    this._answered = false;
    this._results = undefined;
    this._lastRemoteResults = undefined;
    this._releasedDocumentJsonIds.clear();
    this._reactiveQueryId = undefined;
    this._updateSubscription?.();
    this._updateSubscription = undefined;
    void this._hydrationCtx?.dispose().catch(() => {});
    this._hydrationCtx = undefined;
    this._closeStream();
  }

  getResults(): SourceEntry[] {
    return this._results ?? [];
  }

  /** Index results are produced asynchronously from the host query stream. */
  isSynchronous(): boolean {
    return false;
  }

  isPending(): boolean {
    // A query the index does not serve has nothing outstanding here.
    if (this._query === undefined || !queryTargetsSpacesOrFeeds(this._query)) {
      return false;
    }
    return !this._answered;
  }

  async run(_ctx: Context, query: QueryAST.Query): Promise<SourceEntry[]> {
    this._query = query;
    // The index serves spaces and feeds; a query whose explicit scopes target neither
    // (e.g. registry-only) is answered entirely by other sources. Forwarding it anyway
    // made the whole query fail on edge — the query host rejects space-less queries, and
    // the fail-fast merge in `GraphQueryContext.run` discarded the registry source's results.
    if (!queryTargetsSpacesOrFeeds(query)) {
      return [];
    }
    return new Promise((resolve, reject) => {
      this._runOneShot(query, resolve, reject);
    });
  }

  update(query: QueryAST.Query): void {
    this._query = query;

    this._closeStream();
    this._lastRemoteResults = undefined;
    this._releasedDocumentJsonIds.clear();
    this._reactiveQueryId = undefined;
    // Drop any in-flight hydration pass so it doesn't apply results for the previous query.
    void this._hydrationCtx?.dispose().catch(() => {});
    this._hydrationCtx = undefined;
    this._results = [];
    this._answered = false;
    this.changed.emit();

    // Don't start a reactive remote query until the query context is started (calls `open()`).
    // This prevents `.query(...).run()` from accidentally triggering a REACTIVE query in addition to the ONE_SHOT query.
    if (!this._open) {
      return;
    }

    // Same gate as `run`: no space/feed scope means nothing here to watch.
    if (!queryTargetsSpacesOrFeeds(query)) {
      return;
    }

    this._startReactive(query);
  }

  /** Single-use query: resolves with the first host response, then closes the stream. */
  private _runOneShot(
    query: QueryAST.Query,
    resolve: (results: SourceEntry[]) => void,
    reject: (error: Error) => void,
  ): void {
    const queryId = nextQueryId++;
    log('queryIndex', { queryId, query: Query.pretty(Query.fromAst(query)) });
    const start = Date.now();
    let settled = false;
    let cleanup: (() => void) | undefined;

    const settle = (run: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      cleanup?.();
      run();
    };

    // The one-shot query must resolve/reject within a bounded window; the effect stream is
    // otherwise lazy and would hang if the host never responds.
    const queryTimeout = this._params.queryTimeout ?? QUERY_SERVICE_TIMEOUT;
    const hydrationTimeout = this._params.hydrationTimeout ?? RECORD_HYDRATION_TIMEOUT;
    const timeout = setTimeout(() => {
      settle(() => reject(new TimeoutError(queryTimeout, 'index query')));
    }, queryTimeout);

    cleanup = subscribeStream(
      this._params.runtime,
      this._params.service['QueryService.execQuery']({
        query: JSON.stringify(query),
        queryId: String(queryId),
        reactivity: QueryReactivity.ONE_SHOT,
        documentCopies: this._params.documentCopies,
      }),
      {
        onData: (response) => {
          void (async () => {
            try {
              this._assertResultSpaces(query, response);
              if (settled) {
                return;
              }
              // The host has answered, so the index-query budget is spent; hydration below is
              // bounded per record and must not be charged to it — doing so reported a stalled
              // document as an "index query" timeout, naming the wrong subsystem.
              clearTimeout(timeout);
              this._primeDocumentCopies(response);
              const { results, stalled } = await this._mapRecords(
                new Context(),
                queryId,
                query,
                start,
                response.results ?? [],
              );
              if (stalled.length > 0) {
                // A one-shot caller gets no second pass, so a short result would read as the whole
                // set; fail instead, naming the objects that did not load.
                throw new TimeoutError(hydrationTimeout, _describeStall(stalled, response.results?.length ?? 0));
              }
              settle(() => resolve(results));
            } catch (err: any) {
              settle(() => reject(err));
            }
          })();
        },
        onError: (err) => {
          settle(() => reject(err));
        },
      },
    );
  }

  /**
   * Reports the current query as answered-with-nothing, so a subscriber waiting on this source stops
   * waiting. Ignored once the query has been replaced or closed.
   */
  private _fail(queryId: number | undefined): void {
    if (queryId === undefined || this._reactiveQueryId !== queryId) {
      return;
    }
    this._answered = true;
    this.changed.emit();
  }

  /** Reactive query: pushes results on every host response and remembers the raw records. */
  private _startReactive(query: QueryAST.Query): void {
    const queryId = nextQueryId++;
    this._reactiveQueryId = queryId;
    log('queryIndex', { queryId, query: Query.pretty(Query.fromAst(query)) });

    if (this._streamCleanup) {
      log.warn('Query stream already open');
    }

    this._streamCleanup = subscribeStream(
      this._params.runtime,
      this._params.service['QueryService.execQuery']({
        query: JSON.stringify(query),
        queryId: String(queryId),
        reactivity: QueryReactivity.REACTIVE,
        documentCopies: this._params.documentCopies,
      }),
      {
        onData: (response) => {
          try {
            this._assertResultSpaces(query, response);
            this._primeDocumentCopies(response);
            // Remember the raw host records so a later local object load can re-hydrate them.
            this._lastRemoteResults = response.results ?? [];
            this._releasedDocumentJsonIds.clear();
            this._scheduleHydrate();
          } catch (err: any) {
            log.catch(err);
            this._fail(queryId);
          }
        },
        onError: (err) => {
          if (err != null && !(err instanceof RpcClosedError)) {
            log.catch(err);
          }
          // Nothing more is coming on this stream; a subscriber waiting for the index must not wait
          // for it forever.
          this._fail(queryId);
        },
      },
    );
  }

  /**
   * Re-hydrate the remembered host records when a referenced object loads locally. This lets index
   * hits that previously failed to load (e.g. timed out before their document arrived) appear once
   * their documents become available, without waiting for a host-side index invalidation.
   */
  private _onObjectsUpdated(event: ObjectUpdate): void {
    // Only reactive queries retain remembered records; one-shot results are not refreshed.
    if (!this._open || this._query == null || this._reactiveQueryId == null) {
      return;
    }
    const records = this._lastRemoteResults;
    if (records == null || records.length === 0) {
      return;
    }

    // Re-hydrate only when an updated object is among the records the host returned.
    const updated = new Set(event.objectIds);
    const affectsResults = records.some((record) => record.spaceId === event.spaceId && updated.has(record.id));
    if (!affectsResults) {
      return;
    }

    log('re-hydrating index results after object update', { queryId: this._reactiveQueryId, spaceId: event.spaceId });
    this._scheduleHydrate();
  }

  /**
   * Coalesce hydration triggers (stream responses and object updates) into a single serialized loop.
   * Rapid bursts of update events would otherwise launch overlapping passes that supersede each other;
   * instead we run one pass at a time and re-run once more if new triggers arrived while it was in flight.
   */
  private _scheduleHydrate(): void {
    if (this._hydrating) {
      this._hydratePending = true;
      return;
    }
    void this._hydrateLoop();
  }

  /** Hydrate the latest remembered records, set `_results`, and emit — repeating while triggers arrive. */
  private async _hydrateLoop(): Promise<void> {
    this._hydrating = true;
    // The query the pass that throws was hydrating, which a replacement installed meanwhile is not.
    let passQueryId: number | undefined;
    try {
      do {
        this._hydratePending = false;

        const query = this._query;
        const queryId = this._reactiveQueryId;
        passQueryId = queryId;
        if (!this._open || query == null || queryId == null) {
          break;
        }
        const records = this._lastRemoteResults ?? [];

        const ctx = new Context();
        this._hydrationCtx = ctx;
        const { results, stalled } = await this._mapRecords(ctx, queryId, query, Date.now(), records);
        if (stalled.length > 0) {
          // Non-fatal here: a reactive query re-hydrates these once their documents arrive
          // (see `_onObjectsUpdated`), so the pass publishes what it has.
          log.warn('index hits did not hydrate within the budget', { queryId, stalled });
        }

        // Dropped if the source closed (or was re-opened with a new query) during hydration; a pass
        // queued for the new query still runs.
        if (this._hydrationCtx !== ctx) {
          continue;
        }

        this._results = results;
        this._answered = true;
        this.changed.emit();
      } while (this._hydratePending);
    } catch (err: any) {
      log.catch(err);
      this._fail(passQueryId);
    } finally {
      this._hydrating = false;
      // A trigger that arrived while the failed pass was running, which nothing else would serve.
      if (this._hydratePending && this._open) {
        this._scheduleHydrate();
      }
    }
  }

  /**
   * Hydrate raw host records into query entries, dropping objects that fail to load or validate, and
   * reporting separately the ids whose hydration outran {@link RECORD_HYDRATION_TIMEOUT} — a stall is
   * not a miss, and each caller answers it differently.
   */
  private async _mapRecords(
    ctx: Context,
    queryId: number,
    query: QueryAST.Query,
    start: number,
    records: readonly QueryService.QueryResult[],
  ): Promise<{ results: SourceEntry[]; stalled: string[] }> {
    log('queryIndex raw results', {
      queryId,
      query: Query.pretty(Query.fromAst(query)),
      length: records.length,
    });

    const hydratedIntoFeedHandle = new Set<string>();
    // Chunked so hydrating a large local result set is not one uninterrupted run of microtasks.
    const processedResults: (SourceEntry | null | typeof STALLED)[] = [];
    for (const chunk of chunkArray([...records], HYDRATE_RECORDS_PER_YIELD_CHECK)) {
      await yieldOrContinue('smooth');
      processedResults.push(
        ...(await Promise.all(chunk.map((result) => this._hydrateRecord(ctx, start, result, hydratedIntoFeedHandle)))),
      );
    }
    const stalled = records.filter((_, index) => processedResults[index] === STALLED).map((record) => record.id);
    const results = processedResults.filter((entry) => entry !== STALLED).filter(isNonNullable);

    // Only rewrite the set we just hydrated — a newer host response may have replaced it meanwhile.
    if (hydratedIntoFeedHandle.size > 0 && this._lastRemoteResults === records) {
      this._lastRemoteResults = records.map((record) => {
        if (record.documentJson === undefined || !hydratedIntoFeedHandle.has(record.id)) {
          return record;
        }
        this._releasedDocumentJsonIds.add(record.id);
        return { ...record, documentJson: undefined };
      });
    }

    const resultsWithNoSchema = results.filter((_) => _.result && !Entity.getType(_.result));
    if (resultsWithNoSchema.length > 0) {
      log('unable to resolve schema for queried objects', {
        count: resultsWithNoSchema.length,
        types: Array.dedupe(resultsWithNoSchema.map((_) => _.result && Entity.getTypeURI(_.result)?.toString())),
      });
    }

    log('queryIndex processed results', {
      queryId,
      query: Query.pretty(Query.fromAst(query)),
      fetchedFromIndex: records.length,
      loaded: results.length,
      stalled: stalled.length,
    });

    return { results, stalled };
  }

  /**
   * Hydrate one record under a bounded budget. Hydration reaches document loading, which waits on
   * replication and never settles while a document is unavailable; left unbounded it held the
   * caller's whole query open for as long as the index-query budget allowed.
   */
  private async _hydrateRecord(
    ctx: Context,
    start: number,
    result: QueryService.QueryResult,
    hydratedIntoFeedHandle: Set<string>,
  ): Promise<SourceEntry | null | typeof STALLED> {
    const timeout = this._params.hydrationTimeout ?? RECORD_HYDRATION_TIMEOUT;
    const hydration = this._filterMapResult(ctx, start, result, hydratedIntoFeedHandle);
    // The abandoned hydration may still reject after the race has settled, which would surface as an
    // unhandled rejection; the real outcome is already taken below.
    hydration.catch(() => {});
    // Compared by identity so a TimeoutError thrown from within hydration is not mistaken for ours.
    const expired = new TimeoutError(timeout, 'index hit hydration');
    try {
      return await asyncTimeout(hydration, timeout, expired);
    } catch (err) {
      if (err === expired) {
        return STALLED;
      }
      throw err;
    }
  }

  private _assertResultSpaces(query: QueryAST.Query, response: QueryService.QueryResponse): void {
    const targetSpaces = getTargetSpacesForQuery(query);
    if (targetSpaces.length > 0) {
      invariant(
        response.results?.every((r) => targetSpaces.includes(SpaceId.make(r.spaceId))),
        'Result spaceId mismatch',
      );
    }
  }

  /**
   * Hydrate one host record into a query entry, or null if it fails to load or validate. Ids
   * hydrated through a feed handle are added to `hydratedIntoFeedHandle` so the caller can release
   * their retained `documentJson`.
   */
  private async _filterMapResult(
    ctx: Context,
    queryStartTimestamp: number,
    result: QueryService.QueryResult,
    hydratedIntoFeedHandle?: Set<string>,
  ): Promise<SourceEntry | null> {
    // A collapsed group carries no object, so there is nothing to load: pass its values through.
    if (result.aggregates !== undefined) {
      return {
        id: result.id,
        match: { rank: result.rank },
        resolution: { source: 'index', time: Date.now() - queryStartTimestamp },
        group: _groupFromRemoteResult(result),
      };
    }

    if (result.recordJson !== undefined) {
      return {
        id: result.id,
        match: { rank: result.rank },
        resolution: { source: 'index', time: Date.now() - queryStartTimestamp },
        record: Object.freeze(JSON.parse(result.recordJson)),
      };
    }

    recordObjectDiagnostic(result.id, () => ({
      objectId: result.id,
      spaceId: result.spaceId,
      loadReason: 'query',
      query: JSON.stringify(this._query ?? null),
    }));

    invariant(SpaceId.isValid(result.spaceId), 'Invalid spaceId');
    invariant(EntityId.isValid(result.id), 'Invalid id');

    // For queue items, hydrate using Obj.fromJSON with ref resolver.
    const documentJsonReleased = result.documentJson === undefined && this._releasedDocumentJsonIds.has(result.id);
    if (result.queueId && (result.documentJson !== undefined || documentJsonReleased)) {
      invariant(EntityId.isValid(result.queueId), 'Invalid queueId');
      const queueEchoUri = EID.make({ spaceId: result.spaceId, entityId: result.queueId });
      const refResolver = this._params.graph.createRefResolver({
        context: { space: result.spaceId, feed: queueEchoUri },
      });
      const database = this._params.graph.getDatabase(result.spaceId);
      // A feed item's parent is the Feed object (whose id equals the queue id). Setting it here mirrors
      // the client feed-handle read path so `Obj.getParent` resolves for index-hydrated feed items.
      const parent = database?.getObjectById(result.queueId);
      // Route through the feed handle so index-hydrated results share identity (and live `Obj.update`
      // semantics) with the same object read via polling or `db.appendToFeed`. When no handle is
      // available (feed service not connected, or the Feed object isn't loaded) we still return a
      // *live* object — feed objects must uniformly follow the live type-spec/API; only core-tracked
      // identity and background persistence are unavailable in that degraded state.
      let feedHandle: FeedHandle | undefined;
      if (database instanceof DatabaseImpl) {
        if (Obj.instanceOf(Feed.Feed)(parent)) {
          feedHandle = database._getFeedHandleIfAvailable(queueEchoUri, parent.namespace);
          feedHandle?.setParentEntity(parent);
        } else {
          // Parent Feed not loaded — reuse an already-created handle (correct namespace) if present,
          // but don't mint one at a guessed namespace.
          feedHandle = database._tryGetFeedHandle(queueEchoUri);
        }
      }
      // A record whose JSON we already released on an earlier pass: the feed handle holds the live
      // object under the same id, so re-resolving from its identity map is the whole re-hydration.
      if (documentJsonReleased) {
        const cached = feedHandle?.getCachedObjectById(EntityId.make(result.id));
        if (!cached) {
          return null;
        }
        return {
          id: result.id,
          result: cached,
          match: { rank: result.rank },
          resolution: { source: 'index', time: Date.now() - queryStartTimestamp },
          group: _groupFromRemoteResult(result),
        };
      }

      invariant(result.documentJson !== undefined);
      const json = JSON.parse(result.documentJson);
      let object;
      try {
        object = feedHandle
          ? await feedHandle.upsertFromJSON(json)
          : makeDecodedEntityLive(
              await Obj.fromJSON(json, {
                refResolver,
                uri: EID.make({ spaceId: result.spaceId, entityId: result.id }),
                database,
                parent,
              }),
            );
      } catch (err) {
        const typeDxn = typeof json[ATTR_TYPE] === 'string' ? json[ATTR_TYPE] : '<unknown>';
        if (!emittedSchemaValidationWarnings.has(typeDxn)) {
          emittedSchemaValidationWarnings.add(typeDxn);
          log.warn('object failed schema validation', { type: typeDxn, error: err });
        }
        return null;
      }
      if (!object) {
        return null;
      }
      if (feedHandle) {
        hydratedIntoFeedHandle?.add(result.id);
      }
      const queryResult: SourceEntry = {
        id: result.id,
        result: object,
        match: { rank: result.rank },
        resolution: { source: 'index', time: Date.now() - queryStartTimestamp },
        group: _groupFromRemoteResult(result),
      };
      return queryResult;
    }

    const object = await this._resolveIndexedObject(result);
    if (!object) {
      return null;
    }

    if (ctx.disposed) {
      return null;
    }

    // The host's index lags a local delete: its in-flight response still lists the object, and
    // because results are a union across sources any stale entry resurfaces it after the working
    // set has already dropped it. The local flag is authoritative here.
    if (!this._matchesDeletedOption(object)) {
      return null;
    }

    const queryResult: SourceEntry = {
      id: object.id,
      result: object,
      match: { rank: result.rank },
      resolution: { source: 'index', time: Date.now() - queryStartTimestamp },
      group: _groupFromRemoteResult(result),
    };
    return queryResult;
  }

  private _primeDocumentCopies(response: QueryService.QueryResponse): void {
    if (response.documentCopies?.length) {
      this._params.objectLoader.primeDocumentCopies?.(response.documentCopies);
    }
  }

  /** Whether a hydrated object's local deleted flag satisfies the query's `deleted` option. */
  private _matchesDeletedOption(object: Entity.Unknown): boolean {
    const deleted = Entity.isDeleted(object);
    switch (this._query === undefined ? 'exclude' : getQueryDeletedOption(this._query)) {
      case 'exclude':
        return !deleted;
      case 'only':
        return deleted;
      case 'include':
        return true;
    }
  }

  /**
   * Hydrate an index hit via disk-only load; skip objects whose strong deps
   * are permanently unavailable.
   *
   * The load does not settle while the object's document is unavailable (see
   * `query-api-stall.test.ts`), so the caller time-boxes it in {@link _hydrateRecord} rather than
   * here — a budget on this one step could only drop the object silently.
   */
  private async _resolveIndexedObject(result: QueryService.QueryResult): Promise<Entity.Unknown | undefined> {
    const spaceId = SpaceId.make(result.spaceId);

    return this._params.objectLoader.loadObject({
      spaceId,
      objectId: result.id,
      documentId: result.documentId,
    });
  }

  private _closeStream(): void {
    this._streamCleanup?.();
    this._streamCleanup = undefined;
  }
}

/** Marks a record whose hydration outran its budget, as distinct from one that hydrated to nothing. */
const STALLED = Symbol('stalled');

/** Names the stalled objects in the error a one-shot caller sees, rather than just the elapsed time. */
const _describeStall = (stalled: readonly string[], total: number): string =>
  `index query result hydration (${stalled.length} of ${total} objects did not load: ${stalled.slice(0, 5).join(', ')}${stalled.length > 5 ? ', …' : ''})`;

/**
 * Used for logging.
 */
let nextQueryId = 1;

/**
 * Keyed by the type DXN.
 */
const emittedSchemaValidationWarnings = new Set<string>();

/**
 * Builds the group membership from a wire record; present iff the query has a `groupBy` clause.
 * The host always sends `groupCount` alongside `groupKey`; the `?? 1` floor (a present record
 * implies at least one member) is defensive and matches the working-set source's fallback.
 */
const _groupFromRemoteResult = (result: QueryService.QueryResult): SourceEntry['group'] =>
  result.groupKey !== undefined
    ? {
        key: JSON.parse(result.groupKey),
        count: result.groupCount ?? 1,
        ...(result.aggregates !== undefined ? { aggregates: JSON.parse(result.aggregates) } : {}),
      }
    : undefined;
