//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { HashRouter } from 'react-router-dom';

import { DensityProvider } from '@dxos/aurora';
import { ClientServices } from '@dxos/client';
import { appkitTranslations, Fallback, useTelemetry, ThemeProvider } from '@dxos/react-appkit';
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

// Entry point that does not have opinion on Client, so it can be reused in extension.
export const Devtools = ({
  context,
  namespace = telemetryNamespace,
}: {
  context?: { client: Client; services?: ClientServices };
  namespace?: string;
}) => {
  const fallback = <Fallback message='Loading...' />;
  if (!context) {
    return fallback;
  }

  return (
    <ThemeProvider appNs='devtools' resourceExtensions={[appkitTranslations]} fallback={fallback}>
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
