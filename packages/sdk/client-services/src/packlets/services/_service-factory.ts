//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { NetworkManager } from '@dxos/network-manager';

import { DevtoolsHostEvents } from '../devtools';
import { HaloService, PartyService, ProfileService, SystemService, TracingService } from './impl';
import { DevtoolsService } from './impl/devtools';
import { ServiceContext } from './service-context';
import { ClientServices } from './services';
import { HaloSigner } from './signer';

/**
 * Service factory.
 */
export const createServices = ({
  config,
  context, // TODO(burdon): Too big to pass into services.?
  signer // TODO(burdon): Remove (legacy?)
}: {
  config: Config;
  context: ServiceContext;
  networkManager: NetworkManager;
  signer?: HaloSigner;
}): ClientServices => ({
  DataService: context.dataService,
  HaloService: new HaloService(null, signer), // TODO(burdon): Remove.
  PartyService: new PartyService(context),
  ProfileService: new ProfileService(context),
  SystemService: new SystemService(config),
  TracingService: new TracingService(config),
  DevtoolsHost: new DevtoolsService({ events: new DevtoolsHostEvents(), config, context })
});
