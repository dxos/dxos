//
// Copyright 2020 DXOS.org
//

import '@dxos-theme';

import * as Match from 'effect/Match';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { useApp } from '@dxos/app-framework';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { LogLevel, log } from '@dxos/log';
import { getObservabilityGroup, initializeAppObservability, isObservabilityDisabled } from '@dxos/observability';
import { ThemeProvider, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { Placeholder, ResetDialog } from './components';
import { setupConfig } from './config';
import { APP_KEY } from './constants';
import { type PluginConfig, getCore, getDefaults, getPlugins } from './plugin-defs';
import { translations } from './translations';
import { defaultStorageIsEmpty, isFalse, isTrue } from './util';

const PARAM_SAFE_MODE = 'safe';
const PARAM_LOG_LEVEL = 'log';

const main = async () => {
  const url = new URL(window.location.href);
  const safeMode = isTrue(url.searchParams.get(PARAM_SAFE_MODE), false);
  if (safeMode) {
    log.info('SAFE MODE');
  }
  const logLevel = url.searchParams.get(PARAM_LOG_LEVEL) ?? (safeMode ? 'debug' : undefined);
  if (logLevel) {
    const level = LogLevel[logLevel.toUpperCase() as keyof typeof LogLevel];
    log.config({ filter: level });
  }

  TRACE_PROCESSOR.setInstanceTag('app');

  registerSignalsRuntime();

  const { defs, SaveConfig } = await import('@dxos/config');
  const { createClientServices } = await import('@dxos/react-client');
  const { Migrations } = await import('@dxos/migrations');
  const { __COMPOSER_MIGRATIONS__ } = await import('./migrations');

  Migrations.define(APP_KEY, __COMPOSER_MIGRATIONS__);

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

  // Intentionally do not await; i.e., don't block app startup for telemetry.
  // The namespace has to match the value passed to sentryVitePlugin in vite.config.ts for sourcemaps to work.
  const observability = initializeAppObservability({
    namespace: APP_KEY,
    config,
    replayEnable: true,
  });
  const observabilityDisabled = await isObservabilityDisabled(APP_KEY);
  const observabilityGroup = await getObservabilityGroup(APP_KEY);

  const disableSharedWorker = config.values.runtime?.app?.env?.DX_HOST;
  const services = await createClientServices(
    config,
    disableSharedWorker
      ? undefined
      : () =>
          new SharedWorker(new URL('./shared-worker', import.meta.url), {
            type: 'module',
            name: 'dxos-client-worker',
          }),
    observabilityGroup,
    !observabilityDisabled,
  );

  const isTauri = !!(globalThis as any).__TAURI__;
  const isMobile = await Match.value(isTauri).pipe(
    Match.when(true, async () => {
      const { type } = await import('@tauri-apps/plugin-os');
      const osType = type();
      return osType === 'ios' || osType === 'android';
    }),
    Match.orElse(() => isTrue(config.values.runtime?.app?.env?.DX_MOBILE)),
  );

  const conf: PluginConfig = {
    appKey: APP_KEY,
    config,
    services,
    observability,

    isDev: !['production', 'staging'].includes(config.values.runtime?.app?.env?.DX_ENVIRONMENT),
    isPwa: !isFalse(config.values.runtime?.app?.env?.DX_PWA),
    isTauri,
    isMobile,
    isLabs: isTrue(config.values.runtime?.app?.env?.DX_LABS),
    isStrict: !isFalse(config.values.runtime?.app?.env?.DX_STRICT),
  };

  const plugins = getPlugins(conf);
  const core = await getCore(conf);
  const defaults = getDefaults(conf);

  const Fallback = ({ error }: { error: Error }) => (
    <ThemeProvider tx={defaultTx} resourceExtensions={translations}>
      <Tooltip.Provider>
        <ResetDialog error={error} observability={observability} />
      </Tooltip.Provider>
    </ThemeProvider>
  );

  const Main = () => {
    const App = useApp({
      fallback: Fallback,
      placeholder: Placeholder,
      plugins,
      core,
      defaults,
      cacheEnabled: true,
      safeMode,
      debounce: 1_000,
    });

    return <App />;
  };

  const root = document.getElementById('root')!;
  if (conf.isStrict) {
    createRoot(root).render(
      <StrictMode>
        <Main />
      </StrictMode>,
    );
  } else {
    createRoot(root).render(<Main />);
  }
};

void main();
