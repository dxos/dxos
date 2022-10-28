//
// Copyright 2022 DXOS.org
//

import React, { useRef } from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Client } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';
import { UiKitProvider } from '@dxos/react-uikit';
import { TextModel } from '@dxos/text-model';

import { ServiceWorkerToast } from './components/ServiceWorkerToast/ServiceWorkerToast';
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

const Routes = () =>
  useRoutes([
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

export const App = () => {
  const clientRef = useRef<Client>();

  // TODO(wittjosiah): Factor out to notification component.
  //   Example: https://github.com/vite-pwa/vite-plugin-pwa/blob/cd7992b0ac5b2845e97f02ae4eca04ca75ef2ff9/examples/react-router/src/ReloadPrompt.tsx.
  const {
    offlineReady: [_offlineReady, _setOfflineReady],
    needRefresh: [_needRefresh, _setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisterError: (err) => {
      console.error(err);
    }
  });

  const needRefresh = false;
  const offlineReady = true;

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
          {needRefresh ? (
            <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
          ) : offlineReady ? (
            <ServiceWorkerToast variant='offlineReady' />
          ) : null}
        </HashRouter>
      </ClientProvider>
    </UiKitProvider>
  );
};
