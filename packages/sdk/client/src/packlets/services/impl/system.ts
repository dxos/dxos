//
// Copyright 2022 DXOS.org
//

import { SystemService } from '../../proto';
import { CreateServicesOpts } from './types';

export const createSystemService = ({ config, echo }: CreateServicesOpts): SystemService => ({
  getConfig: async () => config.values,

  reset: async () => {
    await echo.reset();
  }
});
