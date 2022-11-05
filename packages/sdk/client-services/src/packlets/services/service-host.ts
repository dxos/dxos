//
// Copyright 2021 DXOS.org
//

import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { InvitationsService } from '@dxos/protocols/proto/dxos/client/services';

import {
  HaloServiceImpl,
  PartyServiceImpl,
  ProfileServiceImpl,
  SystemServiceImpl,
  TracingServiceImpl
} from '../deprecated';
import { DevtoolsServiceImpl, DevtoolsHostEvents } from '../devtools';
import { SpaceInvitationsServiceImpl } from '../invitations';
import { SpacesServiceImpl } from '../spaces';
import { createStorageObjects } from '../storage';
import { ServiceContext } from './service-context';
import { ClientServicesProvider, ClientServices, clientServiceBundle } from './service-definitions';
import { createServiceProvider, ServiceRegistry } from './service-registry';
import { HaloSigner } from './signer';

type ClientServicesHostParams = {
  config: Config;
  signer?: HaloSigner;
  modelFactory?: ModelFactory;
  networkManager: NetworkManager;
};

// TODO(burdon): Normalize constructor of peer with ClientServicesProxy.

/**
 * Remote service implementation.
 */
// TODO(burdon): Reconcile Host/Backend, etc.
export class ClientServicesHost implements ClientServicesProvider {
  private readonly _serviceContext: ServiceContext;
  private readonly _serviceRegistry: ServiceRegistry<ClientServices>;

  constructor({
    config,
    modelFactory = new ModelFactory().registerModel(ObjectModel),
    signer,
    networkManager
  }: ClientServicesHostParams) {
    // TODO(dmaretskyi): Remove keyStorage.
    const { storage } = createStorageObjects(config.get('runtime.client.storage', {})!);

    // TODO(burdon): Break into components.
    this._serviceContext = new ServiceContext(storage, networkManager, modelFactory);

    // TODO(burdon): Move to open method?
    this._serviceRegistry = new ServiceRegistry<ClientServices>(clientServiceBundle, {
      HaloService: new HaloServiceImpl(null, signer),

      SpacesService: new SpacesServiceImpl(),
      SpaceInvitationsService: createServiceProvider<InvitationsService>(() => {
        return new SpaceInvitationsServiceImpl(
          this._serviceContext.spaceManager!,
          this._serviceContext.spaceInvitations!
        );
      }),

      PartyService: new PartyServiceImpl(this._serviceContext),
      DataService: this._serviceContext.dataService,
      ProfileService: new ProfileServiceImpl(this._serviceContext),
      SystemService: new SystemServiceImpl(config),
      TracingService: new TracingServiceImpl(config),
      DevtoolsHost: new DevtoolsServiceImpl({ events: new DevtoolsHostEvents(), config, context: this._serviceContext })
    });
  }

  get descriptors() {
    return this._serviceRegistry.descriptors;
  }

  get services() {
    return this._serviceRegistry.services;
  }

  async open() {
    log('opening...');
    await this._serviceContext.open();
    log('opened');
  }

  async close() {
    log('closing...');
    await this._serviceContext.close();
    log('closed');
  }
}
