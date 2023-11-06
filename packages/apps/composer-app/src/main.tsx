//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ClientPlugin } from '@braneframe/plugin-client';
import { DebugPlugin } from '@braneframe/plugin-debug';
import { ErrorPlugin } from '@braneframe/plugin-error';
import { FilesPlugin } from '@braneframe/plugin-files';
import { GithubPlugin } from '@braneframe/plugin-github';
import { GraphPlugin } from '@braneframe/plugin-graph';
import { IpfsPlugin } from '@braneframe/plugin-ipfs';
import { LayoutPlugin } from '@braneframe/plugin-layout';
import { MarkdownPlugin } from '@braneframe/plugin-markdown';
import { MetadataPlugin } from '@braneframe/plugin-metadata';
import { NavTreePlugin } from '@braneframe/plugin-navtree';
import { PresenterPlugin } from '@braneframe/plugin-presenter';
import { PwaPlugin } from '@braneframe/plugin-pwa';
import { SketchPlugin } from '@braneframe/plugin-sketch';
import { SpacePlugin } from '@braneframe/plugin-space';
import { StackPlugin } from '@braneframe/plugin-stack';
import { TelemetryPlugin } from '@braneframe/plugin-telemetry';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { types, Document, Folder, File, Table, Sketch, Stack } from '@braneframe/types';
import { createApp, LayoutAction } from '@dxos/app-framework';
import { SpaceProxy, Text, TypedObject } from '@dxos/client/echo';
import { createClientServices } from '@dxos/client/services';
import { Config, Defaults, Envs, Local } from '@dxos/config';
import { EchoDatabase } from '@dxos/echo-schema';
import { ProgressBar } from '@dxos/react-ui';

import { INITIAL_CONTENT, INITIAL_TITLE } from './initialContent';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TypedObject.name] = TypedObject;
(globalThis as any)[EchoDatabase.name] = EchoDatabase;
(globalThis as any)[SpaceProxy.name] = SpaceProxy;

// TODO(wittjosiah): Remove. Used to be able to access types from the console.
(window as any).dxos.types = {
  Document,
  File,
  Folder,
  Sketch,
  Stack,
  Table,
};

const APP = 'composer.dxos.org';

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
      // Needs to run ASAP on startup (but not blocking).
      // TODO(burdon): Normalize namespace across apps (composer.dxos.org).
      TelemetryPlugin({ namespace: 'composer-app', config: new Config(Defaults()) }),

      // Outside of error boundary so error dialog is styled.
      ThemePlugin({ appName: 'Composer' }),

      // Outside of error boundary so that updates are not blocked by errors.
      PwaPlugin(),

      // Core framework.
      // TODO(wittjosiah): Factor out to app framework.
      ErrorPlugin(),

      // Core UX.
      LayoutPlugin(),
      NavTreePlugin(),

      // Application data integrations.
      ClientPlugin({ appKey: APP, config, services, types }),
      SpacePlugin({
        onFirstRun: ({ personalSpaceFolder, dispatch }) => {
          const document = new Document({ title: INITIAL_TITLE, content: new Text(INITIAL_CONTENT) });
          personalSpaceFolder.objects.push(document);

          void dispatch({
            action: LayoutAction.ACTIVATE,
            data: { id: document.id },
          });
        },
      }),
      DebugPlugin(),
      FilesPlugin(),
      GithubPlugin(),
      IpfsPlugin(),

      // Presentation plugins.
      MarkdownPlugin(),
      PresenterPlugin(), // Before Stack.
      StackPlugin(),
      SketchPlugin(),

      // App framework extensions.
      // TODO(wittjosiah): Space plugin currently needs to be before the Graph plugin.
      //  Root folder needs to be created before the graph is built or else it's not ordered first.
      GraphPlugin(),
      MetadataPlugin(),
    ],
  });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void main();
