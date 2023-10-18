//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ClientPlugin } from '@braneframe/plugin-client';
import { ErrorPlugin } from '@braneframe/plugin-error';
import { PwaPlugin } from '@braneframe/plugin-pwa';
import { TelemetryPlugin } from '@braneframe/plugin-telemetry';
import { ThemePlugin, type TranslationsProvides } from '@braneframe/plugin-theme';
import { Config, Defaults } from '@dxos/config';
import { TypedObject } from '@dxos/echo-schema';
import { type PluginDefinition, PluginProvider } from '@dxos/react-surface';

import { OpenVault, ProgressBar } from './components';
import translations from './translations';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TypedObject.name] = TypedObject;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PluginProvider
      fallback={
        <div className='flex h-screen justify-center items-center'>
          <ProgressBar indeterminate />
        </div>
      }
      plugins={[
        TelemetryPlugin({ namespace: 'composer-app', config: new Config(Defaults()) }),
        ThemePlugin({ appName: 'HALO' }),
        // Outside of error boundary so that updates are not blocked by errors.
        PwaPlugin(),
        // Inside theme provider so that errors are styled.
        ErrorPlugin(),
        ClientPlugin(),
        {
          meta: {
            id: 'dxos.org/plugin/halo-app',
          },
          provides: {
            translations,
            components: {
              default: () => {
                return (
                  <div className='flex h-screen justify-center items-center'>
                    <OpenVault />
                  </div>
                );
              },
            },
          },
        } as PluginDefinition<TranslationsProvides>,
      ]}
    />
  </StrictMode>,
);
