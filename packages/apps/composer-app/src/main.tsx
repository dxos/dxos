//
// Copyright 2020 DXOS.org
//

// NOTE: lit dev-mode warning suppression lives inline in `index.html` because
// ES module imports below this point are hoisted above any executable
// statement, so the same suppression here would run after lit's
// `queueMicrotask` warning has already fired.

import '@dxos-theme';

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import React, { StrictMode, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { type Plugin, PluginAssetCache, UrlLoader } from '@dxos/app-framework';
import { useApp } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { runAndForwardErrors } from '@dxos/effect';
import { LogBuffer, LogLevel, log } from '@dxos/log';
import { Observability } from '@dxos/observability';
import { observabilityTranslations } from '@dxos/plugin-observability';
import { ThemeProvider, Tooltip } from '@dxos/react-ui';
import { TRACE_PROCESSOR } from '@dxos/tracing';
import { defaultTx } from '@dxos/ui-theme';
import { getHostPlatform, isMobile as isMobile$, isTauri as isTauri$ } from '@dxos/util';

import { Placeholder, ResetDialog } from './components';
import { initializeObservability, PARAM_PROFILER, setupConfig } from './config';
import { PARAM_LOG_LEVEL, PARAM_SAFE_MODE, setSafeModeUrl } from './config';
import { APP_KEY } from './constants';
import { type PluginConfig, getCore, getDefaults, getPlugins } from './plugin-defs';
import { startupProfiler } from './profiler';
import { translations } from './translations';
import {
  defaultStorageIsEmpty,
  isFalse,
  isTrue,
  runStorageResetMigration,
  shouldRunStorageResetMigration,
} from './util';

declare global {
  interface ImportMeta {
    env: ImportMetaEnv;
  }

  interface ImportMetaEnv {
    DEV: string;
  }

  // Debug hook: run `downloadLogs()` from devtools to save buffered logs (same as Reset dialog).
  var downloadLogs: () => void;

  interface Window {
    /**
     * Native-DOM boot loader driver injected by `bootLoaderPlugin`
     * (`@dxos/app-framework/vite-plugin`). `status()` updates the visible
     * status line; `progress(fraction)` switches the bar from the
     * indeterminate slide to a determinate fill at `fraction` ∈ [0, 1] (or
     * pass a negative value / omit to revert to indeterminate); `dismiss()`
     * removes the loader after React mounts.
     */
    __bootLoader?: {
      status: (text: string) => void;
      progress: (fraction?: number) => void;
      dismiss: () => void;
    };
  }
}

/**
 * Updates the native-DOM boot loader text. No-op once React has replaced #root.
 * The CSS animation in `index.html` keeps painting on the compositor thread
 * regardless of main-thread work, so this is purely textual feedback.
 */
const bootStatus = (text: string) => window.__bootLoader?.status(text);

/**
 * Picks the platform-appropriate offline asset cache for third-party plugins.
 *  - Tauri (desktop + iOS): Rust-backed filesystem cache, served via the `dxos-plugin://` URI scheme.
 *  - Web with a service worker: cache managed by the SW in `./sw.ts`.
 *  - Otherwise (tests, unsupported environments): a no-op cache; plugins still
 *    load but lose their offline guarantee.
 *
 * Each branch dynamic-imports its impl so vite emits per-platform chunks instead
 * of dragging both into the initial bundle.
 */
const createAssetCache = async (isTauri: boolean): Promise<PluginAssetCache.Cache> => {
  if (isTauri) {
    const { createTauriAssetCache } = await import('./asset-cache/tauri');
    return createTauriAssetCache();
  }
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    const { createServiceWorkerAssetCache } = await import('./asset-cache/service-worker');
    return createServiceWorkerAssetCache();
  }
  return PluginAssetCache.noop();
};

