//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { trackLeaks } from '@dxos/async';
import { Context } from '@dxos/context';
import { CredentialConsumer, CredentialGenerator } from '@dxos/credentials';
import { Database, DataPipelineControllerImpl, ISpace, MetadataStore, Space, SnapshotManager, SigningContext, createMappedFeedWriter } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { Presence } from '@dxos/teleport-extension-presence';
import { ComplexSet } from '@dxos/util';

import { TrustedKeySetAuthVerifier } from '../identity';
import { NotarizationPlugin } from './notarization-plugin';
import { timed } from '@dxos/debug';
import { Keyring } from '@dxos/keyring';
import { AdmittedFeed, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { TypedMessage } from '@dxos/protocols';

const AUTH_TIMEOUT = 30000;

export type DataSpaceParams = {
  inner: Space;
  modelFactory: ModelFactory;
  metadataStore: MetadataStore;
  snapshotManager: SnapshotManager;
  presence: Presence;
  keyring: Keyring;
  signingContext: SigningContext;
  memberKey: PublicKey;
  snapshotId?: string | undefined;
};

const CONTROL_PIPELINE_READY_TIMEFRAME = 3000;
@trackLeaks('open', 'close')
export class DataSpace implements ISpace {
  private readonly _ctx = new Context();
  private readonly _dataPipelineController: DataPipelineControllerImpl;
  private readonly _inner: Space;
  private readonly _presence: Presence;
  private readonly _keyring: Keyring;
  private readonly _signingContext: SigningContext;
  public readonly authVerifier: TrustedKeySetAuthVerifier;
  private readonly _notarizationPluginConsumer: CredentialConsumer<NotarizationPlugin>;

  constructor(params: DataSpaceParams) {
    this._inner = params.inner;
    this._presence = params.presence;
    this._keyring = params.keyring;
    this._signingContext = params.signingContext;
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
    await this._notarizationPluginConsumer.open();

    await this._inner.open();

    await this._inner.controlPipeline.state.waitUntilReachedTargetTimeframe({ timeout: CONTROL_PIPELINE_READY_TIMEFRAME });

    await this._ensureOwnFeedsAreAdmitted();
    this.notarizationPlugin.setWriter(createMappedFeedWriter<Credential, TypedMessage>(credential => ({
      '@type': 'dxos.echo.feed.CredentialsMessage',
      credential
    }), this._inner.controlPipeline.writer));
    
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

  @timed(10_000)
  private async _ensureOwnFeedsAreAdmitted() {
    const credentials: Credential[] = []
    const generator = new CredentialGenerator(this._keyring, this._signingContext.identityKey, this._signingContext.deviceKey);

    if(!this._inner.spaceState.feeds.has(this.inner.controlFeedKey)) {
      credentials.push(await generator.createFeedAdmission(this.key, this._inner.controlFeedKey, AdmittedFeed.Designation.CONTROL))
    }
    if(!this._inner.spaceState.feeds.has(this.inner.dataFeedKey)) {
      credentials.push(await generator.createFeedAdmission(this.key, this._inner.dataFeedKey, AdmittedFeed.Designation.DATA))
    }

    if(credentials.length > 0) {
      await this.notarizationPlugin.notarize(credentials);
    }
  }
}
