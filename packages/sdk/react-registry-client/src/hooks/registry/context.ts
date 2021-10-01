//
// Copyright 2020 DXOS.org
//

import { createContext } from 'react';

import { RegistryApi } from '@dxos/registry-api';

type ContextValue = {
  registry?: RegistryApi | undefined,
}
export const RegistryContext = createContext<ContextValue | undefined>(undefined);
