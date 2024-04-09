//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import { withProfiler } from '@sentry/react';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, useRouteError } from 'react-router-dom';

import { initializeAppObservability } from '@dxos/observability';
import { type Client, ClientProvider, Config, Defaults } from '@dxos/react-client';
import { DensityProvider, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { AppContainer, Main } from './components';
import { ItemType } from './data';
import translations from './translations';

// TODO(burdon): Purpose: Basic ECHO queries; evolve to replace DebugPlug (evolution of devtools as composer plugins).
// TODO(burdon): App, storybook, vite tests (in-browser and headless), playwright tests.

void initializeAppObservability({
  namespace: 'testbench.dxos.org',
  config: new Config(Defaults()),
});

const Error = () => {
  const error = useRouteError();
  const stack = (error as any)?.stack;
  return (
    <div className='flex flex-col m-8 p-2 gap-4 border'>
      <div className='text-blue-500'>{String(error)}</div>
      {stack && <pre className='opacity-75'>{stack}</pre>}
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <Error />,
    element: (
      <AppContainer>
        <Main />
      </AppContainer>
    ),
  },
]);

const App = withProfiler(() => {
  const handleInitialized = async (client: Client) => {
    if (!client.halo.identity.get()) {
      await client.halo.createIdentity({ displayName: 'Test User' });
    }

    client.addSchema(ItemType);

    await client.spaces.isReady.wait();
  };

  return (
    <ThemeProvider tx={defaultTx} resourceExtensions={translations}>
      <DensityProvider density='fine'>
        <ClientProvider onInitialized={handleInitialized}>
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
