//
// Copyright 2022 DXOS.org
//

import { SystemService } from '../../proto/gen/dxos/client';
import { CreateServicesOpts } from './types';

export const createSystemService = ({ config, echo }: CreateServicesOpts): SystemService => {
  return {
    getConfig: async () => {
      return config.values;
    },

    reset: async () => {
      await echo.reset();
    }
  };
};
