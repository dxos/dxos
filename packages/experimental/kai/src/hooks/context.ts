//
// Copyright 2022 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { Space } from '@dxos/client';
import { EchoDatabase } from '@dxos/echo-db2';

export type SpaceContextType = {
  space: Space;
  database: EchoDatabase;
};

export const SpaceContext: Context<SpaceContextType | null> = createContext<SpaceContextType | null>(null);

export const useSpace = (): SpaceContextType => {
  return useContext(SpaceContext)!;
};
