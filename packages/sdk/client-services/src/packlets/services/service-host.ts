//
// Copyright 2021 DXOS.org
//

import { Config } from '@dxos/config';
import { raise } from '@dxos/debug';
import { DataServiceImpl } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { Storage } from '@dxos/random-access-storage';
import { TextModel } from '@dxos/text-model';

import { SpaceServiceImpl, ProfileServiceImpl, SystemServiceImpl, TracingServiceImpl } from '../deprecated';
import { DevtoolsServiceImpl, DevtoolsHostEvents } from '../devtools';
import { DevicesServiceImpl } from '../identity/devices-service-impl';
import { HaloInvitationsServiceImpl, SpaceInvitationsServiceImpl } from '../invitations';
import { NetworkServiceImpl } from '../network';
import { SpacesServiceImpl } from '../spaces';
import { createStorageObjects } from '../storage';
import { ServiceContext } from './service-context';
import { ClientServicesProvider, ClientServices, clientServiceBundle } from './service-definitions';
import { ServiceRegistry } from './service-registry';

// TODO(burdon): Factor out to spaces.
// TODO(burdon): Defaults (with TextModel).
export const createDefaultModelFactory = () => {
  return new ModelFactory().registerModel(ObjectModel).registerModel(TextModel);
};

type ClientServicesHostParams = {
  config: Config;
  modelFactory?: ModelFactory;
  networkManager: NetworkManager;
  storage?: Storage;
};

/**
 * Remote service implementation.
 */
export class ClientServicesHost implements ClientServicesProvider {
  private _serviceContext!: ServiceContext;
  private _serviceRegistry!: ServiceRegistry<ClientServices>;

  private readonly _config: Config;
  private readonly _modelFactory: ModelFactory;
  private readonly _networkManager: NetworkManager;
  private _storage: Storage;

  constructor({
    config,
    modelFactory = createDefaultModelFactory(),
    // TODO(burdon): Create ApolloLink abstraction (see Client).
    networkManager,
    storage = createStorageObjects(config.get('runtime.client.storage', {})!).storage
  }: ClientServicesHostParams) {
    this._config = config;
    this._modelFactory = modelFactory;
    this._networkManager = networkManager;
    this._storage = storage;
  }

  get descriptors() {
    return this._serviceRegistry.descriptors;
  }

  get services() {
    return this._serviceRegistry.services;
  }

  // TODO(wittjosiah): Try to avoid this.
  get serviceContext() {
    return this._serviceContext;
  }

  async open() {
    log('opening...');
    await this._initialize();
    await this._serviceContext.open();
    const deviceKey = this._serviceContext.identityManager.identity?.deviceKey;
    log('opened', { deviceKey });
  }

  async close() {
    const deviceKey = this._serviceContext.identityManager.identity?.deviceKey;
    log('closing...', { deviceKey });
    await this._serviceContext.close();
    log('closed', { deviceKey });
  }

  // TODO(burdon): Move into open.
  async _initialize() {
    // TODO(burdon): Break into components.
    this._serviceContext = new ServiceContext(this._storage, this._networkManager, this._modelFactory);

    // TODO(burdon): Start to think of DMG (dynamic services).
    this._serviceRegistry = new ServiceRegistry<ClientServices>(clientServiceBundle, {
      HaloInvitationsService: new HaloInvitationsServiceImpl(
        this._serviceContext.identityManager,
        this._serviceContext.haloInvitations
      ),

      DevicesService: new DevicesServiceImpl(this._serviceContext.identityManager),

      SpaceInvitationsService: new SpaceInvitationsServiceImpl(
        this._serviceContext.identityManager,
        () => this._serviceContext.spaceInvitations ?? raise(new Error('SpaceInvitations not initialized')),
        () => this._serviceContext.dataSpaceManager ?? raise(new Error('SpaceManager not initialized'))
      ),

      SpacesService: new SpacesServiceImpl(this._serviceContext.spaceManager),

      DataService: new DataServiceImpl(this._serviceContext.dataServiceSubscriptions),

      NetworkService: new NetworkServiceImpl(this._serviceContext.networkManager),

      // TODO(burdon): Move to new protobuf definitions.
      ProfileService: new ProfileServiceImpl(this._serviceContext),
      SpaceService: new SpaceServiceImpl(this._serviceContext),
      SystemService: new SystemServiceImpl(this._config, this._serviceContext),
      TracingService: new TracingServiceImpl(this._config),
      DevtoolsHost: new DevtoolsServiceImpl({
        events: new DevtoolsHostEvents(),
        config: this._config,
        context: this._serviceContext
      })
    });
  }
}
