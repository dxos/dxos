//
// Copyright 2022 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { type Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { CredentialGenerator, createCredentialSignerWithChain } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { EchoHost, MeshEchoReplicator, SpaceManager, valueEncoding } from '@dxos/echo-pipeline';
import { SqliteMetadataStore } from '@dxos/echo-pipeline';
import { RuntimeProvider } from '@dxos/effect';
import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { SqliteKeyring } from '@dxos/keyring';
import { MemorySignalManager, MemorySignalManagerContext, type SignalManager } from '@dxos/messaging';
import { MemoryTransportFactory, SwarmNetworkManager } from '@dxos/network-manager';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { StorageType } from '@dxos/random-access-storage';
import { layerMemory as sqliteLayerMemory } from '@dxos/sql-sqlite/platform';
import * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';
import { SqliteBlobStore } from '@dxos/teleport-extension-object-sync';

import { InvitationsHandler, InvitationsManager, SpaceInvitationProtocol } from '../invitations';
import { ClientServicesHost, ServiceContext, type ServiceContextRuntimeProps } from '../services';
import { SqliteStorage } from '../services/sqlite-storage';
import { DataSpaceManager, type DataSpaceManagerRuntimeProps, type SigningContext } from '../spaces';

//
// TODO(burdon): Replace with test builder.
//

export const createServiceHost = (config: Config, signalManagerContext: MemorySignalManagerContext) => {
  return new ClientServicesHost({
    config,
    signalManager: new MemorySignalManager(signalManagerContext),
    transportFactory: MemoryTransportFactory,
    runtime: ManagedRuntime.make(
      SqlTransaction.layer
        .pipe(Layer.provideMerge(sqliteLayerMemory), Layer.provideMerge(Reactivity.layer))
        .pipe(Layer.orDie),
    ).runtimeEffect,
  });
};

export const createServiceContext = async ({
  signalManagerFactory = async () => {
    const signalContext = new MemorySignalManagerContext();
    return new MemorySignalManager(signalContext);
  },
  runtimeProps,
}: {
  signalManagerFactory?: () => Promise<SignalManager>;
  runtimeProps?: ServiceContextRuntimeProps;
} = {}) => {
  const signalManager = await signalManagerFactory();
  const networkManager = new SwarmNetworkManager({
    signalManager,
    transportFactory: MemoryTransportFactory,
  });

  const runtime = ManagedRuntime.make(
    SqlTransaction.layer
      .pipe(Layer.provideMerge(sqliteLayerMemory), Layer.provideMerge(Reactivity.layer))
      .pipe(Layer.orDie),
  ).runtimeEffect;

  return new ServiceContext(networkManager, signalManager, undefined, undefined, runtime, {
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
  feedStore?: FeedStore<any>;
  metadataStore?: SqliteMetadataStore;
  keyring?: SqliteKeyring;
  networkManager?: SwarmNetworkManager;
  spaceManager?: SpaceManager;
  dataSpaceManager?: DataSpaceManager;
  signingContext?: SigningContext;
  blobStore?: SqliteBlobStore;
  echoHost?: EchoHost;
  meshEchoReplicator?: MeshEchoReplicator;
  invitationsManager?: InvitationsManager;
};

export class TestPeer {
  private _props: TestPeerProps = {};
  private readonly _runtime = ManagedRuntime.make(
    SqlTransaction.layer
      .pipe(Layer.provideMerge(sqliteLayerMemory), Layer.provideMerge(Reactivity.layer))
      .pipe(Layer.orDie),
  );
  private readonly _feedStorage = new SqliteStorage({ runtime: this._runtime.runtimeEffect });

  constructor(
    private readonly _signalContext: MemorySignalManagerContext,
    private readonly _opts: TestPeerOpts = { dataStore: StorageType.RAM },
  ) {}

  get props() {
    return this._props;
  }

  get keyring() {
    return (this._props.keyring ??= new SqliteKeyring({ runtime: this._runtime.runtimeEffect }));
  }

  get feedStore() {
    return (this._props.feedStore ??= new FeedStore({
      factory: new FeedFactory({
        root: this._feedStorage.createDirectory('feeds'),
        signer: this.keyring,
        hypercore: {
          valueEncoding,
        },
      }),
    }));
  }

  get metadataStore() {
    return (this._props.metadataStore ??= new SqliteMetadataStore({ runtime: this._runtime.runtimeEffect }));
  }

  get blobStore() {
    return (this._props.blobStore ??= new SqliteBlobStore({ runtime: this._runtime.runtimeEffect }));
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
    await this.migrate();
    this._props.signingContext ??= await createSigningContext(this.keyring);
    this.networkManager.setPeerInfo({
      identityKey: this._props.signingContext.identityKey.toHex(),
      peerKey: this._props.signingContext.deviceKey.toHex(),
    });
  }

  async migrate(): Promise<void> {
    await RuntimeProvider.runPromise(this._runtime.runtimeEffect)(
      Effect.all([
        this.metadataStore.migrate,
        this.blobStore.migrate,
        this.keyring.migrate,
        this._feedStorage.migrate,
      ]),
    );
  }

  async destroy(): Promise<void> {
    await this._runtime.dispose();
  }
}

export const createSigningContext = async (keyring: SqliteKeyring): Promise<SigningContext> => {
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
