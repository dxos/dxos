//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import { withProfiler } from '@sentry/react';
import React, { type FC, type PropsWithChildren, StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { initializeAppObservability } from '@dxos/observability';
import { ClientProvider, Config, Defaults, useClient } from '@dxos/react-client';
import { DensityProvider, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { Root } from './components';
import { ItemType } from './data';
import translations from './translations';

// TODO(burdon): Purpose: Basic ECHO queries; evolve to replace DebugPlug (evolution of devtools as composer plugins).
// TODO(burdon): App, storybook, vite tests (in-browser and headless), playwright tests.

void initializeAppObservability({ namespace: 'testbench.dxos.org', config: new Config(Defaults()) });

const Identity: FC<PropsWithChildren> = ({ children }) => {
  const client = useClient();
  // TODO(burdon): [API]: get() here is strange; should be natural like client.spaces.default?
  const [identity, setIdentity] = useState(client.halo.identity.get());
  useEffect(() => {
    try {
      client.addSchema(ItemType);
    } catch (err) {
      // TODO(burdon): [API]: Not idempotent.
    }

    if (!identity) {
      setTimeout(async () => {
        // TODO(burdon): [API]: Need better start-up API.
        // TODO(burdon): [API]: Race condition with identity not set.
        //  Should through API-level error, not: "Error: invariant violation:"
        await client.halo.createIdentity({ displayName: 'Test User' });
        await client.spaces.isReady.wait();
        setIdentity(client.halo.identity.get());
      });
    }
  }, []);

  if (!identity) {
    return null;
  }

  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Identity>
        <Root />
      </Identity>
    ),
  },
]);

// TODO(burdon): ErrorBoundary.
const App = withProfiler(() => {
  return (
    <ThemeProvider tx={defaultTx} resourceExtensions={translations}>
      <DensityProvider density='fine'>
        <ClientProvider>
          <RouterProvider router={router} />
        </ClientProvider>
      </DensityProvider>
    </ThemeProvider>
  );
});

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
