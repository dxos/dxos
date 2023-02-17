//
// Copyright 2022 DXOS.org
//

import { DocumentModel } from '@dxos/document-model';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { WebsocketSignalManager, MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { createWebRTCTransportFactory, MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { createStorage, Storage, StorageType } from '@dxos/random-access-storage';
import { Presence } from '@dxos/teleport-extension-presence';
import { ComplexMap } from '@dxos/util';

import { SnapshotStore } from '@dxos/echo-db';
import { SnapshotManager } from '@dxos/echo-db';
import { MetadataStore } from '../metadata';
import { MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER, Space, SpaceManager, SpaceProtocol } from '../space';
import { DataPipelineControllerImpl } from '../space/data-pipeline-controller';
import { TestFeedBuilder } from './test-feed-builder';

export type NetworkManagerProvider = () => NetworkManager;

export const MemoryNetworkManagerProvider =
  (signalContext: MemorySignalManagerContext): NetworkManagerProvider =>
  () =>
    new NetworkManager({
      signalManager: new MemorySignalManager(signalContext),
      transportFactory: MemoryTransportFactory
    });

export const WebsocketNetworkManagerProvider =
  (signalUrl: string): NetworkManagerProvider =>
  () =>
    new NetworkManager({
      signalManager: new WebsocketSignalManager([signalUrl]),
      transportFactory: createWebRTCTransportFactory()
    });

export type TestAgentBuilderOptions = {
  storage?: Storage;
  networkManagerProvider?: NetworkManagerProvider;
};

/**
 * Factory for test agents.
 */
export class TestAgentBuilder {
  private readonly _agents = new ComplexMap<PublicKey, TestAgent>(PublicKey.hash);
  private readonly _storage: Storage;
  private readonly _networkManagerProvider: NetworkManagerProvider;

  constructor({ storage, networkManagerProvider }: TestAgentBuilderOptions = {}) {
    this._storage = storage ?? createStorage({ type: StorageType.RAM });
    this._networkManagerProvider =
      networkManagerProvider ?? MemoryNetworkManagerProvider(new MemorySignalManagerContext());
  }

  async close() {
    return Promise.all(this.agents.map((agent) => agent.close()));
  }

  get agents() {
    return Array.from(this._agents.values());
  }

  getAgent(deviceKey: PublicKey) {
    return this._agents.get(deviceKey);
  }

  async createPeer(): Promise<TestAgent> {
    // prettier-ignore
    const feedBuilder = new TestFeedBuilder()
      .setStorage(this._storage, `agent-${this._agents.size}`);

    const identityKey = await feedBuilder.keyring.createKey();
    const deviceKey = await feedBuilder.keyring.createKey();

    const agent = new TestAgent(this._networkManagerProvider, feedBuilder, identityKey, deviceKey);
    this._agents.set(deviceKey, agent);
    return agent;
  }
}

/**
 * Test agent that enables the creation and replication of multiple spaces.
 */
export class TestAgent {
  private readonly _spaces = new ComplexMap<PublicKey, Space>(PublicKey.hash);

  public readonly keyring: Keyring;
  public readonly feedStore: FeedStore<FeedMessage>;

  constructor(
    private readonly _networkManagerProvider: NetworkManagerProvider,
    private readonly _feedBuilder: TestFeedBuilder,
    public readonly identityKey: PublicKey,
    public readonly deviceKey: PublicKey
  ) {
    this.keyring = this._feedBuilder.keyring;
    this.feedStore = this._feedBuilder.createFeedStore();
  }

  async close() {
    return Promise.all([...this.spaces.map((space) => space.close())]);
  }

  get spaces() {
    return Array.from(this._spaces.values());
  }

  getSpace(spaceKey: PublicKey) {
    return this._spaces.get(spaceKey);
  }

  createSpaceManager() {
    return new SpaceManager({
      feedStore: this._feedBuilder.createFeedStore(),
      networkManager: this._networkManagerProvider()
    });
  }

  async createSpace(
    identityKey: PublicKey = this.identityKey,
    spaceKey?: PublicKey,
    genesisKey?: PublicKey
  ): Promise<[Space, DataPipelineControllerImpl]> {
    if (!spaceKey) {
      spaceKey = await this.keyring.createKey();
    }

    const dataFeedKey = await this.keyring.createKey();
    const dataFeed = await this.feedStore.openFeed(dataFeedKey, { writable: true });

    const controlFeedKey = await this.keyring.createKey();
    const controlFeed = await this.feedStore.openFeed(controlFeedKey, { writable: true });
    const genesisFeed = genesisKey ? await this.feedStore.openFeed(genesisKey) : controlFeed;
    const snapshotManager = new SnapshotManager(new SnapshotStore(createStorage().createDirectory('snapshots')));

    const metadataStore = new MetadataStore(createStorage().createDirectory('metadata'));
    await metadataStore.addSpace({ key: spaceKey });
    const dataPipelineController: DataPipelineControllerImpl = new DataPipelineControllerImpl({
      modelFactory: new ModelFactory().registerModel(DocumentModel),
      metadataStore,
      snapshotManager,
      memberKey: identityKey,
      spaceKey,
      feedInfoProvider: (feedKey) => space.spaceState.feeds.get(feedKey),
      snapshotId: undefined
    });
    const space = new Space({
      spaceKey,
      protocol: this.createSpaceProtocol(spaceKey),
      genesisFeed,
      feedProvider: (feedKey) => this.feedStore.openFeed(feedKey)
    })
      .setControlFeed(controlFeed)
      .setDataFeed(dataFeed);
    await space.open();
    await space.initDataPipeline(dataPipelineController);

    this._spaces.set(spaceKey, space);
    return [space, dataPipelineController];
  }

  createSpaceProtocol(topic: PublicKey, presence?: Presence) {
    return new SpaceProtocol({
      topic,
      swarmIdentity: {
        peerKey: this.deviceKey,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      },
      networkManager: this._networkManagerProvider(),
      onSessionAuth: (session) => {
        session.addExtension(
          'dxos.mesh.teleport.presence',
          (presence ?? this.createPresence()).createExtension({ remotePeerId: session.remotePeerId })
        );
      }
    });
  }

  createPresence() {
    return new Presence({
      localPeerId: this.deviceKey,
      announceInterval: 30,
      offlineTimeout: 200,
      identityKey: this.identityKey
    });
  }
}
