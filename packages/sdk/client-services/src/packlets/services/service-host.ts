//
// Copyright 2021 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Option from 'effect/Option';
import * as Scope from 'effect/Scope';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { synchronized } from '@dxos/async';
import {
  type ClientServices,
  type ClientServicesHandlers,
  makeInProcessClientServicesRpc,
  makeServicesFromRpc,
} from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { type EchoHost, EchoHostService } from '@dxos/echo-host';
import { type EdgeConnection, EdgeConnectionService } from '@dxos/edge-client';
import { EffectEx, RuntimeProvider } from '@dxos/effect';
import { type FeedStore, FeedStoreService } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type KeyringApi, KeyringApiService } from '@dxos/keyring';
import { log } from '@dxos/log';
import { type SignalManager, SignalManagerService } from '@dxos/messaging';
import { type SwarmNetworkManager, SwarmNetworkManagerService, type TransportFactory } from '@dxos/network-manager';
import { SystemStatus } from '@dxos/protocols/buf/dxos/client/services_pb';
import type * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import type * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';
import { trace as Trace } from '@dxos/tracing';
import { WebsocketRpcClient } from '@dxos/websocket-rpc';

import { type EdgeAgentManager, EdgeAgentManagerService } from '../agents/index.ts';
import { DevtoolsHostService, type DevtoolsServiceImpl } from '../devtools/index.ts';
import {
  type CollectDiagnosticsBroadcastHandler,
  createCollectDiagnosticsBroadcastHandler,
  createDiagnostics,
} from '../diagnostics/index.ts';
import {
  type EdgeIdentityRecoveryManager,
  EdgeIdentityRecoveryManagerService,
} from '../identity/identity-recovery-manager.ts';
import {
  type CreateIdentityOptions,
  type Identity,
  type IdentityLifecycle,
  IdentityLifecycleService,
  type IdentityManager,
  IdentityManagerService,
} from '../identity/index.ts';
import {
  type InvitationsHandler,
  InvitationsHandlerService,
  type InvitationsManager,
  InvitationsManagerService,
} from '../invitations/index.ts';
import { type IMetadataStore, IMetadataStoreService } from '../metadata/index.ts';
import { type SpaceManager, SpaceManagerService } from '../space/index.ts';
import { type DataSpaceManager, DataSpaceManagerService } from '../spaces/index.ts';
import { SystemServiceImpl } from '../system/index.ts';
import { type ClientPlatformLayerOptions } from './client-platform.ts';
import {
  ClientServicesLayer,
  type ClientServicesStackContext,
  enableNetworking,
  handlersFromStack,
  openStack,
} from './client-services-stack.ts';
import { type ServiceContextRuntimeProps } from './service-stack.ts';
import { wipeSqliteStorage } from './sqlite-storage.ts';
import { type StackReadiness, StackReadinessService } from './stack-readiness.ts';

export type ClientServicesHostProps = {
  /**
   * Can be omitted if `initialize` is later called.
   */
  config?: Config;
  transportFactory?: TransportFactory;
  signalManager?: SignalManager;
  connectionLog?: boolean;
  callbacks?: ClientServicesHostCallbacks;
  /**
   * Start edge networking as soon as the stack is open. Set `false` when the embedder drives it via
   * {@link ClientServicesHost.startNetworking} — the worker does, so the dial cannot compete with
   * the boot RPCs the tab is waiting on.
   * @default true
   */
  autoConnect?: boolean;
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlExport.SqlExport | SqlTransaction.SqlTransaction>;
  runtimeProps?: ServiceContextRuntimeProps;
};

export type ClientServicesHostCallbacks = {
  onReset?: () => Promise<void>;
};

export type InitializeOptions = {
  config?: Config;
  transportFactory?: TransportFactory;
  signalManager?: SignalManager;
  connectionLog?: boolean;
};

// Alias for consumers (tests, devtools, diagnostics) that referred to the former `ServiceContext`
// orchestrator; its lifecycle and API now live on {@link ClientServicesHost} directly.
// TODO(dmaretskyi): Remove this update consumers.
export type ServiceContext = ClientServicesHost;

/**
 * Shared backend for all client services.
 *
 * Owns the full client stack and its lifecycle: it builds the layer-composed components (keyring,
 * feed store, echo host, identity/space managers, …) plus the client RPC handlers. The open sequence
 * is an event chain (see `events.ts`): the host emits `Opening` and each layer opens its component on
 * the event it needs and emits the fact it establishes; `StackOpened` follows once the cascade is
 * done. Teardown is runtime disposal, which runs the layer finalizers in reverse build order.
 */
