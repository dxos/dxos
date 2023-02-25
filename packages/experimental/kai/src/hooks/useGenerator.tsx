//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { useAppRouter } from '../hooks';
import { Generator } from '../proto';

export const useGenerator = (): Generator | undefined => {
  const { space } = useAppRouter();
  return useMemo(() => space && new Generator(space.db), [space]);
};
