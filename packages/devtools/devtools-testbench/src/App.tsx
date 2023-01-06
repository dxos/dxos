//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';

import { Client, fromHost } from '@dxos/client';
import { OptionsContext, Routes as KaiRoutes } from '@dxos/kai';
import { Config, Defaults } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';



/**
 * Main app container with routes.
 */
export const App: FC<{ debug?: boolean }> = ({ debug = false }) => {
  const [client, setClient] = useState<Client | undefined>(undefined);

  // Auto-create client and profile.
  useEffect(() => {
    setTimeout(async () => {
      const config = new Config(Defaults());
      const client = new Client({
        config,
        services: fromHost(config)
      });

      await client.initialize();
      // TODO(burdon): Hangs (no error) if profile not created?
      if (!client.halo.profile) {
        await client.halo.createProfile();
      }

      setClient(client);
    });
  }, []);

  if (!client) {
    return null;
  }

  // TODO(burdon): Error boundary and indicator.

  return (
    <ClientProvider client={client}>
      <OptionsContext.Provider value={{ debug }}>
        <HashRouter>
          <KaiRoutes />
        </HashRouter>
      </OptionsContext.Provider>
    </ClientProvider>
  );
};
