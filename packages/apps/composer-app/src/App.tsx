//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { useCallback } from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { fromHost, fromIFrame, Space } from '@dxos/client';
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
import { ClientProvider, useConfig } from '@dxos/react-client';
import { DOCUMENT_TYPE } from '@dxos/react-composer';
import { UiKitProvider } from '@dxos/react-uikit';
import { captureException } from '@dxos/sentry';
import { TextModel } from '@dxos/text-model';

import { SpacePage } from './pages';
import composerTranslations from './translations';

log.config({ filter: process.env.LOG_FILTER ?? 'client:debug,warn', prefix: process.env.LOG_BROWSER_PREFIX });

const configProvider = async () => new Config(await Dynamics(), Defaults());
const servicesProvider = (config: Config) => (process.env.DX_VAULT === 'false' ? fromHost(config) : fromIFrame(config));

const Routes = () => {
  useTelemetry({ namespace: 'composer-app' });
  const config = useConfig();
  // TODO(wittjosiah): Separate config for HALO UI & vault so origin doesn't need to parsed out.
  // TODO(wittjosiah): Config defaults should be available from the config.
  const remoteSource = new URL(config.get('runtime.client.remoteSource') || 'https://halo.dxos.org');

  const handleSpaceCreate = useCallback(async (space: Space) => {
    await space.database.createItem({
      model: TextModel,
      type: DOCUMENT_TYPE
    });
  }, []);

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
    <UiKitProvider
      resourceExtensions={[translations, composerTranslations]}
      fallback={<Fallback message='Loading...' />}
      appNs='composer'
    >
      <ErrorProvider>
        {/* TODO(wittjosiah): Hook up user feedback mechanism. */}
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider config={configProvider} services={servicesProvider} fallback={<GenericFallback />}>
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
