//
// Copyright 2022 DXOS.org
//

import { ClientServices } from '../../../interfaces';
import { CreateServicesOpts } from './interfaces';
import { createPartyService } from './party';
import { createProfileService } from './profile';
import { createSystemService } from './system';

export const createServices = (opts: CreateServicesOpts): Omit<ClientServices, 'DevtoolsHost'> => {
  return {
    SystemService: createSystemService(opts),
    ProfileService: createProfileService(opts),
    PartyService: createPartyService(opts),
    DataService: opts.echo.dataService,
    TracingService: {
      SetTracingOptions: () => {
        throw new Error('Tracing not available');
      },
      SubscribeToRpcTrace: () => {
        throw new Error('Tracing not available');
      }
    }
  };
};
