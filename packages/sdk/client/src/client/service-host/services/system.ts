//
// Copyright 2022 DXOS.org
//

import { SystemService } from '../../../proto/gen/dxos/client';
import { CreateServicesOpts } from './interfaces';

export const createSystemService = ({ config, echo }: CreateServicesOpts): SystemService => {
  return {
    GetConfig: async () => {
      return {
        ...config.values,
        build: {
          ...config.values.build,
          timestamp: undefined // TODO(rzadp): Substitution did not kick in here?.
        }
      };
    },
    Reset: async () => {
      await echo.reset();
    }
  };
};
