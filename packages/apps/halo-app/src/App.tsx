//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { useEffect, useRef } from 'react';
import { HashRouter, useLocation, useRoutes } from 'react-router-dom';

import { Client } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider } from '@dxos/react-client';
import { UiKitProvider } from '@dxos/react-uikit';
import * as Sentry from '@dxos/sentry';
import * as Telemetry from '@dxos/telemetry';
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

const DX_ENVIRONMENT = process.env.DX_ENVIRONMENT ?? 'development';
const DX_RELEASE = process.env.DX_RELEASE ?? 'development';
const SENTRY_DESTINATION = process.env.SENTRY_DSN;
const TELEMETRY_API_KEY = process.env.SEGMENT_API_KEY;

const configProvider = async () => new Config(await Dynamics(), await Envs(), Defaults());

const Routes = () => {
  const location = useLocation();

  // TODO(wittjosiah): Store preference for disabling telemetry.
  //   At minimum should be stored locally (i.e., localstorage), possibly in halo preference.
  //   Needs to be hooked up to settings page for user visibility.

  useEffect(() => {
    if (SENTRY_DESTINATION) {
      Sentry.init({
        destination: SENTRY_DESTINATION,
        environment: DX_ENVIRONMENT,
        release: DX_RELEASE,
        // TODO(wittjosiah): Configure this.
        sampleRate: 1.0
      });
    }

    Telemetry.init({
      apiKey: TELEMETRY_API_KEY,
      enable: Boolean(TELEMETRY_API_KEY)
    });
  }, []);

  useAsyncEffect(async () => {
    // TODO(wittjosiah): Store uuid in halo for the purposes of usage metrics.
    // await client.halo.getGlobalPreference('dxosTelemetryIdentifier');
    const identityId = undefined;
    Telemetry.page({
      identityId,
      properties: {
        environment: DX_ENVIRONMENT,
        release: DX_RELEASE
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
