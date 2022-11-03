//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';

import { HaloService, SpaceService, ProfileService, SystemServiceImpl, TracingServiceImpl } from './impl';
import { ServiceContext } from './service-context';
import { ClientServices } from './services';
import { HaloSigner } from './signer';

/**
 * Service factory.
 */
export const createServices = ({
  config,
  context, // TODO(burdon): Split.
  echo, // TODO(burdon): Rename.
  signer
}: {
  config: Config;
  context: ServiceContext;
  echo: any;
  signer?: HaloSigner;
}): Omit<ClientServices, 'DevtoolsHost'> => ({
  DataService: context.dataService,
  HaloService: new HaloService(echo, signer), // TODO(burdon): Remove.
  PartyService: new SpaceService(context),
  ProfileService: new ProfileService(context),
  SystemService: new SystemServiceImpl(config),
  TracingService: new TracingServiceImpl(config)
});
