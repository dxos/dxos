//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { useMediaQuery } from '@dxos/aurora';
import { fromIFrame, fromHost } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs, Local } from '@dxos/config';
import { log } from '@dxos/log';
import {
  ThemeProvider,
  appkitTranslations,
  ClientFallback,
  ErrorProvider,
  Fallback,
  ResetDialog,
  ServiceWorkerToast,
} from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { osTranslations } from '@dxos/react-shell';
import { captureException } from '@dxos/sentry';

import composerTranslations from '../translations';

const configProvider = async () => new Config(await Dynamics(), await Envs(), Local(), Defaults());
const servicesProvider = async (config?: Config) =>
  config?.get('runtime.app.env.DX_VAULT') === 'false' ? fromHost(config) : fromIFrame(config);

export const Root = () => {
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

  const [prefersDark] = useMediaQuery('(prefers-color-scheme: dark)', { ssr: false, fallback: true });

  useEffect(() => {
    document.documentElement.classList[prefersDark ? 'add' : 'remove']('dark');
  }, [prefersDark]);

  return (
    <ThemeProvider
      themeMode={prefersDark ? 'dark' : 'light'}
      resourceExtensions={[osTranslations, appkitTranslations, composerTranslations]}
      fallback={<Fallback message='Loading...' />}
      appNs='composer'
      tooltipProviderProps={{ delayDuration: 1200, skipDelayDuration: 600, disableHoverableContent: true }}
    >
      {/* TODO(wittjosiah): Hook up user feedback mechanism. */}
      <ErrorBoundary fallback={({ error }) => <ResetDialog error={error} config={configProvider} />}>
        <ClientProvider config={configProvider} services={servicesProvider} fallback={ClientFallback}>
          <ErrorProvider config={configProvider} isDev={false}>
            <Outlet />
          </ErrorProvider>
        </ClientProvider>
      </ErrorBoundary>
      {/* NOTE: Outside error boundary so that this renders even in the event of a fatal error. */}
      {needRefresh ? (
        <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
      ) : offlineReady ? (
        <ServiceWorkerToast variant='offlineReady' />
      ) : null}
    </ThemeProvider>
  );
};
