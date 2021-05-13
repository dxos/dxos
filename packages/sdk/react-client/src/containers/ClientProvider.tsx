//
// Copyright 2020 DXOS.org
//

import React, { ReactNode, useEffect } from 'react';

import { Client } from '@dxos/client';

import { ClientContext } from '../hooks';

export interface ClientProviderProps {
  client: Client
  children?: ReactNode
}

/**
 * Root component initializes and provides the client instance to child components.
 */
const ClientProvider = ({ client, children }: ClientProviderProps) => {
  useEffect(() => {
    (window as any).__DXOS__ = client.getDevtoolsContext();
  }, []);

  return (
    <ClientContext.Provider value={client}>
      {children}
    </ClientContext.Provider>
  );
};

export default ClientProvider;
