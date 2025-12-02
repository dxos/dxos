//
// Copyright 2024 DXOS.org
//

import { type Context, ContextDisposedError, LifecycleState, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type QueueService } from '@dxos/protocols';
import { type QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import { type DataService } from '@dxos/protocols/proto/dxos/echo/service';

import { HypergraphImpl } from '../hypergraph';
import { EchoDatabaseImpl } from '../proxy-db';
import { QueueFactory } from '../queue';

import { IndexQuerySourceProvider, type LoadObjectParams } from './index-query-source-provider';

export type EchoClientParams = {};

export type ConnectToServiceParams = {
  dataService: DataService;
  queryService: QueryService;
  queueService?: QueueService;
};

export type ConstructDatabaseParams = {
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
  private readonly _databases = new Map<SpaceId, EchoDatabaseImpl>();

  private _dataService: DataService | undefined = undefined;
  private _queryService: QueryService | undefined = undefined;
  private _queuesService: QueueService | undefined = undefined;

  private _indexQuerySourceProvider: IndexQuerySourceProvider | undefined = undefined;

  constructor(_: EchoClientParams = {}) {
    super();
  }

  get graph(): HypergraphImpl {
    return this._graph;
  }

  get openDatabases(): Iterable<EchoDatabaseImpl> {
    return this._databases.values();
  }

  /**
   * Connects to the ECHO service.
   * Must be called before open.
   */
  connectToService({ dataService, queryService, queueService }: ConnectToServiceParams): this {
    invariant(this._lifecycleState === LifecycleState.CLOSED);
    this._dataService = dataService;
    this._queryService = queryService;
    this._queuesService = queueService;
    return this;
  }

  disconnectFromService(): void {
    invariant(this._lifecycleState === LifecycleState.CLOSED);
    this._dataService = undefined;
    this._queryService = undefined;
  }

  protected override async _open(ctx: Context): Promise<void> {
    invariant(this._dataService && this._queryService, 'Invalid state: not connected');

    this._indexQuerySourceProvider = new IndexQuerySourceProvider({
      service: this._queryService,
      objectLoader: {
        loadObject: this._loadObjectFromDocument.bind(this),
      },
    });
    this._graph.registerQuerySourceProvider(this._indexQuerySourceProvider);
  }

  protected override async _close(ctx: Context): Promise<void> {
    if (this._indexQuerySourceProvider) {
      this._graph.unregisterQuerySourceProvider(this._indexQuerySourceProvider);
    }
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
  }: ConstructDatabaseParams): EchoDatabaseImpl {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    invariant(!this._databases.has(spaceId), 'Database already exists.');
    const db = new EchoDatabaseImpl({
      dataService: this._dataService!,
      queryService: this._queryService!,
      graph: this._graph,
      spaceId,
      reactiveSchemaQuery,
      preloadSchemaOnOpen,
      spaceKey,
    });
    this._graph._registerDatabase(spaceId, db, owningObject);
    this._databases.set(spaceId, db);
    return db;
  }

  constructQueueFactory(spaceId: SpaceId): QueueFactory {
    const queueFactory = new QueueFactory(spaceId, this._graph);
    this._graph._registerQueueFactory(spaceId, queueFactory);
    if (this._queuesService) {
      queueFactory.setService(this._queuesService);
    }
    return queueFactory;
  }

  private async _loadObjectFromDocument({ spaceId, objectId, documentId }: LoadObjectParams) {
    const db = this._databases.get(spaceId);
    if (!db) {
      return undefined;
    }

    // Waiting for the database to open since the query can run before the database is ready.
    // TODO(dmaretskyi): Refactor this.
    try {
      await db.coreDatabase.opened.wait();
    } catch (err) {
      if (err instanceof ContextDisposedError) {
        return undefined;
      }
      throw err;
    }

    const objectDocId = db._coreDatabase._automergeDocLoader.getObjectDocumentId(objectId);
    if (objectDocId !== documentId) {
      log("documentIds don't match", { objectId, expected: documentId, actual: objectDocId ?? null });
      return undefined;
    }

    return db._loadObjectById(objectId);
  }
}
