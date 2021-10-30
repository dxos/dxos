//
// Copyright 2020 DXOS.org
//

import { DevtoolsServiceDependencies } from '..';
import { GetConfigResponse } from '../proto/gen/dxos/devtools';

export const getConfig = (hook: DevtoolsServiceDependencies): GetConfigResponse => {
  return {
    config: JSON.stringify(hook.config.values) // TODO(marik-d): Serialize config with protobuf.
  };
};
