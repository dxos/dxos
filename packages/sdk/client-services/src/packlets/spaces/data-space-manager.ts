//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event, synchronized, trackLeaks } from '@dxos/async';
import { SpaceState } from '@dxos/client';
import { cancelWithContext, Context } from '@dxos/context';
import { getCredentialAssertion } from '@dxos/credentials';
import {
  DataServiceSubscriptions,
  MetadataStore,
  SigningContext,
  SnapshotManager,
  SnapshotStore,
  Space,
  spaceGenesis,
  SpaceManager
} from '@dxos/echo-pipeline';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { trace } from '@dxos/protocols';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { Gossip, Presence } from '@dxos/teleport-extension-gossip';
import { Timeframe } from '@dxos/timeframe';
import { ComplexMap, deferFunction } from '@dxos/util';

import { createAuthProvider } from '../identity';
import { DataSpace } from './data-space';

export type AcceptSpaceOptions = {
  spaceKey: PublicKey;
  genesisFeedKey: PublicKey;

  /**
   * Latest known timeframe for the control pipeline.
   * We will try to catch up to this timeframe before starting the data pipeline.
   */
  controlTimeframe?: Timeframe;

  /**
   * Latest known timeframe for the data pipeline.
   * We will try to catch up to this timeframe before initializing the database.
   */
  dataTimeframe?: Timeframe;
};

@trackLeaks('open', 'close')
export class DataSpaceManager {
  private readonly _ctx = new Context();

  public readonly updated = new Event();

  private readonly _spaces = new ComplexMap<PublicKey, DataSpace>(PublicKey.hash);

  private _isOpen = false;
  private readonly _instanceId = PublicKey.random().toHex();
  public _traceParent?: string;

  constructor(
    private readonly _spaceManager: SpaceManager,
    private readonly _metadataStore: MetadataStore,
    private readonly _dataServiceSubscriptions: DataServiceSubscriptions,
    private readonly _keyring: Keyring,
    private readonly _signingContext: SigningContext,
    private readonly _modelFactory: ModelFactory,
    private readonly _feedStore: FeedStore<FeedMessage>,
    private readonly _snapshotStore: SnapshotStore
  ) { }

  // TODO(burdon): Remove.
  get spaces() {
    return this._spaces;
  }

  @synchronized
  async open() {
    log('open');
    log.trace('dxos.echo.data-space-manager', trace.begin({ id: this._instanceId, parentId: this._traceParent }));
    await this._metadataStore.load();
    log('metadata loaded', { spaces: this._metadataStore.spaces.length });

    for (const spaceMetadata of this._metadataStore.spaces) {
      try {
        log('load space', { spaceMetadata });
        const space = await this._constructSpace(spaceMetadata);
        space.initializeDataPipelineAsync();
      } catch (err) {
        log.error('Error loading space', { spaceMetadata, err });
      }
    }

    this._isOpen = true;
    this.updated.emit();
  }

  @synchronized
  async close() {
    log('close');
    this._isOpen = false;
    await this._ctx.dispose();
    for (const space of this._spaces.values()) {
      await space.close();
    }
    log.trace('dxos.echo.data-space-manager', trace.end({ id: this._instanceId }));
  }

  /**
   * Creates a new space writing the genesis credentials to the control feed.
   */
  @synchronized
  async createSpace() {
    assert(this._isOpen, 'Not open.');
    const spaceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();
    const metadata: SpaceMetadata = {
      key: spaceKey,
      genesisFeedKey: controlFeedKey,
      controlFeedKey,
      dataFeedKey
    };

    log('creating space...', { spaceKey });
    const space = await this._constructSpace(metadata);

    const credentials = await spaceGenesis(this._keyring, this._signingContext, space.inner);
    await this._metadataStore.addSpace(metadata);

    const memberCredential = credentials[1];
    assert(getCredentialAssertion(memberCredential)['@type'] === 'dxos.halo.credentials.SpaceMember');
    await this._signingContext.recordCredential(memberCredential);

    await space.initializeDataPipeline();

    this.updated.emit();
    return space;
  }

