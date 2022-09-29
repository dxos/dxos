//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';

import { HaloService, PartyService, ProfileService, SystemService, TracingService } from './impl';
import { ServiceContext } from './service-context';
import { ClientServices } from './services';
import { HaloSigner } from './signer';

/**
 * Service factory.
 */
export const createServices = ({
  config,
  context, // TODO(burdon): Too big to pass into services.?
  echo, // TODO(burdon): Remove (legacy?)
  signer // TODO(burdon): Remove (legacy?)
}: {
  config: Config
  context: ServiceContext
  echo: any
  signer?: HaloSigner
}): Omit<ClientServices, 'DevtoolsHost'> => ({
  DataService: context.dataService,
  HaloService: new HaloService(echo, signer), // TODO(burdon): Remove.
  PartyService: new PartyService(context),
  ProfileService: new ProfileService(context),
  SystemService: new SystemService(config),
  TracingService: new TracingService(config)
});
