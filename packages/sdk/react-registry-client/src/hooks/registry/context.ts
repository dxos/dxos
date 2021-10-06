//
// Copyright 2020 DXOS.org
//

import { createContext } from 'react';

import type { IRegistryClient } from '@dxos/registry-client';

type ContextValue = {
  registry?: IRegistryClient | undefined,
}
export const RegistryContext = createContext<ContextValue | undefined>(undefined);
