//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Config } from '@dxos/config';

import { DevtoolsHostEvents } from '../devtools';
import { HaloService, ProfileService, SystemService, TracingService } from './impl';
import { DevtoolsService } from './impl/devtools';
import { SpaceInvitationsServiceImpl } from './invitations';
import { ServiceContext } from './service-context';
import { ServiceRegistry } from './service-registry';
import { ClientServices } from './services';
import { HaloSigner } from './signer';
import { SpacesServiceImpl } from './spaces';

export enum ServiceType {
  Halo,
  Spaces,
  SpaceInvitations
}

/**
 * Service factory.
 */
export const createServices = ({
  config,
  context,
  signer // TODO(burdon): Remove (legacy?)
}: {
  config: Config;
  context: ServiceContext;
  signer?: HaloSigner; // TODO(burdon): Deprecated.
}): ClientServices => {
  // TODO(burdon): Return factory.
  const serviceRegistry = new ServiceRegistry<ServiceType>();
  serviceRegistry.registerService(ServiceType.Halo, new HaloService(null, signer));

  assert(context.spaceManager);
  assert(context.spaceInvitations);

  return {
    SpacesService: new SpacesServiceImpl(),
    SpaceInvitationService: new SpaceInvitationsServiceImpl(context.spaceManager, context.spaceInvitations),

    DataService: context.dataService,
    HaloService: serviceRegistry.getService<HaloService>(ServiceType.Halo),
    ProfileService: new ProfileService(context),
    SystemService: new SystemService(config),
    TracingService: new TracingService(config),
    DevtoolsHost: new DevtoolsService({ events: new DevtoolsHostEvents(), config, context })
  };
};
