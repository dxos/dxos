//
// Copyright 2020 DXOS.org
//

import '@dxos-theme';

import { withProfiler } from '@sentry/react';
import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import { log } from '@dxos/log';
import { initializeAppObservability } from '@dxos/observability';
import { type Client, ClientProvider, Config, Defaults } from '@dxos/react-client';
import { type ThemeMode, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { AppContainer, Error, Main } from './components';
import { SyncBench } from './components/SyncBench';
import { getConfig } from './config';
import { Document, Item } from './data';
import { translations } from './translations';

TRACE_PROCESSOR.setInstanceTag('app');

void initializeAppObservability({
  namespace: 'testbench.dxos.org',
  config: new Config(Defaults()),
});

const router = createBrowserRouter([
  {
    path: '*',
    errorElement: <Error />,
    element: (
      <AppContainer>
        <Main />
      </AppContainer>
    ),
  },
  {
    path: '/sync-bench',
    element: <SyncBench />,
  },
]);

// TODO(burdon): Factor out. See copy paste in devtools.
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

const App = withProfiler(() => {
  const themeMode = useThemeWatcher();
  return (
    <ThemeProvider tx={defaultTx} themeMode={themeMode} resourceExtensions={translations} noCache>
      <RouterProvider router={router} />
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

  log.config({ filter: config.get('runtime.client.log.filter'), prefix: config.get('runtime.client.log.prefix') });

  const handleInitialized = async (client: Client) => {
    const searchParams = new URLSearchParams(location.search);
    const deviceInvitationCode = searchParams.get('deviceInvitationCode');
    const identity = client.halo.identity.get();
    if (!identity && !deviceInvitationCode) {
      await client.halo.createIdentity({ displayName: 'Testbench User' });
      // TODO(wittjosiah): Ideally this would be per app rather than per identity.
    } else if (deviceInvitationCode) {
      await client.shell.joinIdentity({ invitationCode: deviceInvitationCode }).then(({ identity }) => {
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

    await client.addTypes([Item, Document]);
    await client.spaces.waitUntilReady();
  };

  const root = createRoot(document.getElementById('root')!);
  root.render(
    // NOTE: StrictMode will cause the entire stack to render twice.
    <StrictMode>
      <ClientProvider
        config={config}
        createWorker={createWorker}
        shell='./shell.html'
        onInitialized={handleInitialized}
      >
        <App />
      </ClientProvider>
    </StrictMode>,
  );
};

void main();
