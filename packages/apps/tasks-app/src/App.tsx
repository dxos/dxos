//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React from 'react';
import { HashRouter } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { fromHost, fromIFrame, Config } from '@dxos/client';
import { Defaults, Dynamics } from '@dxos/config';
import { log } from '@dxos/log';
import {
  ErrorProvider,
  Fallback,
  FatalError,
  GenericFallback,
  ServiceWorkerToast,
  translations,
  StatusIndicator2
} from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { UiProvider } from '@dxos/react-components';
import { captureException } from '@dxos/sentry';

import { Routes } from './Routes';
import tasksTranslations from './translations';

log.config({
  filter: process.env.LOG_FILTER ?? 'sdk:debug,warn',
  prefix: process.env.LOG_BROWSER_PREFIX
});

const configProvider = async () => new Config(await Dynamics(), Defaults());
const servicesProvider = (config: Config) => (process.env.DX_VAULT === 'false' ? fromHost(config) : fromIFrame(config));

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
    <UiProvider
      appNs='halo'
      resourceExtensions={[translations, tasksTranslations]}
      fallback={<Fallback message='Loading...' />}
    >
      <ErrorProvider>
        {/* TODO: (wittjosiah): Hook up user feedback mechanism. */}
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider config={configProvider} services={servicesProvider} fallback={<GenericFallback />}>
            <StatusIndicator2 />
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
    </UiProvider>
  );
};
