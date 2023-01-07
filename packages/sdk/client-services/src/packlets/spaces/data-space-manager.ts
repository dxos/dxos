//
// Copyright 2022 DXOS.org
//

import { Event, synchronized } from '@dxos/async';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import {
  AcceptSpaceOptions,
  DataServiceSubscriptions,
  MetadataStore,
  SigningContext,
  SnapshotStore,
  Space,
  spaceGenesis,
  SpaceManager
} from '@dxos/echo-db';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { Presence } from '@dxos/teleport-extension-presence';
import { Timeframe } from '@dxos/timeframe';
import { ComplexMap } from '@dxos/util';

import { DataSpace } from './data-space';

/**
 * Number of mutations since the last snapshot before we automatically create another snapshot.
 */
const MESSAGES_PER_SNAPSHOT = 10;

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
      if (spaceMetadata.latestTimeframe) {
        log('waiting for latest timeframe', { spaceMetadata });
        await space.dataPipelineController.waitUntilTimeframe(spaceMetadata.latestTimeframe);
      }
    }
  }

  @synchronized
  async close() {
    await this._ctx.dispose();
    for (const space of this._spaces.values()) {
      await this._saveSnapshot(space);
      const latestTimeframe = space.dataPipelineController.pipelineState?.timeframe;
      if (latestTimeframe) {
        await this._metadataStore.setSpaceLatestTimeframe(space.key, latestTimeframe);
      }
    }
  }

  /**
   * Creates a new space writing the genesis credentials to the control feed.
   */
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

    this.updated.emit();
    return space;
  }

  // TODO(burdon): Rename join space.
  async acceptSpace(opts: AcceptSpaceOptions): Promise<DataSpace> {
    const metadata: SpaceMetadata = {
      key: opts.spaceKey,
      genesisFeedKey: opts.genesisFeedKey,
      controlFeedKey: opts.controlFeedKey,
      dataFeedKey: opts.dataFeedKey
    };

    const space = await this._constructSpace(metadata);
    await this._metadataStore.addSpace(metadata);
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
    const space: Space = await this._spaceManager.constructSpace({
      metadata,
      swarmIdentity: {
        peerKey: this._signingContext.deviceKey,
        credentialProvider: this._signingContext.credentialProvider,
        credentialAuthenticator: this._signingContext.credentialAuthenticator
      },
      dataPipelineControllerProvider: () => dataSpace.dataPipelineController,
      presence
    });
    let snapshot: SpaceSnapshot | undefined;
    if (metadata.snapshot) {
      snapshot = await this._snapshotStore.loadSnapshot(metadata.snapshot);
    }
    const dataSpace = new DataSpace({
      inner: space,
      modelFactory: this._modelFactory,
      memberKey: this._signingContext.identityKey,
      presence,
      snapshot
    });

    let lastSnapshotTimeframe: Timeframe = snapshot?.timeframe ?? new Timeframe();

    dataSpace.dataPipelineController.onTimeframeReached.debounce(1000).on(this._ctx, async () => {
      const latestTimeframe = dataSpace.dataPipelineController.pipelineState?.timeframe;
      if (!latestTimeframe) {
        return;
      }

      // Record last timeframe.
      if (latestTimeframe) {
        await this._metadataStore.setSpaceLatestTimeframe(metadata.key, latestTimeframe);
      }

      // Save snapshot.
      if (latestTimeframe.totalMessages() - lastSnapshotTimeframe.totalMessages() > MESSAGES_PER_SNAPSHOT) {
        const snapshot = await this._saveSnapshot(dataSpace);
        lastSnapshotTimeframe = snapshot.timeframe ?? failUndefined();
        log('save', { snapshot });
      }
    });

    await space.open();
    this._dataServiceSubscriptions.registerSpace(space.key, dataSpace.database.createDataServiceHost());
    this._spaces.set(metadata.key, dataSpace);
    return dataSpace;
  }

  private async _saveSnapshot(space: DataSpace) {
    const snapshot = await space.dataPipelineController.createSnapshot();
    const snapshotKey = await this._snapshotStore.saveSnapshot(snapshot);
    await this._metadataStore.setSpaceSnapshot(space.key, snapshotKey);
    return snapshot;
  }
}
