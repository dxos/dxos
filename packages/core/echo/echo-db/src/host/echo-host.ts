//
// Copyright 2024 DXOS.org
//

import { Context, LifecycleState, Resource } from '@dxos/context';
import { AutomergeHost, DataServiceImpl, type LevelDB } from '@dxos/echo-pipeline';
import { IndexMetadataStore, IndexStore, Indexer, createStorageCallbacks } from '@dxos/indexing';
import { createSelectedDocumentsIterator } from './documents-iterator';
import { Storage } from '@dxos/random-access-storage';
import { PublicKey } from '@dxos/keys';
import { AutomergeUrl } from '@dxos/automerge/automerge-repo';
import { QueryServiceImpl } from '../query';
import { QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import { invariant } from '@dxos/invariant';

export type EchoHostParams = {
  kv: LevelDB;
  storage: Storage;
};

export class EchoHost extends Resource {
  private readonly _indexMetadataStore: IndexMetadataStore;
  private readonly _indexer: Indexer;
  private readonly _automergeHost: AutomergeHost;
  private readonly _queryService: QueryServiceImpl;
  private readonly _dataService: DataServiceImpl;

  constructor({ kv, storage }: EchoHostParams) {
    super();

    this._indexMetadataStore = new IndexMetadataStore({ db: kv.sublevel('index-metadata') });

    this._automergeHost = new AutomergeHost({
      db: kv.sublevel('automerge'),
      // TODO(dmaretskyi): Remove circular dependency.
      storageCallbacks: createStorageCallbacks({ host: () => this._automergeHost, metadata: this._indexMetadataStore }),
      // TODO(dmaretskyi): Still needed for data migration -- remove before the next release.
      directory: storage.createDirectory('automerge'),
    });

    this._indexer = new Indexer({
      db: kv,
      indexStore: new IndexStore({ db: kv.sublevel('index-storage') }),
      metadataStore: this._indexMetadataStore,
      loadDocuments: createSelectedDocumentsIterator(this._automergeHost),
    });

    this._queryService = new QueryServiceImpl({
      automergeHost: this._automergeHost,
      indexer: this._indexer,
    });

    this._dataService = new DataServiceImpl(this._automergeHost);
  }

  get queryService(): QueryService {
    return this._queryService;
  }

  get dataService(): DataServiceImpl {
    return this._dataService;
  }

  /**
   * @deprecated
   */
  // TODO(dmaretskyi): Remove.
  get automergeHost(): AutomergeHost {
    return this._automergeHost;
  }

  protected override async _open(ctx: Context): Promise<void> {
    await this._automergeHost.open();
    await this._queryService.open(ctx);
  }

  protected override async _close(ctx: Context): Promise<void> {
    await this._queryService.close(ctx);
    await this._indexer.destroy();
    await this._automergeHost.close();
  }

  async flush() {
    await this._automergeHost.repo.flush();
  }

  async createSpaceRoot(spaceKey: PublicKey): Promise<AutomergeUrl> {
    invariant(this._lifecycleState === LifecycleState.OPEN);

    const automergeRoot = this._automergeHost.repo.create();
    automergeRoot.change((doc: any) => {
      doc.access = { spaceKey: spaceKey.toHex() };
    });

    await this._automergeHost.repo.flush();

    return automergeRoot.url;
  }
}
