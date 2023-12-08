//
// Copyright 2022 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React, { type FC, useEffect } from 'react';
import { HashRouter, useLocation } from 'react-router-dom';

import {
  BASE_TELEMETRY_PROPERTIES,
  getTelemetryIdentifier,
  setupTelemetryListeners,
} from '@braneframe/plugin-telemetry/headless';
import { log } from '@dxos/log';
import { type Observability } from '@dxos/observability';
import { type Client, ClientContext, type ClientServices, useClient } from '@dxos/react-client';
import { DensityProvider, type ThemeMode, ThemeProvider } from '@dxos/react-ui';
import { defaultTheme, bindTheme, toolbarRoot } from '@dxos/react-ui-theme';

import { ErrorBoundary } from '../components';
import { DevtoolsContextProvider, useRoutes, namespace as observabilityNamespace } from '../hooks';

const Routes = () => {
  return useRoutes();
};

// TODO(wittjosiah): Migrate devtools to use surface plugins.
const Telemetry = ({ namespace, observability }: { namespace: string; observability?: Observability }) => {
  const location = useLocation();
  const client = useClient();

  if (!observability) {
    log.warn('observability not initialized, cannot initialize devtools observability');
    return null;
  }

  useEffect(() => {
    observability.telemetryEvent({
      identityId: getTelemetryIdentifier(client),
      name: `${namespace}.page.load`,
      properties: {
        ...BASE_TELEMETRY_PROPERTIES,
        href: window.location.href,
        loadDuration: window.performance.timing.loadEventEnd - window.performance.timing.loadEventStart,
      },
    });

    return setupTelemetryListeners(namespace, client, observability);
  }, []);

  useEffect(() => {
    observability.telemetryPage({
      identityId: getTelemetryIdentifier(client),
      properties: BASE_TELEMETRY_PROPERTIES,
    });
  }, [location]);

  return null;
};

/**
 * Entrypoint for app and extension (no direct dependency on Client).
 */
export const Devtools: FC<{
  client: Client;
  services: ClientServices;
  namespace?: string;
  observability?: Observability;
}> = ({ client, services, observability, namespace = observabilityNamespace }) => {
  const state = deepSignal<{ themeMode: ThemeMode }>({ themeMode: 'dark' });
  const devtoolsTx = bindTheme({
    ...defaultTheme,
    toolbar: {
      root: (props, ...etc) => {
        return toolbarRoot(props, 'p-2', ...etc);
      },
    },
  });

  return (
    <ThemeProvider {...{ tx: devtoolsTx, themeMode: state.themeMode }}>
      <DensityProvider density='fine'>
        <ErrorBoundary>
          <ClientContext.Provider value={{ client, services }}>
            <DevtoolsContextProvider>
              <HashRouter>
                <Telemetry namespace={namespace} observability={observability} />
                <Routes />
              </HashRouter>
            </DevtoolsContextProvider>
          </ClientContext.Provider>
        </ErrorBoundary>
      </DensityProvider>
    </ThemeProvider>
  );
};
