//
// Copyright 2024 DXOS.org
//

import * as Runtime from 'effect/Runtime';

import { type CleanupFn, Event } from '@dxos/async';
import { type Context, ContextDisposedError, LifecycleState, Resource } from '@dxos/context';
import type { Entity } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type DataService, type FeedService, type QueryService } from '@dxos/protocols/rpc';

import { HypergraphImpl } from '../hypergraph';
import { DatabaseImpl } from '../proxy-db';
import { IndexQuerySourceProvider, type LoadObjectProps, type ObjectUpdate } from './index-query-source-provider';

export type EchoClientProps = {};

export type ConnectToServiceProps = {
  dataService: DataService.Client;
  queryService: QueryService.Client;
  feedService?: FeedService.Client;

  /** Runtime used to run effect-rpc service calls at Promise/callback boundaries. */
  runtime?: Runtime.Runtime<never>;
};

export type ConstructDatabaseProps = {
  spaceId: SpaceId;

  /** @deprecated Use spaceId */
  spaceKey: PublicKey;

  /**
   * Run a reactive query for a set of dynamic schema.
   * @default true
   */
  reactiveSchemaQuery?: boolean;

  /**
   * Preload all schema during open.
   * @default true
   */
  preloadSchemaOnOpen?: boolean;

  /**
   * Space proxy reference for SDK compatibility.
   */
  // TODO(dmaretskyi): Remove.
  owningObject?: unknown;
};

/**
 * ECHO client.
 * Manages a set of databases and builds a unified hypergraph.
 * Connects to the ECHO host via an ECHO service.
 */
export class EchoClient extends Resource {
  private readonly _graph = new HypergraphImpl();

  // TODO(burdon): This already exists in Hypergraph.
  private readonly _databases = new Map<SpaceId, DatabaseImpl>();

  private _dataService: DataService.Client | undefined = undefined;
  private _queryService: QueryService.Client | undefined = undefined;
  private _feedService: FeedService.Client | undefined = undefined;
  private _runtime: Runtime.Runtime<never> = Runtime.defaultRuntime;

  private _indexQuerySourceProvider: IndexQuerySourceProvider | undefined = undefined;

  /** Aggregated local object-update signal across all databases, consumed by index query sources. */
  private readonly _objectsUpdated = new Event<ObjectUpdate>();
  private readonly _dbUpdateSubscriptions = new Map<SpaceId, CleanupFn>();

  constructor(_: EchoClientProps = {}) {
    super();
  }

  get graph(): HypergraphImpl {
    return this._graph;
  }

  get openDatabases(): Iterable<DatabaseImpl> {
    return this._databases.values();
  }

  /**
   * Connects to the ECHO service.
   * Must be called before open.
   */
  connectToService({ dataService, queryService, feedService, runtime }: ConnectToServiceProps): this {
    invariant(this._lifecycleState === LifecycleState.CLOSED);
    this._dataService = dataService;
    this._queryService = queryService;
    this._feedService = feedService;
    this._runtime = runtime ?? Runtime.defaultRuntime;
    return this;
  }

  disconnectFromService(): void {
    invariant(this._lifecycleState === LifecycleState.CLOSED);
    this._dataService = undefined;
    this._queryService = undefined;
    this._feedService = undefined;
  }

  protected override async _open(ctx: Context): Promise<void> {
    invariant(this._dataService && this._queryService, 'Invalid state: not connected');

    this._indexQuerySourceProvider = new IndexQuerySourceProvider({
      service: this._queryService,
      runtime: this._runtime,
      objectLoader: {
        loadObject: this._loadObjectFromDocument.bind(this),
        updateEvent: this._objectsUpdated,
      },
      graph: this._graph,
    });
    this._graph.registerQuerySourceProvider(this._indexQuerySourceProvider);
  }

