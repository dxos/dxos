//
// Copyright 2024 DXOS.org
//

import { type AutomergeUrl, type Repo } from '@dxos/automerge/automerge-repo';
import { type Context, LifecycleState, Resource } from '@dxos/context';
import { AutomergeHost, DataServiceImpl, type EchoReplicator, MeshEchoReplicator } from '@dxos/echo-pipeline';
import { IndexMetadataStore, IndexStore, Indexer } from '@dxos/indexing';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { type IndexConfig, IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { type QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import { type Storage } from '@dxos/random-access-storage';
import { type TeleportExtension } from '@dxos/teleport';

import { createSelectedDocumentsIterator } from './documents-iterator';
import { QueryServiceImpl } from '../query';

const INDEXER_CONFIG: IndexConfig = {
  enabled: true,
  indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }],
};

export type EchoHostParams = {
  kv: LevelDB;
  storage?: Storage;
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

  // TODO(dmaretskyi): Extract from this class.
  private readonly _meshEchoReplicator: MeshEchoReplicator;

  constructor({ kv, storage }: EchoHostParams) {
    super();

    this._indexMetadataStore = new IndexMetadataStore({ db: kv.sublevel('index-metadata') });

    this._automergeHost = new AutomergeHost({
      db: kv.sublevel('automerge'),
      indexMetadataStore: this._indexMetadataStore,
      // TODO(dmaretskyi): Still needed for data migration -- remove before the next release.
      directory: storage?.createDirectory('automerge'),
    });

    this._indexer = new Indexer({
      db: kv,
      indexStore: new IndexStore({ db: kv.sublevel('index-storage') }),
      metadataStore: this._indexMetadataStore,
      loadDocuments: createSelectedDocumentsIterator(this._automergeHost),
    });
    this._indexer.setConfig(INDEXER_CONFIG);

    this._queryService = new QueryServiceImpl({
      automergeHost: this._automergeHost,
      indexer: this._indexer,
    });

    this._dataService = new DataServiceImpl(this._automergeHost);

    this._meshEchoReplicator = new MeshEchoReplicator();
  }

  get queryService(): QueryService {
    return this._queryService;
  }

  get dataService(): DataServiceImpl {
    return this._dataService;
  }

  get automergeRepo(): Repo {
    return this._automergeHost.repo;
  }

  protected override async _open(ctx: Context): Promise<void> {
    await this._automergeHost.open();
    await this._indexer.open(ctx);
    await this._queryService.open(ctx);
    await this._automergeHost.addReplicator(this._meshEchoReplicator);
  }

  protected override async _close(ctx: Context): Promise<void> {
    await this._automergeHost.removeReplicator(this._meshEchoReplicator);
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
   * Create new space root.
   */
  async createSpaceRoot(spaceKey: PublicKey): Promise<AutomergeUrl> {
    invariant(this._lifecycleState === LifecycleState.OPEN);

    const automergeRoot = this._automergeHost.repo.create();
    automergeRoot.change((doc: any) => {
      doc.access = { spaceKey: spaceKey.toHex() };
    });

    await this._automergeHost.repo.flush([automergeRoot.documentId]);

    return automergeRoot.url;
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
   * Authorize remote device to access space.
   * @deprecated
   */
  // TODO(dmaretskyi): Rethink replication/auth API.
  authorizeDevice(spaceKey: PublicKey, deviceKey: PublicKey) {
    this._meshEchoReplicator.authorizeDevice(spaceKey, deviceKey);
  }

  /**
   * This doc will be replicated from remote peers.
   * @deprecated
   */
  // TODO(dmaretskyi): Rethink replication/auth API.
  replicateDocument(docUrl: string) {
    this._automergeHost._requestedDocs.add(docUrl);
  }

  /**
   * @deprecated
   */
  // TODO(dmaretskyi): Rethink replication/auth API.
  createReplicationExtension(): TeleportExtension {
    return this._meshEchoReplicator.createExtension();
  }
}
