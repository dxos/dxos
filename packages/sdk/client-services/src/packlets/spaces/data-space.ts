//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Context } from '@dxos/context';
import { Database, DataPipelineControllerImpl, ISpace, MetadataStore, Space, SnapshotManager } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { Presence } from '@dxos/teleport-extension-presence';
import { trackLeaks } from '@dxos/async';

export type DataSpaceParams = {
  inner: Space;
  modelFactory: ModelFactory;
  metadataStore: MetadataStore;
  snapshotManager: SnapshotManager;
  presence: Presence;
  memberKey: PublicKey;
  snapshotId?: string | undefined;
};

@trackLeaks('open', 'close')
export class DataSpace implements ISpace {
  private readonly _ctx = new Context();
  private readonly _dataPipelineController: DataPipelineControllerImpl;
  private readonly _inner: Space;
  private readonly _presence: Presence;

  constructor(params: DataSpaceParams) {
    this._inner = params.inner;
    this._presence = params.presence;
    this._dataPipelineController = new DataPipelineControllerImpl({
      modelFactory: params.modelFactory,
      metadataStore: params.metadataStore,
      snapshotManager: params.snapshotManager,
      memberKey: params.memberKey,
      spaceKey: this._inner.key,
      feedInfoProvider: (feedKey) => this._inner.spaceState.feeds.get(feedKey),
      snapshotId: params.snapshotId
    });
  }

  get key() {
    return this._inner.key;
  }

  get inner() {
    return this._inner;
  }

  get isOpen() {
    return this._inner.isOpen;
  }

  get dataPipelineController(): DataPipelineControllerImpl {
    return this._dataPipelineController;
  }

  get database(): Database {
    assert(this._dataPipelineController.database);
    return this._dataPipelineController.database;
  }

  get stateUpdate() {
    return this._inner.stateUpdate;
  }

  get presence() {
    return this._presence;
  }

  async open() {
    await this._inner.open();
    await this._inner.initDataPipeline(this._dataPipelineController);
  }

  async close() {
    await this._ctx.dispose();
    await this._inner.close();
    await this._presence.destroy();
  }
}