  protected override async _close(ctx: Context): Promise<void> {
    if (this._indexQuerySourceProvider) {
      this._graph.unregisterQuerySourceProvider(this._indexQuerySourceProvider);
    }
    for (const unsubscribe of this._dbUpdateSubscriptions.values()) {
      unsubscribe();
    }
    this._dbUpdateSubscriptions.clear();
    for (const db of this._databases.values()) {
      this._graph._unregisterDatabase(db.spaceId);
      await db.close();
    }
    this._databases.clear();
  }

  // TODO(dmaretskyi): Make async?
  constructDatabase({
    spaceId,
    owningObject,
    reactiveSchemaQuery,
    preloadSchemaOnOpen,
    spaceKey,
  }: ConstructDatabaseProps): DatabaseImpl {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    invariant(!this._databases.has(spaceId), 'Database already exists.');
    const db = new DatabaseImpl({
      dataService: this._dataService!,
      queryService: this._queryService!,
      feedService: this._feedService,
      runtime: this._runtime,
      graph: this._graph,
      spaceId,
      reactiveSchemaQuery,
      preloadSchemaOnOpen,
      spaceKey,
    });
    this._graph._registerDatabase(spaceId, db, owningObject);
    this._databases.set(spaceId, db);

    // Forward this database's local object updates to the aggregated signal so reactive index
    // sources can re-hydrate index hits once their documents become available locally.
    this._dbUpdateSubscriptions.set(
      spaceId,
      db._entityManager._updateEvent.on((event) => {
        this._objectsUpdated.emit({ spaceId, objectIds: event.itemsUpdated.map((item) => item.id) });
      }),
    );

    return db;
  }

  /**
   * Update service references after reconnection.
   * Must be called before _notifyReconnect.
   */
  _updateServices({
    dataService,
    queryService,
    feedService,
  }: {
    dataService: DataService.Client;
    queryService: QueryService.Client;
    feedService?: FeedService.Client;
  }): void {
    log('updating service references');
    this._dataService = dataService;
    this._queryService = queryService;
    this._feedService = feedService;

    // Update IndexQuerySourceProvider with new service.
    if (this._indexQuerySourceProvider) {
      this._graph.unregisterQuerySourceProvider(this._indexQuerySourceProvider);
      this._indexQuerySourceProvider = new IndexQuerySourceProvider({
        service: this._queryService,
        runtime: this._runtime,
        objectLoader: {
          loadObject: this._loadObjectFromDocument.bind(this),
          updateEvent: this._objectsUpdated,
        },
        graph: this._graph,
      });
      this._graph.registerQuerySourceProvider(this._indexQuerySourceProvider);
    }

    // Update all databases with new services.
    for (const db of this._databases.values()) {
      db._updateServices({ dataService, queryService, feedService });
    }
  }

  /**
   * Notify all databases that the service connection has been re-established.
   * Called after a dedicated worker leader change.
   */
  async _notifyReconnect(): Promise<void> {
    log('notifying databases of reconnection');
    for (const db of this._databases.values()) {
      await db._onReconnect();
    }
  }

  private async _loadObjectFromDocument({
    spaceId,
    objectId,
    documentId,
  }: LoadObjectProps): Promise<Entity.Unknown | undefined> {
    const db = this._databases.get(spaceId);
    if (!db) {
      return undefined;
    }

    // Waiting for the database to open since the query can run before the database is ready.
    // TODO(dmaretskyi): Refactor this.
    try {
      await db.opened.wait();
    } catch (err) {
      if (err instanceof ContextDisposedError) {
        return undefined;
      }
      throw err;
    }

    const objectDocId = db.getObjectDocumentId(objectId);
    if (objectDocId !== documentId) {
      log("documentIds don't match", { objectId, expected: documentId, actual: objectDocId ?? null });
      return undefined;
    }

    // Disk-only load: wait for dep states to settle, then return the core
    // only when strong deps are satisfied (unavailable deps → `undefined`).
    return db._loadObjectById(objectId, {
      allowDeleted: true,
      diskOnly: true,
    });
  }
}
