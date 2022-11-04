//
// Copyright 2021 DXOS.org
//

import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { InvitationsService } from '@dxos/protocols/proto/dxos/client/services';

import { HaloService, PartyServiceImpl, ProfileService, SystemService, TracingService } from '../deprecated';
import { DevtoolsService, DevtoolsHostEvents } from '../devtools';
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
      SpacesService: new SpacesServiceImpl(),
      SpaceInvitationsService: createServiceProvider<InvitationsService>(
        () =>
          new SpaceInvitationsServiceImpl(this._serviceContext.spaceManager!, this._serviceContext.spaceInvitations!)
      ),

      PartyService: new PartyServiceImpl(this._serviceContext),
      DataService: this._serviceContext.dataService,
      HaloService: new HaloService(null, signer),
      ProfileService: new ProfileService(this._serviceContext),
      SystemService: new SystemService(config),
      TracingService: new TracingService(config),
      DevtoolsHost: new DevtoolsService({ events: new DevtoolsHostEvents(), config, context: this._serviceContext })
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
    // this._devtoolsEvents.ready.emit();
    log('opened');
  }

  async close() {
    log('closing...');
    await this._serviceContext.close();
    log('closed');
  }
}
