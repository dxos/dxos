//
// Copyright 2020 DXOS.org
//

import { createContext, useContext } from 'react';

import { ECHO } from '@dxos/echo-db';

interface Context {
  echo: ECHO
}

export const EchoContext = createContext<Context | undefined>(undefined);

/**
 * Get ECHO instance.
 */
export const useEcho = (): ECHO => {
  const context = useContext(EchoContext);
  if (!context) {
    throw new Error('useEcho used outside EchoContext');
  }
  return context.echo;
};
