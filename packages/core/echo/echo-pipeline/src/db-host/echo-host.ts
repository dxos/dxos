//
// Copyright 2024 DXOS.org
//

import {
  type AnyDocumentId,
  type AutomergeUrl,
  type DocHandle,
  type DocumentId,
  type Repo,
} from '@automerge/automerge-repo';

import { Context, LifecycleState, Resource } from '@dxos/context';
import { todo } from '@dxos/debug';
import { type DatabaseDirectory, SpaceDocVersion, createIdFromSpaceKey } from '@dxos/echo-protocol';
import { IndexMetadataStore, IndexStore, Indexer } from '@dxos/indexing';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { trace } from '@dxos/tracing';

import {
  AutomergeHost,
  type CreateDocOptions,
  EchoDataMonitor,
  type EchoDataStats,
  type EchoReplicator,
  FIND_PARAMS,
  type LoadDocOptions,
  type PeerIdProvider,
  type RootDocumentSpaceKeyProvider,
  deriveCollectionIdFromSpaceId,
} from '../automerge';

import { DataServiceImpl } from './data-service';
import { type DatabaseRoot } from './database-root';
import { createSelectedDocumentsIterator } from './documents-iterator';
import { QueryServiceImpl } from './query-service';
import { SpaceStateManager } from './space-state-manager';

export interface EchoHostIndexingConfig {
  /**
   * @default true
   */
  fullText: boolean;

  /**
   * @default false
   */
  vector: boolean;
}

const DEFAULT_INDEXING_CONFIG: EchoHostIndexingConfig = {
  // TODO(dmaretskyi): Disabled by default since embedding generation is expensive.
  fullText: false,
  vector: false,
};

export type EchoHostParams = {
  kv: LevelDB;
  peerIdProvider?: PeerIdProvider;
  getSpaceKeyByRootDocumentId?: RootDocumentSpaceKeyProvider;

  indexing?: Partial<EchoHostIndexingConfig>;
};

/**
 * Host for the Echo database.
 * Manages multiple spaces.
 * Stores data to disk.
 * Can sync with pluggable data replicators.
 */
export class EchoHost extends Resource {
  private readonly _indexMetadataStore: IndexMetadataStore;
  private readonly _indexer: Indexer;
  private readonly _automergeHost: AutomergeHost;
  private readonly _queryService: QueryServiceImpl;
  private readonly _dataService: DataServiceImpl;
  private readonly _spaceStateManager = new SpaceStateManager();
  private readonly _echoDataMonitor: EchoDataMonitor;

  constructor({ kv, indexing = {}, peerIdProvider, getSpaceKeyByRootDocumentId }: EchoHostParams) {
    super();

    const indexingConfig = { ...DEFAULT_INDEXING_CONFIG, ...indexing };

    this._indexMetadataStore = new IndexMetadataStore({ db: kv.sublevel('index-metadata') });
    this._echoDataMonitor = new EchoDataMonitor();
    this._automergeHost = new AutomergeHost({
      db: kv,
      dataMonitor: this._echoDataMonitor,
      indexMetadataStore: this._indexMetadataStore,
      peerIdProvider,
      getSpaceKeyByRootDocumentId,
    });

    this._indexer = new Indexer({
      db: kv,
      indexStore: new IndexStore({ db: kv.sublevel('index-storage') }),
      metadataStore: this._indexMetadataStore,
      loadDocuments: createSelectedDocumentsIterator(this._automergeHost),
      indexCooldownTime: process.env.NODE_ENV === 'test' ? 0 : undefined,
    });
    void this._indexer.setConfig({
      enabled: true,
      indexes: [
        //
        { kind: IndexKind.Kind.SCHEMA_MATCH },
        { kind: IndexKind.Kind.GRAPH },

        ...(indexingConfig.fullText ? [{ kind: IndexKind.Kind.FULL_TEXT }] : []),
        ...(indexingConfig.vector ? [{ kind: IndexKind.Kind.VECTOR }] : []),
      ],
    });

    this._queryService = new QueryServiceImpl({
      automergeHost: this._automergeHost,
      indexer: this._indexer,
      spaceStateManager: this._spaceStateManager,
    });

    this._dataService = new DataServiceImpl({
      automergeHost: this._automergeHost,
      spaceStateManager: this._spaceStateManager,
      updateIndexes: async () => {
        await this._indexer.updateIndexes();
      },
    });

    trace.diagnostic<EchoStatsDiagnostic>({
      id: 'echo-stats',
      name: 'Echo Stats',
      fetch: async () => {
        return {
          dataStats: this._echoDataMonitor.computeStats(),
          loadedDocsCount: this._automergeHost.loadedDocsCount,
        };
      },
    });

    trace.diagnostic({
      id: 'database-roots',
      name: 'Database Roots',
      fetch: async () => {
        return Array.from(this._spaceStateManager.roots.values()).map((root) => ({
          url: root.url,
          isLoaded: root.isLoaded,
          spaceKey: root.getSpaceKey(),
          inlineObjects: root.getInlineObjectCount(),
          linkedObjects: root.getLinkedObjectCount(),
        }));
      },
    });

    trace.diagnostic({
      id: 'database-root-metrics',
      name: 'Database Roots (with metrics)',
      fetch: async () => {
        return Array.from(this._spaceStateManager.roots.values()).map((root) => ({
          url: root.url,
          isLoaded: root.isLoaded,
          spaceKey: root.getSpaceKey(),
          inlineObjects: root.getInlineObjectCount(),
          linkedObjects: root.getLinkedObjectCount(),
          ...(root.measureMetrics() ?? {}),
        }));
      },
    });
  }

