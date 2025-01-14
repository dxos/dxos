//
// Copyright 2020 DXOS.org
//

import '@dxos-theme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createApp } from '@dxos/app-framework';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { getObservabilityGroup, isObservabilityDisabled, initializeAppObservability } from '@dxos/observability';
import { Status, Tooltip, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { ResetDialog } from './components';
import { setupConfig } from './config';
import { appKey } from './constants';
import { core, defaults, plugins, type PluginConfig } from './plugins';
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

  const App = createApp({
    fallback: ({ error }) => (
      <ThemeProvider tx={defaultTx} resourceExtensions={translations}>
        <Tooltip.Provider>
          <ResetDialog error={error} config={config} />
        </Tooltip.Provider>
      </ThemeProvider>
    ),
    // TODO(burdon): Create skeleton.
    placeholder: (
      <ThemeProvider tx={defaultTx}>
        <div className='flex flex-col justify-end bs-dvh'>
          <Status variant='main-bottom' indeterminate aria-label='Initializing' />
        </div>
      </ThemeProvider>
    ),
    plugins: plugins(conf),
    core: core(conf),
    defaults: defaults(conf),
    cacheEnabled: true,
  });

  const root = document.getElementById('root')!;
  if (conf.isStrict) {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } else {
    createRoot(root).render(<App />);
  }
};

void main();
