//
// Copyright 2022 DXOS.org
//

import { ClientServices } from './client-service';
import { createHaloService } from './impl/halo';
import { createPartyService } from './impl/party';
import { createProfileService } from './impl/profile';
import { createSystemService } from './impl/system';
import { createTracingService } from './impl/tracing';
import { CreateServicesOpts } from './types';

// TODO(burdon): Remove factory functions.
// TODO(burdon): Rename CreateServicesOpts => ServiceContext.
export const createServices = (opts: CreateServicesOpts): Omit<ClientServices, 'DevtoolsHost'> => ({
  DataService: opts.context.dataService,
  HaloService: createHaloService(opts),
  PartyService: createPartyService(opts),
  ProfileService: createProfileService(opts),
  SystemService: createSystemService(opts),
  TracingService: createTracingService(opts)
});
