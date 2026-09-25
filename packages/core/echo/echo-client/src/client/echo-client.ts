//
// Copyright 2024 DXOS.org
//

import * as EffectContext from 'effect/Context';

import { type CleanupFn, Event } from '@dxos/async';
import { type Context, ContextDisposedError, LifecycleState, Resource } from '@dxos/context';
import type { Entity } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type DataService, type FeedService, type MirrorService, type QueryService } from '@dxos/protocols/rpc';

import { type DocumentMode, parseDocumentMode } from '../automerge/index.ts';
import { type BranchStore } from '../core-db/index.ts';
import { HypergraphImpl } from '../hypergraph.ts';
import { DatabaseImpl } from '../proxy-db/index.ts';
import { IndexQuerySourceProvider, type LoadObjectProps, type ObjectUpdate } from './index-query-source-provider.ts';

/** A root that has not linked an index hit by then may never; `linksAdded` re-hydrates it if it does. */
const ROOT_LINK_WAIT_TIMEOUT = 2_000;

export type EchoClientProps = {};

export type ConnectToServiceProps = {
  dataService: DataService.Client;
  queryService: QueryService.Client;
  feedService?: FeedService.Client;
  /** Serves proxies of documents; the `proxy` document mode needs it. */
  mirrorService?: MirrorService.Client;

  /** Defaults to `DX_ECHO_DOCUMENT_MODE` in the process environment, else `replica`. */
  documentMode?: DocumentMode;

  /**
   * With `proxy` documents, show objects from the services' index until this client writes to them.
   * Defaults to `DX_ECHO_PROXY_INDEX_READS` in the process environment, else off.
   */
  proxyIndexReads?: boolean;

  /** Runtime used to run effect-rpc service calls at Promise/callback boundaries. */
  runtime?: EffectContext.Context<never>;
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

  /** Device-local persistence for the current-branch selection (non-synced). In-memory if omitted. */
  branchStore?: BranchStore;
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
  private _mirrorService: MirrorService.Client | undefined = undefined;
  private _queryService: QueryService.Client | undefined = undefined;
  private _feedService: FeedService.Client | undefined = undefined;
  private _runtime: EffectContext.Context<never> = EffectContext.empty();
  private _documentMode: DocumentMode = 'replica';
  private _proxyIndexReads = false;

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

  /** How this client holds documents, settled by {@link connectToService}. */
  get documentMode(): DocumentMode {
    return this._documentMode;
  }

  /**
   * Connects to the ECHO service.
   * Must be called before open.
   */
  connectToService({
    dataService,
    queryService,
    feedService,
    mirrorService,
    documentMode,
    proxyIndexReads,
    runtime,
  }: ConnectToServiceProps): this {
    invariant(this._lifecycleState === LifecycleState.CLOSED);
    // Resolved here, where the setting enters, so nothing below reads the environment.
    this._documentMode = documentMode ?? parseDocumentMode(processEnv('DX_ECHO_DOCUMENT_MODE')) ?? 'replica';
    this._proxyIndexReads =
      this._documentMode === 'proxy' && (proxyIndexReads ?? processEnv('DX_ECHO_PROXY_INDEX_READS') === 'true');
    invariant(this._documentMode === 'replica' || mirrorService, 'The proxy document mode needs a mirror service.');
    this._mirrorService = mirrorService;
    this._dataService = dataService;
    this._queryService = queryService;
    this._feedService = feedService;
    this._runtime = runtime ?? EffectContext.empty();
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
    branchStore,
  }: ConstructDatabaseProps): DatabaseImpl {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    invariant(!this._databases.has(spaceId), 'Database already exists.');
    const db = new DatabaseImpl({
      dataService: this._dataService!,
      mirrorService: this._mirrorService,
      documentMode: this._documentMode,
      proxyIndexReads: this._proxyIndexReads,
      queryService: this._queryService!,
      feedService: this._feedService,
      runtime: this._runtime,
      graph: this._graph,
      spaceId,
      reactiveSchemaQuery,
      preloadSchemaOnOpen,
      spaceKey,
      branchStore,
    });
    this._graph._registerDatabase(spaceId, db, owningObject);
    this._databases.set(spaceId, db);

    // Forward this database's local object updates to the aggregated signal so reactive index
    // sources can re-hydrate index hits once their documents become available locally.
    const unsubscribeFromUpdates = db._entityManager._updateEvent.on((event) => {
      this._objectsUpdated.emit({ spaceId, objectIds: event.itemsUpdated.map((item) => item.id) });
    });
    // An index hit dropped because this client's space root did not route it yet is re-hydrated when
    // the root gains the link, rather than staying missing until the next host response.
    const unsubscribeFromLinks = db.linksAdded.on((objectIds) => {
      this._objectsUpdated.emit({ spaceId, objectIds });
    });
    this._dbUpdateSubscriptions.set(spaceId, () => {
      unsubscribeFromUpdates();
      unsubscribeFromLinks();
    });

    return db;
  }

  /**
   * Closes and unregisters a space's database, so the space can be constructed again should it
   * return (e.g. an identity deleted in place and then recovered brings back the same space ids).
   */
  removeDatabase(db: DatabaseImpl): Promise<void> {
    if (this._databases.get(db.spaceId) !== db) {
      return Promise.resolve();
    }
    this._databases.delete(db.spaceId);
    this._dbUpdateSubscriptions.get(db.spaceId)?.();
    this._dbUpdateSubscriptions.delete(db.spaceId);
    this._graph._unregisterDatabase(db.spaceId);
    return db.close().then(() => undefined);
  }

  /**
   * Update service references after reconnection.
   * Must be called before _notifyReconnect.
   */
  _updateServices({
    dataService,
    queryService,
    feedService,
    mirrorService,
  }: {
    dataService: DataService.Client;
    queryService: QueryService.Client;
    feedService?: FeedService.Client;
    mirrorService?: MirrorService.Client;
  }): void {
    log('updating service references');
    this._dataService = dataService;
    this._queryService = queryService;
    this._feedService = feedService;
    if (mirrorService) {
      this._mirrorService = mirrorService;
    }

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
      db._updateServices({ dataService, queryService, feedService, mirrorService });
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

    const objectDocId = db.getObjectDocumentId(objectId) ?? (await this._waitForObjectLink(db, objectId));
    if (objectDocId !== documentId) {
      // Dropping the hit makes the result short, which reads to a caller as "no such object".
      log.warn('index hit dropped: the space root does not route the object to the indexed document', {
        objectId,
        expected: documentId,
        actual: objectDocId ?? null,
      });
      return undefined;
    }

    // Disk-only load: wait for dep states to settle, then return the core
    // only when strong deps are satisfied (unavailable deps → `undefined`).
    return db._loadObjectById(objectId, {
      allowDeleted: true,
      diskOnly: true,
    });
  }

  /**
   * The document the space root routes `objectId` to, once this client's replica of the root links it.
   * The index can learn of an object from the host's replica one sync batch before this one does.
   */
  private _waitForObjectLink(db: DatabaseImpl, objectId: string): Promise<string | undefined> {
    return new Promise((resolve) => {
      const settle = () => {
        clearTimeout(timer);
        unsubscribe();
        resolve(db.getObjectDocumentId(objectId));
      };
      const rootHandle = db._entityManager.getSpaceRootDocHandle();
      const onChange = () => {
        if (db.getObjectDocumentId(objectId) !== undefined) {
          settle();
        }
      };
      const unsubscribe = () => rootHandle.off('change', onChange);
      const timer = setTimeout(settle, ROOT_LINK_WAIT_TIMEOUT);
      rootHandle.on('change', onChange);
    });
  }
}

/** A process environment variable, where there is a process; browsers and workers have none. */
const processEnv = (key: string): string | undefined => (typeof process === 'undefined' ? undefined : process.env[key]);
