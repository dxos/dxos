//
// Copyright 2024 DXOS.org
//

import {
  type AnyDocumentId,
  type AutomergeUrl,
  type DocHandle,
  type DocumentId,
  type Repo,
} from '@dxos/automerge/automerge-repo';
import { type Context, LifecycleState, Resource } from '@dxos/context';
import { todo } from '@dxos/debug';
import {
  AutomergeHost,
  DataServiceImpl,
  type EchoReplicator,
  MeshEchoReplicator,
  type LoadDocOptions,
  type CreateDocOptions,
  createIdFromSpaceKey,
  type CollectionSyncState,
  EchoDataMonitor,
  type EchoDataStats,
} from '@dxos/echo-pipeline';
import { deriveCollectionIdFromSpaceId } from '@dxos/echo-pipeline';
import { SpaceDocVersion, type SpaceDoc } from '@dxos/echo-protocol';
import { Indexer, IndexMetadataStore, IndexStore } from '@dxos/indexing';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { type IndexConfig, IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { type TeleportExtension } from '@dxos/teleport';
import { type AutomergeReplicatorFactory } from '@dxos/teleport-extension-automerge-replicator';
import { trace } from '@dxos/tracing';

import { type DatabaseRoot } from './database-root';
import { createSelectedDocumentsIterator } from './documents-iterator';
import { SpaceStateManager } from './space-state-manager';
import { QueryServiceImpl } from '../query';

const INDEXER_CONFIG: IndexConfig = {
  enabled: true,
  indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }],
};

export type EchoHostParams = {
  kv: LevelDB;
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

  // TODO(dmaretskyi): Extract from this class.
  private readonly _meshEchoReplicator: MeshEchoReplicator;

  constructor({ kv }: EchoHostParams) {
    super();

    this._indexMetadataStore = new IndexMetadataStore({ db: kv.sublevel('index-metadata') });

    this._echoDataMonitor = new EchoDataMonitor();

    this._automergeHost = new AutomergeHost({
      db: kv,
      dataMonitor: this._echoDataMonitor,
      indexMetadataStore: this._indexMetadataStore,
    });

    this._indexer = new Indexer({
      db: kv,
      indexStore: new IndexStore({ db: kv.sublevel('index-storage') }),
      metadataStore: this._indexMetadataStore,
      loadDocuments: createSelectedDocumentsIterator(this._automergeHost),
      indexCooldownTime: process.env.NODE_ENV === 'test' ? 0 : undefined,
    });
    this._indexer.setConfig(INDEXER_CONFIG);

    this._queryService = new QueryServiceImpl({
      automergeHost: this._automergeHost,
      indexer: this._indexer,
    });

    this._dataService = new DataServiceImpl({
      automergeHost: this._automergeHost,
      updateIndexes: async () => {
        await this._indexer.updateIndexes();
      },
    });

    this._meshEchoReplicator = new MeshEchoReplicator();

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

  /**
   * @deprecated To be abstracted away.
   */
  get automergeRepo(): Repo {
    return this._automergeHost.repo;
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
      void this._automergeHost.updateLocalCollectionState(deriveCollectionIdFromSpaceId(e.spaceId), e.documentIds);
    });

    await this._automergeHost.addReplicator(this._meshEchoReplicator);
  }

  protected override async _close(ctx: Context): Promise<void> {
    await this._automergeHost.removeReplicator(this._meshEchoReplicator);

    await this._spaceStateManager.close();
    await this._queryService.close(ctx);
    await this._indexer.close(ctx);
    await this._automergeHost.close();
  }

  /**
   * Flush all pending writes to the underlying storage.
   */
  async flush() {
    await this._automergeHost.repo.flush();
  }

  /**
   * Perform any pending index updates.
   */
  async updateIndexes() {
    await this._indexer.updateIndexes();
  }

  /**
   * Loads the document handle from the repo and waits for it to be ready.
   */
  async loadDoc<T>(ctx: Context, documentId: AnyDocumentId, opts?: LoadDocOptions): Promise<DocHandle<T>> {
    return await this._automergeHost.loadDoc(ctx, documentId, opts);
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

    const automergeRoot = this._automergeHost.createDoc<SpaceDoc>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: spaceKey.toHex() },
    });

    await this._automergeHost.flush({ documentIds: [automergeRoot.documentId] });

    return await this.openSpaceRoot(spaceId, automergeRoot.url);
  }

  // TODO(dmaretskyi): Change to document id.
  async openSpaceRoot(spaceId: SpaceId, automergeUrl: AutomergeUrl): Promise<DatabaseRoot> {
    invariant(this._lifecycleState === LifecycleState.OPEN);
    const handle = this._automergeHost.repo.find(automergeUrl);

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

  async getSpaceSyncState(spaceId: SpaceId): Promise<CollectionSyncState> {
    const collectionId = deriveCollectionIdFromSpaceId(spaceId);
    return this._automergeHost.getCollectionSyncState(collectionId);
  }

  /**
   * Authorize remote device to access space.
   * @deprecated MESH-based replication is being moved out from EchoHost.
   */
  // TODO(dmaretskyi): Extract from this class.
  async authorizeDevice(spaceKey: PublicKey, deviceKey: PublicKey) {
    await this._meshEchoReplicator.authorizeDevice(spaceKey, deviceKey);
  }

  /**
   * @deprecated MESH-based replication is being moved out from EchoHost.
   */
  // TODO(dmaretskyi): Extract from this class.
  createReplicationExtension(extensionFactory?: AutomergeReplicatorFactory): TeleportExtension {
    return this._meshEchoReplicator.createExtension(extensionFactory);
  }
}

export type { EchoDataStats };

export type EchoStatsDiagnostic = {
  loadedDocsCount: number;
  dataStats: EchoDataStats;
};
