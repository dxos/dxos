//
// Copyright 2021 DXOS.org
//

import { Event, synchronized } from '@dxos/async';
import { clientServiceBundle, type ClientServices, defaultKey, Properties } from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { DocumentModel } from '@dxos/document-model';
import { DataServiceImpl } from '@dxos/echo-pipeline';
import { type TypedObject, base } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type SignalManager, WebsocketSignalManager } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { createSimplePeerTransportFactory, NetworkManager, type TransportFactory } from '@dxos/network-manager';
import { trace } from '@dxos/protocols';
import { SystemStatus } from '@dxos/protocols/proto/dxos/client/services';
import { type EchoObject } from '@dxos/protocols/proto/dxos/echo/object';
import { type Storage } from '@dxos/random-access-storage';
import { TextModel } from '@dxos/text-model';
import { TRACE_PROCESSOR, trace as Trace } from '@dxos/tracing';
import { WebsocketRpcClient } from '@dxos/websocket-rpc';

import { createDiagnostics } from './diagnostics';
import { ServiceContext } from './service-context';
import { ServiceRegistry } from './service-registry';
import { DevicesServiceImpl } from '../devices';
import { DevtoolsServiceImpl, DevtoolsHostEvents } from '../devtools';
import { type CreateIdentityOptions, IdentityServiceImpl } from '../identity';
import { InvitationsServiceImpl } from '../invitations';
import { Lock, type ResourceLock } from '../locks';
import { LoggingServiceImpl } from '../logging';
import { NetworkServiceImpl } from '../network';
import { SpacesServiceImpl } from '../spaces';
import { createStorageObjects } from '../storage';
import { SystemServiceImpl } from '../system';

// TODO(burdon): Factor out to spaces.
export const createDefaultModelFactory = () => {
  return new ModelFactory().registerModel(DocumentModel).registerModel(TextModel);
};

// TODO(wittjosiah): Factor out.
const createGenesisMutationFromTypedObject = (obj: TypedObject): EchoObject => {
  const snapshot = obj[base]._createSnapshot();

  return {
    objectId: obj[base]._id,
    genesis: {
      modelType: obj[base]._modelConstructor.meta.type,
    },
    snapshot: {
      model: snapshot,
    },
  };
};

export type ClientServicesHostParams = {
  /**
   * Can be omitted if `initialize` is later called.
   */
  config?: Config;
  modelFactory?: ModelFactory;
  transportFactory?: TransportFactory;
  signalManager?: SignalManager;
  connectionLog?: boolean;
  storage?: Storage;
  lockKey?: string;
  callbacks?: ClientServicesHostCallbacks;
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
  private readonly _modelFactory: ModelFactory;
  private _signalManager?: SignalManager;
  private _networkManager?: NetworkManager;
  private _storage?: Storage;
  private _callbacks?: ClientServicesHostCallbacks;
  private _devtoolsProxy?: WebsocketRpcClient<{}, ClientServices>;

  private _serviceContext!: ServiceContext;

  @Trace.info()
  private _opening = false;

  @Trace.info()
  private _open = false;

  constructor({
    config,
    modelFactory = createDefaultModelFactory(),
    transportFactory,
    signalManager,
    storage,
    // TODO(wittjosiah): Turn this on by default.
    lockKey,
    callbacks,
  }: ClientServicesHostParams = {}) {
    this._storage = storage;
    this._modelFactory = modelFactory;
    this._callbacks = callbacks;

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
      config: this._config,
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

    const {
      connectionLog = true,
      transportFactory = createSimplePeerTransportFactory({
        iceServers: this._config?.get('runtime.services.ice'),
      }),
      signalManager = new WebsocketSignalManager(this._config?.get('runtime.services.signaling') ?? []),
    } = options;
    this._signalManager = signalManager;

    invariant(!this._networkManager, 'network manager already set');
    this._networkManager = new NetworkManager({
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

    await this._loggingService.open();

    this._serviceContext = new ServiceContext(
      this._storage,
      this._networkManager,
      this._signalManager,
      this._modelFactory,
    );

    this._serviceRegistry.setServices({
      SystemService: this._systemService,

      IdentityService: new IdentityServiceImpl(
        (params) => this._createIdentity(params),
        this._serviceContext.identityManager,
        this._serviceContext.keyring,
      ),

      InvitationsService: new InvitationsServiceImpl(this._serviceContext.invitations, (invitation) =>
        this._serviceContext.getInvitationHandler(invitation),
      ),

      DevicesService: new DevicesServiceImpl(this._serviceContext.identityManager),

      SpacesService: new SpacesServiceImpl(
        this._serviceContext.identityManager,
        this._serviceContext.spaceManager,
        this._serviceContext.dataServiceSubscriptions,
        async () => {
          await this._serviceContext.initialized.wait();
          return this._serviceContext.dataSpaceManager!;
        },
      ),

      DataService: new DataServiceImpl(this._serviceContext.dataServiceSubscriptions),

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
    await this._devtoolsProxy?.close();
    this._serviceRegistry.setServices({ SystemService: this._systemService });
    await this._loggingService.close();
    await this._serviceContext.close();
    this._open = false;
    this._statusUpdate.emit();
    log('closed', { deviceKey });
  }

  async reset() {
    const traceId = PublicKey.random().toHex();
    log.trace('dxos.sdk.client-services-host.reset', trace.begin({ id: traceId }));

    log('resetting...');
    await this._serviceContext?.close();
    await this._storage!.reset();
    log('reset');
    log.trace('dxos.sdk.client-services-host.reset', trace.end({ id: traceId }));
    await this._callbacks?.onReset?.();
  }

  private async _createIdentity(params?: CreateIdentityOptions) {
    const identity = await this._serviceContext.createIdentity(params);

    // Setup default space.
    await this._serviceContext.initialized.wait();
    const space = await this._serviceContext.dataSpaceManager!.createSpace();
    const obj: TypedObject = new Properties();
    obj[defaultKey] = identity.identityKey.toHex();
    await this._serviceRegistry.services.DataService!.write({
      spaceKey: space.key,
      batch: {
        objects: [createGenesisMutationFromTypedObject(obj)],
      },
    });
    await this._serviceRegistry.services.DataService!.flush({ spaceKey: space.key });

    return identity;
  }
}
