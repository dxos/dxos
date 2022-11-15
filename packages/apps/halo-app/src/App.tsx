//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { useEffect } from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Client } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { log } from '@dxos/log';
import { ServiceWorkerToast } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { Heading, Loading, UiKitProvider, useTranslation } from '@dxos/react-uikit';
import { captureException } from '@dxos/sentry';

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
import { useTelemetry } from './telemetry';
import translationResources from './translations';

const config = async () =>
  new Config(
    // TODO(wittjosiah): It would be useful it `null` was a valid config value which unset previously set values.
    process.env.DX_VAULT === 'false' ? { runtime: { client: { remoteSource: '' } } } : {},
    await Dynamics(),
    await Envs(),
    Defaults()
  );

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
            { path: '/spaces/:space', element: <SpacePage /> }
          ]
        }
      ]
    }
  ]);
};

const Fallback = ({ message }: { message: string }) => (
  <div className='py-8 flex flex-col gap-4' aria-live='polite'>
    <Loading label={message} size='lg' />
    <Heading level={1} className='text-lg font-light text-center'>
      {message}
    </Heading>
  </div>
);

const ClientFallback = () => {
  const { t } = useTranslation('uikit');
  return <Fallback message={t('generic loading label')} />;
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

  useEffect(() => {
    log.config({ filter: ['invitations:debug'] });
  }, []);

  return (
    <UiKitProvider resourceExtensions={translationResources} fallback={<Fallback message='Loading...' />}>
      <ErrorsProvider>
        {/* TODO(wittjosiah): Hook up user feedback mechanism. */}
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider client={new Client({ config })} fallback={<ClientFallback />}>
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
