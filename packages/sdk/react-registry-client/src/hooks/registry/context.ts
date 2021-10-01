//
// Copyright 2020 DXOS.org
//

import { createContext } from 'react';

import { RegistryApi } from '@dxos/registry-client';

type ContextValue = {
  registry?: RegistryApi | undefined,
}
export const RegistryContext = createContext<ContextValue | undefined>(undefined);
