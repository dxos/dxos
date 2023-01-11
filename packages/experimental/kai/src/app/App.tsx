//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Client, fromHost } from '@dxos/client';
import { Config, Defaults } from '@dxos/config';
import { log } from '@dxos/log';
import { appkitTranslations, Fallback, ServiceWorkerToast } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';

import { AppView, OptionsContext } from '../hooks';
import { schema } from '../proto';
import kaiTranslations from '../translations';
import { InitPage, JoinPage, SettingsPage, SpacePage } from './pages';

/**
 * Main app routes.
 */
export const Routes = () => {
  return useRoutes([
    {
      path: '/',
      element: <InitPage />
    },
    {
      path: '/settings',
      element: <SettingsPage />
    },
    {
      path: '/join/:invitation',
      element: <JoinPage />
    },
    {
      path: '/:spaceKey',
      element: <SpacePage />,
      children: [
        {
          path: '/:spaceKey/:view',
          element: <SpacePage />
        }
      ]
    }
  ]);
};

/**
 * Main app container with routes.
 */
export const App: FC<{ views: AppView[]; debug?: boolean; demo?: boolean }> = ({
  views,
  debug = false,
  demo = true
}) => {
  const {
    offlineReady: [offlineReady, _setOfflineReady],
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisterError: (err) => {
      log.error(err);
    }
  });

  const [client, setClient] = useState<Client | undefined>(undefined);

  // Auto-create client and profile.
  useEffect(() => {
    setTimeout(async () => {
      const config = new Config(Defaults());
      const client = new Client({
        config,
        services: fromHost(config)
      });

      client.echo.dbRouter.setSchema(schema);
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
    <ThemeProvider
      appNs='kai'
      resourceExtensions={[appkitTranslations, kaiTranslations]}
      fallback={<Fallback message='Loading...' />}
    >
      <ClientProvider client={client}>
        <OptionsContext.Provider value={{ debug, demo, views }}>
          <HashRouter>
            <Routes />
            {needRefresh ? (
              <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
            ) : offlineReady ? (
              <ServiceWorkerToast variant='offlineReady' />
            ) : null}
          </HashRouter>
        </OptionsContext.Provider>
      </ClientProvider>
    </ThemeProvider>
  );
};
