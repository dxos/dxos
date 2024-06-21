//
// Copyright 2022 DXOS.org
//

import { Context } from '@dxos/context';
import { CredentialGenerator } from '@dxos/credentials';
import { type FeedStore } from '@dxos/feed-store';
import { type Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { MemoryTransportFactory, SwarmNetworkManager, createSimplePeerTransportFactory } from '@dxos/network-manager';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { AdmittedFeed } from '@dxos/protocols/proto/dxos/halo/credentials';
import { StorageType, createStorage, type Storage } from '@dxos/random-access-storage';
import { Gossip, Presence } from '@dxos/teleport-extension-gossip';
import { BlobStore } from '@dxos/teleport-extension-object-sync';
import { ComplexMap } from '@dxos/util';

import { TestFeedBuilder } from './test-feed-builder';
import { SnapshotStore } from '../db-host';
import { MetadataStore } from '../metadata';
import { MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER, SpaceManager, SpaceProtocol, type Space } from '../space';

export type NetworkManagerProvider = () => SwarmNetworkManager;

export const MemoryNetworkManagerProvider =
  (signalContext: MemorySignalManagerContext): NetworkManagerProvider =>
  () =>
    new SwarmNetworkManager({
      signalManager: new MemorySignalManager(signalContext),
      transportFactory: MemoryTransportFactory,
    });

export const WebsocketNetworkManagerProvider =
  (signalUrl: string): NetworkManagerProvider =>
  () =>
    new SwarmNetworkManager({
      signalManager: new WebsocketSignalManager([{ server: signalUrl }]),
      transportFactory: createSimplePeerTransportFactory(),
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

  public readonly storage: Storage;
  public readonly keyring: Keyring;
  public readonly feedStore: FeedStore<FeedMessage>;

  private _metadataStore?: MetadataStore;
  get metadataStore() {
    return (this._metadataStore ??= new MetadataStore(this.storage.createDirectory('metadata')));
  }

  private _snapshotStore?: SnapshotStore;
  get snapshotStore() {
    return (this._snapshotStore ??= new SnapshotStore(this.storage.createDirectory('snapshots')));
  }

  private _blobStore?: BlobStore;
  get blobStore() {
    return (this._blobStore ??= new BlobStore(this.storage.createDirectory('blobs')));
  }

  constructor(
    private readonly _networkManagerProvider: NetworkManagerProvider,
    private readonly _feedBuilder: TestFeedBuilder,
    public readonly identityKey: PublicKey,
    public readonly deviceKey: PublicKey,
  ) {
    this.storage = this._feedBuilder.storage;
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

  private _spaceManager?: SpaceManager;
  get spaceManager() {
    return (this._spaceManager ??= new SpaceManager({
      feedStore: this.feedStore,
      networkManager: this._networkManagerProvider(),
      metadataStore: this.metadataStore,
      snapshotStore: this.snapshotStore,
      blobStore: this.blobStore,
    }));
  }

  async createSpace(
    identityKey: PublicKey = this.identityKey,
    spaceKey?: PublicKey,
    genesisKey?: PublicKey,
    dataKey?: PublicKey,
    saveMetadata = false,
  ): Promise<Space> {
    if (!spaceKey) {
      saveMetadata = true;
      spaceKey = await this.keyring.createKey();
    }
    if (!genesisKey) {
      genesisKey = await this.keyring.createKey();
    }

    const controlFeed = await this.feedStore.openFeed(genesisKey, { writable: true });
    const dataFeed = await this.feedStore.openFeed(dataKey ?? (await this.keyring.createKey()), {
      writable: true,
      sparse: true,
    });

    const metadata: SpaceMetadata = {
      key: spaceKey,
      genesisFeedKey: genesisKey,
      controlFeedKey: controlFeed.key,
      dataFeedKey: dataFeed.key,
    };
    if (saveMetadata) {
      await this.metadataStore.addSpace(metadata);
    }

    await this.spaceManager.open();
    const space = await this.spaceManager.constructSpace({
      metadata,
      swarmIdentity: {
        peerKey: this.deviceKey,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER,
      },
      memberKey: identityKey,
      onAuthorizedConnection: (session) => {
        session.addExtension(
          'dxos.mesh.teleport.gossip',
          this.createGossip().createExtension({ remotePeerId: session.remotePeerId }),
        );
      },
      onDelegatedInvitationStatusChange: async () => {},
      onMemberRolesChanged: async () => {},
    });
    await space.setControlFeed(controlFeed);
    await space.setDataFeed(dataFeed);

    await space.open(new Context());

    this._spaces.set(spaceKey, space);
    return space;
  }

  createSpaceProtocol(topic: PublicKey, gossip?: Gossip) {
    return new SpaceProtocol({
      topic,
      swarmIdentity: {
        peerKey: this.deviceKey,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER,
      },
      networkManager: this._networkManagerProvider(),
      blobStore: this.blobStore,
      onSessionAuth: (session) => {
        session.addExtension(
          'dxos.mesh.teleport.gossip',
          (gossip ?? this.createGossip()).createExtension({ remotePeerId: session.remotePeerId }),
        );
      },
    });
  }

  createGossip() {
    return new Gossip({
      localPeerId: this.deviceKey,
    });
  }

  createPresence(gossip?: Gossip) {
    return new Presence({
      announceInterval: 30,
      offlineTimeout: 200,
      identityKey: this.identityKey,
      gossip: gossip ?? this.createGossip(),
    });
  }

  async spaceGenesis(space: Space) {
    const generator = new CredentialGenerator(this.keyring, this.identityKey, this.deviceKey);
    const credentials = [
      ...(await generator.createSpaceGenesis(space.key, space.controlFeedKey!)),
      await generator.createFeedAdmission(space.key, space.dataFeedKey!, AdmittedFeed.Designation.DATA),
      await generator.createEpochCredential(space.key),
    ];

    for (const credential of credentials) {
      await space.controlPipeline.writer.write({
        credential: { credential },
      });
    }
  }
}
