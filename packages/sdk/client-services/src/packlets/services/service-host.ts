//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { clientServiceBundle, ClientServices, createDefaultModelFactory, PublicKey } from '@dxos/client';
import { Config } from '@dxos/config';
import { DataServiceImpl } from '@dxos/echo-pipeline';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { trace } from '@dxos/protocols';
import { SystemStatus } from '@dxos/protocols/proto/dxos/client/services';
import { Storage } from '@dxos/random-access-storage';

import { TracingServiceImpl } from '../deprecated';
import { DevicesServiceImpl } from '../devices';
import { DevtoolsServiceImpl, DevtoolsHostEvents } from '../devtools';
import { IdentityServiceImpl } from '../identity';
import { InvitationsServiceImpl } from '../invitations';
import { LoggingServiceImpl } from '../logging';
import { NetworkServiceImpl } from '../network';
import { SpacesServiceImpl } from '../spaces';
import { createStorageObjects } from '../storage';
import { SystemServiceImpl } from '../system';
import { VaultResourceLock } from '../vault';
import { ServiceContext } from './service-context';
import { ServiceRegistry } from './service-registry';

export type ClientServicesHostParams = {
  /**
   * Can be omitted if `initialize` is later called.
   */
  config?: Config;
  modelFactory?: ModelFactory;
  networkManager?: NetworkManager;
  storage?: Storage;
  lockKey?: string;
};

export type InitializeOptions = {
  config?: Config;
  networkManager?: NetworkManager;
};

/**
 * Remote service implementation.
 */
export class ClientServicesHost {
  private readonly _resourceLock?: VaultResourceLock;
  private readonly _serviceRegistry: ServiceRegistry<ClientServices>;
  private readonly _systemService: SystemServiceImpl;

  private _config?: Config;
  private readonly _statusUpdate = new Event<void>();
  private readonly _modelFactory: ModelFactory;
  private _networkManager?: NetworkManager;
  private _storage?: Storage;

  /**
   * @internal
   */
  _serviceContext!: ServiceContext;
  private _opening = false;
  private _open = false;

  private readonly _instanceId = PublicKey.random().toHex();

  constructor({
    config,
    modelFactory = createDefaultModelFactory(),
    // TODO(burdon): Create ApolloLink abstraction (see Client).
    networkManager,
    storage,
    // TODO(wittjosiah): Turn this on by default.
    lockKey
  }: ClientServicesHostParams = {}) {
    this._storage = storage;
    this._modelFactory = modelFactory;

    if (config) {
      this.initialize({ config, networkManager });
    }

    this._resourceLock = lockKey
      ? new VaultResourceLock({
          lockKey,
          onAcquire: () => {
            this._opening || this.open();
          },
          onRelease: () => this.close()
        })
      : undefined;

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
      }
    });

    // TODO(burdon): Start to think of DMG (dynamic services).
    this._serviceRegistry = new ServiceRegistry<ClientServices>(clientServiceBundle, {
      SystemService: this._systemService
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
  initialize({ config, networkManager }: InitializeOptions) {
    assert(!this._open, 'service host is open');

    if (config) {
      assert(!this._config, 'config already set');

      this._config = config;
      if (!this._storage) {
        this._storage = createStorageObjects(config.get('runtime.client.storage', {})!).storage;
      }
    }

    if (networkManager) {
      assert(!this._networkManager, 'network manager already set');
      this._networkManager = networkManager;
    }
  }

  async open() {
    if (this._open) {
      return;
    }

    log.trace('dxos.sdk.client-services-host', trace.begin({ id: this._instanceId }));

    assert(this._config, 'config not set');
    assert(this._storage, 'storage not set');
    assert(this._networkManager, 'network manager not set');

    this._opening = true;
    log('opening...', { lockKey: this._resourceLock?.lockKey });
    await this._resourceLock?.acquire();

    // TODO(wittjosiah): Make re-entrant.
    // TODO(burdon): Break into components.
    this._serviceContext = new ServiceContext(this._storage, this._networkManager, this._modelFactory);

    // TODO(burdon): Start to think of DMG (dynamic services).
    this._serviceRegistry.setServices({
      SystemService: this._systemService,

      IdentityService: new IdentityServiceImpl(this._serviceContext),

      InvitationsService: new InvitationsServiceImpl(this._serviceContext.invitations, (invitation) =>
        this._serviceContext.getInvitationHandler(invitation)
      ),

      DevicesService: new DevicesServiceImpl(this._serviceContext.identityManager),

      SpacesService: new SpacesServiceImpl(
        this._serviceContext.identityManager,
        this._serviceContext.spaceManager,
        this._serviceContext.dataServiceSubscriptions,
        async () => {
          await this._serviceContext.initialized.wait();
          return this._serviceContext.dataSpaceManager!;
        }
      ),

      DataService: new DataServiceImpl(this._serviceContext.dataServiceSubscriptions),

      NetworkService: new NetworkServiceImpl(this._serviceContext.networkManager),

      LoggingService: new LoggingServiceImpl(),

      // TODO(burdon): Move to new protobuf definitions.
      TracingService: new TracingServiceImpl(this._config),
      DevtoolsHost: new DevtoolsServiceImpl({
        events: new DevtoolsHostEvents(),
        config: this._config,
        context: this._serviceContext
      })
    });

    await this._serviceContext.open();
    this._opening = false;
    this._open = true;
    this._statusUpdate.emit();
    const deviceKey = this._serviceContext.identityManager.identity?.deviceKey;
    log('opened', { deviceKey });
  }

  async close() {
    if (!this._open) {
      return;
    }

    const deviceKey = this._serviceContext.identityManager.identity?.deviceKey;
    log('closing...', { deviceKey });
    this._serviceRegistry.setServices({ SystemService: this._systemService });
    await this._serviceContext.close();
    this._open = false;
    this._statusUpdate.emit();
    log('closed', { deviceKey });

    log.trace('dxos.sdk.client-services-host', trace.end({ id: this._instanceId }));
  }

  async reset() {
    log('resetting...');
    await this._serviceContext?.close();
    await this._storage!.reset();
    log('reset');
  }
}
