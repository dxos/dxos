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
  AppLayout,
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

import { NavMenu } from './components';
import haloTranslations from './translations';

const LockPage = React.lazy(() => import('./pages/LockPage'));
const AppsPage = React.lazy(() => import('./pages/AppsPage'));
const ContactsPage = React.lazy(() => import('./pages/ContactsPage'));
const CreateIdentityPage = React.lazy(() => import('./pages/CreateIdentityPage'));
const DevicesPage = React.lazy(() => import('./pages/DevicesPage'));
const IdentityPage = React.lazy(() => import('./pages/IdentityPage'));
const JoinIdentityPage = React.lazy(() => import('./pages/JoinIdentityPage'));
const RecoverIdentityPage = React.lazy(() => import('./pages/RecoverIdentityPage'));
const RequireIdentity = React.lazy(() => import('./pages/RequireIdentity'));
const SpacePage = React.lazy(() => import('./pages/SpacePage'));
const SpacesPage = React.lazy(() => import('./pages/SpacesPage'));

// prettier-ignore
log.config({
  filter: process.env.LOG_FILTER ?? 'halo-app:debug,client:debug,config:debug,warn',
  prefix: process.env.LOG_BROWSER_PREFIX
});

const configProvider = async () => new Config(await Dynamics(), Defaults());
const serviceProvider = (config: Config) => (process.env.DX_VAULT === 'false' ? fromHost(config) : fromIFrame(config));

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
          element: <AppLayout menubarContent={<NavMenu />} suppressSpaceMenu manageProfilePath='/identity' />,
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
    <UiKitProvider
      resourceExtensions={[translations, haloTranslations]}
      fallback={<Fallback message='Loading...' />}
      appNs='halo'
    >
      <ErrorProvider>
        {/* TODO(wittjosiah): Hook up user feedback mechanism. */}
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider config={configProvider} services={serviceProvider} fallback={<GenericFallback />}>
            <HashRouter>
              <StatusContainer />
              <Routes />
              {needRefresh ? (
                <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
              ) : offlineReady ? (
                <ServiceWorkerToast variant='offlineReady' />
              ) : null}
            </HashRouter>
          </ClientProvider>
        </ErrorBoundary>
      </ErrorProvider>
    </UiKitProvider>
  );
};
