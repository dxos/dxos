//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import { BaselimeRum } from '@baselime/react-rum';
import { withProfiler } from '@sentry/react';
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { initializeAppObservability } from '@dxos/observability';
import { type Client, ClientProvider, Config, Defaults } from '@dxos/react-client';
import { DensityProvider, type ThemeMode, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { AppContainer, Main, Error, Connector } from './components';
import { getConfig } from './config';
import { ItemType, DocumentType } from './data';
import translations from './translations';

TRACE_PROCESSOR.setInstanceTag('app');

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

// TODO(burdon): Factor out. See copy paste in devtools
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
  const themeMode = useThemeWatcher();

  return (
    <ThemeProvider tx={defaultTx} themeMode={themeMode} resourceExtensions={translations}>
      <DensityProvider density='fine'>
        <RouterProvider router={router} />
      </DensityProvider>
    </ThemeProvider>
  );
});

const main = async () => {
  const config = await getConfig();
  const createWorker = config.values.runtime?.app?.env?.DX_HOST
    ? undefined
    : () =>
        new SharedWorker(new URL('./shared-worker', import.meta.url), {
          type: 'module',
          name: 'dxos-client-worker',
        });

  const handleInitialized = async (client: Client) => {
    const searchParams = new URLSearchParams(location.search);
    const deviceInvitationCode = searchParams.get('deviceInvitationCode');
    const identity = client.halo.identity.get();
    if (!identity && !deviceInvitationCode) {
      await client.halo.createIdentity({ displayName: 'Testbench User' });
      // TODO(wittjosiah): Ideally this would be per app rather than per identity.
    } else if (deviceInvitationCode) {
      await client.shell.initializeIdentity({ invitationCode: deviceInvitationCode }).then(({ identity }) => {
        if (!identity) {
          return;
        }

        const url = new URL(window.location.href);
        const params = Array.from(url.searchParams.entries());
        const [name] = params.find(([_, value]) => value === deviceInvitationCode) ?? [null, null];
        if (name) {
          url.searchParams.delete(name);
          history.replaceState({}, document.title, url.href);
        }
      });
    }

    // TODO(burdon): [API]: Pass array.
    // TODO(burdon): [API]: Get array of registered schema.
    client.addType(ItemType, DocumentType);
    await client.spaces.isReady.wait();
  };

  const root = createRoot(document.getElementById('root')!);
  root.render(
    // NOTE: StrictMode will cause the entire stack to render twice.
    // <StrictMode>
    <BaselimeRum apiKey={config.values.runtime?.app?.env?.BASELIME_API_KEY} enableWebVitals>
      <ClientProvider
        config={config}
        createWorker={createWorker}
        shell='./shell.html'
        onInitialized={handleInitialized}
      >
        <App />
      </ClientProvider>
    </BaselimeRum>,
    // </StrictMode>,
  );
};

void main();
