//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';
import { useRoutes, HashRouter, useLocation } from 'react-router-dom';

import { Client } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';
import { UiKitProvider } from '@dxos/react-uikit';
import * as Telemetry from '@dxos/telemetry';
import { TextModel } from '@dxos/text-model';

// TODO(wittjosiah): Shouldn't import non-hooks from hooks.
import { isInternalUser, useTelemetry } from './hooks';
import {
  AppLayout,
  AppsPage,
  ContactsPage,
  CreateIdentityPage,
  DevicesPage,
  IdentityPage,
  JoinIdentityPage,
  JoinSpacePage,
  LockPage,
  RecoverIdentityPage,
  RequireIdentity,
  SpacePage,
  SpacesPage
} from './pages';
import translationResources from './translations';

const configProvider = async () => new Config(await Dynamics(), await Envs(), Defaults());

const Routes = () => {
  const location = useLocation();

  useEffect(() => {
    Telemetry.page({
      machineId: 'default',
      identityId: 'default',
      name: location.pathname,
      properties: {
        environment: process.env.DX_ENVIRONMENT,
        release: process.env.DX_RELEASE,
        isInternalUser: isInternalUser()
      }
    });
  }, [location]);

  return useRoutes([
    {
      path: '/',
      element: <LockPage />
    },
    {
      path: '/',
      element: <RequireIdentity inverse redirect='/spaces' />,
      children: [
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
        }
      ]
    },
    {
      path: '/',
      element: <RequireIdentity redirect='/' />,
      children: [
        {
          path: '/spaces/join',
          element: <JoinSpacePage />
        },
        {
          path: '/',
          element: <AppLayout />,
          children: [
            { path: '/devices', element: <DevicesPage /> },
            { path: '/identity', element: <IdentityPage /> },
            { path: '/spaces', element: <SpacesPage /> },
            { path: '/contacts', element: <ContactsPage /> },
            { path: '/apps', element: <AppsPage /> },
            { path: '/spaces/:space', element: <SpacePage /> }
          ]
        }
      ]
    }
  ]);
};

export const App = () => {
  const clientRef = useRef<Client>();

  // TODO(wittjosiah): Factor out to persisant settings.
  const [disableTelemetry] = useState(false);
  useTelemetry(disableTelemetry);

  return (
    <UiKitProvider resourceExtensions={translationResources}>
      <ClientProvider
        clientRef={clientRef}
        config={configProvider}
        onInitialize={async (client) => {
          client.echo.registerModel(TextModel);
        }}
      >
        <HashRouter>
          <Routes />
        </HashRouter>
      </ClientProvider>
    </UiKitProvider>
  );
};
