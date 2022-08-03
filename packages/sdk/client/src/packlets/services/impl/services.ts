//
// Copyright 2022 DXOS.org
//

import { ClientServices } from '../../api';
import { createHaloService } from './halo';
import { createPartyService } from './party';
import { createProfileService } from './profile';
import { createSystemService } from './system';
import { CreateServicesOpts } from './types';

export const createServices = (opts: CreateServicesOpts): Omit<ClientServices, 'DevtoolsHost'> => ({
  SystemService: createSystemService(opts),
  ProfileService: createProfileService(opts),
  HaloService: createHaloService(opts),
  PartyService: createPartyService(opts),
  DataService: opts.echo.dataService,
  TracingService: {
    setTracingOptions: () => {
      throw new Error('Tracing not available.');
    },
    subscribeToRpcTrace: () => {
      throw new Error('Tracing not available.');
    }
  }
});
