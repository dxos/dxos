//
// Copyright 2020 DXOS.org
//

import { GetConfigResponse } from '@dxos/client-protocol';

import { DevtoolsServiceDependencies } from './devtools-context';

export const getConfig = (hook: DevtoolsServiceDependencies): GetConfigResponse => ({
  config: JSON.stringify(hook.config.values) // TODO(marik-d): Serialize config with protobuf.
});
