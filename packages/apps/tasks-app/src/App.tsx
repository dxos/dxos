//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { useEffect } from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { fromHost, fromIFrame, ObjectModel, Space } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { log } from '@dxos/log';
import {
  AppLayout,
  ErrorProvider,
  Fallback,
  FatalError,
  GenericFallback,
  ManageSpacePage,
  RequireIdentity,
  ServiceWorkerToast,
  SpacesPage,
  useTelemetry,
  translations
} from '@dxos/react-appkit';
import { ClientProvider, useClient, useIdentity } from '@dxos/react-client';
import { LIST_TYPE } from '@dxos/react-list';
import { UiKitProvider } from '@dxos/react-uikit';
import { captureException } from '@dxos/sentry';

import { SpacePage } from './pages';
import tasksTranslations from './translations';

log.config({
  filter: process.env.LOG_FILTER ?? 'sdk:debug,warn',
  prefix: process.env.LOG_BROWSER_PREFIX
});

const configProvider = async () => new Config(await Dynamics(), Defaults());

const Routes = () => {
  // TODO(wittjosiah): Settings to disable telemetry, sync from HALO?
  useTelemetry({ namespace: 'tasks-app' });
  const client = useClient();
  const identity = useIdentity();
  // TODO(wittjosiah): Separate config for HALO UI & vault so origin doesn't need to parsed out.
  // TODO(wittjosiah): Config defaults should be available from the config.
  const remoteSource = new URL(client.config.get('runtime.client.remoteSource') || 'https://halo.dxos.org');

  useEffect(() => {
    if (process.env.DX_VAULT === 'false' && !identity) {
      void client.halo.createProfile();
    }
  }, []);

  const handleSpaceCreate = async (space: Space) => {
    await space.database.createItem({
      model: ObjectModel,
      type: LIST_TYPE
    });
  };

  if (process.env.DX_VAULT === 'false' && !identity) {
    return null;
  }

  return useRoutes([
    {
      path: '/',
      element: <RequireIdentity redirect={remoteSource.origin} />,
      children: [
        {
          path: '/',
          element: <AppLayout spacesPath='/' />,
          children: [
            {
              path: '/',
              element: <SpacesPage onSpaceCreate={handleSpaceCreate} />
            },
            {
              path: '/spaces/:space',
              element: <SpacePage />
            },
            {
              path: '/spaces/:space/settings',
              element: <ManageSpacePage />
            }
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
      log.error(err);
    }
  });

  return (
    <UiKitProvider resourceExtensions={[translations, tasksTranslations]} fallback={<Fallback message='Loading...' />}>
      <ErrorProvider>
        {/* TODO(wittjosiah): Hook up user feedback mechanism. */}
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider
            config={configProvider}
            services={(config) => (process.env.DX_VAULT === 'false' ? fromHost(config) : fromIFrame(config))}
            fallback={<GenericFallback />}
          >
            <HashRouter>
              <Routes />
              {needRefresh ? (
                <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
              ) : offlineReady ? (
                <ServiceWorkerToast variant='offlineReady' appNs='tasks' />
              ) : null}
            </HashRouter>
          </ClientProvider>
        </ErrorBoundary>
      </ErrorProvider>
    </UiKitProvider>
  );
};
