//
// Copyright 2022 DXOS.org
//

import React, { useRef } from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';

import { Client } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';
import { UiKitProvider } from '@dxos/react-uikit';
import { TextModel } from '@dxos/text-model';

import {
  AppLayout,
  AppsPage,
  ContactsPage,
  CreateProfilePage,
  DevicesPage,
  IdentityPage,
  InviteDevicePage,
  LockPage,
  RecoverProfilePage,
  RequireProfile,
  SpacePage,
  SpaceInvitationPage,
  SpacesPage
} from './pages';
import translationResources from './translations';

const configProvider = async () =>
  new Config(await Dynamics(), await Envs(), Defaults());

const Routes = () =>
  useRoutes([
    {
      // TODO(wittjosiah): This should be "identity".
      // TODO(wittjosiah): These pages should redirect to lock page if identity exists.
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
          path: '/spaces/join',
          element: <SpaceInvitationPage />
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

export const App = () => {
  const clientRef = useRef<Client>();

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