export class ClientServicesHost {
  // Effect-rpc handlers served over each connection, resolved from the Layer stack on open and reset
  // to the host-local set on close. Held directly (no separate registry indirection).
  #handlers: Partial<ClientServicesHandlers>;
  readonly #systemService: SystemServiceImpl;

  #config?: Config;
  #signalManager?: SignalManager;
  #platformOptions: ClientPlatformLayerOptions = {};
  #networkManager?: SwarmNetworkManager;
  #connectionLog = true;
  #callbacks?: ClientServicesHostCallbacks;
  #devtoolsProxy?: WebsocketRpcClient<{}, ClientServices>;
  #edgeConnection?: EdgeConnection;

  #stackRuntime?: ManagedRuntime.ManagedRuntime<ClientServicesStackContext, never>;
  #stackContext?: EffectContext.Context<ClientServicesStackContext>;
  readonly #runtime: RuntimeProvider.RuntimeProvider<
    SqlClient.SqlClient | SqlExport.SqlExport | SqlTransaction.SqlTransaction
  >;
  readonly #runtimeProps: ServiceContextRuntimeProps;
  #diagnosticsBroadcastHandler: CollectDiagnosticsBroadcastHandler;

  #opening = false;
  #open = false;

  // Stack components, resolved from the layer runtime on open. Present after `open` starts.
  #ctx?: Context;

  /** See {@link ClientServicesHostProps.autoConnect}. */
  readonly #autoConnect: boolean;
  #metadataStore?: IMetadataStore;
  #keyring?: KeyringApi;
  #feedStore?: FeedStore<any>;
  #spaceManager?: SpaceManager;
  #identityManager?: IdentityManager;
  #recoveryManager?: EdgeIdentityRecoveryManager;
  #invitations?: InvitationsHandler;
  #invitationsManager?: InvitationsManager;
  #echoHost?: EchoHost;
  #dataSpaceManager?: DataSpaceManager;
  #edgeAgentManager?: EdgeAgentManager;
  #identityLifecycle?: IdentityLifecycle;
  #readiness?: StackReadiness;
  #devtoolsHost?: DevtoolsServiceImpl;

  constructor({
    config,
    transportFactory,
    signalManager,
    callbacks,
    autoConnect = true,
    runtime,
    runtimeProps,
  }: ClientServicesHostProps) {
    this.#callbacks = callbacks;
    this.#autoConnect = autoConnect;
    this.#runtime = runtime;
    this.#runtimeProps = runtimeProps ?? {};

    if (config) {
      this.initialize({ config, transportFactory, signalManager });
    }

    // TODO(wittjosiah): If config is not defined here, system service will always have undefined config.
    this.#systemService = new SystemServiceImpl({
      config: () => this.#config,
      getDiagnostics: async () => {
        // Bridge the host Handlers to the proto services surface that diagnostics collection consumes.
        const scope = Effect.runSync(Scope.make());
        try {
          const rpc = await EffectEx.runPromise(
            makeInProcessClientServicesRpc(() => this.#handlers).pipe(Effect.provideService(Scope.Scope, scope)),
          );
          const services = makeServicesFromRpc(rpc, EffectContext.empty());
          return await createDiagnostics(services, this.stack, this.#config!);
        } finally {
          await EffectEx.runPromise(Scope.close(scope, Exit.void));
        }
      },
      close: () => this.close(),
      wipeStorage: () => RuntimeProvider.runPromise(this.#runtime)(wipeSqliteStorage),
      onReset: () => callbacks?.onReset?.(),
    });

    this.#diagnosticsBroadcastHandler = createCollectDiagnosticsBroadcastHandler(this.#systemService);

    this.#handlers = {
      SystemService: this.#systemService,
    };
  }

  get isOpen() {
    return this.#open;
  }

  get config() {
    return this.#config;
  }

  // Self-reference retained for the former `host.context` accessor.
  // TODO(dmaretskyi): kill this.
  get context(): ClientServicesHost {
    return this;
  }

  get services() {
    return this.#handlers;
  }

  /**
   * Effect context of the built stack: every component and RPC handler layer. Present while open.
   */
  get stack(): EffectContext.Context<ClientServicesStackContext> {
    return this.#stackContext ?? failUndefined();
  }

