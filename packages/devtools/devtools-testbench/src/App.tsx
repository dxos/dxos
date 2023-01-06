//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';

import { Client, fromHost } from '@dxos/client';
import { ClientAndServices, PanelsContainer, sections } from '@dxos/devtools';
import { OptionsContext, Routes as KaiRoutes } from '@dxos/kai';
import { Config, Defaults } from '@dxos/config';
import { ClientContext, ClientProvider } from '@dxos/react-client';
import { ErrorBoundary } from '@dxos/react-toolkit';

/**
 * Main app container with routes.
 */
export const App: FC<{ debug?: boolean }> = ({ debug = false }) => {
  const [value, setValue] = useState<ClientAndServices | undefined>(undefined);

  // Auto-create client and profile.
  useEffect(() => {
    setTimeout(async () => {
      const config = new Config(Defaults());
      const services = fromHost(config);
      const client = new Client({
        config,
        services
      });

      await client.initialize();
      // TODO(burdon): Hangs (no error) if profile not created?
      if (!client.halo.profile) {
        await client.halo.createProfile();
      }

      setValue({ client, services: services.services });
    });
  }, []);

  if (!value) {
    return null;
  }

  // TODO(burdon): Error boundary and indicator.

  return (
    <ClientProvider value={value}>
      <OptionsContext.Provider value={{ debug }}>
        <HashRouter>
          <KaiRoutes />
        </HashRouter>
      </OptionsContext.Provider>

      {/* <PanelsContainer sections={sections} /> */}
    </ClientProvider>
  );
};
