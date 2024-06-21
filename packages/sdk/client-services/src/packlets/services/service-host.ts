//
// Copyright 2021 DXOS.org
//

import { Event, synchronized } from '@dxos/async';
import { clientServiceBundle, type ClientServices } from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { WebsocketSignalManager, type SignalManager } from '@dxos/messaging';
import { SwarmNetworkManager, createSimplePeerTransportFactory, type TransportFactory } from '@dxos/network-manager';
import { trace } from '@dxos/protocols';
import { SystemStatus } from '@dxos/protocols/proto/dxos/client/services';
import { type Storage } from '@dxos/random-access-storage';
import { TRACE_PROCESSOR, trace as Trace } from '@dxos/tracing';
import { WebsocketRpcClient } from '@dxos/websocket-rpc';

import { ServiceContext, type ServiceContextRuntimeParams } from './service-context';
import { ServiceRegistry } from './service-registry';
import { DevicesServiceImpl } from '../devices';
import { DevtoolsHostEvents, DevtoolsServiceImpl } from '../devtools';
import {
  type CollectDiagnosticsBroadcastHandler,
  createCollectDiagnosticsBroadcastHandler,
  createDiagnostics,
} from '../diagnostics';
import { IdentityServiceImpl, type CreateIdentityOptions } from '../identity';
import { InvitationsServiceImpl } from '../invitations';
import { Lock, type ResourceLock } from '../locks';
import { LoggingServiceImpl } from '../logging';
import { NetworkServiceImpl } from '../network';
import { SpacesServiceImpl } from '../spaces';
import { createLevel, createStorageObjects } from '../storage';
import { SystemServiceImpl } from '../system';

