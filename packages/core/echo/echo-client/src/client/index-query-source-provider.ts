//
// Copyright 2024 DXOS.org
//

import * as Array from 'effect/Array';

import { type CleanupFn, type ReadOnlyEvent, Event, TimeoutError, asyncTimeout } from '@dxos/async';
import { type Stream } from '@dxos/codec-protobuf/stream';
import { Context } from '@dxos/context';
import { type Hypergraph, type QueryResult, Entity, Obj, Query } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { ATTR_TYPE } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { EID, EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError } from '@dxos/protocols';
import {
  type QueryResponse,
  type QueryService,
  type QueryResult as RemoteQueryResult,
  QueryReactivity,
} from '@dxos/protocols/proto/dxos/echo/query';
import { isNonNullable } from '@dxos/util';

import { type QuerySourceProvider, OBJECT_DIAGNOSTICS } from '../hypergraph';
import { type QuerySource, getTargetSpacesForQuery } from '../query';

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
  service: QueryService;
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
      objectLoader: this._params.objectLoader,
      graph: this._params.graph,
    });
  }
}

export type IndexQuerySourceProps = {
  service: QueryService;
  objectLoader: ObjectLoader;
  graph: Hypergraph.Hypergraph;
};

/**
 * Runs queries against an index.
 */
export class IndexQuerySource implements QuerySource {
  changed = new Event<void>();

  private _query?: QueryAST.Query = undefined;
  private _results?: QueryResult.EntityEntry[] = [];
  private _stream?: Stream<QueryResponse>;
  private _open = false;

  /**
   * Raw records from the host's last reactive response. Retained so we can re-hydrate when the
   * objects they reference finish loading locally (see {@link _onObjectsUpdated}).
   */
  private _lastRemoteResults?: readonly RemoteQueryResult[] = undefined;

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
    this._reactiveQueryId = undefined;
    this._updateSubscription?.();
    this._updateSubscription = undefined;
    void this._hydrationCtx?.dispose().catch(() => {});
    this._hydrationCtx = undefined;
    this._closeStream();
  }

  getResults(): QueryResult.EntityEntry[] {
    return this._results ?? [];
  }

  async run(_ctx: Context, query: QueryAST.Query): Promise<QueryResult.EntityEntry[]> {
    this._query = query;
    return new Promise((resolve, reject) => {
      this._runOneShot(query, resolve, reject);
    });
  }

  update(query: QueryAST.Query): void {
    this._query = query;

    this._closeStream();
    this._lastRemoteResults = undefined;
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

    this._startReactive(query);
  }

  /** Single-use query: resolves with the first host response, then closes the stream. */
  private _runOneShot(
    query: QueryAST.Query,
    resolve: (results: QueryResult.EntityEntry[]) => void,
    reject: (error: Error) => void,
  ): void {
    const queryId = nextQueryId++;
    log('queryIndex', { queryId, query: Query.pretty(Query.fromAst(query)) });
    const start = Date.now();
    let settled = false;

    const stream = this._params.service.execQuery(
      { query: JSON.stringify(query), queryId: String(queryId), reactivity: QueryReactivity.ONE_SHOT },
      { timeout: QUERY_SERVICE_TIMEOUT },
    );

    stream.subscribe(
      async (response) => {
        try {
          this._assertResultSpaces(query, response);
          if (settled) {
            return;
          }
          settled = true;
          void stream.close().catch(() => {});
          const results = await this._mapRecords(new Context(), queryId, query, start, response.results ?? []);
          resolve(results);
        } catch (err: any) {
          reject(err);
        }
      },
      (err) => {
        if (err != null) {
          reject(err);
        }
      },
    );
  }

  /** Reactive query: pushes results on every host response and remembers the raw records. */
  private _startReactive(query: QueryAST.Query): void {
    const queryId = nextQueryId++;
    this._reactiveQueryId = queryId;
    log('queryIndex', { queryId, query: Query.pretty(Query.fromAst(query)) });

    const stream = this._params.service.execQuery(
      { query: JSON.stringify(query), queryId: String(queryId), reactivity: QueryReactivity.REACTIVE },
      { timeout: QUERY_SERVICE_TIMEOUT },
    );

    if (this._stream) {
      log.warn('Query stream already open');
    }
    this._stream = stream;

    stream.subscribe(
      async (response) => {
        try {
          this._assertResultSpaces(query, response);
          // Remember the raw host records so a later local object load can re-hydrate them.
          this._lastRemoteResults = response.results ?? [];
          this._scheduleHydrate();
        } catch (err: any) {
          log.catch(err);
        }
      },
      (err) => {
        if (err != null && !(err instanceof RpcClosedError)) {
          log.catch(err);
        }
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
  ): Promise<QueryResult.EntityEntry[]> {
    log('queryIndex raw results', {
      queryId,
      query: Query.pretty(Query.fromAst(query)),
      length: records.length,
    });

    const processedResults = await Promise.all(records.map((result) => this._filterMapResult(ctx, start, result)));
    const results = processedResults.filter(isNonNullable);

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

  private async _filterMapResult(
    ctx: Context,
    queryStartTimestamp: number,
    result: RemoteQueryResult,
  ): Promise<QueryResult.EntityEntry | null> {
    if (!OBJECT_DIAGNOSTICS.has(result.id)) {
      OBJECT_DIAGNOSTICS.set(result.id, {
        objectId: result.id,
        spaceId: result.spaceId,
        loadReason: 'query',
        query: JSON.stringify(this._query ?? null),
      });
    }

    invariant(SpaceId.isValid(result.spaceId), 'Invalid spaceId');
    invariant(EntityId.isValid(result.id), 'Invalid id');

    // For queue items, hydrate using Obj.fromJSON with ref resolver.
    if (result.queueId && result.documentJson) {
      invariant(EntityId.isValid(result.queueId), 'Invalid queueId');
      const json = JSON.parse(result.documentJson);
      const queueEchoUri = EID.make({ spaceId: result.spaceId, entityId: result.queueId });
      const refResolver = this._params.graph.createRefResolver({
        context: { space: result.spaceId, feed: queueEchoUri },
      });
      const database = this._params.graph.getDatabase(result.spaceId);
      let object;
      try {
        object = await Obj.fromJSON(json, {
          refResolver,
          uri: EID.make({ spaceId: result.spaceId, entityId: result.id }),
          database,
        });
      } catch (err) {
        const typeDxn = typeof json[ATTR_TYPE] === 'string' ? json[ATTR_TYPE] : '<unknown>';
        if (!emittedSchemaValidationWarnings.has(typeDxn)) {
          emittedSchemaValidationWarnings.add(typeDxn);
          log.warn('object failed schema validation', { type: typeDxn, error: err });
        }
        return null;
      }
      const queryResult: QueryResult.EntityEntry = {
        id: result.id,
        result: object,
        match: { rank: result.rank },
        resolution: { source: 'index', time: Date.now() - queryStartTimestamp },
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

    const queryResult: QueryResult.EntityEntry = {
      id: object.id,
      result: object,
      match: { rank: result.rank },
      resolution: { source: 'index', time: Date.now() - queryStartTimestamp },
    };
    return queryResult;
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
    void this._stream?.close().catch(() => {});
    this._stream = undefined;
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
