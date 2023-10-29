//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ClientPlugin } from '@braneframe/plugin-client';
import { ErrorPlugin } from '@braneframe/plugin-error';
// import { FilesPlugin } from '@braneframe/plugin-files';
// import { GithubPlugin } from '@braneframe/plugin-github';
import { GraphPlugin } from '@braneframe/plugin-graph';
import { LayoutPlugin } from '@braneframe/plugin-layout';
import { MarkdownPlugin } from '@braneframe/plugin-markdown';
import { NavTreePlugin } from '@braneframe/plugin-navtree';
import { PwaPlugin } from '@braneframe/plugin-pwa';
// import { SketchPlugin } from '@braneframe/plugin-sketch';
import { SpacePlugin } from '@braneframe/plugin-space';
// import { StackPlugin } from '@braneframe/plugin-stack';
import { TelemetryPlugin } from '@braneframe/plugin-telemetry';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { types } from '@braneframe/types';
import { createApp } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/client/echo';
import { createClientServices } from '@dxos/client/services';
import { Config, Defaults, Envs, Local } from '@dxos/config';
import { EchoDatabase, TypedObject } from '@dxos/echo-schema';
import { ProgressBar } from '@dxos/react-ui';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TypedObject.name] = TypedObject;
(globalThis as any)[EchoDatabase.name] = EchoDatabase;
(globalThis as any)[SpaceProxy.name] = SpaceProxy;

const main = async () => {
  const config = new Config(Envs(), Local(), Defaults());
  const services = await createClientServices(config);
  const App = createApp({
    fallback: (
      <div className='flex h-screen justify-center items-center'>
        <ProgressBar indeterminate />
      </div>
    ),
    plugins: [
      // TODO(burdon): Normalize namespace across apps.
      TelemetryPlugin({ namespace: 'composer-app', config: new Config(Defaults()) }),
      ThemePlugin({ appName: 'Composer' }),

      // Outside of error boundary so that updates are not blocked by errors.
      PwaPlugin(),

      // Core framework.
      ErrorPlugin(),
      GraphPlugin(),
      ClientPlugin({ config, services, types }),

      // Core UX.
      LayoutPlugin(),
      NavTreePlugin(),

      // TODO(burdon): Remove need to come after SplitView.
      SpacePlugin(),

      // Apps.
      MarkdownPlugin(),
      // StackPlugin(),
      // FilesPlugin(),
      // GithubPlugin(),
      // SketchPlugin(),
    ],
  });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void main();
