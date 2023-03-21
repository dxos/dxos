//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event, scheduleTask, synchronized, trackLeaks } from '@dxos/async';
import { cancelWithContext, Context } from '@dxos/context';
import { getCredentialAssertion } from '@dxos/credentials';
import {
  MetadataStore,
  SigningContext,
  Space,
  spaceGenesis,
  SpaceManager,
  DataServiceSubscriptions,
  SnapshotManager,
  SnapshotStore
} from '@dxos/echo-pipeline';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { Gossip, Presence } from '@dxos/teleport-extension-gossip';
import { ComplexMap, deferFunction } from '@dxos/util';

import { createAuthProvider } from '../identity';
import { DataSpace } from './data-space';

const DATA_PIPELINE_READY_TIMEOUT = 3_000;

export type AcceptSpaceOptions = {
  spaceKey: PublicKey;
  genesisFeedKey: PublicKey;
};

@trackLeaks('open', 'close')
export class DataSpaceManager {
  private readonly _ctx = new Context();

  public readonly updated = new Event();

  private readonly _spaces = new ComplexMap<PublicKey, DataSpace>(PublicKey.hash);

  constructor(
    private readonly _spaceManager: SpaceManager,
    private readonly _metadataStore: MetadataStore,
    private readonly _dataServiceSubscriptions: DataServiceSubscriptions,
    private readonly _keyring: Keyring,
    private readonly _signingContext: SigningContext,
    private readonly _modelFactory: ModelFactory,
    private readonly _feedStore: FeedStore<FeedMessage>,
    private readonly _snapshotStore: SnapshotStore
  ) {}

  // TODO(burdon): Remove.
  get spaces() {
    return this._spaces;
  }

  @synchronized
  async open() {
    await this._metadataStore.load();
    log('metadata loaded', { spaces: this._metadataStore.spaces.length });

    for (const spaceMetadata of this._metadataStore.spaces) {
      log('load space', { spaceMetadata });
      const space = await this._constructSpace(spaceMetadata);
      if (spaceMetadata.dataTimeframe) {
        log('set latest timeframe', { spaceMetadata });
        space.dataPipelineController.setTargetTimeframe(spaceMetadata.dataTimeframe);
      }

      // Asynchronously initialize the data pipeline.
      scheduleTask(this._ctx, async () => {
        try {
          await space.initializeDataPipeline();
          await space.dataPipelineController.pipelineState!.waitUntilReachedTargetTimeframe({
            timeout: DATA_PIPELINE_READY_TIMEOUT
          });
          this._dataServiceSubscriptions.registerSpace(
            space.key,
            space.dataPipelineController.databaseBackend!.createDataServiceHost()
          );
          this.updated.emit();
        } catch (err) {
          log.error('error initializing space data pipeline', err);
        }
      }) 
    }

    this.updated.emit();
  }

  @synchronized
  async close() {
    await this._ctx.dispose();
    for (const space of this._spaces.values()) {
      await space.close();
    }
  }

  /**
   * Creates a new space writing the genesis credentials to the control feed.
   */
  @synchronized
  async createSpace() {
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

    // For the new space this should complete without blocking on network.
    await space.initializeDataPipeline();
    this._dataServiceSubscriptions.registerSpace(
      space.key,
      space.dataPipelineController.databaseBackend!.createDataServiceHost()
    );

    this.updated.emit();
    return space;
  }

  // TODO(burdon): Rename join space.
  @synchronized
  async acceptSpace(opts: AcceptSpaceOptions): Promise<DataSpace> {
    assert(!this._spaces.has(opts.spaceKey), 'Space already exists.');

    const metadata: SpaceMetadata = {
      key: opts.spaceKey,
      genesisFeedKey: opts.genesisFeedKey
    };

    const space = await this._constructSpace(metadata);
    await this._metadataStore.addSpace(metadata);

    // Asynchronously initialize the data pipeline.
    scheduleTask(this._ctx, async () => {
      await space.initializeDataPipeline();
      this._dataServiceSubscriptions.registerSpace(
        space.key,
        space.dataPipelineController.databaseBackend!.createDataServiceHost()
      );
      this.updated.emit();
    });

    this.updated.emit();
    return space;
  }

  /**
   * Wait until the space data pipeline is fully initialized.
   * Used by invitation handler.
   * TODO(dmaretskyi): Consider removing.
   */
  async waitUntilDataPipelineInitialized(spaceKey: PublicKey) {
    await cancelWithContext(this._ctx, this.updated.waitForCondition(() => {
      const space = this._spaces.get(spaceKey);
      return !!space && space.isOpen && space.dataPipelineController.isOpen;
    }));
  }

  private async _constructSpace(metadata: SpaceMetadata) {
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
      snapshotId: metadata.snapshot
    });

    await dataSpace.open();
    this._spaces.set(metadata.key, dataSpace);
    return dataSpace;
  }
}
