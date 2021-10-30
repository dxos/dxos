//
// Copyright 2020 DXOS.org
//

import { GetConfigResponse } from '../proto/gen/dxos/devtools';
import { DevtoolsContext } from './devtools-context';

export const getConfig = (hook: DevtoolsContext): GetConfigResponse => {
  return {
    config: JSON.stringify(hook.client.config) // make sure the config is serializable
  };
};
