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
import { TextModel } from '@dxos/text-model';

import { SpaceServiceImpl, ProfileServiceImpl, SystemServiceImpl, TracingServiceImpl } from '../deprecated';
import { DevtoolsServiceImpl, DevtoolsHostEvents } from '../devtools';
import { DevicesServiceImpl } from '../identity/devices-service-impl';
import { HaloInvitationsServiceImpl, SpaceInvitationsServiceImpl } from '../invitations';
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

  constructor({
    config,
    modelFactory = createDefaultModelFactory(),
    // TODO(burdon): Create ApolloLink abstraction (see Client).
    networkManager
  }: ClientServicesHostParams) {
    this._config = config;
    this._modelFactory = modelFactory;
    this._networkManager = networkManager;
  }

  get descriptors() {
    return this._serviceRegistry.descriptors;
  }

  get services() {
    return this._serviceRegistry.services;
  }

  async open() {
    await this._initialize();
    const deviceKey = this._serviceContext.identityManager.identity?.deviceKey;
    log('opening...', { deviceKey });
    await this._initialize();
    await this._serviceContext.open();
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
    // TODO(dmaretskyi): Remove keyStorage.
    const { storage } = createStorageObjects(this._config.get('runtime.client.storage', {})!);

    // TODO(burdon): Break into components.
    this._serviceContext = new ServiceContext(storage, this._networkManager, this._modelFactory);

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

      SpacesService: new SpacesServiceImpl(),

      DataService: new DataServiceImpl(this._serviceContext.dataServiceSubscriptions),

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
