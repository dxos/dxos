//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { fromIFrame } from '@dxos/client';
import { fromHost } from '@dxos/client-services';
import { Config, ConfigProto, Defaults, Dynamics, Envs } from '@dxos/config';
import { log } from '@dxos/log';
import {
  appkitTranslations,
  ClientFallback,
  ErrorProvider,
  Fallback,
  FatalError,
  ServiceWorkerToast
} from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';
import { osTranslations } from '@dxos/react-ui';
import { captureException } from '@dxos/sentry';

import composerTranslations from '../../translations';
import { DocumentLayout } from '../DocumentLayout';

// TODO(wittjosiah): Remove once cloudflare proxy stops messing with cache.
const configOverride: ConfigProto = window.location.hostname.includes('localhost')
  ? {}
  : {
      runtime: {
        client: { remoteSource: `https://${window.location.hostname.replace('composer', 'halo')}/vault.html` }
      }
    };
const configProvider = async () => new Config(configOverride, await Dynamics(), await Envs(), Defaults());
const servicesProvider = (config?: Config) =>
  config?.get('runtime.app.env.DX_VAULT') === 'false' ? fromHost(config) : fromIFrame(config);

export const Root = () => {
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
    <ThemeProvider
      resourceExtensions={[osTranslations, appkitTranslations, composerTranslations]}
      fallback={<Fallback message='Loading...' />}
      appNs='composer'
      tooltipProviderProps={{ delayDuration: 1200, skipDelayDuration: 600, disableHoverableContent: true }}
    >
      <ErrorProvider>
        {/* TODO(wittjosiah): Hook up user feedback mechanism. */}
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider config={configProvider} services={servicesProvider} fallback={ClientFallback}>
            <DocumentLayout />
          </ClientProvider>
        </ErrorBoundary>
      </ErrorProvider>
      {/* NOTE: Outside error boundary so that this renders even in the event of a fatal error. */}
      {needRefresh ? (
        <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
      ) : offlineReady ? (
        <ServiceWorkerToast variant='offlineReady' />
      ) : null}
    </ThemeProvider>
  );
};
