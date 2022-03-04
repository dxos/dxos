//
// Copyright 2022 DXOS.org
//

import { ClientServices } from '../../../interfaces';
import { createHaloService } from './halo';
import { CreateServicesOpts } from './interfaces';
import { createNetworkService } from './network';
import { createPartyService } from './party';
import { createProfileService } from './profile';
import { createSystemService } from './system';

export const createServices = (opts: CreateServicesOpts): Omit<ClientServices, 'DevtoolsHost'> => {
  return {
    SystemService: createSystemService(opts),
    ProfileService: createProfileService(opts),
    HaloService: createHaloService(opts),
    PartyService: createPartyService(opts),
    DataService: opts.echo.dataService,
    TracingService: {
      setTracingOptions: () => {
        throw new Error('Tracing not available');
      },
      subscribeToRpcTrace: () => {
        throw new Error('Tracing not available');
      }
    },
    NetworkService: createNetworkService(opts)
  };
};
