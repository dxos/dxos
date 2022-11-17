//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Client, fromIFrame, ObjectModel, Space } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
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
  useTelemetry
} from '@dxos/react-appkit';
import { ClientProvider, useConfig } from '@dxos/react-client';
import { LIST_TYPE } from '@dxos/react-list';
import { UiKitProvider } from '@dxos/react-uikit';
import { captureException } from '@dxos/sentry';

import { SpacePage } from './pages';
import translationResources from './translations';

const configProvider = async () => new Config(await Dynamics(), Defaults());

const clientProvider = async () => {
  const config = await configProvider();
  const client = new Client({ config, services: fromIFrame(config) });
  await client.initialize();
  return client;
};

const Routes = () => {
  // TODO(wittjosiah): Settings to disable telemetry, sync from HALO?
  useTelemetry({ namespace: 'tasks-app' });
  const config = useConfig();
  // TODO(wittjosiah): Separate config for HALO UI & vault so origin doesn't need to parsed out.
  // TODO(wittjosiah): Config defaults should be available from the config.
  const remoteSource = new URL(config.get('runtime.client.remoteSource') || 'https://halo.dxos.org');

  const handleSpaceCreate = async (space: Space) => {
    await space.database.createItem({
      model: ObjectModel,
      type: LIST_TYPE
    });
  };

  return useRoutes([
    {
      path: '/',
      element: <RequireIdentity redirect={remoteSource.origin} />,
      children: [
        {
          path: '/',
          element: <AppLayout onSpaceCreate={handleSpaceCreate} />,
          children: [
            {
              path: '/',
              element: <SpacesPage />
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
      console.error(err);
    }
  });

  return (
    <UiKitProvider resourceExtensions={translationResources} fallback={<Fallback message='Loading...' />}>
      <ErrorProvider>
        {/* TODO(wittjosiah): Hook up user feedback mechanism. */}
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider client={clientProvider} fallback={<GenericFallback />}>
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
    </UiKitProvider>
  );
};
