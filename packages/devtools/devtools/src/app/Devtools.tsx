//
// Copyright 2022 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React from 'react';
import { HashRouter } from 'react-router-dom';

import { DensityProvider, ThemeMode, ThemeProvider } from '@dxos/aurora';
import { auroraTx } from '@dxos/aurora-theme';
import { useTelemetry } from '@dxos/react-appkit';
import { ClientServices, Client, ClientContext } from '@dxos/react-client';

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
export const Devtools = ({
  context,
  namespace = telemetryNamespace,
}: {
  context?: { client: Client; services?: ClientServices };
  namespace?: string;
}) => {
  const state = deepSignal<{ themeMode: ThemeMode }>({ themeMode: 'dark' });
  if (!context) {
    return null;
  }

  return (
    <ThemeProvider {...{ tx: auroraTx, themeMode: state.themeMode }}>
      <DensityProvider density='fine'>
        <ErrorBoundary>
          <ClientContext.Provider value={context}>
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
