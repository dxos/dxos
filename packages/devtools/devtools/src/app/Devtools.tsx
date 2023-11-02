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
  withTelemetry,
} from '@braneframe/plugin-telemetry/headless';
import { type Client, ClientContext, type ClientServices, useClient } from '@dxos/react-client';
import { DensityProvider, type ThemeMode, ThemeProvider } from '@dxos/react-ui';
import { defaultTheme, bindTheme, toolbarRoot } from '@dxos/react-ui-theme';

import { ErrorBoundary } from '../components';
import { DevtoolsContextProvider, useRoutes, namespace as telemetryNamespace } from '../hooks';

const Routes = () => {
  return useRoutes();
};

// TODO(wittjosiah): Migrate devtools to use surface plugins.
const Telemetry = ({ namespace }: { namespace: string }) => {
  const location = useLocation();
  const client = useClient();

  useEffect(() => {
    void withTelemetry((Telemetry) => {
      Telemetry.event({
        identityId: getTelemetryIdentifier(client),
        name: `${namespace}.page.load`,
        properties: {
          ...BASE_TELEMETRY_PROPERTIES,
          href: window.location.href,
          loadDuration: window.performance.timing.loadEventEnd - window.performance.timing.loadEventStart,
        },
      });
    });

    return setupTelemetryListeners(namespace, client);
  }, []);

  useEffect(() => {
    void withTelemetry((Telemetry) => {
      Telemetry.page({
        identityId: getTelemetryIdentifier(client),
        properties: BASE_TELEMETRY_PROPERTIES,
      });
    });
  }, [location]);

  return null;
};

/**
 * Entrypoint for app and extension (no direct dependency on Client).
 */
export const Devtools: FC<{ client: Client; services: ClientServices; namespace?: string }> = ({
  client,
  services,
  namespace = telemetryNamespace,
}) => {
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
                <Telemetry namespace={namespace} />
                <Routes />
              </HashRouter>
            </DevtoolsContextProvider>
          </ClientContext.Provider>
        </ErrorBoundary>
      </DensityProvider>
    </ThemeProvider>
  );
};
