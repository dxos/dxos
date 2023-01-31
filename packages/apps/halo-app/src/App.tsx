//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { fromHost, fromIFrame } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import {
  appkitTranslations,
  ClientFallback,
  ErrorProvider,
  Fallback,
  FatalError,
  ServiceWorkerToast,
  useTelemetry
} from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';
import { captureException } from '@dxos/sentry';

import { NavMenu } from './components';
import { AppLayout } from './layouts';
import { haloTranslations } from './translations';

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

export const namespace = 'halo-app';
const configProvider = async () => new Config(await Dynamics(), await Envs(), Defaults());
const serviceProvider = (config?: Config) =>
  config?.get('runtime.app.env.DX_VAULT') === 'false' ? fromHost(config) : fromIFrame(config);

const Routes = () => {
  useTelemetry({ namespace });

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
          element: <AppLayout menubarContent={<NavMenu />} manageProfilePath='/identity' />,
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
    <ThemeProvider
      resourceExtensions={[appkitTranslations, haloTranslations]}
      fallback={<Fallback message='Loading...' />}
      appNs='halo'
    >
      <ErrorProvider>
        {/* TODO(wittjosiah): Hook-up user feedback mechanism. */}
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider config={configProvider} services={serviceProvider} fallback={ClientFallback}>
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
      </ErrorProvider>
    </ThemeProvider>
  );
};
