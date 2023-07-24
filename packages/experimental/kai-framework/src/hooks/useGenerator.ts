//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { Generator } from '@dxos/kai-types/testing';
import { Space } from '@dxos/react-client/echo';

export const useGenerator = (space: Space | undefined): Generator | undefined => {
  return useMemo(() => space && new Generator(space.db), [space]);
};
