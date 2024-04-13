//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import { withProfiler } from '@sentry/react';
import React, { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { initializeAppObservability } from '@dxos/observability';
import { type Client, ClientProvider, Config, Defaults } from '@dxos/react-client';
import { DensityProvider, type ThemeMode, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { AppContainer, Main, Error, Connector } from './components';
import { getConfig } from './config';
import { ItemType, DocumentType } from './data';
import translations from './translations';

void initializeAppObservability({
  namespace: 'testbench.dxos.org',
  config: new Config(Defaults()),
});

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
  {
    path: '/test',
    element: <Connector />,
  },
]);

// TODO(burdon): Factor out.
const useThemeWatcher = () => {
  const [themeMode, setThemeMode] = React.useState<ThemeMode>('dark');
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

const App = withProfiler(() => {
  const config = () => getConfig();
  const themeMode = useThemeWatcher();

  const handleInitialized = async (client: Client) => {
    if (!client.halo.identity.get()) {
      await client.halo.createIdentity({ displayName: 'Test User' });
    }

    // TODO(burdon): [API]: Pass array.
    // TODO(burdon): [API]: Get array of registered schema.
    client.addSchema(ItemType, DocumentType);
    await client.spaces.isReady.wait();
  };

  return (
    <ThemeProvider tx={defaultTx} themeMode={themeMode} resourceExtensions={translations}>
      <DensityProvider density='fine'>
        <ClientProvider config={config} shell='./shell.html' onInitialized={handleInitialized}>
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
