//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { trackLeaks } from '@dxos/async';
import { Context } from '@dxos/context';
import { Database, DataPipelineControllerImpl, ISpace, MetadataStore, Space, SnapshotManager } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { Presence } from '@dxos/teleport-extension-presence';
import { ComplexSet } from '@dxos/util';

import { TrustedKeySetAuthVerifier } from '../identity';
import { NotarizationPlugin } from './notarization-plugin';
import { CredentialConsumer } from '@dxos/credentials';

const AUTH_TIMEOUT = 30000;

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
  public readonly authVerifier: TrustedKeySetAuthVerifier;
  private readonly _notarizationPluginConsumer: CredentialConsumer<NotarizationPlugin>;

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
    this.authVerifier = new TrustedKeySetAuthVerifier({
      trustedKeysProvider: () => new ComplexSet(PublicKey.hash, Array.from(this._inner.spaceState.members.keys())),
      update: this._inner.stateUpdate,
      authTimeout: AUTH_TIMEOUT
    });
    this._notarizationPluginConsumer = this._inner.spaceState.registerProcessor(new NotarizationPlugin());
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

  get notarizationPlugin() {
    return this._notarizationPluginConsumer.processor;
  }

  async open() {
    await this.notarizationPlugin.open();
    await this._notarizationPluginConsumer.open()

    await this._inner.open();

    await this._inner.initDataPipeline(this._dataPipelineController);
  }

  async close() {
    await this._ctx.dispose();

    await this.authVerifier.close();
    await this._inner.close();

    await this._notarizationPluginConsumer.close();
    await this.notarizationPlugin.close();

    await this._presence.destroy();
  }
}