export type ClientServicesHostParams = {
  /**
   * Can be omitted if `initialize` is later called.
   */
  config?: Config;
  transportFactory?: TransportFactory;
  signalManager?: SignalManager;
  connectionLog?: boolean;
  storage?: Storage;
  level?: LevelDB;
  lockKey?: string;
  callbacks?: ClientServicesHostCallbacks;
  runtimeParams?: ServiceContextRuntimeParams;
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

/**
 * Remote service implementation.
 */
@Trace.resource()
export class ClientServicesHost {
  private readonly _resourceLock?: ResourceLock;
  private readonly _serviceRegistry: ServiceRegistry<ClientServices>;
  private readonly _systemService: SystemServiceImpl;
  private readonly _loggingService: LoggingServiceImpl;
  private readonly _tracingService = TRACE_PROCESSOR.createTraceSender();

  private _config?: Config;
  private readonly _statusUpdate = new Event<void>();
  private _signalManager?: SignalManager;
  private _networkManager?: SwarmNetworkManager;
  private _storage?: Storage;
  private _level?: LevelDB;
  private _callbacks?: ClientServicesHostCallbacks;
  private _devtoolsProxy?: WebsocketRpcClient<{}, ClientServices>;

  private _serviceContext!: ServiceContext;
  private readonly _runtimeParams: ServiceContextRuntimeParams;
  private diagnosticsBroadcastHandler: CollectDiagnosticsBroadcastHandler;

  @Trace.info()
  private _opening = false;

  @Trace.info()
  private _open = false;

  constructor({
    config,
    transportFactory,
    signalManager,
    storage,
    level,
    // TODO(wittjosiah): Turn this on by default.
    lockKey,
    callbacks,
    runtimeParams,
  }: ClientServicesHostParams = {}) {
    this._storage = storage;
    this._level = level;
    this._callbacks = callbacks;
    this._runtimeParams = runtimeParams ?? {};

    if (config) {
      this.initialize({ config, transportFactory, signalManager });
    }

    if (lockKey) {
      this._resourceLock = new Lock({
        lockKey,
        onAcquire: () => {
          if (!this._opening) {
            void this.open(new Context());
          }
        },
        onRelease: () => this.close(),
      });
    }

    // TODO(wittjosiah): If config is not defined here, system service will always have undefined config.
    this._systemService = new SystemServiceImpl({
      config: () => this._config,
      statusUpdate: this._statusUpdate,
      getCurrentStatus: () => (this.isOpen ? SystemStatus.ACTIVE : SystemStatus.INACTIVE),
      getDiagnostics: () => {
        return createDiagnostics(this._serviceRegistry.services, this._serviceContext, this._config!);
      },
      onUpdateStatus: async (status: SystemStatus) => {
        if (!this.isOpen && status === SystemStatus.ACTIVE) {
          await this._resourceLock?.acquire();
        } else if (this.isOpen && status === SystemStatus.INACTIVE) {
          await this._resourceLock?.release();
        }
      },
      onReset: async () => {
        await this.reset();
      },
    });

    this.diagnosticsBroadcastHandler = createCollectDiagnosticsBroadcastHandler(this._systemService);
    this._loggingService = new LoggingServiceImpl();

    this._serviceRegistry = new ServiceRegistry<ClientServices>(clientServiceBundle, {
      SystemService: this._systemService,
      TracingService: this._tracingService,
    });
  }

  get isOpen() {
    return this._open;
  }

  get config() {
    return this._config;
  }

  get context() {
    return this._serviceContext;
  }

  get serviceRegistry() {
    return this._serviceRegistry;
  }

  get descriptors() {
    return this._serviceRegistry.descriptors;
  }

  get services() {
    return this._serviceRegistry.services;
  }

  /**
   * Initialize the service host with the config.
   * Config can also be provided in the constructor.
   * Can only be called once.
   */
  initialize({ config, ...options }: InitializeOptions) {
    invariant(!this._open, 'service host is open');
    log('initializing...');

    if (config) {
      invariant(!this._config, 'config already set');
      this._config = config;
      if (!this._storage) {
        this._storage = createStorageObjects(config.get('runtime.client.storage', {})!).storage;
      }
    }

    if (!options.signalManager) {
      log.warn('running signaling without telemetry metadata.');
    }
    const {
      connectionLog = true,
      transportFactory = createSimplePeerTransportFactory({
        iceServers: this._config?.get('runtime.services.ice'),
      }),
      signalManager = new WebsocketSignalManager(this._config?.get('runtime.services.signaling') ?? []),
    } = options;
    this._signalManager = signalManager;

    invariant(!this._networkManager, 'network manager already set');
    this._networkManager = new SwarmNetworkManager({
      log: connectionLog,
      transportFactory,
      signalManager,
    });

    log('initialized');
  }

  @synchronized
  @Trace.span()
  async open(ctx: Context) {
    if (this._open) {
      return;
    }

    const traceId = PublicKey.random().toHex();
    log.trace('dxos.client-services.host.open', trace.begin({ id: traceId }));

    invariant(this._config, 'config not set');
    invariant(this._storage, 'storage not set');
    invariant(this._signalManager, 'signal manager not set');
    invariant(this._networkManager, 'network manager not set');

    this._opening = true;
    log('opening...', { lockKey: this._resourceLock?.lockKey });

    await this._resourceLock?.acquire();

    if (!this._level) {
      this._level = await createLevel(this._config.get('runtime.client.storage', {})!);
    }
    await this._level.open();

    await this._loggingService.open();

    this._serviceContext = new ServiceContext(
      this._storage,
      this._level,
      this._networkManager,
      this._signalManager,
      this._runtimeParams,
    );

    const identityService = new IdentityServiceImpl(
      this._serviceContext.identityManager,
      this._serviceContext.keyring,
      () => this._serviceContext.dataSpaceManager!,
      (params) => this._createIdentity(params),
      (profile) => this._serviceContext.broadcastProfileUpdate(profile),
    );

    this._serviceRegistry.setServices({
      SystemService: this._systemService,
      IdentityService: identityService,

      InvitationsService: new InvitationsServiceImpl(this._serviceContext.invitationsManager),

      DevicesService: new DevicesServiceImpl(this._serviceContext.identityManager),

      SpacesService: new SpacesServiceImpl(
        this._serviceContext.identityManager,
        this._serviceContext.spaceManager,
        async () => {
          await this._serviceContext.initialized.wait();
          return this._serviceContext.dataSpaceManager!;
        },
      ),

      DataService: this._serviceContext.echoHost.dataService,
      QueryService: this._serviceContext.echoHost.queryService,

      NetworkService: new NetworkServiceImpl(this._serviceContext.networkManager, this._serviceContext.signalManager),

      LoggingService: this._loggingService,
      TracingService: this._tracingService,

      // TODO(burdon): Move to new protobuf definitions.
      DevtoolsHost: new DevtoolsServiceImpl({
        events: new DevtoolsHostEvents(),
        config: this._config,
        context: this._serviceContext,
      }),
    });

    await this._serviceContext.open(ctx);
    await identityService.open();

    const devtoolsProxy = this._config?.get('runtime.client.devtoolsProxy');
    if (devtoolsProxy) {
      this._devtoolsProxy = new WebsocketRpcClient({
        url: devtoolsProxy,
        requested: {},
        exposed: clientServiceBundle,
        handlers: this.services as ClientServices,
      });
      void this._devtoolsProxy.open();
    }
    this.diagnosticsBroadcastHandler.start();

    this._opening = false;
    this._open = true;
    this._statusUpdate.emit();
    const deviceKey = this._serviceContext.identityManager.identity?.deviceKey;
    log('opened', { deviceKey });
    log.trace('dxos.client-services.host.open', trace.end({ id: traceId }));
  }

  @synchronized
  @Trace.span()
  async close() {
    if (!this._open) {
      return;
    }

    const deviceKey = this._serviceContext.identityManager.identity?.deviceKey;
    log('closing...', { deviceKey });
    this.diagnosticsBroadcastHandler.stop();
    await this._devtoolsProxy?.close();
    this._serviceRegistry.setServices({ SystemService: this._systemService });
    await this._loggingService.close();
    await this._serviceContext.close();
    await this._level?.close();
    this._open = false;
    this._statusUpdate.emit();
    log('closed', { deviceKey });
  }

  async reset() {
    const traceId = PublicKey.random().toHex();
    log.trace('dxos.sdk.client-services-host.reset', trace.begin({ id: traceId }));

    log.info('resetting...');
    await this._serviceContext?.close();
    await this._storage!.reset();
    log.info('reset');
    log.trace('dxos.sdk.client-services-host.reset', trace.end({ id: traceId }));
    await this._callbacks?.onReset?.();
  }

  private async _createIdentity(params: CreateIdentityOptions) {
    const identity = await this._serviceContext.createIdentity(params);
    await this._serviceContext.initialized.wait();
    return identity;
  }
}
