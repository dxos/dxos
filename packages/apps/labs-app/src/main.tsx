//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ChessPlugin } from '@braneframe/plugin-chess';
import { ClientPlugin } from '@braneframe/plugin-client';
import { DebugPlugin } from '@braneframe/plugin-debug';
import { DndPlugin } from '@braneframe/plugin-dnd';
import { ErrorPlugin } from '@braneframe/plugin-error';
import { FilesPlugin } from '@braneframe/plugin-files';
import { GithubPlugin } from '@braneframe/plugin-github';
import { GraphPlugin } from '@braneframe/plugin-graph';
import { IntentPlugin } from '@braneframe/plugin-intent';
import { IpfsPlugin } from '@braneframe/plugin-ipfs';
import { KanbanPlugin } from '@braneframe/plugin-kanban';
import { MapPlugin } from '@braneframe/plugin-map';
import { MarkdownPlugin } from '@braneframe/plugin-markdown';
import { PwaPlugin } from '@braneframe/plugin-pwa';
import { SketchPlugin } from '@braneframe/plugin-sketch';
import { SpacePlugin } from '@braneframe/plugin-space';
import { SplitViewPlugin } from '@braneframe/plugin-splitview';
import { StackPlugin } from '@braneframe/plugin-stack';
import { TablePlugin } from '@braneframe/plugin-table';
import { TelemetryPlugin } from '@braneframe/plugin-telemetry';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { ThreadPlugin } from '@braneframe/plugin-thread';
import { TreeViewPlugin } from '@braneframe/plugin-treeview';
import { schema$ } from '@braneframe/types';
import {
  auroraTheme,
  bindTheme,
  focusRing,
  groupBorder,
  groupSurface,
  mx,
  popperMotion,
  surfaceElevation,
} from '@dxos/aurora-theme';
import { SpaceProxy } from '@dxos/client/echo';
import { createClientServices, Remote } from '@dxos/client/services';
import { Config, Envs, Local } from '@dxos/config';
import { EchoDatabase, TypedObject } from '@dxos/echo-schema';
import { Defaults } from '@dxos/react-client';
import { PluginProvider } from '@dxos/react-surface';

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
    ...auroraTheme,
    popover: {
      ...auroraTheme.popover,
      content: (_props, ...etc) =>
        mx(
          'z-[30] rounded-xl',
          popperMotion,
          // 'bg-orange-200',
          groupSurface,
          groupBorder,
          surfaceElevation({ elevation: 'group' }),
          focusRing,
          ...etc,
        ),
    },
  });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <PluginProvider
        plugins={[
          // TODO(burdon): Normalize namespace across apps.
          TelemetryPlugin({ namespace: 'labs.dxos.org', config: new Config(Defaults()) }),
          ThemePlugin({ appName: 'Labs', tx: labsTx }),

          // Outside of error boundary so that updates are not blocked by errors.
          PwaPlugin(),

          // Core framework.
          ErrorPlugin(),
          IntentPlugin(),
          GraphPlugin(),
          ClientPlugin({ config, services, debugIdentity: debug, schema: schema$ }),

          // Core UX.
          DndPlugin(),
          TreeViewPlugin(),
          SplitViewPlugin({ showComplementarySidebar: true }),

          // TODO(burdon): Remove need to come after SplitView.
          SpacePlugin(),

          // Composer Apps.
          FilesPlugin(),
          GithubPlugin(),
          MarkdownPlugin(),
          SketchPlugin(),
          StackPlugin(),

          // Labs Apps.
          ChessPlugin(),
          DebugPlugin(),
          IpfsPlugin(),
          KanbanPlugin(),
          MapPlugin(),
          TablePlugin(),
          ThreadPlugin(),
        ]}
      />
    </StrictMode>,
  );
};

void main();
