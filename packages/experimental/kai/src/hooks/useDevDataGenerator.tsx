//
// Copyright 2023 DXOS.org
//

import { useEffect } from 'react';

import { useConfig, useSpaces } from '@dxos/react-client';

import { Generator } from '../proto';
import { useAppState } from './useAppState';

let init = false;

export const useDevDataGenerator = () => {
  const { dev } = useAppState();
  const config = useConfig();
  const spaces = useSpaces();

  useEffect(() => {
    if (!init && dev && !config.get('runtime.client.storage.persistent') && spaces[0]) {
      void new Generator(spaces[0].experimental.db).generate();
      init = true;
    }
  }, [dev, config, spaces]);
};
