//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';

import { Client, fromHost } from '@dxos/client';
import { ClientAndServices, PanelsContainer, sections } from '@dxos/devtools';
import { AppView, OptionsContext, Routes as KaiRoutes } from '@dxos/kai';
import { Config, Defaults } from '@dxos/config';
import { ClientContext } from '@dxos/react-client';

/**
 * Main app container with routes.
 */
export const App: FC<{ views: AppView[]; debug?: boolean }> = ({ views, debug = false, demo = true }) => {
  const [value, setValue] = useState<ClientAndServices>();

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
    <ClientContext.Provider value={value}>
      <div className='h-screen w-full grid grid-rows-2 grid-flow-col gap-4'>
        <div className='h-1/2'>
          <OptionsContext.Provider value={{ debug, views, demo }}>
            <HashRouter>
              <KaiRoutes />
            </HashRouter>
          </OptionsContext.Provider>
        </div>
        <div className='h-1/2'>
          <PanelsContainer sections={sections} />
        </div>
      </div>
    </ClientContext.Provider>
  );
};
