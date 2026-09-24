//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Scope from 'effect/Scope';
import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { type Trigger } from '@dxos/async';
import { type ClientServicesRpc, makeClientServicesRpcFromRouter } from '@dxos/client-protocol';
import { LayerStack } from '@dxos/compute-runtime';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { Config, ConfigService } from '@dxos/config';
import { Context } from '@dxos/context';
import { CredentialGenerator, createCredentialSignerWithChain } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { EchoHost, EchoHostService, MeshEchoReplicator } from '@dxos/echo-host';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { EffectEx, Hook, RuntimeProvider } from '@dxos/effect';
import { HypercoreFactory, HypercoreStore, HypercoreStoreService } from '@dxos/feed-store';
import { type KeyringApi, KeyringApiService, SqliteKeyring } from '@dxos/keyring';
import {
  MemorySignalManager,
  MemorySignalManagerContext,
  type SignalManager,
  SignalManagerService,
} from '@dxos/messaging';
import {
  MemoryTransportFactory,
  SwarmNetworkManager,
  SwarmNetworkManagerService,
  type TransportFactory,
} from '@dxos/network-manager';
import { toPublicKey } from '@dxos/protocols/buf';
import { Invitation_Kind } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { PeerSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { ChainSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { StorageType } from '@dxos/random-access-storage';
import { RpcRouter } from '@dxos/rpc';
import { layerMemory as sqliteLayerMemory } from '@dxos/sql-sqlite/platform';

import * as IdentityContract from '../../contracts/identity.ts';
import * as InvitationsContract from '../../contracts/invitations.ts';
import * as SpacesContract from '../../contracts/spaces.ts';
import * as Events from '../../Events.ts';
import { type Identity } from '../../Identity.ts';
import * as Readiness from '../../Readiness.ts';
import * as SqliteStorage from '../../SqliteStorage.ts';
import { type EdgeAgentManager, EdgeAgentManagerService } from '../agents/index.ts';
import {
  type EdgeIdentityRecoveryManager,
  EdgeIdentityRecoveryManagerService,
} from '../identity/identity-recovery-manager.ts';
import { type CreateIdentityOptions } from '../identity/index.ts';
import {
  InvitationsHandler,
  InvitationsHandlerService,
  InvitationsManager,
  SpaceInvitationProtocol,
} from '../invitations/index.ts';
import { type IMetadataStore, IMetadataStoreService, SqliteMetadataStore } from '../kernel/metadata/index.ts';
import { valueEncoding } from '../kernel/pipeline/index.ts';
import { type ServiceContextRuntimeProps, layerClientServices } from '../services/index.ts';
import { SpaceManager, SpaceManagerService } from '../space/index.ts';
import { DataSpaceManager, type DataSpaceManagerRuntimeProps, type SigningContext } from '../spaces/index.ts';

/** The open event chain; `StackOpened` resolves once every handler the cascade triggered has run. */
const openChain = Effect.gen(function* () {
  yield* Hook.emit(Events.Opening, undefined);
  yield* Hook.emit(Events.StackOpened, undefined);
});

/**
 * Options for a test {@link ServiceContext}.
 */
export type ServiceContextOptions = {
  config?: Config;
  signalManager?: SignalManager;
  transportFactory?: TransportFactory;
  runtimeProps?: ServiceContextRuntimeProps;
};

/**
 * The tags this test surface hands out synchronously. The stack resolves lazily, so they are
 * materialised together when it opens rather than on first access.
 */
const EXPOSED_TAGS = [
  RpcRouter.RpcRouter,
  Readiness.StackReadinessService,
  IdentityContract.ManagerService,
  IdentityContract.LifecycleService,
  SpaceManagerService,
  IMetadataStoreService,
  EdgeIdentityRecoveryManagerService,
  KeyringApiService,
  HypercoreStoreService,
  EchoHostService,
  InvitationsHandlerService,
  InvitationsContract.ManagerService,
  SwarmNetworkManagerService,
  SignalManagerService,
  SpacesContract.ManagerService,
  EdgeAgentManagerService,
] as const;

/**
 * A client services runtime for tests: the stack built from {@link layerClientServices} over an
 * in-memory SQLite runtime, plus the system service, with the components exposed as properties
 * while open.
 */
export class ServiceContext {
  readonly #options: ServiceContextOptions;
  readonly #config: Config;
  readonly #sql = ManagedRuntime.make(sqliteLayerMemory.pipe(Layer.provideMerge(Reactivity.layer)).pipe(Layer.orDie));
  readonly #controller = Hook.makeController();
  /** Holds the reset handlers; closed by `destroy`. */
  readonly #busScope = Effect.runSync(Scope.make());
  /** Scope of the built stack; closed by `#closeStack`. */
  #stackScope?: Scope.Closeable;
  #stack?: LayerStack.LayerStack;
  /** The tags this test surface exposes, resolved once the stack is open so the getters stay sync. */
  #services?: EffectContext.Context<never>;
  #ctx?: Context;

  constructor(options: ServiceContextOptions = {}) {
    this.#options = options;
    this.#config = options.config ?? new Config();
    Effect.runSync(
      Effect.gen({ self: this }, function* () {
        yield* Hook.on(Events.Closing, () => Effect.promise(() => this.#closeStack()));
        yield* Hook.on(Events.WipingStorage, () =>
          Effect.promise(() => this.#sql.runPromise(SqliteStorage.wipeSqliteStorage)),
        );
      }).pipe(Effect.provideService(Hook.Controller, this.#controller), Scope.provide(this.#busScope)),
    );
  }

  get isOpen(): boolean {
    return this.#stack !== undefined;
  }

  get config(): Config {
    return this.#config;
  }

  /**
   * The in-process rpc surface over the services registered with the stack's router; scoped to the
   * caller, who closes it when done.
   */
  get rpc(): Effect.Effect<ClientServicesRpc, never, Scope.Scope> {
    return makeClientServicesRpcFromRouter.pipe(
      Effect.provideService(RpcRouter.RpcRouter, this.#get(RpcRouter.RpcRouter)),
    );
  }

  get stack(): LayerStack.LayerStack {
    return this.#stack ?? failUndefined();
  }

  /** The router every service registered itself with; served to a client without a wire hop. */
  get router(): RpcRouter.Service {
    return this.#get(RpcRouter.RpcRouter);
  }

  get initialized(): Trigger {
    return this.#get(Readiness.StackReadinessService).initialized;
  }

  get identityManager(): IdentityContract.Manager {
    return this.#get(IdentityContract.ManagerService);
  }

  get spaceManager(): SpaceManager {
    return this.#get(SpaceManagerService);
  }

  get metadataStore(): IMetadataStore {
    return this.#get(IMetadataStoreService);
  }

  get recoveryManager(): EdgeIdentityRecoveryManager {
    return this.#get(EdgeIdentityRecoveryManagerService);
  }

  get keyring(): KeyringApi {
    return this.#get(KeyringApiService);
  }

  get hypercoreStore(): HypercoreStore<any> {
    return this.#get(HypercoreStoreService);
  }

  get echoHost(): EchoHost {
    return this.#get(EchoHostService);
  }

  get invitations(): InvitationsHandler {
    return this.#get(InvitationsHandlerService);
  }

  get invitationsManager(): InvitationsContract.Manager {
    return this.#get(InvitationsContract.ManagerService);
  }

  get networkManager(): SwarmNetworkManager {
    return this.#get(SwarmNetworkManagerService);
  }

  get signalManager(): SignalManager {
    return this.#get(SignalManagerService);
  }

  get dataSpaceManager(): SpacesContract.Manager | undefined {
    return this.#services && EffectContext.getUnsafe(this.#services, SpacesContract.ManagerService);
  }

  get edgeAgentManager(): EdgeAgentManager | undefined {
    return this.#services && EffectContext.getUnsafe(this.#services, EdgeAgentManagerService);
  }

  async open(ctx: Context = new Context()): Promise<void> {
    if (this.#stackScope) {
      return;
    }
    this.#ctx = ctx;
    const scope = Effect.runSync(Scope.make());
    this.#stackScope = scope;
    try {
      // Building the layer also builds its eager specs, so the rpc registrations are in place
      // before the lifecycle events below run.
      const stackContext = await EffectEx.runPromise(
        Layer.build(
          layerClientServices({
            runtimeProps: {
              invitationConnectionDefaultProps: { teleport: { controlHeartbeatInterval: 200 } },
              ...this.#options.runtimeProps,
            },
            signalManager: this.#options.signalManager,
            transportFactory: this.#options.transportFactory ?? MemoryTransportFactory,
          }).pipe(
            Layer.provide(RuntimeProvider.toLayer(this.#sql.contextEffect)),
            Layer.provide(Layer.succeed(ConfigService, this.#config)),
            Layer.provide(Layer.succeed(Hook.Controller, this.#controller)),
          ),
        ).pipe(Scope.provide(scope)),
      );
      this.#stack = EffectContext.get(stackContext, LayerStack.Service);
      this.#services = await EffectEx.runPromise(
        ServiceResolver.resolveAll(EXPOSED_TAGS, {}).pipe(
          Effect.provide(stackContext),
          Effect.orDie,
          Scope.provide(scope),
        ),
      );
      await EffectEx.runPromise(
        EffectEx.withContext(ctx)(openChain).pipe(Effect.provideService(Hook.Controller, this.#controller)),
      );
    } catch (err) {
      await this.#closeStack();
      throw err;
    }
  }

  async close(_ctx?: Context): Promise<void> {
    await this.#closeStack();
  }

  /**
   * Runs an effect against the SQLite runtime backing this context's storage. The runtime outlives
   * the stack, so a test can still inspect what a reset left behind.
   */
  async runSql<A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>): Promise<A> {
    return this.#sql.runPromise(effect);
  }

  /** Resets through the in-process RPC bridge, as a client does. */
  async reset(): Promise<void> {
    await EffectEx.runPromise(
      Effect.scoped(
        Effect.gen({ self: this }, function* () {
          const rpc = yield* this.rpc;
          yield* rpc['SystemService.reset']();
        }),
      ),
    );
  }

  /** Disposes the SQLite runtime too; call once the context is no longer needed. */
  async destroy(): Promise<void> {
    await this.#closeStack();
    await EffectEx.runPromise(Scope.close(this.#busScope, Exit.void));
    await this.#sql.dispose();
  }

  // Shared by close and destroy so a caller that wraps `close` cannot recurse through `destroy`.
  async #closeStack(): Promise<void> {
    const scope = this.#stackScope;
    if (!scope) {
      return;
    }
    this.#stackScope = undefined;
    // Closed before the services are dropped: teardown stops the schedulers that still reach for
    // them, and clearing first leaves those callbacks resolving against nothing.
    await EffectEx.runPromise(Scope.close(scope, Exit.void));
    this.#stack = undefined;
    this.#services = undefined;
  }

  async createIdentity(params: CreateIdentityOptions = {}, ctx?: Context): Promise<Identity> {
    return this.#get(IdentityContract.LifecycleService).createIdentity(params, ctx ?? this.#ctx);
  }

  // The stack proves nothing about which tags are built, so the lookup is unsafe by construction:
  // asking before `open` throws here rather than returning undefined into a test.
  #get<Self, Service>(tag: EffectContext.Key<Self, Service>): Service {
    return EffectContext.getUnsafe(this.#services ?? failUndefined(), tag);
  }
}

export const createServiceHost = (config: Config, signalManagerContext: MemorySignalManagerContext): ServiceContext =>
  new ServiceContext({ config, signalManager: new MemorySignalManager(signalManagerContext) });

export const createServiceContext = async ({
  signalManagerFactory = async () => new MemorySignalManager(new MemorySignalManagerContext()),
  runtimeProps,
}: {
  signalManagerFactory?: () => Promise<SignalManager>;
  runtimeProps?: ServiceContextRuntimeProps;
} = {}): Promise<ServiceContext> => {
  const context = new ServiceContext({ signalManager: await signalManagerFactory(), runtimeProps });
  // Tests close the context; the SQLite runtime goes with it so layer finalizers do not leak across tests.
  const close = context.close.bind(context);
  context.close = async (ctx) => {
    await close(ctx);
    await context.destroy();
  };
  return context;
};

export const createPeers = async (
  numPeers: number,
  signalManagerFactory?: () => Promise<SignalManager>,
  runtimeProps?: ServiceContextRuntimeProps,
) => {
  if (!signalManagerFactory) {
    const signalContext = new MemorySignalManagerContext();
    signalManagerFactory = async () => new MemorySignalManager(signalContext);
  }
  return await Promise.all(
    Array.from(Array(numPeers)).map(async () => {
      const peer = await createServiceContext({ signalManagerFactory, runtimeProps });
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
  edgeHttpClient?: EdgeHttpClient;
};

export type TestPeerProps = {
  hypercoreStore?: HypercoreStore<any>;
  metadataStore?: SqliteMetadataStore;
  keyring?: SqliteKeyring;
  networkManager?: SwarmNetworkManager;
  spaceManager?: SpaceManager;
  dataSpaceManager?: SpacesContract.Manager;
  signingContext?: SigningContext;
  echoHost?: EchoHost;
  meshEchoReplicator?: MeshEchoReplicator;
  invitationsManager?: InvitationsContract.Manager;
};

export class TestPeer {
  private _props: TestPeerProps = {};
  private readonly _runtime = ManagedRuntime.make(
    sqliteLayerMemory.pipe(Layer.provideMerge(Reactivity.layer)).pipe(Layer.orDie),
  );
  private readonly _feedStorage = new SqliteStorage.SqliteStorage({ runtime: this._runtime.contextEffect });

  constructor(
    private readonly _signalContext: MemorySignalManagerContext,
    private readonly _opts: TestPeerOpts = { dataStore: StorageType.RAM },
  ) {}

  get props() {
    return this._props;
  }

  get keyring() {
    return (this._props.keyring ??= new SqliteKeyring({ runtime: this._runtime.contextEffect }));
  }

  get hypercoreStore() {
    return (this._props.hypercoreStore ??= new HypercoreStore({
      factory: new HypercoreFactory({
        root: this._feedStorage.createDirectory('feeds'),
        signer: this.keyring,
        hypercore: {
          valueEncoding,
        },
      }),
    }));
  }

  get metadataStore() {
    return (this._props.metadataStore ??= new SqliteMetadataStore({ runtime: this._runtime.contextEffect }));
  }

  get networkManager() {
    return (this._props.networkManager ??= new SwarmNetworkManager({
      signalManager: new MemorySignalManager(this._signalContext),
      transportFactory: MemoryTransportFactory,
    }));
  }

  get spaceManager() {
    return (this._props.spaceManager ??= new SpaceManager({
      hypercoreStore: this.hypercoreStore,
      networkManager: this.networkManager,
      metadataStore: this.metadataStore,
    }));
  }

  get identity() {
    return this._props.signingContext ?? failUndefined();
  }

  get echoHost() {
    return (this._props.echoHost ??= new EchoHost({
      runtime: this._runtime.contextEffect,
    }));
  }

  get meshEchoReplicator() {
    return (this._props.meshEchoReplicator ??= new MeshEchoReplicator());
  }

  get dataSpaceManager(): SpacesContract.Manager {
    return (this._props.dataSpaceManager ??= new DataSpaceManager({
      spaceManager: this.spaceManager,
      metadataStore: this.metadataStore,
      keyring: this.keyring,
      signingContextProvider: () => this.identity,
      hypercoreStore: this.hypercoreStore,
      echoHost: this.echoHost,
      invitationsManager: this.invitationsManager,
      edgeConnection: undefined,
      meshReplicator: this.meshEchoReplicator,
      echoEdgeReplicator: undefined,
      edgeHttpClient: this._opts.edgeHttpClient,
      runtimeProps: this._opts.dataSpaceProps,
    }));
  }

  get invitationsManager() {
    if (!this._props.invitationsManager) {
      const manager = new InvitationsManager(new InvitationsHandler(this.networkManager), this.metadataStore);
      manager.setInvitationHandlerFactory((invitation) => {
        if (invitation.kind === Invitation_Kind.SPACE) {
          return new SpaceInvitationProtocol(
            this.dataSpaceManager,
            this.identity,
            this.keyring,
            toPublicKey(invitation.spaceKey),
          );
        } else {
          throw new Error('not implemented');
        }
      });
      this._props.invitationsManager = manager;
    }
    return this._props.invitationsManager;
  }

  async createIdentity(): Promise<void> {
    await this.migrate();
    this._props.signingContext ??= await createSigningContext(this.keyring);
    this.networkManager.setPeerInfo(
      create(PeerSchema, {
        identityKey: this._props.signingContext.identityKey.toHex(),
        peerKey: this._props.signingContext.deviceKey.toHex(),
      }),
    );
  }

  async migrate(): Promise<void> {
    await RuntimeProvider.runPromise(this._runtime.contextEffect)(
      Effect.all([this.metadataStore.migrate, this.keyring.migrate, this._feedStorage.migrate]),
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
      create(ChainSchema, {
        credential: await new CredentialGenerator(keyring, identityKey, deviceKey).createDeviceAuthorization(deviceKey),
      }),
      deviceKey,
    ),
    recordCredential: async () => {}, // No-op.
    getProfile: () => undefined,
  };
};
