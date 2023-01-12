//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';

import { Client, fromHost, fromIFrame } from '@dxos/client';
import { Config, Defaults } from '@dxos/config';
import { RequireIdentity } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';
import { osTranslations } from '@dxos/react-ui';

import { AppView, OptionsContext } from '../hooks';
import { schema } from '../proto';
import {
  CreateIdentityPage,
  InitPage,
  JoinIdentityPage,
  JoinSpacePage,
  RecoverIdentityPage,
  SettingsPage,
  SpacePage
} from './pages';

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
      path: '/identity/create',
      element: <CreateIdentityPage />
    },
    {
      path: '/identity/recover',
      element: <RecoverIdentityPage />
    },
    {
      path: '/identity/join',
      element: <JoinIdentityPage />
    },
    {
      path: '/',
      element: <RequireIdentity redirect='/' />,
      children: [
        {
          path: '/settings',
          element: <SettingsPage />
        },
        {
          path: '/space/join',
          element: <JoinSpacePage />
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
      ]
    }
  ]);
};

const clientProvider = async () => {
  const config = new Config(Defaults());
  const client = new Client({
    config,
    services: process.env.DX_VAULT === 'true' ? fromIFrame(config) : fromHost(config)
  });

  client.echo.dbRouter.setSchema(schema);
  await client.initialize();
  return client;
};

/**
 * Main app container with routes.
 */
export const App: FC<{ views: AppView[]; debug?: boolean; demo?: boolean }> = ({
  views,
  debug = false,
  demo = true
}) => {
  // TODO(burdon): Error boundary and indicator.
  return (
    <ClientProvider client={clientProvider}>
      <OptionsContext.Provider value={{ debug, demo, views }}>
        <ThemeProvider resourceExtensions={[osTranslations]}>
          <HashRouter>
            <Routes />
          </HashRouter>
        </ThemeProvider>
      </OptionsContext.Provider>
    </ClientProvider>
  );
};
