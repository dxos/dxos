//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ChessPlugin } from '@braneframe/plugin-chess';
import { ClientPlugin } from '@braneframe/plugin-client';
import { DebugPlugin } from '@braneframe/plugin-debug';
import { ErrorPlugin } from '@braneframe/plugin-error';
import { ExplorerPlugin } from '@braneframe/plugin-explorer';
import { FilesPlugin } from '@braneframe/plugin-files';
import { GithubPlugin } from '@braneframe/plugin-github';
import { GraphPlugin } from '@braneframe/plugin-graph';
import { GridPlugin } from '@braneframe/plugin-grid';
import { IpfsPlugin } from '@braneframe/plugin-ipfs';
import { KanbanPlugin } from '@braneframe/plugin-kanban';
import { LayoutPlugin } from '@braneframe/plugin-layout';
import { MapPlugin } from '@braneframe/plugin-map';
import { MarkdownPlugin } from '@braneframe/plugin-markdown';
import { NavTreePlugin } from '@braneframe/plugin-navtree';
import { PresenterPlugin } from '@braneframe/plugin-presenter';
import { PwaPlugin } from '@braneframe/plugin-pwa';
import { SearchPlugin } from '@braneframe/plugin-search';
import { SketchPlugin } from '@braneframe/plugin-sketch';
import { SpacePlugin } from '@braneframe/plugin-space';
import { StackPlugin } from '@braneframe/plugin-stack';
import { TablePlugin } from '@braneframe/plugin-table';
import { TelemetryPlugin } from '@braneframe/plugin-telemetry';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { ThreadPlugin } from '@braneframe/plugin-thread';
import { types } from '@braneframe/types';
import { createApp } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/client/echo';
import { createClientServices, Remote } from '@dxos/client/services';
import { Config, Envs, Local } from '@dxos/config';
import { EchoDatabase, TypedObject } from '@dxos/echo-schema';
import { Defaults } from '@dxos/react-client';
import {
  defaultTheme,
  bindTheme,
  focusRing,
  groupBorder,
  groupSurface,
  mx,
  popperMotion,
  surfaceElevation,
} from '@dxos/react-ui-theme';

// TODO(wittjosiah): This ensures that typed objects and SpaceProxy are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TypedObject.name] = TypedObject;
(globalThis as any)[EchoDatabase.name] = EchoDatabase;
(globalThis as any)[SpaceProxy.name] = SpaceProxy;

const main = async () => {
  const searchParams = new URLSearchParams(window.location.search);
  const config = new Config(Remote(searchParams.get('target') ?? undefined), Envs(), Local(), Defaults());
  const services = await createClientServices(config);
  const debug = config?.values.runtime?.app?.env?.DX_DEBUG;

  // TODO(burdon): Custom theme (e.g., primary).
  const labsTx = bindTheme({
    ...defaultTheme,
    popover: {
      ...defaultTheme.popover,
      content: (_props, ...etc) =>
        mx(
          'z-[30] rounded-xl',
          popperMotion,
          groupSurface,
          groupBorder,
          surfaceElevation({ elevation: 'group' }),
          focusRing,
          ...etc,
        ),
    },
  });

  const App = createApp({
    plugins: [
      TelemetryPlugin({ namespace: 'labs.dxos.org', config: new Config(Defaults()) }),
      ThemePlugin({ appName: 'Labs', tx: labsTx }),

      // Outside of error boundary so that updates are not blocked by errors.
      PwaPlugin(),

      // Core framework.
      ErrorPlugin(),
      GraphPlugin(),
      ClientPlugin({ config, services, debugIdentity: debug, types }),

      // Core UX.
      LayoutPlugin({ showComplementarySidebar: true }),
      NavTreePlugin(),

      SpacePlugin(),
      DebugPlugin(),
      FilesPlugin(),
      GithubPlugin(),
      IpfsPlugin(),

      // Presentation plugins.
      MarkdownPlugin(),
      GridPlugin(),
      KanbanPlugin(),
      MapPlugin(),
      PresenterPlugin(), // Before Stack.
      SketchPlugin(),
      StackPlugin(),
      TablePlugin(),
      ThreadPlugin(),
      ExplorerPlugin(),
      ChessPlugin(),

      // TODO(burdon): Currently last so that action are added at end of dropdown menu.
      SearchPlugin(),
    ],
  });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void main();
