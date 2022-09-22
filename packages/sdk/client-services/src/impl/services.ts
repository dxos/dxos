//
// Copyright 2022 DXOS.org
//

import { ClientServices } from '../client-service';
import { createHaloService } from './halo';
import { createPartyService } from './party';
import { createProfileService } from './profile';
import { createSystemService } from './system';
import { createTracingService } from './tracing';
import { CreateServicesOpts } from './types';

// TODO(burdon): Remove factory functions.
// TODO(burdon): Rename CreateServicesOpts => ServiceContext.
export const createServices = (opts: CreateServicesOpts): Omit<ClientServices, 'DevtoolsHost'> => ({
  SystemService: createSystemService(opts),
  ProfileService: createProfileService(opts),
  HaloService: createHaloService(opts),
  PartyService: createPartyService(opts),
  DataService: opts.context.dataServiceRouter,
  TracingService: createTracingService(opts)
});
