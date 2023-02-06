//
// Copyright 2022 DXOS.org
//

import { Context, createContext, useContext } from 'react';

export type PlexusState = {
  transition?: number;
};

export const PlexusStateContext: Context<PlexusState> = createContext<PlexusState>({
  transition: 0
});

export const usePlexusState = (): PlexusState => {
  return useContext(PlexusStateContext)!;
};
