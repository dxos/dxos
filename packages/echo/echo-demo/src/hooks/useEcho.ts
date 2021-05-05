//
// Copyright 2020 DXOS.org
//

import { createContext, useContext } from 'react';

import { ECHO } from '@dxos/echo-db';

interface Context {
  echo: ECHO
}

export const EchoContext = createContext<Context>(null);

/**
 * Get ECHO instance.
 */
export const useEcho = (): ECHO => {
  const { echo } = useContext(EchoContext);
  return echo;
};
