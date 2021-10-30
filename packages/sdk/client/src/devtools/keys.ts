//
// Copyright 2020 DXOS.org
//

import { DevtoolsContext } from "..";
import { GetKeyringKeysResponse } from "../proto/gen/dxos/devtools";


export const getKeyringKeys = (hook: DevtoolsContext): GetKeyringKeysResponse => {
  const { keyring } = hook;
  return { keys: keyring.keys };
};
