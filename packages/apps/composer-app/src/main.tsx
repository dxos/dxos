//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ClientPlugin } from '@braneframe/plugin-client';
import { DndPlugin } from '@braneframe/plugin-dnd';
import { ErrorPlugin } from '@braneframe/plugin-error';
import { GithubPlugin } from '@braneframe/plugin-github';
import { GraphPlugin } from '@braneframe/plugin-graph';
import { IntentPlugin } from '@braneframe/plugin-intent';
import { MarkdownPlugin } from '@braneframe/plugin-markdown';
import { PwaPlugin } from '@braneframe/plugin-pwa';
import { SpacePlugin } from '@braneframe/plugin-space';
import { SplitViewPlugin } from '@braneframe/plugin-splitview';
import { StackPlugin } from '@braneframe/plugin-stack';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { TreeViewPlugin } from '@braneframe/plugin-treeview';
import { UrlSyncPlugin } from '@braneframe/plugin-url-sync';
import { Config, Defaults } from '@dxos/config';
import { TypedObject } from '@dxos/echo-schema';
import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';
import { PluginProvider } from '@dxos/react-surface';

import { ProgressBar } from './components/ProgressBar/ProgressBar';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TypedObject.name] = TypedObject;

void initializeAppTelemetry({ namespace: 'composer-app', config: new Config(Defaults()) });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PluginProvider
      fallback={
        <div className='flex h-screen justify-center items-center'>
          <ProgressBar indeterminate />
        </div>
      }
      plugins={[
        IntentPlugin(),
        ThemePlugin({ appName: 'Composer' }),
        DndPlugin(),
        // Outside of error boundary so that updates are not blocked by errors.
        PwaPlugin(),
        // Inside theme provider so that errors are styled.
        ErrorPlugin(),
        ClientPlugin(),
        GraphPlugin(),
        TreeViewPlugin(),
        UrlSyncPlugin(),
        SplitViewPlugin({
          showComplementarySidebar: false,
        }),
        SpacePlugin(),
        MarkdownPlugin(),
        StackPlugin(),
        GithubPlugin(),
        // FilesPlugin(),
      ]}
    />
  </StrictMode>,
);
