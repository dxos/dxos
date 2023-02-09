//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { useCurrentSpace } from '@dxos/react-client';

import { Generator } from '../proto';

export const useGenerator = (): Generator | undefined => {
  const [space] = useCurrentSpace();
  return useMemo(() => space && new Generator(space.experimental.db), [space]);
};
