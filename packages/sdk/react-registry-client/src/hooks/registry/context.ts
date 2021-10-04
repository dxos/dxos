//
// Copyright 2020 DXOS.org
//

import { createContext } from 'react';

import { RegistryClient } from '@dxos/registry-client';

type ContextValue = {
  registry?: RegistryClient | undefined,
}
export const RegistryContext = createContext<ContextValue | undefined>(undefined);
