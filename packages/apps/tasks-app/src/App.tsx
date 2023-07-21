//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary, withProfiler } from '@sentry/react';
import React from 'react';
import { HashRouter } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { log } from '@dxos/log';
import {
  appkitTranslations,
  ClientFallback,
  ErrorProvider,
  Fallback,
  ResetDialog,
  ServiceWorkerToast,
  ThemeProvider,
} from '@dxos/react-appkit';
import { Config, Defaults, Dynamics, Envs, Local, fromIFrame, fromHost, ClientProvider } from '@dxos/react-client';
import { osTranslations } from '@dxos/react-shell';
import { captureException } from '@dxos/sentry';

import { Routes } from './Routes';
import tasksTranslations from './translations';

const configProvider = async () => new Config(await Dynamics(), await Envs(), Local(), Defaults());
const servicesProvider = (config?: Config) =>
  config?.get('runtime.app.env.DX_VAULT') === 'false' ? fromHost(config) : fromIFrame(config);

export const App = withProfiler(() => {
  const {
    offlineReady: [offlineReady, _setOfflineReady],
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (err) => {
      captureException(err);
      log.error(err);
    },
  });

  return (
    <ThemeProvider
      appNs='halo'
      resourceExtensions={[appkitTranslations, osTranslations, tasksTranslations]}
      fallback={<Fallback message='Loading...' />}
    >
      <ErrorProvider config={configProvider}>
        {/* TODO: (wittjosiah): Hook up user feedback mechanism. */}
        <ErrorBoundary fallback={({ error }) => <ResetDialog error={error} config={configProvider} />}>
          <ClientProvider config={configProvider} services={servicesProvider} fallback={ClientFallback}>
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
});