  get initialized() {
    return (this.#readiness ?? failUndefined()).initialized;
  }

  get identityManager(): IdentityManager {
    return this.#identityManager ?? failUndefined();
  }

  get spaceManager(): SpaceManager {
    return this.#spaceManager ?? failUndefined();
  }

  get metadataStore(): IMetadataStore {
    return this.#metadataStore ?? failUndefined();
  }

  get recoveryManager(): EdgeIdentityRecoveryManager {
    return this.#recoveryManager ?? failUndefined();
  }

  get keyring(): KeyringApi {
    return this.#keyring ?? failUndefined();
  }

  get feedStore(): FeedStore<any> {
    return this.#feedStore ?? failUndefined();
  }

  get echoHost(): EchoHost {
    return this.#echoHost ?? failUndefined();
  }

  get invitations(): InvitationsHandler {
    return this.#invitations ?? failUndefined();
  }

  get invitationsManager(): InvitationsManager {
    return this.#invitationsManager ?? failUndefined();
  }

  get networkManager(): SwarmNetworkManager {
    return this.#networkManager ?? failUndefined();
  }

  get signalManager(): SignalManager {
    return this.#signalManager ?? failUndefined();
  }

  // Present after the stack constructs it; usable once `initialized` wakes.
  get dataSpaceManager(): DataSpaceManager | undefined {
    return this.#dataSpaceManager;
  }

  get edgeAgentManager(): EdgeAgentManager | undefined {
    return this.#edgeAgentManager;
  }

  get edgeConnection(): EdgeConnection | undefined {
    return this.#edgeConnection;
  }

  /**
   * Debugging util.
   */
  async exportSqliteDatabase(): Promise<Uint8Array> {
    return (this.#devtoolsHost ?? failUndefined()).exportSqliteDatabase();
  }

  /**
   * Debugging util.
   */
  async runSqliteQuery(query: string, params?: unknown[]): Promise<readonly Record<string, unknown>[]> {
    return (this.#devtoolsHost ?? failUndefined()).runSqliteQuery(query, params);
  }

  /**
   * Initialize the service host with the config.
   * Config can also be provided in the constructor.
   * Can only be called once.
   */
  initialize({ config, ...options }: InitializeOptions): void {
    invariant(!this.#open, 'service host is open');
    log('initializing...');

    if (config) {
      invariant(!this.#config, 'config already set');
      this.#config = config;
    }

    // The edge clients, signal manager and transport are built by the platform layer on open.
    const { connectionLog = true, transportFactory, signalManager } = options;
    this.#platformOptions = { signalManager, transportFactory };
    this.#connectionLog = connectionLog;

    log('initialized');
  }

  @synchronized
  @Trace.span()
  async open(ctx: Context = new Context()): Promise<void> {
    if (this.#open) {
      return;
    }

    log('opening service host');

    invariant(this.#config, 'config not set');
    const config = this.#config;

    this.#opening = true;
    this.#ctx = ctx;
    log('opening...');

    const stackLayer = ClientServicesLayer({
      config,
      runtime: this.#runtime,
      runtimeProps: this.#runtimeProps,
      ...this.#platformOptions,
      connectionLog: this.#connectionLog,
      autoConnect: this.#autoConnect,
    });
    try {
      this.#stackRuntime = ManagedRuntime.make(stackLayer);
      this.#stackContext = await this.#stackRuntime.context();
      const resolved = await this.#stackRuntime.runPromise(
        Effect.all({
          // Components.
          metadataStore: IMetadataStoreService,
          keyring: KeyringApiService,
          feedStore: FeedStoreService,
          spaceManager: SpaceManagerService,
          identityManager: IdentityManagerService,
          recoveryManager: EdgeIdentityRecoveryManagerService,
          invitations: InvitationsHandlerService,
          invitationsManager: InvitationsManagerService,
          echoHost: EchoHostService,
          dataSpaceManager: DataSpaceManagerService,
          edgeAgentManager: EdgeAgentManagerService,
          identityLifecycle: IdentityLifecycleService,
          readiness: StackReadinessService,
          networkManager: SwarmNetworkManagerService,
          signalManager: SignalManagerService,
          edgeConnection: Effect.serviceOption(EdgeConnectionService),
          devtoolsHost: DevtoolsHostService,
        }),
      );

      this.#metadataStore = resolved.metadataStore;
      this.#keyring = resolved.keyring;
      this.#feedStore = resolved.feedStore;
      this.#spaceManager = resolved.spaceManager;
      this.#identityManager = resolved.identityManager;
      this.#recoveryManager = resolved.recoveryManager;
      this.#invitations = resolved.invitations;
      this.#invitationsManager = resolved.invitationsManager;
      this.#echoHost = resolved.echoHost;
      this.#dataSpaceManager = resolved.dataSpaceManager;
      this.#edgeAgentManager = resolved.edgeAgentManager;
      this.#identityLifecycle = resolved.identityLifecycle;
      this.#readiness = resolved.readiness;
      this.#devtoolsHost = resolved.devtoolsHost;
      this.#networkManager = resolved.networkManager;
      this.#signalManager = resolved.signalManager;
      this.#edgeConnection = Option.getOrUndefined(resolved.edgeConnection);

      this.#handlers = { SystemService: this.#systemService, ...handlersFromStack(this.#stackContext) };

      await this.#stackRuntime.runPromise(openStack(ctx));
    } catch (err) {
      // One rollback boundary for building the runtime and running the open chain. Only the runtime
      // is released: the stores below it are not closed, since the metadata store persists on close
      // and nothing guarantees the storage stage loaded it.
      await this.#stackRuntime?.dispose();
      this.#releaseStack();
      this.#handlers = { SystemService: this.#systemService };
      this.#opening = false;
      throw err;
    }

    const devtoolsProxy = this.#config?.get('runtime.client.devtoolsProxy');
    if (devtoolsProxy) {
      // TODO(dxos): The devtools websocket proxy serves the protobuf service bundle, which is
      // incompatible with the effect-rpc Handlers the host now provides. Re-enable once this legacy
      // transport is migrated to effect-rpc (or bridged via makeInProcessClient + a proto adapter).
      log.warn('devtoolsProxy is not supported with effect-rpc services; skipping', { devtoolsProxy });
    }
    this.#diagnosticsBroadcastHandler.start();

    this.#opening = false;
    this.#open = true;
    this.#systemService.setStatus(SystemStatus.ACTIVE);
    const deviceKey = this.#identityManager?.identity?.deviceKey;
    log('opened', { deviceKey });
  }

  /**
   * Allows outbound network activity to begin. Idempotent. Emitted automatically when the stack
   * opens unless {@link ClientServicesHostProps.autoConnect} is `false`, in which case the embedder
   * decides when connecting is safe (and owns any delay).
   */
  startNetworking(): void {
    if (!this.#stackRuntime) {
      log.warn('startNetworking called before the stack is open; ignoring');
      return;
    }
    void this.#stackRuntime.runPromise(enableNetworking);
  }

  @synchronized
  @Trace.span()
  async close(ctx: Context = Context.default()): Promise<void> {
    if (!this.#open) {
      return;
    }

    const deviceKey = this.#identityManager?.identity?.deviceKey;
    log('closing...', { deviceKey });
    this.#diagnosticsBroadcastHandler.stop();
    await this.#devtoolsProxy?.close();
    this.#handlers = { SystemService: this.#systemService };
    await this.#disposeStack();
    this.#open = false;
    this.#systemService.setStatus(SystemStatus.INACTIVE);
    log('closed', { deviceKey });
  }

  /**
   * Closes the host and wipes its storage; the system service owns the sequence.
   */
  async reset(): Promise<void> {
    await this.#systemService.reset();
  }

  //
  // Orchestration (formerly ServiceContext).
  //

  async createIdentity(params: CreateIdentityOptions = {}, ctx?: Context): Promise<Identity> {
    return (this.#identityLifecycle ?? failUndefined()).createIdentity(params, ctx ?? this.#ctx);
  }

  /**
   * Disposes the stack runtime, closing every layer-owned component in reverse build order.
   */
  async #disposeStack(): Promise<void> {
    log('closing stack...');
    await this.#stackRuntime?.dispose();
    this.#releaseStack();
    log('stack closed');
  }

  /**
   * Drops every reference into a disposed runtime so the getters cannot hand out dead instances.
   */
  #releaseStack(): void {
    this.#stackRuntime = undefined;
    this.#stackContext = undefined;
    this.#metadataStore = undefined;
    this.#keyring = undefined;
    this.#feedStore = undefined;
    this.#spaceManager = undefined;
    this.#identityManager = undefined;
    this.#recoveryManager = undefined;
    this.#invitations = undefined;
    this.#invitationsManager = undefined;
    this.#echoHost = undefined;
    this.#dataSpaceManager = undefined;
    this.#edgeAgentManager = undefined;
    this.#identityLifecycle = undefined;
    this.#readiness = undefined;
    this.#devtoolsHost = undefined;
    this.#networkManager = undefined;
    this.#signalManager = undefined;
    this.#edgeConnection = undefined;
  }
}
