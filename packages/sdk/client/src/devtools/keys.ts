//
// Copyright 2020 DXOS.org
//

import { DevtoolsServiceDependencies } from '..';
import { GetKeyringKeysResponse } from '../proto/gen/dxos/devtools';

export const getKeyringKeys = (hook: DevtoolsServiceDependencies): GetKeyringKeysResponse => {
  const { keyring } = hook;
  return { keys: keyring.keys };
};
