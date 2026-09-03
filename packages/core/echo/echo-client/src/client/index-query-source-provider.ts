//
// Copyright 2024 DXOS.org
//

import * as Array from 'effect/Array';
import * as EffectContext from 'effect/Context';

import { type CleanupFn, Event, type ReadOnlyEvent, TimeoutError, asyncTimeout } from '@dxos/async';
import { Context } from '@dxos/context';
import { Entity, Feed, type Hypergraph, Obj, Query } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { ATTR_TYPE, makeDecodedEntityLive } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { EID, EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError, subscribeStream } from '@dxos/protocols';
import {
  QueryReactivity,
  type QueryResponse,
  type QueryResult as RemoteQueryResult,
} from '@dxos/protocols/proto/dxos/echo/query';
import { type QueryService } from '@dxos/protocols/rpc';
import { isNonNullable } from '@dxos/util';

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
};

const QUERY_SERVICE_TIMEOUT = 20_000;

/** Per-index-hit object hydration budget (parallel across hits). */
const INDEX_OBJECT_LOAD_TIMEOUT = 2_000;

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
    });
  }
}

export type IndexQuerySourceProps = {
  service: QueryService.Client;
  runtime: EffectContext.Context<never>;
  objectLoader: ObjectLoader;
  graph: Hypergraph.Hypergraph;
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
  private _lastRemoteResults?: readonly RemoteQueryResult[] = undefined;

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
    const timeout = setTimeout(() => {
      settle(() => reject(new TimeoutError(QUERY_SERVICE_TIMEOUT, 'index query')));
    }, QUERY_SERVICE_TIMEOUT);

    cleanup = subscribeStream(
      this._params.runtime,
      this._params.service['QueryService.execQuery']({
        query: JSON.stringify(query),
        queryId: String(queryId),
        reactivity: QueryReactivity.ONE_SHOT,
      }),
      {
        onData: (response) => {
          void (async () => {
            try {
              this._assertResultSpaces(query, response);
              if (settled) {
                return;
              }
              const results = await this._mapRecords(new Context(), queryId, query, start, response.results ?? []);
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
      }),
      {
        onData: (response) => {
          try {
            this._assertResultSpaces(query, response);
            // Remember the raw host records so a later local object load can re-hydrate them.
            this._lastRemoteResults = response.results ?? [];
            this._releasedDocumentJsonIds.clear();
            this._scheduleHydrate();
          } catch (err: any) {
            log.catch(err);
          }
        },
        onError: (err) => {
          if (err != null && !(err instanceof RpcClosedError)) {
            log.catch(err);
          }
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
    try {
      do {
        this._hydratePending = false;

        const query = this._query;
        const queryId = this._reactiveQueryId;
        if (!this._open || query == null || queryId == null) {
          break;
        }
        const records = this._lastRemoteResults ?? [];

        const ctx = new Context();
        this._hydrationCtx = ctx;
        const results = await this._mapRecords(ctx, queryId, query, Date.now(), records);

        // Dropped if the source closed (or was re-opened with a new query) during hydration.
        if (this._hydrationCtx !== ctx) {
          return;
        }

        this._results = results;
        this.changed.emit();
      } while (this._hydratePending);
    } catch (err: any) {
      log.catch(err);
    } finally {
      this._hydrating = false;
    }
  }

  /** Hydrate raw host records into query entries, dropping objects that fail to load or validate. */
  private async _mapRecords(
    ctx: Context,
    queryId: number,
    query: QueryAST.Query,
    start: number,
    records: readonly RemoteQueryResult[],
  ): Promise<SourceEntry[]> {
    log('queryIndex raw results', {
      queryId,
      query: Query.pretty(Query.fromAst(query)),
      length: records.length,
    });

    const hydratedIntoFeedHandle = new Set<string>();
    const processedResults = await Promise.all(
      records.map((result) => this._filterMapResult(ctx, start, result, hydratedIntoFeedHandle)),
    );
    const results = processedResults.filter(isNonNullable);

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
      log.warn('unable to resolve schema for queried objects', {
        count: resultsWithNoSchema.length,
        types: Array.dedupe(results.map((_) => _.result && Entity.getTypeURI(_.result)?.toString())),
      });
    }

    log('queryIndex processed results', {
      queryId,
      query: Query.pretty(Query.fromAst(query)),
      fetchedFromIndex: records.length,
      loaded: results.length,
    });

    return results;
  }

  private _assertResultSpaces(query: QueryAST.Query, response: QueryResponse): void {
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
    result: RemoteQueryResult,
    hydratedIntoFeedHandle?: Set<string>,
  ): Promise<SourceEntry | null> {
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
   */
  private async _resolveIndexedObject(result: RemoteQueryResult): Promise<Entity.Unknown | undefined> {
    const spaceId = SpaceId.make(result.spaceId);

    try {
      return await asyncTimeout(
        this._params.objectLoader.loadObject({
          spaceId,
          objectId: result.id,
          documentId: result.documentId,
        }),
        INDEX_OBJECT_LOAD_TIMEOUT,
      );
    } catch (err) {
      if (err instanceof TimeoutError) {
        log.warn('index object load timed out', { objectId: result.id, spaceId });
        return undefined;
      }
      throw err;
    }
  }

  private _closeStream(): void {
    this._streamCleanup?.();
    this._streamCleanup = undefined;
  }
}

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
const _groupFromRemoteResult = (result: RemoteQueryResult): SourceEntry['group'] =>
  result.groupKey !== undefined ? { key: JSON.parse(result.groupKey), count: result.groupCount ?? 1 } : undefined;
