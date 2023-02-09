//
// Copyright 2023 DXOS.org
//

import { useEffect } from 'react';

import { useConfig, useCurrentSpace, useSpaces } from '@dxos/react-client';

import { Generator } from '../proto';
import { useAppState } from './useAppState';

export const useDevDataGenerator = () => {
  const { dev } = useAppState();
  const config = useConfig();
  const spaces = useSpaces();
  const [space] = useCurrentSpace();

  useEffect(() => {
    if (dev && !config.get('runtime.client.storage.persistent') && spaces.length === 1 && space) {
      void new Generator(space.experimental.db).generate();
    }
  }, [dev, config, spaces, space]);
};
