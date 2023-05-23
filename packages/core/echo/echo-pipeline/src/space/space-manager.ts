//
// Copyright 2022 DXOS.org
//

import { synchronized, trackLeaks } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { FeedStore } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { trace } from '@dxos/protocols';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { Teleport } from '@dxos/teleport';
import { ComplexMap } from '@dxos/util';

import { SnapshotManager, SnapshotStore } from '../dbhost';
import { MetadataStore } from '../metadata';
import { Space } from './space';
import { SpaceProtocol, SwarmIdentity } from './space-protocol';

export type SpaceManagerParams = {
  feedStore: FeedStore<FeedMessage>;
  networkManager: NetworkManager;
  modelFactory: ModelFactory;
  metadataStore: MetadataStore;
  snapshotStore: SnapshotStore;
};

export type ConstructSpaceParams = {
  metadata: SpaceMetadata;
  swarmIdentity: SwarmIdentity;
  memberKey: PublicKey;
  onNetworkConnection: (session: Teleport) => void;
};

/**
 * Manages a collection of ECHO (Data) Spaces.
 */
@trackLeaks('open', 'close')
export class SpaceManager {
  private readonly _spaces = new ComplexMap<PublicKey, Space>(PublicKey.hash);
  private readonly _feedStore: FeedStore<FeedMessage>;
  private readonly _networkManager: NetworkManager;
  private readonly _modelFactory: ModelFactory;
  private readonly _metadataStore: MetadataStore;
  private readonly _snapshotStore: SnapshotStore;
  private readonly _instanceId = PublicKey.random().toHex();

  constructor({ feedStore, networkManager, modelFactory, metadataStore, snapshotStore }: SpaceManagerParams) {
    // TODO(burdon): Assert.
    this._feedStore = feedStore;
    this._networkManager = networkManager;
    this._modelFactory = modelFactory;
    this._metadataStore = metadataStore;
    this._snapshotStore = snapshotStore;
  }

  // TODO(burdon): Remove.
  get spaces() {
    return this._spaces;
  }

  @synchronized
  async open() {}

  @synchronized
  async close() {
    await Promise.all([...this._spaces.values()].map((space) => space.close()));
  }

  async constructSpace({ metadata, swarmIdentity, onNetworkConnection, memberKey }: ConstructSpaceParams) {
    log.trace('dxos.echo.space-manager.construct-space', trace.begin({ id: this._instanceId }));
    log('constructing space...', { spaceKey: metadata.genesisFeedKey });

    // The genesis feed will be the same as the control feed if the space was created by the local agent.
    const genesisFeed = await this._feedStore.openFeed(metadata.genesisFeedKey ?? failUndefined());

    const spaceKey = metadata.key;
    const protocol = new SpaceProtocol({
      topic: spaceKey,
      swarmIdentity,
      networkManager: this._networkManager,
      onSessionAuth: onNetworkConnection,
    });
    const snapshotManager = new SnapshotManager(this._snapshotStore);

    const space = new Space({
      spaceKey,
      protocol,
      genesisFeed,
      feedProvider: (feedKey) => this._feedStore.openFeed(feedKey),
      modelFactory: this._modelFactory,
      metadataStore: this._metadataStore,
      snapshotManager,
      memberKey,
    });
    this._spaces.set(space.key, space);
    log.trace('dxos.echo.space-manager.construct-space', trace.end({ id: this._instanceId }));
    return space;
  }
}
