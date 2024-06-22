//
// Copyright 2022 DXOS.org
//

import React, { useEffect, type FC, useState } from 'react';
import { HashRouter } from 'react-router-dom';

import { type Observability } from '@dxos/observability';
import { type Client, ClientContext, type ClientServices } from '@dxos/react-client';
import { DensityProvider, type ThemeMode, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { ErrorBoundary } from '../components';
import { DevtoolsContextProvider, useRoutes, namespace as observabilityNamespace } from '../hooks';

const Routes = () => {
  return useRoutes();
};

// TODO(burdon): Factor out. See copy paste in testbench-app.
const useThemeWatcher = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const setTheme = ({ matches: prefersDark }: { matches?: boolean }) => {
    document.documentElement.classList[prefersDark ? 'add' : 'remove']('dark');
    setThemeMode(prefersDark ? 'dark' : 'light');
  };

  useEffect(() => {
    const modeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme({ matches: modeQuery.matches });
    modeQuery.addEventListener('change', setTheme);
    return () => modeQuery.removeEventListener('change', setTheme);
  }, []);

  return themeMode;
};

// TODO(wittjosiah): Migrate devtools to use surface plugins.
const Telemetry = ({ namespace, observability }: { namespace: string; observability?: Observability }) => {
  // TODO: Add telemetry.
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
  const themeMode = useThemeWatcher();
  return (
    <ThemeProvider {...{ tx: defaultTx, themeMode }}>
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
