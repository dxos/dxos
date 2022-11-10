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

import { PartyServiceImpl, ProfileServiceImpl, SystemServiceImpl, TracingServiceImpl } from '../deprecated';
import { DevtoolsServiceImpl, DevtoolsHostEvents } from '../devtools';
import { DevicesServiceImpl } from '../identity/devices-service-impl';
import { SpaceInvitationsServiceImpl } from '../invitations';
import { SpacesServiceImpl } from '../spaces';
import { createStorageObjects } from '../storage';
import { ServiceContext } from './service-context';
import { ClientServicesProvider, ClientServices, clientServiceBundle } from './service-definitions';
import { ServiceRegistry } from './service-registry';

type ClientServicesHostParams = {
  config: Config;
  modelFactory?: ModelFactory;
  networkManager: NetworkManager;
};

// TODO(burdon): Factor out to spaces.
// TODO(burdon): Defaults (with TextModel).
export const createDefaultModelFactory = () => {
  return new ModelFactory().registerModel(ObjectModel).registerModel(TextModel);
};

/**
 * Remote service implementation.
 */
// TODO(burdon): Reconcile Host/Backend, etc.
export class ClientServicesHost implements ClientServicesProvider {
  private readonly _serviceContext: ServiceContext;
  private readonly _serviceRegistry: ServiceRegistry<ClientServices>;

  constructor({
    config,
    modelFactory = createDefaultModelFactory(),
    // TODO(burdon): Create ApolloLink abstraction (see Client).
    networkManager
  }: ClientServicesHostParams) {
    // TODO(dmaretskyi): Remove keyStorage.
    const { storage } = createStorageObjects(config.get('runtime.client.storage', {})!);

    // TODO(burdon): Break into components.
    this._serviceContext = new ServiceContext(storage, networkManager, modelFactory);

    // TODO(burdon): Start to think of DMG (dynamic services).
    this._serviceRegistry = new ServiceRegistry<ClientServices>(clientServiceBundle, {
      SpacesService: new SpacesServiceImpl(),
      SpaceInvitationsService: new SpaceInvitationsServiceImpl(
          this._serviceContext.identityManager,
          () => this._serviceContext.spaceManager ?? raise(new Error('SpaceManager not initialized')),
          () => this._serviceContext.spaceInvitations ?? raise(new Error('SpaceInvitations not initialized'))
      ),

      PartyService: new PartyServiceImpl(this._serviceContext),
      DataService: new DataServiceImpl(this._serviceContext.dataServiceSubscriptions),

      ProfileService: new ProfileServiceImpl(this._serviceContext),
      SystemService: new SystemServiceImpl(config),
      TracingService: new TracingServiceImpl(config),
      DevtoolsHost: new DevtoolsServiceImpl({ events: new DevtoolsHostEvents(), config, context: this._serviceContext }),
      DevicesService: new DevicesServiceImpl(this._serviceContext.identityManager),
    });
  }

  get descriptors() {
    return this._serviceRegistry.descriptors;
  }

  get services() {
    return this._serviceRegistry.services;
  }

  async open() {
    const deviceKey = this._serviceContext.identityManager.identity?.deviceKey;
    log('opening...', { deviceKey });
    await this._serviceContext.open();
    log('opened', { deviceKey });
  }

  async close() {
    const deviceKey = this._serviceContext.identityManager.identity?.deviceKey;
    log('closing...', { deviceKey });
    await this._serviceContext.close();
    log('closed', { deviceKey });
  }
}
