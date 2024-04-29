//
// Copyright 2024 DXOS.org
//

import { type Context, LifecycleState, Resource, ContextDisposedError } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import { type DataService } from '@dxos/protocols/proto/dxos/echo/service';
import { ComplexMap } from '@dxos/util';

import { IndexQuerySourceProvider } from './index-query-source-provider';
import { AutomergeContext } from '../automerge';
import { EchoDatabaseImpl } from '../database';
import { Hypergraph } from '../hypergraph';

export type EchoClientParams = {};

export type ConnectToServiceParams = {
  dataService: DataService;
  queryService: QueryService;
};

export type CreateDatabaseParams = {
  // TODO(dmaretskyi): Consider changing to string id.
  spaceKey: PublicKey;

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
  private readonly _graph: Hypergraph;
  private readonly _databases = new ComplexMap<PublicKey, EchoDatabaseImpl>(PublicKey.hash);

  private _dataService: DataService | undefined = undefined;
  private _queryService: QueryService | undefined = undefined;
  private _automergeContext: AutomergeContext | undefined = undefined;
  private _indexQuerySourceProvider: IndexQuerySourceProvider | undefined = undefined;

  constructor(params: EchoClientParams) {
    super();
    this._graph = new Hypergraph();
  }

  get graph(): Hypergraph {
    return this._graph;
  }

  /**
   * Connects to the ECHO service.
   * Must be called before open.
   */
  connectToService({ dataService, queryService }: ConnectToServiceParams) {
    invariant(this._lifecycleState === LifecycleState.CLOSED);
    this._dataService = dataService;
    this._queryService = queryService;
  }

  disconnectFromService() {
    invariant(this._lifecycleState === LifecycleState.CLOSED);
    this._dataService = undefined;
    this._queryService = undefined;
  }

  protected override async _open(ctx: Context): Promise<void> {
    invariant(this._dataService && this._queryService, 'Invalid state: not connected');
    this._automergeContext = new AutomergeContext(this._dataService, {
      spaceFragmentationEnabled: true,
    });

    this._indexQuerySourceProvider = new IndexQuerySourceProvider({
      service: this._queryService,
      objectLoader: {
        loadObject: async (spaceKey, objectId) => {
          const db = this._databases.get(spaceKey);
          if (!db) {
            return undefined;
          }

          // Waiting for the database to open since the query can run before the database is ready.
          // TODO(dmaretskyi): Refactor this.
          try {
            await db.automerge.openTrigger.wait();
          } catch (err) {
            if (err instanceof ContextDisposedError) {
              return undefined;
            }
            throw err;
          }

          const object = await db.automerge.loadObjectById(objectId);
          return object;
        },
      },
    });
    this._graph.registerQuerySourceProvider(this._indexQuerySourceProvider);
  }

  protected override async _close(ctx: Context): Promise<void> {
    if (this._indexQuerySourceProvider) {
      this._graph.unregisterQuerySourceProvider(this._indexQuerySourceProvider);
    }
    for (const db of this._databases.values()) {
      this._graph._unregister(db.spaceKey);
      await db.close();
    }
    this._databases.clear();
    await this._automergeContext?.close();
    this._automergeContext = undefined;
  }

  // TODO(dmaretskyi): Make async?
  constructDatabase({ spaceKey, owningObject }: CreateDatabaseParams) {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    invariant(!this._databases.has(spaceKey), 'Database already exists.');
    const db = new EchoDatabaseImpl({
      automergeContext: this._automergeContext!,
      graph: this._graph,
      spaceKey,
    });
    this._graph._register(spaceKey, db, owningObject);
    this._databases.set(spaceKey, db);
    return db;
  }
}
