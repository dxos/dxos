//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { Space } from '@dxos/client';
import { Generator } from '@dxos/kai-types/testing';

export const useGenerator = (space: Space | undefined): Generator | undefined => {
  return useMemo(() => space && new Generator(space.db), [space]);
};
