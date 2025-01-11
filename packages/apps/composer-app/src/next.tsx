//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createApp, IntentPlugin, SettingsPlugin } from '@dxos/app-framework/next';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { getObservabilityGroup, isObservabilityDisabled, initializeAppObservability } from '@dxos/observability';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { ClientPlugin } from '@dxos/plugin-client';
import { DeckPlugin } from '@dxos/plugin-deck';
import { GraphPlugin } from '@dxos/plugin-graph';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { NavTreePlugin } from '@dxos/plugin-navtree';
import { SpacePlugin } from '@dxos/plugin-space';
import { ThemePlugin } from '@dxos/plugin-theme';
import { Status, Tooltip, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { ResetDialog } from './components';
import { setupConfig } from './config';
import { appKey } from './constants';
import { type PluginConfig } from './plugins';
import { WelcomePlugin } from './plugins/welcome';
import translations from './translations';
import { defaultStorageIsEmpty, isTrue, isFalse } from './util';

const main = async () => {
  TRACE_PROCESSOR.setInstanceTag('app');

  registerSignalsRuntime();

  const { defs, SaveConfig } = await import('@dxos/config');
  const { createClientServices } = await import('@dxos/react-client');
  const { Migrations } = await import('@dxos/migrations');
  const { __COMPOSER_MIGRATIONS__ } = await import('./migrations');

  Migrations.define(appKey, __COMPOSER_MIGRATIONS__);

  // Namespace for global Composer test & debug hooks.
  (window as any).composer = {};

  let config = await setupConfig();
  if (
    !config.values.runtime?.client?.storage?.dataStore &&
    (await defaultStorageIsEmpty(config.values.runtime?.client?.storage))
  ) {
    // NOTE: Set default for first time users to IDB (works better with automerge CRDTs).
    // Needs to be done before worker is created.
    await SaveConfig({
      runtime: { client: { storage: { dataStore: defs.Runtime.Client.Storage.StorageDriver.IDB } } },
    });
    config = await setupConfig();
  }

  // Intentionally do not await, don't block app startup for telemetry.
  // namespace has to match the value passed to sentryVitePlugin in vite.config.ts for sourcemaps to work.
  const observability = initializeAppObservability({ namespace: appKey, config, replayEnable: true });

  // TODO(nf): refactor.
  const observabilityDisabled = await isObservabilityDisabled(appKey);
  const observabilityGroup = await getObservabilityGroup(appKey);

  const services = await createClientServices(
    config,
    config.values.runtime?.app?.env?.DX_HOST
      ? undefined
      : () =>
          new SharedWorker(new URL('./shared-worker', import.meta.url), {
            type: 'module',
            name: 'dxos-client-worker',
          }),
    observabilityGroup,
    !observabilityDisabled,
  );

  const conf: PluginConfig = {
    appKey,
    config,
    services,
    observability,

    isDev: !['production', 'staging'].includes(config.values.runtime?.app?.env?.DX_ENVIRONMENT),
    isPwa: !isFalse(config.values.runtime?.app?.env?.DX_PWA),
    isSocket: !!(globalThis as any).__args,
    isLabs: isTrue(config.values.runtime?.app?.env?.DX_LABS),
    isStrict: !isFalse(config.values.runtime?.app?.env?.DX_STRICT),
  };

  const plugins = [
    AttentionPlugin(),
    ClientPlugin({
      config,
      services,
      onClientInitialized: async (_, client) => {
        const { LegacyTypes } = await import('./migrations');
        client.addTypes([
          LegacyTypes.DocumentType,
          LegacyTypes.FileType,
          LegacyTypes.FolderType,
          LegacyTypes.MessageType,
          LegacyTypes.SectionType,
          LegacyTypes.StackType,
          LegacyTypes.TableType,
          LegacyTypes.TextType,
          LegacyTypes.ThreadType,
        ]);
      },
      onReset: ({ target }) => {
        localStorage.clear();

        if (target === 'deviceInvitation') {
          window.location.assign(new URL('/?deviceInvitationCode=', window.location.origin));
        } else if (target === 'recoverIdentity') {
          window.location.assign(new URL('/?recoverIdentity=true', window.location.origin));
        } else {
          window.location.pathname = '/';
        }
      },
    }),
    DeckPlugin(),
    GraphPlugin(),
    IntentPlugin(),
    MarkdownPlugin(),
    NavTreePlugin(),
    SettingsPlugin(),
    SpacePlugin(),
    ThemePlugin({ appName: 'Composer', noCache: conf.isDev }),
    WelcomePlugin(),
  ];

  const App = createApp({
    fallback: ({ error }) => (
      <ThemeProvider tx={defaultTx} resourceExtensions={translations}>
        <Tooltip.Provider>
          <ResetDialog error={error} config={undefined} />
        </Tooltip.Provider>
      </ThemeProvider>
    ),
    placeholder: (
      <ThemeProvider tx={defaultTx}>
        <div className='flex flex-col justify-end bs-dvh'>
          <Status variant='main-bottom' indeterminate aria-label='Initializing' />
        </div>
      </ThemeProvider>
    ),
    plugins,
    core: plugins.map((plugin) => plugin.meta.id),
  });

  const root = document.getElementById('root')!;
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void main();
