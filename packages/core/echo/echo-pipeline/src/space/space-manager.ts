//
// Copyright 2022 DXOS.org
//

import { synchronized, trackLeaks } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { type FeedStore } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type ModelFactory } from '@dxos/model-factory';
import { type NetworkManager } from '@dxos/network-manager';
import { trace } from '@dxos/protocols';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { type Teleport } from '@dxos/teleport';
import { type BlobStore } from '@dxos/teleport-extension-object-sync';
import { ComplexMap } from '@dxos/util';

import { Space } from './space';
import { SpaceProtocol, type SwarmIdentity } from './space-protocol';
import { SnapshotManager, type SnapshotStore } from '../db-host';
import { type MetadataStore } from '../metadata';

export type SpaceManagerParams = {
  feedStore: FeedStore<FeedMessage>;
  networkManager: NetworkManager;
  modelFactory: ModelFactory;
  metadataStore: MetadataStore;

  /**
   * @deprecated Replaced by BlobStore.
   */
  snapshotStore: SnapshotStore;

  blobStore: BlobStore;
};

export type ConstructSpaceParams = {
  metadata: SpaceMetadata;
  swarmIdentity: SwarmIdentity;
  memberKey: PublicKey;
  /**
   * Called when connection auth passed successful.
   */
  onAuthorizedConnection: (session: Teleport) => void;
  onAuthFailure?: (session: Teleport) => void;
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
  private readonly _blobStore: BlobStore;
  private readonly _instanceId = PublicKey.random().toHex();

  constructor({
    feedStore,
    networkManager,
    modelFactory,
    metadataStore,
    snapshotStore,
    blobStore,
  }: SpaceManagerParams) {
    // TODO(burdon): Assert.
    this._feedStore = feedStore;
    this._networkManager = networkManager;
    this._modelFactory = modelFactory;
    this._metadataStore = metadataStore;
    this._snapshotStore = snapshotStore;
    this._blobStore = blobStore;
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

  async constructSpace({
    metadata,
    swarmIdentity,
    onAuthorizedConnection,
    onAuthFailure,
    memberKey,
  }: ConstructSpaceParams) {
    log.trace('dxos.echo.space-manager.construct-space', trace.begin({ id: this._instanceId }));
    log('constructing space...', { spaceKey: metadata.genesisFeedKey });

    // The genesis feed will be the same as the control feed if the space was created by the local agent.
    const genesisFeed = await this._feedStore.openFeed(metadata.genesisFeedKey ?? failUndefined());

    const spaceKey = metadata.key;
    const protocol = new SpaceProtocol({
      topic: spaceKey,
      swarmIdentity,
      networkManager: this._networkManager,
      onSessionAuth: onAuthorizedConnection,
      onAuthFailure,
      blobStore: this._blobStore,
    });
    const snapshotManager = new SnapshotManager(this._snapshotStore, this._blobStore, protocol.blobSync);

    const space = new Space({
      spaceKey,
      protocol,
      genesisFeed,
      feedProvider: (feedKey, opts) => this._feedStore.openFeed(feedKey, opts),
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
