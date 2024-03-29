//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import ClientMeta from '@braneframe/plugin-client/meta';
import ObservabilityMeta from '@braneframe/plugin-observability/meta';
import PwaMeta from '@braneframe/plugin-pwa/meta';
import ThemeMeta from '@braneframe/plugin-theme/meta';
import { Plugin, type PluginDefinition, type TranslationsProvides, createApp } from '@dxos/app-framework';
import { Config, Defaults, Envs, Local } from '@dxos/config';
import { initializeAppObservability } from '@dxos/observability';
import { fromHost, fromIFrame } from '@dxos/react-client';

import { OpenVault, ProgressBar } from './components';
import translations from './translations';

const appKey = 'halo.dxos.org';
const HaloMeta = {
  id: 'dxos.org/plugin/halo-app',
};

const main = async () => {
  const config = new Config(Envs(), Local(), Defaults());
  const observability = initializeAppObservability({ namespace: appKey, config });
  const services = config.get('runtime.app.env.DX_HOST') ? fromHost(config) : fromIFrame(config);

  const App = createApp({
    placeholder: (
      <div className='flex h-screen justify-center items-center'>
        <ProgressBar indeterminate />
      </div>
    ),
    order: [ObservabilityMeta, ThemeMeta, PwaMeta, ClientMeta, HaloMeta],
    plugins: {
      [ObservabilityMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-observability'), {
        namespace: appKey,
        observability: () => observability,
      }),
      [ThemeMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-theme'), { appName: 'HALO' }),
      // Outside of error boundary so that updates are not blocked by errors.
      [PwaMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-pwa')),
      // Inside theme provider so that errors are styled.
      [ClientMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-client'), {
        appKey,
        services,
        config,
      }),
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
        }) as PluginDefinition<TranslationsProvides>,
    },
  });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void main();
