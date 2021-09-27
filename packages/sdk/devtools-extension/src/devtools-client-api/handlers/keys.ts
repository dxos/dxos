//
// Copyright 2020 DXOS.org
//

import { DevtoolsContext } from '@dxos/client';
import { GetKeyringKeysResponse } from '@dxos/devtools';

export const getKeyringKeys = (hook: DevtoolsContext): GetKeyringKeysResponse => {
  const { keyring } = hook;
  return { keys: keyring.keys };
};
