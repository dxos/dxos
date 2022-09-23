//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';

import { ClientServices } from './client-service';
import { HaloService, PartyService, ProfileService, SystemService, TracingService } from './impl';
import { ServiceContext } from './service-context';
import { HaloSigner } from './signer';

// TODO(burdon): Remove factory functions.
// TODO(burdon): Rename CreateServicesOpts => ServiceContext.
export const createServices = ({
  config,
  context, // TODO(burdon): Too big to pass into services.?
  echo,
  signer
}: {
  config: Config
  context: ServiceContext
  echo: any // TODO(burdon): Remove.
  signer?: HaloSigner
}): Omit<ClientServices, 'DevtoolsHost'> => ({
  DataService: context.dataService,
  HaloService: new HaloService(echo, signer), // TODO(burdon): Remove.
  PartyService: new PartyService(context),
  ProfileService: new ProfileService(context),
  SystemService: new SystemService(config),
  TracingService: new TracingService(config)
});
