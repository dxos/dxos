//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import { withProfiler } from '@sentry/react';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, useRouteError } from 'react-router-dom';

import { initializeAppObservability } from '@dxos/observability';
import { ClientProvider, Config, Defaults } from '@dxos/react-client';
import { DensityProvider, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { Initializer, MainContainer, Root } from './components';
import translations from './translations';

// TODO(burdon): Purpose: Basic ECHO queries; evolve to replace DebugPlug (evolution of devtools as composer plugins).
// TODO(burdon): App, storybook, vite tests (in-browser and headless), playwright tests.

void initializeAppObservability({ namespace: 'testbench.dxos.org', config: new Config(Defaults()) });

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
      <Initializer>
        <MainContainer>
          <Root />
        </MainContainer>
      </Initializer>
    ),
  },
]);

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
