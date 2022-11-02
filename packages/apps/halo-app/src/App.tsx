//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';
import { UiKitProvider } from '@dxos/react-uikit';
import { captureException } from '@dxos/sentry';
import { TextModel } from '@dxos/text-model';

import { ErrorsProvider, FatalError, ServiceWorkerToast } from './components';
import { useTelemetry } from './hooks';
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
  SpaceMetaPage,
  SpacePage,
  SpacesPage
} from './pages';
import translationResources from './translations';

const configProvider = async () => new Config(await Dynamics(), await Envs(), Defaults());

const Routes = () => {
  useTelemetry();

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
            { path: '/spaces/:space', element: <SpacePage /> },
            { path: '/spaces/:space/settings', element: <SpaceMetaPage /> }
          ]
        }
      ]
    }
  ]);
};

export const App = () => {
  const {
    offlineReady: [offlineReady, _setOfflineReady],
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisterError: (err) => {
      captureException(err);
      console.error(err);
    }
  });

  return (
    <UiKitProvider resourceExtensions={translationResources}>
      <ErrorsProvider>
        {/* TODO(wittjosiah): Hook up user feedback mechanism. */}
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider
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
        </ErrorBoundary>
      </ErrorsProvider>
    </UiKitProvider>
  );
};
