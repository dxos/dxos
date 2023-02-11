//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { Context, createContext, useContext } from 'react';

import { Space } from '@dxos/client';

// TODO(burdon): Merge with AppState.

export type SpaceContextType = {
  space?: Space;
};

// TODO(wittjosiah): Consider using react router outlet context (see tasks app).
export const SpaceContext: Context<SpaceContextType> = createContext<SpaceContextType>({});

export const useSpace = (): Space => {
  const { space } = useContext(SpaceContext) ?? {};
  assert(space);
  return space;
};