const main = async () => {
  const url = new URL(window.location.href);
  const safeMode = isTrue(url.searchParams.get(PARAM_SAFE_MODE), false);
  if (safeMode) {
    log.info('SAFE MODE');
    setSafeModeUrl(false);
  }

  // The startup profiler is on by default in dev so every devloop produces
  // a BENCHMARKS row without remembering `?profiler=1`. Production explicitly
  // opts in (or out) via the URL parameter.
  const profilerEnabled = isTrue(url.searchParams.get(PARAM_PROFILER), Boolean(import.meta.env?.DEV));
  const profiler = profilerEnabled ? startupProfiler() : undefined;

  const logLevel = url.searchParams.get(PARAM_LOG_LEVEL) ?? (safeMode ? 'debug' : undefined);
  if (logLevel) {
    const level = LogLevel[logLevel.toUpperCase() as keyof typeof LogLevel];
    log.config({ filter: level });
  }

  TRACE_PROCESSOR.setInstanceTag('app');

  const logBuffer = new LogBuffer();
  log.addProcessor(logBuffer.logProcessor);

  // Mirrors `useFileDownload` from `@dxos/react-ui` (used by `ResetDialog`).
  const downloadFile = (data: Blob | string, filename: string) => {
    const url = typeof data === 'string' ? data : URL.createObjectURL(data);
    const element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', filename);
    element.setAttribute('target', 'download');
    element.click();
  };

  // TODO(dmaretskyi): Hookup to a button in the sidebar/devtools.
  globalThis.downloadLogs = () => {
    const ndjson = logBuffer.serialize();
    const file = new Blob([ndjson], { type: 'application/x-ndjson' });
    const fileName = `composer-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.ndjson`;
    downloadFile(file, fileName);
  };

  profiler?.mark('dynamic-imports:start');
  bootStatus('Loading framework…');

  // Load these in parallel; HTTP/2 multiplexes the four chunks and even on
  // local-disk the parser can interleave parses.
  const [{ Config, defs, SaveConfig }, { createClientServices }, { Migrations }, { __COMPOSER_MIGRATIONS__ }] =
    await Promise.all([
      import('@dxos/config'),
      import('@dxos/react-client'),
      import('@dxos/migrations'),
      import('./migrations'),
    ]);

  profiler?.mark('dynamic-imports:end');
  profiler?.measure('dynamic-imports', 'dynamic-imports:start', 'dynamic-imports:end');

  // Namespace for global Composer test & debug hooks.
  (window as any).composer = { profiler };

  Migrations.define(APP_KEY, __COMPOSER_MIGRATIONS__);

  profiler?.mark('config:start');
  bootStatus('Reading configuration…');

  let config = await setupConfig();
  if (shouldRunStorageResetMigration(config.values.runtime?.app?.env?.DX_ENVIRONMENT)) {
    await runStorageResetMigration();
    window.location.replace(window.location.href);
    return;
  }

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

  profiler?.mark('config:end');
  profiler?.measure('config', 'config:start', 'config:end');

  const isTauri = isTauri$();
  if (isTauri) {
    const platform = getHostPlatform();
    document.body.setAttribute('data-platform', platform);
  }

  // Intentionally do not await; the buffering backend in TRACE_PROCESSOR captures
  // early spans and replays them once the real OTEL backend registers.
  const observability = initializeObservability(config, isTauri, logBuffer);

  // Capture a one-shot `composer.startup` event when the framework dispatches
  // `app-framework:startup-activated`. Includes total ms, per-phase ms, top-5
  // slowest modules, transferred bytes (best-effort), and the boot-loader
  // visibility mark. Reads `performance.getEntriesByType` directly so production
  // builds without `?profiler=1` still get data.
  const captureStartupSummary = (): Record<string, string | number | boolean | undefined> => {
    const measures = performance.getEntriesByType('measure');
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const bootMark = performance.getEntriesByName('boot:html-parsed')[0];
    const firstInteractive = performance.getEntriesByName('app-framework:first-interactive')[0];
    const phaseDuration = (name: string): number =>
      Math.round(measures.find((measure) => measure.name === `startup:${name}`)?.duration ?? 0);
    const moduleEntries = measures
      .filter((measure) => measure.name.startsWith('module:'))
      .sort((first, second) => second.duration - first.duration);
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const transferredBytes = Math.round(resources.reduce((total, resource) => total + (resource.transferSize ?? 0), 0));
    // Flatten the top-5 modules into individual primitive keys (`top1Module`,
    // `top1Ms`, …) — observability `Attributes` only accept string | number |
    // boolean | undefined, and per-key fields are easier to filter on in
    // PostHog than a JSON blob.
    const summary: Record<string, string | number | boolean | undefined> = {
      totalMs: phaseDuration('total'),
      dynamicImportsMs: phaseDuration('dynamic-imports'),
      configMs: phaseDuration('config'),
      servicesMs: phaseDuration('services'),
      pluginsInitMs: phaseDuration('plugins-init'),
      bootLoaderVisibleMs: bootMark ? Math.round(bootMark.startTime) : undefined,
      firstInteractiveMs: firstInteractive ? Math.round(firstInteractive.startTime) : undefined,
      domContentLoadedMs: navigation ? Math.round(navigation.domContentLoadedEventEnd) : undefined,
      transferredBytes,
      moduleCount: moduleEntries.length,
    };
    moduleEntries.slice(0, 5).forEach((entry, index) => {
      summary[`top${index + 1}Module`] = entry.name.replace('module:', '');
      summary[`top${index + 1}Ms`] = Math.round(entry.duration);
    });
    return summary;
  };
  window.addEventListener(
    'app-framework:startup-activated',
    () => {
      const summary = captureStartupSummary();
      void observability
        .then((obs) => {
          obs.events.captureEvent('composer.startup', summary);
          log.info('startup summary captured', summary);
        })
        .catch((error) => log.catch(error));
    },
    { once: true },
  );
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

  profiler?.mark('services:start');
  bootStatus('Starting services…');

  // Decide the deployment mode for client services. The factory is a dumb switch on
  // `runtime.client.services_mode` — the app is responsible for picking the right mode from its
  // env / platform constraints. Worker factories are passed unconditionally; the factory only
  // invokes the one required by the configured mode.
  const useLocalServices = isTrue(config.values.runtime?.app?.env?.DX_HOST);
  const useSharedWorker = isTrue(config.values.runtime?.app?.env?.DX_SHARED_WORKER);
  // iOS has a SharedWorker crash bug (Apple FB11723920); if a caller asks for SharedWorker there,
  // transparently fall back to in-process host mode instead of letting the factory throw later.
  const isIos = typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent);
  const sharedWorkerSupported = typeof SharedWorker !== 'undefined' && !isIos;
  const servicesMode = useLocalServices
    ? defs.Runtime.Client.ServicesMode.HOST
    : useSharedWorker
      ? sharedWorkerSupported
        ? defs.Runtime.Client.ServicesMode.SHARED_WORKER
        : defs.Runtime.Client.ServicesMode.HOST
      : defs.Runtime.Client.ServicesMode.DEDICATED_WORKER;

  // Host mode uses OPFS SQLite in a dedicated worker; worker modes run their own in-memory SQLite
  // (OPFS does not yet work from inside a SharedWorker per the TODO in `worker-runtime.ts`).
  const sqliteMode =
    servicesMode === defs.Runtime.Client.ServicesMode.HOST
      ? defs.Runtime.Client.Storage.SqliteMode.OPFS
      : defs.Runtime.Client.Storage.SqliteMode.MEMORY;

  config = new Config(
    {
      runtime: {
        client: {
          observabilityGroup,
          signalTelemetryEnabled: !observabilityDisabled,
          singleClientMode: useSingleClientMode,
          servicesMode,
          storage: { sqliteMode },
        },
      },
    },
    config.values,
  );
  const services = await createClientServices(config, {
    createWorker: () =>
      new SharedWorker(new URL('./shared-worker', import.meta.url), {
        type: 'module',
        name: 'dxos-client-worker',
      }),
    createDedicatedWorker: () =>
      new Worker(new URL('./dedicated-worker', import.meta.url), {
        type: 'module',
        name: 'dxos-client-worker',
      }),
    createCoordinatorWorker: () =>
      new SharedWorker(new URL('./coordinator-worker', import.meta.url), {
        type: 'module',
        name: 'dxos-coordinator-worker',
      }),
    // TODO(wittjosiah): Instrument opfs worker?
    createOpfsWorker: () => new Worker(new URL('@dxos/client/opfs-worker', import.meta.url), { type: 'module' }),
  });

  profiler?.mark('services:end');
  profiler?.measure('services', 'services:start', 'services:end');

  profiler?.mark('plugins:start');

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

  // `getPlugins` dynamic-imports every plugin chunk in parallel.
  // Run it concurrently with `UrlLoader.preload` (network-bound) so the two waits overlap.
  bootStatus('Loading plugins…');
  const assetCache = await createAssetCache(isTauri);
  const [builtinPlugins, remotePluginsResult] = await Promise.all([
    getPlugins(conf, {
      onPluginLoaded: (loaded, total) => {
        bootStatus(`Loading plugins (${loaded}/${total})`);
        // Drive the determinate progress bar — flips the bar out of its
        // indeterminate slide animation and grows it as chunks land.
        window.__bootLoader?.progress(loaded / total);
      },
    }),
    runAndForwardErrors(UrlLoader.preload({ cache: assetCache })),
  ]);

  bootStatus('Starting Composer…');
  window.__bootLoader?.progress(1);
  const remotePlugins: Plugin.Plugin[] = remotePluginsResult;
  const plugins = [...builtinPlugins, ...remotePlugins];
  const pluginLoader = UrlLoader.make(builtinPlugins, { cache: assetCache });
  const onPluginRemove = (id: string) => runAndForwardErrors(UrlLoader.uninstall(id, { cache: assetCache }));
  const core = getCore(conf);
  const defaults = getDefaults(conf);
  const setupEvents = [AppActivationEvents.SetupSettings];

  profiler?.mark('plugins:end');
  profiler?.measure('plugins-init', 'plugins:start', 'plugins:end');

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
      pluginLoader,
      onPluginRemove,
      plugins,
      core,
      defaults,
      setupEvents,
      cacheEnabled: true,
      safeMode,
      // The useLoading state machine ticks every `debounce` ms (Loading → FadeIn → FadeOut → Done),
      // so the gap between `Startup` activated and `<Placeholder>` dismissed is at least 2× debounce.
      // The boot loader covers the pre-React phase, so we don't need a longer fade to hide a flash.
      debounce: 200,
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
  // The boot loader is dismissed from `Placeholder.tsx`'s `useLayoutEffect` (gated on `stage >= 1`),
  // so it stays visible until React has actually committed its replacement.
};

void main();
