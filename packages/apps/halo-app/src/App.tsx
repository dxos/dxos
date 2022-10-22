//
// Copyright 2022 DXOS.org
//

import React, { useRef } from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';

import { Client } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';
import { UiKitProvider } from '@dxos/react-uikit';

import {
  AppLayout,
  AuthPage,
  CreateProfilePage,
  DevicesPage,
  IdentityPage,
  InvitationPage,
  InviteDevicePage,
  LockPage,
  RecoverProfilePage,
  RequireProfile,
  SpacePage,
  SpacesPage
} from './pages';
import translationResources from './translations';

const configProvider = async () =>
  new Config(await Dynamics(), await Envs(), Defaults());

const Routes = () => useRoutes([
  // TODO(wittjosiah): Move behind RequireProfile.
  {
    path: '/auth/:origin',
    element: <AuthPage />
  },
  {
    path: '/profile/create',
    element: <CreateProfilePage />
  },
  {
    path: '/profile/recover',
    element: <RecoverProfilePage />
  },
  {
    path: '/profile/invite-device',
    element: <InviteDevicePage />
  },
  {
    path: '/',
    element: <LockPage />
  },
  {
    path: '/',
    element: <RequireProfile redirect='/' />,
    children: [
      {
        path: '/invitation/:code',
        element: <InvitationPage />
      },
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { path: '/devices', element: <DevicesPage /> },
          { path: '/identity', element: <IdentityPage /> },
          { path: '/spaces', element: <SpacesPage /> },
          { path: '/spaces/:space', element: <SpacePage /> }
        ]
      }]
  }
]);

export const App = () => {
  const clientRef = useRef<Client>();

  console.log('[resources]', translationResources);

  return (
    <UiKitProvider resourceExtensions={translationResources}>
        <ClientProvider
          clientRef={clientRef}
          config={configProvider}
        >
          <HashRouter>
            <Routes />
          </HashRouter>
        </ClientProvider>
    </UiKitProvider>
  );
};
