//
// Copyright 2020 DXOS.org
//

import { GetConfigResponse } from '@dxos/protocols/proto/dxos/devtools';

import { DevtoolsServiceDependencies } from './devtools-context.js';

export const getConfig = (hook: DevtoolsServiceDependencies): GetConfigResponse => ({
  config: JSON.stringify(hook.config.values) // TODO(marik-d): Serialize config with protobuf.
});
