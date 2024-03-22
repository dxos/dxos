//
// Copyright 2022 DXOS.org
//

import { type Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { createCredentialSignerWithChain, CredentialGenerator } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { AutomergeHost, MetadataStore, SnapshotStore, SpaceManager, valueEncoding } from '@dxos/echo-pipeline';
import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { createStorage, StorageType, type Storage } from '@dxos/random-access-storage';
import { BlobStore } from '@dxos/teleport-extension-object-sync';

import { ClientServicesHost, ServiceContext } from '../services';
import { DataSpaceManager, type SigningContext } from '../spaces';

//
// TODO(burdon): Replace with test builder.
//

export const createServiceHost = (config: Config, signalManagerContext: MemorySignalManagerContext) => {
  return new ClientServicesHost({
    config,
    signalManager: new MemorySignalManager(signalManagerContext),
    transportFactory: MemoryTransportFactory,
  });
};

export const createServiceContext = ({
  signalContext = new MemorySignalManagerContext(),
  storage = createStorage({ type: StorageType.RAM }),
}: {
  signalContext?: MemorySignalManagerContext;
  storage?: Storage;
} = {}) => {
  const signalManager = new MemorySignalManager(signalContext);
  const networkManager = new NetworkManager({
    signalManager,
    transportFactory: MemoryTransportFactory,
  });

  return new ServiceContext(storage, networkManager, signalManager);
};

export const createPeers = async (numPeers: number) => {
  const signalContext = new MemorySignalManagerContext();

  return await Promise.all(
    Array.from(Array(numPeers)).map(async () => {
      const peer = createServiceContext({ signalContext });
      await peer.open(new Context());
      return peer;
    }),
  );
};

export const createIdentity = async (peer: ServiceContext) => {
  await peer.createIdentity();
  return peer;
};

export class TestBuilder {
  public readonly signalContext = new MemorySignalManagerContext();
  private readonly _ctx = new Context();

  createPeer(peerOptions?: TestPeerOpts): TestPeer {
    const peer = new TestPeer(this.signalContext, peerOptions);
    this._ctx.onDispose(async () => peer.destroy());
    return peer;
  }

  async destroy() {
    await this._ctx.dispose();
  }
}

export type TestPeerOpts = {
  dataStore?: StorageType;
};

export type TestPeerProps = {
  storage?: Storage;
  feedStore?: FeedStore<any>;
  metadataStore?: MetadataStore;
  keyring?: Keyring;
  networkManager?: NetworkManager;
  spaceManager?: SpaceManager;
  dataSpaceManager?: DataSpaceManager;
  snapshotStore?: SnapshotStore;
  signingContext?: SigningContext;
  blobStore?: BlobStore;
  automergeHost?: AutomergeHost;
};

export class TestPeer {
  private _props: TestPeerProps = {};

  constructor(
    private readonly signalContext: MemorySignalManagerContext,
    private readonly opts: TestPeerOpts = { dataStore: StorageType.RAM },
  ) {}

  get props() {
    return this._props;
  }

  get storage() {
    return (this._props.storage ??= createStorage({ type: this.opts.dataStore }));
  }

  get keyring() {
    return (this._props.keyring ??= new Keyring(this.storage.createDirectory('keyring')));
  }

  get feedStore() {
    return (this._props.feedStore ??= new FeedStore({
      factory: new FeedFactory({
        root: this.storage.createDirectory('feeds'),
        signer: this.keyring,
        hypercore: {
          valueEncoding,
        },
      }),
    }));
  }

  get metadataStore() {
    return (this._props.metadataStore ??= new MetadataStore(this.storage.createDirectory('metadata')));
  }

  get blobStore() {
    return (this._props.blobStore ??= new BlobStore(this.storage.createDirectory('blobs')));
  }

  get snapshotStore() {
    return (this._props.snapshotStore ??= new SnapshotStore(this.storage.createDirectory('snapshots')));
  }

  get networkManager() {
    return (this._props.networkManager ??= new NetworkManager({
      signalManager: new MemorySignalManager(this.signalContext),
      transportFactory: MemoryTransportFactory,
    }));
  }

  get spaceManager() {
    return (this._props.spaceManager ??= new SpaceManager({
      feedStore: this.feedStore,
      networkManager: this.networkManager,
      metadataStore: this.metadataStore,
      snapshotStore: this.snapshotStore,
      blobStore: this.blobStore,
    }));
  }

  get identity() {
    return this._props.signingContext ?? failUndefined();
  }

  get automergeHost() {
    return (this._props.automergeHost ??= new AutomergeHost({ directory: this.storage.createDirectory('automerge') }));
  }

  get dataSpaceManager() {
    return (this._props.dataSpaceManager ??= new DataSpaceManager(
      this.spaceManager,
      this.metadataStore,
      this.keyring,
      this.identity,
      this.feedStore,
      this.automergeHost,
    ));
  }

  async createIdentity() {
    this._props.signingContext ??= await createSigningContext(this.keyring);
  }

  async destroy() {
    await this.storage.reset();
  }
}

export const createSigningContext = async (keyring: Keyring): Promise<SigningContext> => {
  const identityKey = await keyring.createKey();
  const deviceKey = await keyring.createKey();

  return {
    identityKey,
    deviceKey,
    credentialSigner: createCredentialSignerWithChain(
      keyring,
      {
        credential: await new CredentialGenerator(keyring, identityKey, deviceKey).createDeviceAuthorization(deviceKey),
      },
      deviceKey,
    ),
    recordCredential: async () => {}, // No-op.
    getProfile: () => undefined,
  };
};