  get queryService(): QueryServiceImpl {
    return this._queryService;
  }

  get dataService(): DataServiceImpl {
    return this._dataService;
  }

  get roots(): ReadonlyMap<DocumentId, DatabaseRoot> {
    return this._spaceStateManager.roots;
  }

  protected override async _open(ctx: Context): Promise<void> {
    await this._automergeHost.open();
    await this._indexer.open(ctx);
    await this._queryService.open(ctx);
    await this._spaceStateManager.open(ctx);

    this._spaceStateManager.spaceDocumentListUpdated.on(this._ctx, (e) => {
      if (e.previousRootId) {
        void this._automergeHost.clearLocalCollectionState(deriveCollectionIdFromSpaceId(e.spaceId, e.previousRootId));
      }
      void this._automergeHost.updateLocalCollectionState(
        deriveCollectionIdFromSpaceId(e.spaceId, e.spaceRootId),
        e.documentIds,
      );
    });
    this._automergeHost.documentsSaved.on(this._ctx, () => {
      this._queryService.invalidateQueries();
    });
  }

  protected override async _close(ctx: Context): Promise<void> {
    await this._queryService.close(ctx);
    await this._spaceStateManager.close(ctx);
    await this._indexer.close(ctx);
    await this._automergeHost.close();
  }

  /**
   * Flush all pending writes to the underlying storage.
   */
  async flush(): Promise<void> {
    await this._automergeHost.flush();
  }

  /**
   * Perform any pending index updates.
   */
  async updateIndexes(): Promise<void> {
    await this._indexer.updateIndexes();
  }

  /**
   * Loads the document handle from the repo and waits for it to be ready.
   */
  async loadDoc<T>(ctx: Context, documentId: AnyDocumentId, opts?: LoadDocOptions): Promise<DocHandle<T>> {
    return await this._automergeHost.loadDoc(ctx, documentId, opts);
  }

  async exportDoc(ctx: Context, id: AnyDocumentId): Promise<Uint8Array> {
    return await this._automergeHost.exportDoc(ctx, id);
  }

  /**
   * Create new persisted document.
   */
  createDoc<T>(initialValue?: T, opts?: CreateDocOptions): DocHandle<T> {
    return this._automergeHost.createDoc(initialValue, opts);
  }

  /**
   * Create new space root.
   */
  async createSpaceRoot(spaceKey: PublicKey): Promise<DatabaseRoot> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    const spaceId = await createIdFromSpaceKey(spaceKey);

    const automergeRoot = this._automergeHost.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: spaceKey.toHex() },

      // Better to initialize them right away to avoid merge conflicts and data loss that can occur if those maps get created on the fly.
      objects: {},
      links: {},
    });

    await this._automergeHost.flush({ documentIds: [automergeRoot.documentId] });

    return await this.openSpaceRoot(spaceId, automergeRoot.url);
  }

  // TODO(dmaretskyi): Change to document id.
  async openSpaceRoot(spaceId: SpaceId, automergeUrl: AutomergeUrl): Promise<DatabaseRoot> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(Context.default(), automergeUrl, { fetchFromNetwork: true });
    await handle.whenReady();

    return this._spaceStateManager.assignRootToSpace(spaceId, handle);
  }

  // TODO(dmaretskyi): Change to document id.
  async closeSpaceRoot(automergeUrl: AutomergeUrl): Promise<void> {
    todo();
  }

  /**
   * Install data replicator.
   */
  async addReplicator(replicator: EchoReplicator): Promise<void> {
    await this._automergeHost.addReplicator(replicator);
  }

  /**
   * Remove data replicator.
   */
  async removeReplicator(replicator: EchoReplicator): Promise<void> {
    await this._automergeHost.removeReplicator(replicator);
  }

  /**
   * Run collection sync for the given space.
   * Does not wait for the sync to complete.
   */
  async runCollectionSync(spaceId: SpaceId) {
    const root = this._spaceStateManager.getRootBySpaceId(spaceId);
    if (!root) {
      throw new Error(`Space not found: ${spaceId}`);
    }
    this._automergeHost.refreshCollection(deriveCollectionIdFromSpaceId(spaceId, root.documentId));
  }
}

export type { EchoDataStats };

export type EchoStatsDiagnostic = {
  loadedDocsCount: number;
  dataStats: EchoDataStats;
};
