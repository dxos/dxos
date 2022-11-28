//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { fromHost, fromIFrame } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { log } from '@dxos/log';
import {
  ErrorProvider,
  Fallback,
  FatalError,
  GenericFallback,
  ServiceWorkerToast,
  useTelemetry,
  translations,
  StatusIndicator
} from '@dxos/react-appkit';
import { ClientProvider, useStatus } from '@dxos/react-client';
import { UiKitProvider } from '@dxos/react-uikit';
import { captureException } from '@dxos/sentry';

import {
  AppLayout,
  AppsPage,
  ContactsPage,
  CreateIdentityPage,
  DevicesPage,
  IdentityPage,
  JoinIdentityPage,
  LockPage,
  RecoverIdentityPage,
  RequireIdentity,
  SpacePage,
  SpacesPage
} from './pages';
import haloTranslations from './translations';

// prettier-ignore
log.config({
  filter: process.env.LOG_FILTER ?? 'halo-app:debug,client:debug,warn',
  prefix: process.env.LOG_BROWSER_PREFIX
});

const configProvider = async () => new Config(await Dynamics(), Defaults());

const StatusContainer = () => {
  const status = useStatus();
  return <StatusIndicator status={status} />;
};

const Routes = () => {
  useTelemetry({ namespace: 'halo-app' });

  return useRoutes([
    {
      path: '/',
      element: <LockPage />
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
    <UiKitProvider resourceExtensions={[translations, haloTranslations]} fallback={<Fallback message='Loading...' />}>
      <ErrorProvider>
        {/* TODO(wittjosiah): Hook up user feedback mechanism. */}
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider
            config={configProvider}
            services={(config) => (process.env.DX_VAULT === 'false' ? fromHost(config) : fromIFrame(config))}
            fallback={<GenericFallback />}
          >
            <HashRouter>
              <StatusContainer />
              <Routes />
              {needRefresh ? (
                <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
              ) : offlineReady ? (
                <ServiceWorkerToast variant='offlineReady' appNs='halo' />
              ) : null}
            </HashRouter>
          </ClientProvider>
        </ErrorBoundary>
      </ErrorProvider>
    </UiKitProvider>
  );
};
