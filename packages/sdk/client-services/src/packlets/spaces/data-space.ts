//
// Copyright 2022 DXOS.org
//

import { trackLeaks } from '@dxos/async';
import { Context } from '@dxos/context';
import { CredentialConsumer } from '@dxos/credentials';
import { timed } from '@dxos/debug';
import {
  DataPipelineControllerImpl,
  MetadataStore,
  Space,
  SigningContext,
  createMappedFeedWriter,
  SnapshotManager
} from '@dxos/echo-pipeline';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { AdmittedFeed, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Presence } from '@dxos/teleport-extension-presence';
import { ComplexSet } from '@dxos/util';

import { TrustedKeySetAuthVerifier } from '../identity';
import { NotarizationPlugin } from './notarization-plugin';

const AUTH_TIMEOUT = 30000;

export type DataSpaceParams = {
  inner: Space;
  modelFactory: ModelFactory;
  metadataStore: MetadataStore;
  snapshotManager: SnapshotManager;
  presence: Presence;
  keyring: Keyring;
  feedStore: FeedStore<FeedMessage>;
  signingContext: SigningContext;
  memberKey: PublicKey;
  snapshotId?: string | undefined;
};

const CONTROL_PIPELINE_READY_TIMEFRAME = 3000;
@trackLeaks('open', 'close')
export class DataSpace {
  private readonly _ctx = new Context();
  private readonly _dataPipelineController: DataPipelineControllerImpl;
  private readonly _inner: Space;
  private readonly _presence: Presence;
  private readonly _keyring: Keyring;
  private readonly _feedStore: FeedStore<FeedMessage>;
  private readonly _metadataStore: MetadataStore;
  private readonly _signingContext: SigningContext;
  private readonly _notarizationPluginConsumer: CredentialConsumer<NotarizationPlugin>;

  public readonly authVerifier: TrustedKeySetAuthVerifier;

  constructor(params: DataSpaceParams) {
    this._inner = params.inner;
    this._presence = params.presence;
    this._keyring = params.keyring;
    this._feedStore = params.feedStore;
    this._metadataStore = params.metadataStore;
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

  get isOpen() {
    return this._inner.isOpen;
  }

  // TODO(burdon): Can we mark this for debugging only?
  get inner() {
    return this._inner;
  }

  get dataPipelineController(): DataPipelineControllerImpl {
    return this._dataPipelineController;
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
  }

  async close() {
    await this._ctx.dispose();

    await this.authVerifier.close();

    await this._inner.close();
    await this._notarizationPluginConsumer.close();
    await this.notarizationPlugin.close();

    await this._presence.destroy();
  }

  async initializeDataPipeline() {
    await this._inner.controlPipeline.state.waitUntilReachedTargetTimeframe({
      timeout: CONTROL_PIPELINE_READY_TIMEFRAME
    });

    await this._createWritableFeeds();
    this.notarizationPlugin.setWriter(
      createMappedFeedWriter<Credential, FeedMessage.Payload>(
        (credential) => ({
          credential: { credential }
        }),
        this._inner.controlPipeline.writer
      )
    );

    await this._inner.initDataPipeline(this._dataPipelineController);
  }

  @timed(10_000)
  private async _createWritableFeeds() {
    const credentials: Credential[] = [];
    if (!this.inner.controlFeedKey) {
      const controlFeed = await this._feedStore.openFeed(await this._keyring.createKey(), { writable: true });
      this.inner.setControlFeed(controlFeed);

      credentials.push(
        await this._signingContext.credentialSigner.createCredential({
          subject: controlFeed.key,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            spaceKey: this.key,
            deviceKey: this._signingContext.deviceKey,
            identityKey: this._signingContext.identityKey,
            designation: AdmittedFeed.Designation.CONTROL
          }
        })
      );
    }
    if (!this.inner.dataFeedKey) {
      const dataFeed = await this._feedStore.openFeed(await this._keyring.createKey(), { writable: true });
      this.inner.setDataFeed(dataFeed);

      credentials.push(
        await this._signingContext.credentialSigner.createCredential({
          subject: dataFeed.key,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            spaceKey: this.key,
            deviceKey: this._signingContext.deviceKey,
            identityKey: this._signingContext.identityKey,
            designation: AdmittedFeed.Designation.DATA
          }
        })
      );
    }

    if (credentials.length > 0) {
      await this.notarizationPlugin.notarize(credentials);
    }

    // Set this after credentials are notarized so that on failure we will retry.
    await this._metadataStore.setWritableFeedKeys(this.key, this.inner.controlFeedKey!, this.inner.dataFeedKey!);
  }
}
