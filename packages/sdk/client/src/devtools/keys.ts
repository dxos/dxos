//
// Copyright 2020 DXOS.org
//

import { GetKeyringKeysResponse } from '../proto/gen/dxos/devtools';
import { DevtoolsServiceDependencies } from './devtools-context';

export const getKeyringKeys = (hook: DevtoolsServiceDependencies): GetKeyringKeysResponse => {
  const { keyring } = hook;
  return { keys: keyring.keys };
};
