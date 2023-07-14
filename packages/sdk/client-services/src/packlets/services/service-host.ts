//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Event, synchronized } from '@dxos/async';
import { clientServiceBundle, ClientServices, createDefaultModelFactory } from '@dxos/client-protocol';
import { Config } from '@dxos/config';
import { DataServiceImpl } from '@dxos/echo-pipeline';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { SignalManager, WebsocketSignalManager } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { createWebRTCTransportFactory, NetworkManager, TransportFactory } from '@dxos/network-manager';
import { trace } from '@dxos/protocols';
import { SystemStatus } from '@dxos/protocols/proto/dxos/client/services';
import { Storage } from '@dxos/random-access-storage';

import { DevicesServiceImpl } from '../devices';
import { DevtoolsServiceImpl, DevtoolsHostEvents } from '../devtools';
import { IdentityServiceImpl } from '../identity';
import { InvitationsServiceImpl } from '../invitations';
import { Lock, ResourceLock } from '../locks';
import { LoggingServiceImpl } from '../logging';
import { NetworkServiceImpl } from '../network';
import { SpacesServiceImpl } from '../spaces';
import { createStorageObjects } from '../storage';
import { SystemServiceImpl } from '../system';
import { ServiceContext } from './service-context';
import { ServiceRegistry } from './service-registry';

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
export class ClientServicesHost {
  private readonly _resourceLock?: ResourceLock;
  private readonly _serviceRegistry: ServiceRegistry<ClientServices>;
  private readonly _systemService: SystemServiceImpl;
  private readonly _loggingService: LoggingServiceImpl;

  private _config?: Config;
  private readonly _statusUpdate = new Event<void>();
  private readonly _modelFactory: ModelFactory;
  private _signalManager?: SignalManager;
  private _networkManager?: NetworkManager;
  private _storage?: Storage;

  _serviceContext!: ServiceContext;
  private _opening = false;
  private _open = false;

  constructor({
    config,
    modelFactory = createDefaultModelFactory(),
    // TODO(burdon): Create ApolloLink abstraction (see Client).
    transportFactory,
    signalManager,
    connectionLog,
    storage,
    // TODO(wittjosiah): Turn this on by default.
    lockKey,
  }: ClientServicesHostParams = {}) {
    this._storage = storage;
    this._modelFactory = modelFactory;

    if (config) {
      this.initialize({ config, transportFactory, signalManager });
    }

    if (lockKey) {
      this._resourceLock = new Lock({
        lockKey,
        onAcquire: () => {
          if (!this._opening) {
            void this.open();
          }
        },
        onRelease: () => this.close(),
      });
    }

    this._systemService = new SystemServiceImpl({
      config: this._config,

      statusUpdate: this._statusUpdate,

      getCurrentStatus: () => (this.isOpen ? SystemStatus.ACTIVE : SystemStatus.INACTIVE),

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

    // TODO(burdon): Start to think of DMG (dynamic services).
    this._serviceRegistry = new ServiceRegistry<ClientServices>(clientServiceBundle, {
      SystemService: this._systemService,
    });
  }

  get isOpen() {
    return this._open;
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
    assert(!this._open, 'service host is open');

    if (config) {
      assert(!this._config, 'config already set');

      this._config = config;
      if (!this._storage) {
        this._storage = createStorageObjects(config.get('runtime.client.storage', {})!).storage;
      }
    }

    const {
      connectionLog = true,
      transportFactory = createWebRTCTransportFactory({
        iceServers: this._config?.get('runtime.services.ice'),
      }),
      signalManager = new WebsocketSignalManager(this._config?.get('runtime.services.signaling') ?? []),
    } = options;
    this._signalManager = signalManager;

    assert(!this._networkManager, 'network manager already set');
    this._networkManager = new NetworkManager({
      log: connectionLog,
      transportFactory,
      signalManager,
    });
  }

  @synchronized
  async open() {
    if (this._open) {
      return;
    }

    const traceId = PublicKey.random().toHex();
    log.trace('dxos.sdk.client-services-host.open', trace.begin({ id: traceId }));

    assert(this._config, 'config not set');
    assert(this._storage, 'storage not set');
    assert(this._signalManager, 'signal manager not set');
    assert(this._networkManager, 'network manager not set');

    this._opening = true;
    log('opening...', { lockKey: this._resourceLock?.lockKey });
    await this._resourceLock?.acquire();

    await this._loggingService.open();

    // TODO(wittjosiah): Make re-entrant.
    // TODO(burdon): Break into components.
    this._serviceContext = new ServiceContext(
      this._storage,
      this._networkManager,
      this._signalManager,
      this._modelFactory,
    );

    // TODO(burdon): Start to think of DMG (dynamic services).
    this._serviceRegistry.setServices({
      SystemService: this._systemService,

      IdentityService: new IdentityServiceImpl(this._serviceContext),

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

      // TODO(burdon): Move to new protobuf definitions.
      DevtoolsHost: new DevtoolsServiceImpl({
        events: new DevtoolsHostEvents(),
        config: this._config,
        context: this._serviceContext,
      }),
    });

    await this._serviceContext.open();
    this._opening = false;
    this._open = true;
    this._statusUpdate.emit();
    const deviceKey = this._serviceContext.identityManager.identity?.deviceKey;
    log('opened', { deviceKey });
    log.trace('dxos.sdk.client-services-host.open', trace.end({ id: traceId }));
  }

  @synchronized
  async close() {
    if (!this._open) {
      return;
    }

    const deviceKey = this._serviceContext.identityManager.identity?.deviceKey;
    log('closing...', { deviceKey });
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
  }
}
