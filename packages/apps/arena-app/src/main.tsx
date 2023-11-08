//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ChessPlugin } from '@braneframe/plugin-chess';
import { ClientPlugin } from '@braneframe/plugin-client';
import { DebugPlugin } from '@braneframe/plugin-debug';
import { ErrorPlugin } from '@braneframe/plugin-error';
import { GraphPlugin } from '@braneframe/plugin-graph';
import { LayoutPlugin } from '@braneframe/plugin-layout';
import { MetadataPlugin } from '@braneframe/plugin-metadata';
import { NavTreePlugin } from '@braneframe/plugin-navtree';
import { PwaPlugin } from '@braneframe/plugin-pwa';
import { SpacePlugin } from '@braneframe/plugin-space';
import { TelemetryPlugin } from '@braneframe/plugin-telemetry';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { types } from '@braneframe/types';
import { createApp } from '@dxos/app-framework';
import { Remote, createClientServices } from '@dxos/client/services';
import { Config, Defaults, Envs, Local } from '@dxos/react-client';
import { defaultTheme, bindTheme } from '@dxos/react-ui-theme';

const APP = 'arena.dxos.org';

const main = async () => {
  // Dynamics allows configuration to be supplied by the hosting KUBE.

  const searchParams = new URLSearchParams(window.location.search);

  // TODO(burdon): Add monolithic flag. Currently, can set `target=file://local`.
  const config = new Config(Remote(searchParams.get('target') ?? undefined), Envs(), Local(), Defaults());

  const services = await createClientServices(config);
  const debug = config?.values.runtime?.app?.env?.DX_DEBUG;

  const arenaTx = bindTheme({
    ...defaultTheme,
  });

  const App = createApp({
    plugins: [
      TelemetryPlugin({ namespace: APP, config: new Config(Defaults()) }),

      ThemePlugin({ appName: 'Arena', tx: arenaTx }),

      // Outside of error boundary so that updates are not blocked by errors.
      PwaPlugin(),

      // Core framework.
      ErrorPlugin(),
      GraphPlugin(),
      MetadataPlugin(),
      ClientPlugin({ appKey: APP, config, services, debugIdentity: debug, types }),

      // Core UX.
      LayoutPlugin(),
      NavTreePlugin(),

      SpacePlugin(),
      DebugPlugin(),

      // Presentation plugins.
      ChessPlugin(),
    ],
  });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void main();
