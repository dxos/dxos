//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event, synchronized, trackLeaks } from '@dxos/async';
import { Context } from '@dxos/context';
import {
  DataServiceSubscriptions,
  MetadataStore,
  SigningContext,
  SnapshotStore,
  Space,
  spaceGenesis,
  SpaceManager,
  SnapshotManager
} from '@dxos/echo-db';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { Presence } from '@dxos/teleport-extension-presence';
import { ComplexMap, deferFunction } from '@dxos/util';

import { createAuthProvider } from '../identity';
import { DataSpace } from './data-space';

const DATA_PIPELINE_READY_TIMEOUT = 3_000;

export type AcceptSpaceOptions = {
  spaceKey: PublicKey;
  dataFeedKey: PublicKey;
}

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
      await space.initializeDataPipeline();
      if (spaceMetadata.dataTimeframe) {
        log('waiting for latest timeframe', { spaceMetadata });
        await space.dataPipelineController.pipelineState!.setTargetTimeframe(spaceMetadata.dataTimeframe);
      }
      await space.dataPipelineController.pipelineState!.waitUntilReachedTargetTimeframe({
        timeout: DATA_PIPELINE_READY_TIMEOUT
      });
      this._dataServiceSubscriptions.registerSpace(space.key, space.database.createDataServiceHost());
    }
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

    await spaceGenesis(this._keyring, this._signingContext, space.inner);
    await this._metadataStore.addSpace(metadata);
    await space.initializeDataPipeline();
    this._dataServiceSubscriptions.registerSpace(space.key, space.database.createDataServiceHost());

    this.updated.emit();
    return space;
  }

  // TODO(burdon): Rename join space.
  @synchronized
  async acceptSpace(opts: AcceptSpaceOptions): Promise<DataSpace> {
    assert(!this._spaces.has(opts.spaceKey), 'Space already exists.');

    const metadata: SpaceMetadata = {
      key: opts.spaceKey,
      dataFeedKey: opts.dataFeedKey
    };

    const space = await this._constructSpace(metadata);
    await this._metadataStore.addSpace(metadata);
    await space.initializeDataPipeline();
    this._dataServiceSubscriptions.registerSpace(space.key, space.database.createDataServiceHost());

    this.updated.emit();
    return space;
  }

  private async _constructSpace(metadata: SpaceMetadata) {
    const presence = new Presence({
      localPeerId: this._signingContext.deviceKey,
      announceInterval: 1_000,
      offlineTimeout: 30_000,
      identityKey: this._signingContext.identityKey
    });
    const snapshotManager = new SnapshotManager(this._snapshotStore);

    const space: Space = await this._spaceManager.constructSpace({
      metadata,
      swarmIdentity: {
        peerKey: this._signingContext.deviceKey,
        credentialProvider: createAuthProvider(this._signingContext.credentialSigner),
        credentialAuthenticator: deferFunction(() => dataSpace.authVerifier.verifier)
      },
      onNetworkConnection: (session) => {
        session.addExtension(
          'dxos.mesh.teleport.presence',
          presence.createExtension({ remotePeerId: session.remotePeerId })
        );
        session.addExtension('dxos.mesh.teleport.objectsync', snapshotManager.objectSync.createExtension());
        session.addExtension('dxos.mesh.teleport.notarization', dataSpace.notarizationPlugin.createExtension());
      }
    });

    const dataSpace = new DataSpace({
      inner: space,
      modelFactory: this._modelFactory,
      metadataStore: this._metadataStore,
      snapshotManager,
      presence,
      memberKey: this._signingContext.identityKey,
      keyring: this._keyring,
      signingContext: this._signingContext,
      snapshotId: metadata.snapshot
    });

    await dataSpace.open();
    this._spaces.set(metadata.key, dataSpace);
    return dataSpace;
  }
}
