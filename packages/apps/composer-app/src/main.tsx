//
// Copyright 2020 DXOS.org
//

// Suppress Lit dev mode warning (https://lit.dev/msg/dev-mode).
(globalThis as any).litIssuedWarnings ??= new Set();
(globalThis as any).litIssuedWarnings.add('dev-mode');

import '@dxos-theme';

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import React, { StrictMode, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { useApp } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { runAndForwardErrors } from '@dxos/effect';
import { LogBuffer, LogLevel, log } from '@dxos/log';
import { Observability } from '@dxos/observability';
import { ThemeProvider, Tooltip } from '@dxos/react-ui';
import { TRACE_PROCESSOR } from '@dxos/tracing';
import { defaultTx } from '@dxos/ui-theme';
import { getHostPlatform, isMobile as isMobile$, isTauri as isTauri$ } from '@dxos/util';

import { observabilityTranslations } from '@dxos/plugin-observability';

import { Placeholder, ResetDialog } from './components';
import { initializeObservability, setupConfig } from './config';
import { PARAM_LOG_LEVEL, PARAM_SAFE_MODE, setSafeModeUrl } from './config';
import { APP_KEY } from './constants';
import { type PluginConfig, getCore, getDefaults, getPlugins } from './plugin-defs';
import { startupProfiler } from './profiler';
import { translations } from './translations';
import { defaultStorageIsEmpty, isFalse, isTrue } from './util';

declare global {
  interface ImportMeta {
    env: ImportMetaEnv;
  }

  interface ImportMetaEnv {
    DEV: string;
  }
}

/**
 * Collects performance marks/measures from plugin-manager and dumps a startup timeline.
 */
const startupProfiler = () => {
  performance.mark('startup:main:start');

  return {
    mark: (name: string) => performance.mark(`startup:${name}`),
    dump: () => {
      performance.mark('startup:ready');
      performance.measure('startup:total', 'startup:main:start', 'startup:ready');

      const entries = performance.getEntriesByType('measure');
      const eventEntries = entries
        .filter((entry) => entry.name.startsWith('event:'))
        .sort((first, second) => first.startTime - second.startTime);
      const moduleEntries = entries
        .filter((entry) => entry.name.startsWith('module:'))
        .sort((first, second) => second.duration - first.duration);
      const startupEntries = entries
        .filter((entry) => entry.name.startsWith('startup:'))
        .sort((first, second) => first.startTime - second.startTime);

      // eslint-disable-next-line no-console
      console.group('Startup Profile');

      // eslint-disable-next-line no-console
      console.log(
        'Total startup time:',
        Math.round(entries.find((entry) => entry.name === 'startup:total')?.duration ?? 0),
        'ms',
      );

      // eslint-disable-next-line no-console
      console.table(
        startupEntries.map((entry) => ({
          Phase: entry.name.replace('startup:', ''),
          'Duration (ms)': Math.round(entry.duration),
          'Start (ms)': Math.round(entry.startTime),
        })),
      );

      // eslint-disable-next-line no-console
      console.log(`\nActivation Events (${eventEntries.length}):`);
      // eslint-disable-next-line no-console
      console.table(
        eventEntries.map((entry) => ({
          Event: entry.name.replace('event:', ''),
          'Duration (ms)': Math.round(entry.duration),
          'Start (ms)': Math.round(entry.startTime),
        })),
      );

      // eslint-disable-next-line no-console
      console.log(`\nSlowest Modules (top 20 of ${moduleEntries.length}):`);
      // eslint-disable-next-line no-console
      console.table(
        moduleEntries.slice(0, 20).map((entry) => ({
          Module: entry.name.replace('module:', ''),
          'Duration (ms)': Math.round(entry.duration),
          'Start (ms)': Math.round(entry.startTime),
        })),
      );

      // eslint-disable-next-line no-console
      console.groupEnd();
    },
  };
};

const main = async () => {
  const profiler = startupProfiler();
  const url = new URL(window.location.href);
  const safeMode = isTrue(url.searchParams.get(PARAM_SAFE_MODE), false);
  if (safeMode) {
    log.info('SAFE MODE');
    setSafeModeUrl(false);
  }
  const logLevel = url.searchParams.get(PARAM_LOG_LEVEL) ?? (safeMode ? 'debug' : undefined);
  if (logLevel) {
    const level = LogLevel[logLevel.toUpperCase() as keyof typeof LogLevel];
    log.config({ filter: level });
  }

  TRACE_PROCESSOR.setInstanceTag('app');

  const logBuffer = new LogBuffer();
  log.addProcessor(logBuffer.logProcessor);

  profiler.mark('dynamic-imports:start');
  const { defs, SaveConfig } = await import('@dxos/config');
  const { createClientServices } = await import('@dxos/react-client');
  const { Migrations } = await import('@dxos/migrations');
  const { __COMPOSER_MIGRATIONS__ } = await import('./migrations');
  profiler.mark('dynamic-imports:end');
  performance.measure('startup:dynamic-imports', 'startup:dynamic-imports:start', 'startup:dynamic-imports:end');

  Migrations.define(APP_KEY, __COMPOSER_MIGRATIONS__);

  // Namespace for global Composer test & debug hooks.
  (window as any).composer = {};
  (window as any).composer.profiler = profiler;

  profiler.mark('config:start');
  let config = await setupConfig();
  if (
    !config.values.runtime?.client?.storage?.dataStore &&
    (await defaultStorageIsEmpty(config.values.runtime?.client?.storage))
  ) {
    // NOTE: Set default for first time users to IDB (works better with automerge CRDTs).
    // Needs to be done before worker is created.
    await SaveConfig({
      runtime: {
        client: {
          storage: { dataStore: defs.Runtime.Client.Storage.StorageDriver.IDB },
        },
      },
    });
    config = await setupConfig();
  }

  profiler.mark('config:end');
  performance.measure('startup:config', 'startup:config:start', 'startup:config:end');

  const isTauri = isTauri$();
  if (isTauri) {
    const platform = getHostPlatform();
    document.body.setAttribute('data-platform', platform);
  }

  // Intentionally do not await; i.e., don't block app startup for telemetry.
  const observability = initializeObservability(config, isTauri, logBuffer);
  const observabilityDisabled = await Observability.isObservabilityDisabled(APP_KEY);
  const observabilityGroup = await Observability.getObservabilityGroup(APP_KEY);

  // Detect if this is the popover window in Tauri.
  const isPopover = await Match.value(isTauri).pipe(
    Match.when(
      true,
      Effect.fnUntraced(function* () {
        const { getCurrentWindow } = yield* Effect.promise(() => import('@tauri-apps/api/window'));
        const tauriWindow = getCurrentWindow();
        return tauriWindow.label === 'popover';
      }),
    ),
    Match.when(false, () => Effect.succeed(false)),
    Match.exhaustive,
    runAndForwardErrors,
  );

  // Detect mobile operating systems (phones only, not tablets).
  const isMobile = await Match.value(isTauri).pipe(
    Match.when(
      true,
      Effect.fnUntraced(function* () {
        const { type: osType } = yield* Effect.promise(() => import('@tauri-apps/plugin-os'));
        const platform = osType();
        return platform === 'android' || platform === 'ios';
      }),
    ),
    Match.when(false, () => Effect.sync(() => isTrue(config.values.runtime?.app?.env?.DX_MOBILE) || isMobile$())),
    Match.exhaustive,
    runAndForwardErrors,
  );

  // Use in-process coordinator (no SharedWorker) for mobile Tauri apps only. iOS WKWebView has a
  // separate SharedWorker crash bug (Apple FB11723920) unrelated to origin. Desktop Tauri uses
  // tauri-plugin-localhost which serves from http://localhost, giving SharedWorker a proper origin.
  const useSingleClientMode = isTauri && isMobile;

  profiler.mark('services:start');
  const useLocalServices = config.values.runtime?.app?.env?.DX_HOST;
  const useSharedWorker = config.values.runtime?.app?.env?.DX_SHARED_WORKER;
  const services = await createClientServices(config, {
    createWorker:
      useLocalServices || !useSharedWorker
        ? undefined
        : () =>
            new SharedWorker(new URL('./shared-worker', import.meta.url), {
              type: 'module',
              name: 'dxos-client-worker',
            }),
    createDedicatedWorker:
      useLocalServices || useSharedWorker
        ? undefined
        : () =>
            new Worker(new URL('./dedicated-worker', import.meta.url), {
              type: 'module',
              name: 'dxos-client-worker',
            }),
    createCoordinatorWorker:
      useLocalServices || useSharedWorker || useSingleClientMode
        ? undefined
        : () =>
            new SharedWorker(new URL('./coordinator-worker', import.meta.url), {
              type: 'module',
              name: 'dxos-coordinator-worker',
            }),
    // TODO(wittjosiah): Instrument opfs worker?
    createOpfsWorker: () => new Worker(new URL('@dxos/client/opfs-worker', import.meta.url), { type: 'module' }),
    singleClientMode: useSingleClientMode,
    observabilityGroup,
    signalTelemetryEnabled: !observabilityDisabled,
  });

  profiler.mark('services:end');
  performance.measure('startup:services', 'startup:services:start', 'startup:services:end');

  profiler.mark('plugins:start');
  const conf: PluginConfig = {
    appKey: APP_KEY,
    config,
    services,
    observability,
    logBuffer,

    isDev: !['production', 'staging'].includes(config.values.runtime?.app?.env?.DX_ENVIRONMENT),
    isPwa: !isFalse(config.values.runtime?.app?.env?.DX_PWA),
    isTauri,
    isPopover,
    isMobile,
    isLabs: isTrue(config.values.runtime?.app?.env?.DX_LABS),
    isStrict: !isFalse(config.values.runtime?.app?.env?.DX_STRICT),
  };

  const plugins = getPlugins(conf);
  const core = getCore(conf);
  const defaults = getDefaults(conf);
  const setupEvents = [AppActivationEvents.SetupSettings];
  profiler.mark('plugins:end');
  performance.measure('startup:plugins-init', 'startup:plugins:start', 'startup:plugins:end');

  const Fallback = ({ error }: { error: Error }) => {
    const {
      needRefresh: [needRefresh],
      updateServiceWorker,
    } = useRegisterSW();

    const handleReset = useCallback(async () => {
      localStorage.clear();
      await services.services.SystemService?.reset();
      window.location.href = window.location.origin;
    }, [services]);

    return (
      <ThemeProvider tx={defaultTx} resourceExtensions={[...translations, ...observabilityTranslations]}>
        <Tooltip.Provider>
          <ResetDialog
            error={error}
            logBuffer={logBuffer}
            observability={observability}
            needRefresh={needRefresh}
            onRefresh={needRefresh ? () => void updateServiceWorker(true) : undefined}
            onReset={import.meta.env.DEV ? handleReset : undefined}
          />
        </Tooltip.Provider>
      </ThemeProvider>
    );
  };

  const Main = () => {
    const App = useApp({
      fallback: Fallback,
      placeholder: Placeholder,
      plugins,
      core,
      defaults,
      setupEvents,
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
