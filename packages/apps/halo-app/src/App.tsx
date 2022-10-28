//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { useEffect, useRef } from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';

import { Client } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';
import { UiKitProvider } from '@dxos/react-uikit';
import * as Sentry from '@dxos/sentry';
import { TextModel } from '@dxos/text-model';

import { ErrorsProvider, FatalError } from './components';
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

  useEffect(() => {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        destination: process.env.SENTRY_DSN,
        // TODO(wittjosiah): Configure this.
        sampleRate: 1.0
      });
    }
  }, []);

  return (
    <UiKitProvider resourceExtensions={translationResources}>
      <ErrorsProvider>
        {/* TODO(wittjosiah): Hook up user feedback mechanism. */}
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
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
        </ErrorBoundary>
      </ErrorsProvider>
    </UiKitProvider>
  );
};