  // TODO(burdon): Rename join space.
  @synchronized
  async acceptSpace(opts: AcceptSpaceOptions): Promise<DataSpace> {
    log('accept space', { opts });
    assert(this._isOpen, 'Not open.');
    assert(!this._spaces.has(opts.spaceKey), 'Space already exists.');

    const metadata: SpaceMetadata = {
      key: opts.spaceKey,
      genesisFeedKey: opts.genesisFeedKey,
      controlTimeframe: opts.controlTimeframe,
      dataTimeframe: opts.dataTimeframe
    };

    const space = await this._constructSpace(metadata);
    await this._metadataStore.addSpace(metadata);

    space.initializeDataPipelineAsync();

    this.updated.emit();
    return space;
  }

  /**
   * Wait until the space data pipeline is fully initialized.
   * Used by invitation handler.
   * TODO(dmaretskyi): Consider removing.
   */
  async waitUntilSpaceReady(spaceKey: PublicKey) {
    await cancelWithContext(
      this._ctx,
      this.updated.waitForCondition(() => {
        const space = this._spaces.get(spaceKey);
        return !!space && space.state === SpaceState.READY;
      })
    );
  }

  private async _constructSpace(metadata: SpaceMetadata) {
    log('construct space', { metadata });
    const gossip = new Gossip({
      localPeerId: this._signingContext.deviceKey
    });
    const presence = new Presence({
      announceInterval: 500,
      offlineTimeout: 5_000, // TODO(burdon): Config.
      identityKey: this._signingContext.identityKey,
      gossip
    });
    const snapshotManager = new SnapshotManager(this._snapshotStore);

    const controlFeed =
      metadata.controlFeedKey && (await this._feedStore.openFeed(metadata.controlFeedKey, { writable: true }));
    const dataFeed = metadata.dataFeedKey && (await this._feedStore.openFeed(metadata.dataFeedKey, { writable: true }));

    const space: Space = await this._spaceManager.constructSpace({
      metadata,
      swarmIdentity: {
        peerKey: this._signingContext.deviceKey,
        credentialProvider: createAuthProvider(this._signingContext.credentialSigner),
        credentialAuthenticator: deferFunction(() => dataSpace.authVerifier.verifier)
      },
      onNetworkConnection: (session) => {
        session.addExtension(
          'dxos.mesh.teleport.gossip',
          gossip.createExtension({ remotePeerId: session.remotePeerId })
        );
        session.addExtension('dxos.mesh.teleport.objectsync', snapshotManager.objectSync.createExtension());
        session.addExtension('dxos.mesh.teleport.notarization', dataSpace.notarizationPlugin.createExtension());
      }
    });
    controlFeed && space.setControlFeed(controlFeed);
    dataFeed && space.setDataFeed(dataFeed);

    const dataSpace = new DataSpace({
      inner: space,
      modelFactory: this._modelFactory,
      metadataStore: this._metadataStore,
      snapshotManager,
      gossip,
      presence,
      memberKey: this._signingContext.identityKey,
      keyring: this._keyring,
      feedStore: this._feedStore,
      signingContext: this._signingContext,
      snapshotId: metadata.snapshot,
      callbacks: {
        beforeReady: async () => {
          log('before space ready', { space: space.key });
          this._dataServiceSubscriptions.registerSpace(
            space.key,
            dataSpace.dataPipeline.databaseBackend!.createDataServiceHost()
          );
        },
        afterReady: async () => {
          log('after space ready', { space: space.key, open: this._isOpen });
          if (this._isOpen) {
            this.updated.emit();
          }
        }
      }
    });

    await dataSpace.open();

    if (metadata.controlTimeframe) {
      dataSpace.inner.controlPipeline.state.setTargetTimeframe(metadata.controlTimeframe);
    }
    if (metadata.dataTimeframe) {
      dataSpace.dataPipeline.setTargetTimeframe(metadata.dataTimeframe);
    }

    this._spaces.set(metadata.key, dataSpace);
    return dataSpace;
  }
}
