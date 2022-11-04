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
import { ClientServices } from './services';
import { HaloSigner } from './signer';
import { SpacesServiceImpl } from './spaces';

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
  // TODO(burdon): Services must be created incrementally (e.g., may require profile).

  assert(context.spaceManager);
  assert(context.spaceInvitations);

  return {
    SpacesService: new SpacesServiceImpl(),
    SpaceInvitationService: new SpaceInvitationsServiceImpl(context.spaceManager, context.spaceInvitations),

    DataService: context.dataService,
    HaloService: new HaloService(null, signer), // TODO(burdon): Remove.
    ProfileService: new ProfileService(context),
    SystemService: new SystemService(config),
    TracingService: new TracingService(config),
    DevtoolsHost: new DevtoolsService({ events: new DevtoolsHostEvents(), config, context })
  };
};
