//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { Generator } from '@dxos/kai-types/testing';

import { useAppRouter } from '../hooks';

export const useGenerator = (): Generator | undefined => {
  const { space } = useAppRouter();
  return useMemo(() => space && new Generator(space.db), [space]);
};
