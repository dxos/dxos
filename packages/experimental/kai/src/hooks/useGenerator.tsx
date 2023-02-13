//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { Generator } from '../proto';
import { useSpace } from './useSpace';

export const useGenerator = (): Generator => {
  const space = useSpace();
  return useMemo(() => new Generator(space!.experimental.db), [space]);
};
