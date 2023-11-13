//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import ChessMeta from '@braneframe/plugin-chess/meta';
import ClientMeta from '@braneframe/plugin-client/meta';
import DebugMeta from '@braneframe/plugin-debug/meta';
import ErrorMeta from '@braneframe/plugin-error/meta';
import GraphMeta from '@braneframe/plugin-graph/meta';
import LayoutMeta from '@braneframe/plugin-layout/meta';
import MetadataMeta from '@braneframe/plugin-metadata/meta';
import NavTreeMeta from '@braneframe/plugin-navtree/meta';
import PwaMeta from '@braneframe/plugin-pwa/meta';
import RegistryMeta from '@braneframe/plugin-registry/meta';
import SpaceMeta from '@braneframe/plugin-space/meta';
import TelemetryMeta from '@braneframe/plugin-telemetry/meta';
import ThemeMeta from '@braneframe/plugin-theme/meta';

import { types } from '@braneframe/types';
import { Plugin, createApp } from '@dxos/app-framework';
import { Remote, createClientServices } from '@dxos/client/services';
import { Config, Defaults, Envs, Local } from '@dxos/react-client';
import { EchoDatabase, SpaceProxy, TypedObject } from '@dxos/react-client/echo';
import { bindTheme, defaultTheme } from '@dxos/react-ui-theme';

const APP = 'arena.dxos.org';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TypedObject.name] = TypedObject;
(globalThis as any)[EchoDatabase.name] = EchoDatabase;
(globalThis as any)[SpaceProxy.name] = SpaceProxy;

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
    order: [
      TelemetryMeta,
      ThemeMeta,
      PwaMeta,
      ErrorMeta,
      GraphMeta,
      MetadataMeta,
      ClientMeta,
      LayoutMeta,
      NavTreeMeta,
      SpaceMeta,
      DebugMeta,
      ChessMeta,
    ],
    plugins: {
      [TelemetryMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-telemetry'), {
        namespace: APP,
        config: new Config(Defaults()),
      }),
      [ThemeMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-theme'), { appName: 'Arena', tx: arenaTx }),
      [PwaMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-pwa')),
      [ErrorMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-error')),
      [GraphMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-graph')),
      [MetadataMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-metadata')),
      [RegistryMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-registry')),
      [ClientMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-client'), {
        appKey: APP,
        config,
        services,
        debugIdentity: debug,
        types,
      }),
      [LayoutMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-layout')),
      [NavTreeMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-navTree')),
      [SpaceMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-space')),
      [DebugMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-debug')),
      [ChessMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-chess')),
    },
    core: [
      ClientMeta.id,
      ErrorMeta.id,
      GraphMeta.id,
      LayoutMeta.id,
      MetadataMeta.id,
      NavTreeMeta.id,
      PwaMeta.id,
      RegistryMeta.id,
      SpaceMeta.id,
      ThemeMeta.id,
      TelemetryMeta.id,
      ChessMeta.id,
    ],
  });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void main();
