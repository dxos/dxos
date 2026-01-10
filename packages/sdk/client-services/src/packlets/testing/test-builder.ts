//
// Copyright 2022 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { type Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { CredentialGenerator, createCredentialSignerWithChain } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { EchoHost, MeshEchoReplicator, MetadataStore, SpaceManager, valueEncoding } from '@dxos/echo-pipeline';
import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { type LevelDB } from '@dxos/kv-store';
import { createTestLevel } from '@dxos/kv-store/testing';
import { MemorySignalManager, MemorySignalManagerContext, type SignalManager } from '@dxos/messaging';
import { MemoryTransportFactory, SwarmNetworkManager } from '@dxos/network-manager';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type Storage, StorageType, createStorage } from '@dxos/random-access-storage';
import { BlobStore } from '@dxos/teleport-extension-object-sync';

import { InvitationsHandler, InvitationsManager, SpaceInvitationProtocol } from '../invitations';
import { ClientServicesHost, ServiceContext, type ServiceContextRuntimeProps } from '../services';
import { DataSpaceManager, type DataSpaceManagerRuntimeProps, type SigningContext } from '../spaces';

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

export const createServiceContext = async ({
  signalManagerFactory = async () => {
    const signalContext = new MemorySignalManagerContext();
    return new MemorySignalManager(signalContext);
  },
  storage = createStorage({ type: StorageType.RAM }),
  runtimeProps,
}: {
  signalManagerFactory?: () => Promise<SignalManager>;
  storage?: Storage;
  runtimeProps?: ServiceContextRuntimeProps;
} = {}) => {
  const signalManager = await signalManagerFactory();
  const networkManager = new SwarmNetworkManager({
    signalManager,
    transportFactory: MemoryTransportFactory,
  });
  const level = createTestLevel();
  await level.open();

  return new ServiceContext(storage, level, networkManager, signalManager, undefined, undefined, {
    invitationConnectionDefaultProps: { teleport: { controlHeartbeatInterval: 200 } },
    ...runtimeProps,
  });
};

export const createPeers = async (numPeers: number, signalManagerFactory?: () => Promise<SignalManager>) => {
  if (!signalManagerFactory) {
    const signalContext = new MemorySignalManagerContext();
    signalManagerFactory = async () => new MemorySignalManager(signalContext);
  }
  return await Promise.all(
    Array.from(Array(numPeers)).map(async () => {
      const peer = await createServiceContext({ signalManagerFactory });
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

  async destroy(): Promise<void> {
    await this._ctx.dispose();
  }
}

export type TestPeerOpts = {
  dataStore?: StorageType;
  dataSpaceProps?: DataSpaceManagerRuntimeProps;
};

export type TestPeerProps = {
  storage?: Storage;
  level?: LevelDB;
  feedStore?: FeedStore<any>;
  metadataStore?: MetadataStore;
  keyring?: Keyring;
  networkManager?: SwarmNetworkManager;
  spaceManager?: SpaceManager;
  dataSpaceManager?: DataSpaceManager;
  signingContext?: SigningContext;
  blobStore?: BlobStore;
  echoHost?: EchoHost;
  meshEchoReplicator?: MeshEchoReplicator;
  invitationsManager?: InvitationsManager;
};

export class TestPeer {
  private _props: TestPeerProps = {};
  private readonly _runtime = ManagedRuntime.make(
    Layer.merge(
      SqliteClient.layer({
        filename: ':memory:',
      }),
      Reactivity.layer,
    ).pipe(Layer.orDie),
  );

  constructor(
    private readonly _signalContext: MemorySignalManagerContext,
    private readonly _opts: TestPeerOpts = { dataStore: StorageType.RAM },
  ) {}

  get props() {
    return this._props;
  }

  get storage() {
    return (this._props.storage ??= createStorage({ type: this._opts.dataStore }));
  }

  get keyring() {
    return (this._props.keyring ??= new Keyring(this.storage.createDirectory('keyring')));
  }

  get level() {
    return (this._props.level ??= createTestLevel());
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

  get networkManager() {
    return (this._props.networkManager ??= new SwarmNetworkManager({
      signalManager: new MemorySignalManager(this._signalContext),
      transportFactory: MemoryTransportFactory,
    }));
  }

  get spaceManager() {
    return (this._props.spaceManager ??= new SpaceManager({
      feedStore: this.feedStore,
      networkManager: this.networkManager,
      metadataStore: this.metadataStore,
      blobStore: this.blobStore,
    }));
  }

  get identity() {
    return this._props.signingContext ?? failUndefined();
  }

  get echoHost() {
    return (this._props.echoHost ??= new EchoHost({
      kv: this.level,
      runtime: this._runtime.runtimeEffect,
    }));
  }

  get meshEchoReplicator() {
    return (this._props.meshEchoReplicator ??= new MeshEchoReplicator());
  }

  get dataSpaceManager(): DataSpaceManager {
    return (this._props.dataSpaceManager ??= new DataSpaceManager({
      spaceManager: this.spaceManager,
      metadataStore: this.metadataStore,
      keyring: this.keyring,
      signingContext: this.identity,
      feedStore: this.feedStore,
      echoHost: this.echoHost,
      invitationsManager: this.invitationsManager,
      edgeConnection: undefined,
      meshReplicator: this.meshEchoReplicator,
      echoEdgeReplicator: undefined,
      runtimeProps: this._opts.dataSpaceProps,
    }));
  }

  get invitationsManager() {
    return (this._props.invitationsManager ??= new InvitationsManager(
      new InvitationsHandler(this.networkManager),
      (invitation) => {
        if (invitation.kind === Invitation.Kind.SPACE) {
          return new SpaceInvitationProtocol(this.dataSpaceManager, this.identity!, this.keyring, invitation.spaceKey!);
        } else {
          throw new Error('not implemented');
        }
      },
      this.metadataStore,
    ));
  }

  async createIdentity(): Promise<void> {
    this._props.signingContext ??= await createSigningContext(this.keyring);
    this.networkManager.setPeerInfo({
      identityKey: this._props.signingContext.identityKey.toHex(),
      peerKey: this._props.signingContext.deviceKey.toHex(),
    });
  }

  async destroy(): Promise<void> {
    await this.level.close();
    await this.storage.reset();
    await this._runtime.dispose();
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
