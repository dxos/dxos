//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { createCredentialSignerWithChain, CredentialGenerator } from '@dxos/credentials';
import {
  SnapshotStore,
  DataPipelineControllerImpl,
  MetadataStore,
  SigningContext,
  SpaceManager,
  valueEncoding
} from '@dxos/echo-pipeline';
import { testLocalDatabase } from '@dxos/echo-pipeline/testing';
import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { createStorage, Storage, StorageType } from '@dxos/random-access-storage';

import { createDefaultModelFactory, ClientServicesHost, ServiceContext } from '../services';

//
// TODO(burdon): Replace with test builder.
//

export const createServiceHost = (config: Config, signalManagerContext: MemorySignalManagerContext) => {
  const networkManager = new NetworkManager({
    signalManager: new MemorySignalManager(signalManagerContext),
    transportFactory: MemoryTransportFactory
  });

  return new ClientServicesHost({
    config,
    networkManager
  });
};

export const createServiceContext = ({
  signalContext = new MemorySignalManagerContext(),
  storage = createStorage({ type: StorageType.RAM })
}: {
  signalContext?: MemorySignalManagerContext;
  storage?: Storage;
} = {}) => {
  const networkManager = new NetworkManager({
    signalManager: new MemorySignalManager(signalContext),
    transportFactory: MemoryTransportFactory
  });

  const modelFactory = createDefaultModelFactory();
  return new ServiceContext(storage, networkManager, modelFactory);
};

export const createPeers = async (numPeers: number) => {
  const signalContext = new MemorySignalManagerContext();

  return await Promise.all(
    Array.from(Array(numPeers)).map(async () => {
      const peer = createServiceContext({ signalContext });
      await peer.open();
      return peer;
    })
  );
};

export const createIdentity = async (peer: ServiceContext) => {
  await peer.createIdentity();
  return peer;
};

// TODO(burdon): Remove @dxos/client-testing.
// TODO(burdon): Create builder and make configurable.
export const syncItems = async (db1: DataPipelineControllerImpl, db2: DataPipelineControllerImpl) => {
  await testLocalDatabase(db1, db2);
  await testLocalDatabase(db2, db1);
};

export class TestBuilder {
  public readonly signalContext = new MemorySignalManagerContext();

  createPeer(): TestPeer {
    return new TestPeer(this.signalContext);
  }
}

export type TestPeerProps = {
  storage?: Storage;
  feedStore?: FeedStore<any>;
  metadataStore?: MetadataStore;
  keyring?: Keyring;
  networkManager?: NetworkManager;
  spaceManager?: SpaceManager;
  snapshotStore?: SnapshotStore;
};

export class TestPeer {
  private _props: TestPeerProps = {};

  constructor(private readonly signalContext: MemorySignalManagerContext) {}

  get storage() {
    return (this._props.storage ??= createStorage({ type: StorageType.RAM }));
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
          valueEncoding
        }
      })
    }));
  }

  get metadataStore() {
    return (this._props.metadataStore ??= new MetadataStore(this.storage.createDirectory('metadata')));
  }

  get snapshotStore() {
    return (this._props.snapshotStore ??= new SnapshotStore(this.storage.createDirectory('snapshots')));
  }

  get networkManager() {
    return (this._props.networkManager ??= new NetworkManager({
      signalManager: new MemorySignalManager(this.signalContext),
      transportFactory: MemoryTransportFactory
    }));
  }

  get spaceManager() {
    return (this._props.spaceManager ??= new SpaceManager({
      feedStore: this.feedStore,
      networkManager: this.networkManager
    }));
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
        credential: await new CredentialGenerator(keyring, identityKey, deviceKey).createDeviceAuthorization(deviceKey)
      },
      deviceKey
    ),
    recordCredential: async () => {} // No-op.
  };
};
