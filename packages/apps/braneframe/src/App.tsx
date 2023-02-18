//
// Copyright 2023 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React from 'react';
import { HashRouter } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { fromHost, fromIFrame } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { log } from '@dxos/log';
import {
  appkitTranslations,
  ClientFallback,
  ErrorProvider,
  Fallback,
  FatalError,
  ServiceWorkerToastContainer
} from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';
import { osTranslations } from '@dxos/react-ui';
import { captureException } from '@dxos/sentry';

import { Routes } from './Routes';
import braneframeTranslations from './translations';

const configProvider = async () => new Config(await Dynamics(), Defaults());
const servicesProvider = (config?: Config) =>
  process.env.DX_VAULT === 'false' ? fromHost(config) : fromIFrame(config);

export const App = () => {
  const serviceWorker = useRegisterSW({
    onRegisterError: (err) => {
      captureException(err);
      log.error(err);
    }
  });

  return (
    <ThemeProvider
      appNs='braneframe'
      resourceExtensions={[appkitTranslations, osTranslations, braneframeTranslations]}
      fallback={<Fallback message='Loading...' />}
    >
      <ErrorProvider>
        {/* TODO: (wittjosiah): Hook up user feedback mechanism. */}
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider config={configProvider} services={servicesProvider} fallback={ClientFallback}>
            <HashRouter>
              <Routes />
              <ServiceWorkerToastContainer {...serviceWorker} />
            </HashRouter>
          </ClientProvider>
        </ErrorBoundary>
      </ErrorProvider>
    </ThemeProvider>
  );
};
