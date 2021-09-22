//
// Copyright 2020 DXOS.org
//

import { DevtoolsContext } from '@dxos/client';
import type { GetConfigResponse } from '@dxos/devtools';

export const getConfig = (hook: DevtoolsContext): GetConfigResponse => {
  return {
    config: JSON.parse(JSON.stringify(hook.client.config)) // make sure the config is serializable
  };
};
