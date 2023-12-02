//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import ClientMeta from '@braneframe/plugin-client/meta';
import ErrorMeta from '@braneframe/plugin-error/meta';
import PwaMeta from '@braneframe/plugin-pwa/meta';
import TelemetryMeta from '@braneframe/plugin-telemetry/meta';
import ThemeMeta from '@braneframe/plugin-theme/meta';
import { Plugin, type PluginDefinition, type TranslationsProvides, createApp } from '@dxos/app-framework';
import { Config, Defaults } from '@dxos/config';
import { TypedObject } from '@dxos/react-client/echo';

import { OpenVault, ProgressBar } from './components';
import translations from './translations';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TypedObject.name] = TypedObject;

const appKey = 'halo.dxos.org';
const HaloMeta = {
  id: 'dxos.org/plugin/halo-app',
};

const App = createApp({
  fallback: (
    <div className='flex h-screen justify-center items-center'>
      <ProgressBar indeterminate />
    </div>
  ),
  order: [TelemetryMeta, ThemeMeta, PwaMeta, ErrorMeta, ClientMeta, HaloMeta],
  plugins: {
    [TelemetryMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-telemetry'), {
      namespace: appKey,
      config: new Config(Defaults()),
    }),
    [ThemeMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-theme'), { appName: 'HALO' }),
    // Outside of error boundary so that updates are not blocked by errors.
    [PwaMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-pwa')),
    // Inside theme provider so that errors are styled.
    [ErrorMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-error')),
    [ClientMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-client'), { appKey }),
    [HaloMeta.id]: async () =>
      ({
        meta: HaloMeta,
        provides: {
          translations,
          root: () => {
            return (
              <div className='flex h-screen justify-center items-center'>
                <OpenVault />
              </div>
            );
          },
        },
      } as PluginDefinition<TranslationsProvides>),
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
