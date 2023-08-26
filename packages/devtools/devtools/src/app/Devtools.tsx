//
// Copyright 2022 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React, { FC } from 'react';
import { HashRouter } from 'react-router-dom';

import { DensityProvider, ThemeMode, ThemeProvider } from '@dxos/aurora';
import { auroraTheme, bindTheme, toolbarRoot } from '@dxos/aurora-theme';
import { useTelemetry } from '@dxos/react-appkit';
import { Client, ClientContext } from '@dxos/react-client';

import { ErrorBoundary } from '../components';
import { DevtoolsContextProvider, useRoutes, namespace as telemetryNamespace } from '../hooks';

const Routes = () => {
  return useRoutes();
};

const Telemetry = ({ namespace }: { namespace: string }) => {
  useTelemetry({ namespace });
  return null;
};

/**
 * Entrypoint for app and extension (no direct dependency on Client).
 */
export const Devtools: FC<{ client: Client; namespace?: string }> = ({ client, namespace = telemetryNamespace }) => {
  const state = deepSignal<{ themeMode: ThemeMode }>({ themeMode: 'dark' });
  const devtoolsTx = bindTheme({
    ...auroraTheme,
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
          <ClientContext.Provider value={{ client }}>
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
