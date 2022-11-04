//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';

import { DevtoolsHostEvents } from '../devtools';
import { HaloService, ProfileService, SystemService, TracingService } from './impl';
import { DevtoolsService } from './impl/devtools';
import { ServiceContext } from './service-context';
import { ClientServices } from './services';
import { HaloSigner } from './signer';

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
  return {
    // SpacesService: new SpacesServiceImpl(),
    // SpaceInvitationsService: new SpaceInvitationsServiceImpl(context.spaceManager, context.spaceInvitations),

    DataService: context.dataService,
    HaloService: new HaloService(null, signer),
    ProfileService: new ProfileService(context),
    SystemService: new SystemService(config),
    TracingService: new TracingService(config),
    DevtoolsHost: new DevtoolsService({ events: new DevtoolsHostEvents(), config, context })
  };
};
