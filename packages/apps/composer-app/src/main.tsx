//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ClientPlugin } from '@braneframe/plugin-client';
import { DndPlugin } from '@braneframe/plugin-dnd';
import { ErrorPlugin } from '@braneframe/plugin-error';
import { FilesPlugin } from '@braneframe/plugin-files';
import { GithubPlugin } from '@braneframe/plugin-github';
import { GraphPlugin } from '@braneframe/plugin-graph';
import { IntentPlugin } from '@braneframe/plugin-intent';
import { MarkdownPlugin } from '@braneframe/plugin-markdown';
import { PwaPlugin } from '@braneframe/plugin-pwa';
import { SketchPlugin } from '@braneframe/plugin-sketch';
import { SpacePlugin } from '@braneframe/plugin-space';
import { SplitViewPlugin } from '@braneframe/plugin-splitview';
import { StackPlugin } from '@braneframe/plugin-stack';
import { TelemetryPlugin } from '@braneframe/plugin-telemetry';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { TreeViewPlugin } from '@braneframe/plugin-treeview';
import { schema$ } from '@braneframe/types';
import { ProgressBar } from '@dxos/aurora';
import { createClientServices } from '@dxos/client/services';
import { Config, Defaults, Envs, Local } from '@dxos/config';
import { TypedObject } from '@dxos/echo-schema';
import { PluginProvider } from '@dxos/react-surface';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TypedObject.name] = TypedObject;

const main = async () => {
  const config = new Config(Envs(), Local(), Defaults());
  const services = await createClientServices(config);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <PluginProvider
        fallback={
          <div className='flex h-screen justify-center items-center'>
            <ProgressBar indeterminate />
          </div>
        }
        plugins={[
          // TODO(burdon): Normalize namespace across apps.
          TelemetryPlugin({ namespace: 'composer-app', config: new Config(Defaults()) }),
          ThemePlugin({ appName: 'Composer' }),

          // Outside of error boundary so that updates are not blocked by errors.
          PwaPlugin(),

          // Core framework.
          ErrorPlugin(),
          IntentPlugin(),
          GraphPlugin(),
          // TODO(burdon): Broken if services are not provided.
          ClientPlugin({ config, services, schema: schema$ }),

          // Core UX.
          DndPlugin(),
          SplitViewPlugin(),
          TreeViewPlugin(),

          // TODO(burdon): Remove need to come after SplitView.
          SpacePlugin(),

          // Apps.
          MarkdownPlugin(),
          StackPlugin(),
          FilesPlugin(),
          GithubPlugin(),
          SketchPlugin(),
        ]}
      />
    </StrictMode>,
  );
};

void main();
