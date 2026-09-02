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
import React, { StrictMode, Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { EdgeRegistryPluginProvider } from '@dxos/app-framework';
import type * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginAssetCache from '@dxos/app-framework/PluginAssetCache';
import {
  FIRST_INTERACTIVE_EVENT,
  STARTUP_ACTIVATED_EVENT,
  STARTUP_FAILED_EVENT,
  bootLoader,
  useApp,
} from '@dxos/app-framework/ui';
import * as UrlLoader from '@dxos/app-framework/UrlLoader';
// Narrow entry: the barrel also re-exports auth and the ws muxer, neither of which the
// boot path uses.
import { EdgeHttpClient } from '@dxos/edge-client/http';
import { EffectEx } from '@dxos/effect';
import { LogLevel, log } from '@dxos/log';
import { IdbLogStore } from '@dxos/log-store-idb';
import * as Observability from '@dxos/observability/Observability';
import { translations as observabilityTranslations } from '@dxos/plugin-observability/translations';
import { ErrorBoundary, ErrorFallback } from '@dxos/react-error-boundary';
import { ThemeProvider, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { TRACE_PROCESSOR } from '@dxos/tracing';
import { getHostPlatform, isMobile as isMobile$, isTauri as isTauri$ } from '@dxos/util';
import { getConnectionDiagnostics } from '@dxos/worker-framework/Client';

import { type PluginConfig, getDefaults, getPlugins } from './plugin-defs';
import {
  APP_KEY,
  LOG_STORE_DB_NAME,
  PARAM_LOG_LEVEL,
  PARAM_PROFILER,
  PARAM_SAFE_MODE,
  type Profiler,
  WorkerLogProcessor,
  defaultStorageIsEmpty,
  downloadLogs,
  initializeObservability,
  isFalse,
  isTrue,
  runStorageResetMigration,
  setSafeModeUrl,
  setupConfig,
  shouldRunStorageResetMigration,
  showDevRssBanner,
  startupMark,
  startupMeasure,
  startupProfiler,
  translations,
} from './util';
import { initAutomergeWasm } from './util/automerge-wasm';

// Fatal-error-only UI, loaded on demand: its FeedbackForm pulls the whole form stack
// (react-ui-form, editor, pickers) which must stay out of the static boot graph.
const ResetDialog = lazy(() => import('./components').then((module) => ({ default: module.ResetDialog })));

/**
 * Startup deadline override, in SECONDS (`VITE_DX_STARTUP_TIMEOUT=2`).
 *
 * Exists to exercise the deadline itself: shortening it does not fake a stall, it moves the line
 * that startup has genuinely not crossed yet, so the real path runs with real work behind it. Dev
 * only — in production the deadline is fatal, and a shorter one would just fail a boot sooner.
 * Seconds rather than milliseconds because it is typed by hand.
 */
const startupTimeout = (() => {
  if (!import.meta.env.DEV) {
    return undefined;
  }
  const seconds = Number(import.meta.env.VITE_DX_STARTUP_TIMEOUT);
  // The CONVERTED value is checked, not the input: 1e308 is finite and 1e308 * 1_000 is not.
  const timeout = seconds * 1_000;
  return Number.isFinite(timeout) && timeout > 0 ? timeout : undefined;
})();

// Injected by the `define` block in vite.config.ts; '' in production builds.
declare const __DX_DEV_SERVER_BOOT_ID__: string;

// Session id for the agent debug port when the dev server was launched with the debug-port flag.
// Always '' in production builds, so the port cannot be auto-started on a deployed origin.
declare const __DX_DEBUG_PORT_SESSION__: string;

// Merged onto `@dxos/app-framework`'s `ComposerDevtools` (the type behind `globalThis.composer`)
// rather than declared fresh — a second `declare global { var composer }` here would collide with
// its declaration and resolve every member to `{}` (see `playwright/globals.d.ts`).
declare module '@dxos/app-framework' {
  interface ComposerDevtools {
    profiler?: Profiler;
    otel?: {
      enableDebugLogs: () => void;
      disableDebugLogs: () => void;
      getLogLevel: () => Promise<string | null>;
    };
  }
}

declare global {
  interface ImportMeta {
    env: ImportMetaEnv;
    /** Vite HMR API — present only in dev, `undefined` in production bundles. */
    hot?: { dispose(cb: () => void): void };
  }

  interface ImportMetaEnv {
    DEV: string;
    /** Startup deadline override in SECONDS, dev only — see `startupTimeout` below. */
    VITE_DX_STARTUP_TIMEOUT?: string;
  }

  // Debug hook: run `downloadLogs()` from devtools to save buffered logs (same as Reset dialog).
  var downloadLogs: () => Promise<void>;
}

/**
 * Updates the native-DOM boot loader text. No-op once React has replaced #root.
 * The CSS animation in `index.html` keeps painting on the compositor thread
 * regardless of main-thread work, so this is purely textual feedback.
 */
const bootStatus = (text: string) => bootLoader?.status({ humanized: text });

// Stamp every (re-)evaluation of this module so we can tell Vite HMR reloads
// from a true page boot. Dev-only — production has no HMR and the diagnostic
// would just be noise. `import.meta.env.DEV` is statically replaced at build
// time, so the whole block tree-shakes out of prod bundles.
const BOOT_ID = import.meta.env?.DEV ? Math.random().toString(36).slice(2, 10) : '';
const MODULE_EVAL_TIME = Date.now();
if (import.meta.env?.DEV) {
  log('composer main: module evaluated', { bootId: BOOT_ID, t: MODULE_EVAL_TIME });
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      log('composer main: hmr dispose', { bootId: BOOT_ID, ageMs: Date.now() - MODULE_EVAL_TIME });
    });
  }
}

// Cross-tab reload coordination for persistent worker failures (dev only — see
// `onPersistentWorkerFailure` below). The sessionStorage guard makes each tab escalate at most
// once per tab session, so a failure that reloads don't fix cannot loop the reloads.
const DEV_RELOAD_CHANNEL = 'dxos-dev-worker-reload';
const DEV_RELOAD_GUARD_KEY = 'dxos.composer.dev-worker-reload';
if (import.meta.env?.DEV) {
  new BroadcastChannel(DEV_RELOAD_CHANNEL).onmessage = () => window.location.reload();
}

/**
 * Picks the platform-appropriate offline asset cache for third-party plugins.
 *  - Tauri (desktop + iOS): Rust-backed filesystem cache, served via the `dxos-plugin://` URI scheme.
 *  - Web with PWA enabled: cache managed by the SW in `./sw.ts`.
 *  - Otherwise (PWA disabled, tests, unsupported environments): a no-op cache;
 *    plugins still load but lose their offline guarantee.
 *
 * `isPwa` (not `'serviceWorker' in navigator`) is the SW gate because that
 * property is `true` in every modern browser whether or not a worker is
 * actually registered. On non-PWA builds (`DX_PWA=false` → `selfDestroying`
 * VitePWA, e.g. `labs.composer.space`) there is no active registration, and
 * the SW-backed cache's first call is `await navigator.serviceWorker.ready`
 * which resolves only when one exists — hangs forever otherwise, freezing
 * `Install` indefinitely with no timeout.
 *
 * Each branch dynamic-imports its impl so vite emits per-platform chunks instead
 * of dragging both into the initial bundle.
 */
const createAssetCache = async (isPwa: boolean, isTauri: boolean): Promise<PluginAssetCache.Cache> => {
  if (isTauri) {
    const { createTauriAssetCache } = await import('./asset-cache/tauri');
    return createTauriAssetCache();
  }
  if (isPwa && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    const { createServiceWorkerAssetCache } = await import('./asset-cache/service-worker');
    return createServiceWorkerAssetCache();
  }
  return PluginAssetCache.noop();
};

const main = async () => {
  if (import.meta.env?.DEV) {
    log('composer main: main() running', { bootId: BOOT_ID });
    // Fire-and-forget: surfaces the latest entry from a dev RSS feed under
    // the boot loader as a small distraction during cold boots. Routed
    // through the Vite dev server's `/api/rss` proxy (see vite.config.ts)
    // to dodge CORS. Tree-shakes out of prod via the `import.meta.env.DEV`
    // gate above.
    void showDevRssBanner();
  }

  const url = new URL(window.location.href);
  const safeMode = isTrue(url.searchParams.get(PARAM_SAFE_MODE), false);
  if (safeMode) {
    log.info('SAFE MODE');
    setSafeModeUrl(false);
  }

  // The startup profiler is on by default in dev so every devloop produces
  // a BENCHMARKS row without remembering `?profiler=1`. Production explicitly
  // opts in (or out) via the URL parameter.
  // `isTrue`'s second argument is a strictness flag, not a default, so the absent-parameter
  // case has to be handled here — passing the default through it silently disabled the dev
  // profiler (strict mode requires the parameter, which is exactly what is missing).
  const profilerParam = url.searchParams.get(PARAM_PROFILER);
  const profilerEnabled = profilerParam === null ? Boolean(import.meta.env?.DEV) : isTrue(profilerParam);
  // Marked before the profiler is (or is not) constructed: it is the origin of the `total`
  // measure, which production reads even though only dev collects the full timeline.
  startupMark('main:start');
  const profiler = profilerEnabled ? startupProfiler() : undefined;

  const logLevel = url.searchParams.get(PARAM_LOG_LEVEL) ?? (safeMode ? 'debug' : undefined);
  if (logLevel) {
    const level = LogLevel[logLevel.toUpperCase() as keyof typeof LogLevel];
    log.config({ filter: level });
  }

  TRACE_PROCESSOR.setInstanceTag('app');

  // Log persistence runs in its own worker so lines survive main-thread saturation: each
  // pre-serialized line is handed off via postMessage inside the log call, and the worker
  // flushes to IDB while this thread is still blocked. This store is the read handle for
  // downloads and feedback exports (IDB keeps the data); the worker owns writes and eviction,
  // so the read handle's own sweep is disabled.
  const logStore = new IdbLogStore({ dbName: LOG_STORE_DB_NAME, evictionInterval: 0 });
  const observabilityWorker = new Worker(new URL('./workers/observability-worker', import.meta.url), {
    type: 'module',
    name: 'dxos-observability',
  });
  const logProcessor = new WorkerLogProcessor({ worker: observabilityWorker });
  log.addProcessor(logProcessor.processor);

  // Devtools convenience — also surfaced via the help panel and ResetDialog UI.
  globalThis.downloadLogs = () => downloadLogs(logStore);

  startupMark('dynamic-imports:start');
  bootStatus('Loading framework…');

  // Load these in parallel; HTTP/2 multiplexes the three chunks and even on
  // local-disk the parser can interleave parses. The wasm init rides the same wave: it must
  // complete before anything touches automerge (slim entrypoints — see util/automerge-wasm.ts).
  const [{ Config, defs, SaveConfig, getEnvString }, { Client, createClientServices }, AppMigrations] =
    await Promise.all([
      import('@dxos/config'),
      import('@dxos/react-client'),
      import('@dxos/app-toolkit/AppMigrations'),
      initAutomergeWasm(),
    ]);

  startupMark('dynamic-imports:end');
  startupMeasure('dynamic-imports', 'dynamic-imports:start', 'dynamic-imports:end');

  // Namespace for global Composer test & debug hooks.
  const otel = {
    /** Enable debug-level OTEL log export for this device (persisted across reloads, works in workers). */
    enableDebugLogs: () => {
      void Observability.storeOtelLogLevel(APP_KEY, 'debug');
      log.info('otel debug log level enabled — reload to apply');
    },
    /** Remove the debug override and revert to the default INFO log level. */
    disableDebugLogs: () => {
      void Observability.storeOtelLogLevel(APP_KEY, null);
      log.info('otel debug log level override removed — reload to apply');
    },
    /** Return the active OTEL log level override, or null if using the default. */
    getLogLevel: async (): Promise<string | null> => {
      const level = await Observability.getOtelLogLevel(APP_KEY);
      log.info('otel log level', { level: level ?? 'default (INFO)' });
      return level;
    },
  };
  globalThis.composer = { profiler, otel };

  AppMigrations.define();

  startupMark('config:start');
  bootStatus('Reading configuration…');

  let config = await setupConfig();
  if (shouldRunStorageResetMigration(getEnvString(config, 'DX_ENVIRONMENT'))) {
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
          storage: { dataStore: defs.Runtime_Client_Storage_StorageDriver.IDB },
        },
      },
    });
    config = await setupConfig();
  }

  startupMark('config:end');
  startupMeasure('config', 'config:start', 'config:end');

  const isTauri = isTauri$();
  if (isTauri) {
    const platform = getHostPlatform();
    document.body.setAttribute('data-platform', platform);
  }

  // Read the persisted opt-out state up front so we can suppress PostHog's heavy
  // instrumentation (session recorder, dead-clicks autocapture) at init time —
  // opting out after init only stops event capture, not script loading.
  const [observabilityDisabled, observabilityGroup] = await Promise.all([
    Observability.isObservabilityDisabled(APP_KEY),
    Observability.getObservabilityGroup(APP_KEY),
  ]);

  // Intentionally do not await; the buffering backend in TRACE_PROCESSOR captures
  // early spans and replays them once the real OTEL backend registers.
  const observability = initializeObservability(config, isTauri, logStore, observabilityDisabled, {
    post: (message) => observabilityWorker.postMessage(message),
  });

  // Shared by the success and failure captures below, so a boot that missed its deadline is
  // directly comparable against one that did not. Reads `performance.getEntriesByType`
  // directly; the `startup:` measures it needs are emitted unconditionally (see `startupMark`).
  const captureStartupSummary = (): Record<string, string | number | boolean | undefined> => {
    const measures = performance.getEntriesByType('measure');
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const bootMark = performance.getEntriesByName('boot:html-parsed')[0];
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
  const captureStartup = (event: string, extra?: Record<string, string | number | boolean | undefined>) => {
    startupMark('ready');
    startupMeasure('total', 'main:start', 'ready');
    const summary = { ...captureStartupSummary(), ...extra };
    void observability
      .then((obs) => {
        obs.events.captureEvent(event, summary);
        log.info(event, summary);
      })
      .catch((error) => log.catch(error));
  };
  window.addEventListener(STARTUP_ACTIVATED_EVENT, () => captureStartup('composer.startup'), { once: true });
  // Separate from the startup summary: the shell renders at least two debounce ticks after
  // `Startup` activates, so time-to-interactive does not exist yet when that summary is built.
  window.addEventListener(
    FIRST_INTERACTIVE_EVENT,
    (event) => {
      const firstInteractiveMs = event.detail;
      void observability
        .then((obs) => obs.events.captureEvent('composer.first-interactive', { firstInteractiveMs }))
        .catch((error) => log.catch(error));
    },
    { once: true },
  );
  // Without this, a failed boot emits an exception and no timings at all, leaving no denominator
  // for the success event and nothing to compare a stalled phase against.
  window.addEventListener(STARTUP_FAILED_EVENT, (event) => captureStartup('composer.startup.failed', event.detail), {
    once: true,
  });
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
    EffectEx.runPromise,
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
    Match.when(false, () => Effect.sync(() => isTrue(getEnvString(config, 'DX_MOBILE')) || isMobile$())),
    Match.exhaustive,
    EffectEx.runPromise,
  );

  // Use in-process coordinator (no SharedWorker) for mobile Tauri apps only. iOS WKWebView has a
  // separate SharedWorker crash bug (Apple FB11723920) unrelated to origin. Desktop Tauri uses
  // tauri-plugin-localhost which serves from http://localhost, giving SharedWorker a proper origin.
  const useSingleClientMode = isTauri && isMobile;

  startupMark('services:start');
  bootStatus('Starting services…');

  // Decide the deployment mode for client services. The factory is a dumb switch on
  // `runtime.client.services_mode` — the app is responsible for picking the right mode from its
  // env / platform constraints. Worker factories are passed unconditionally; the factory only
  // invokes the one required by the configured mode. Host mode (in-thread services) is opt-in via
  // DX_HOST; otherwise services run in a dedicated worker elected via a lock (leader/follower).
  const useLocalServices = isTrue(getEnvString(config, 'DX_HOST'));
  const servicesMode = useLocalServices
    ? defs.Runtime_Client_ServicesMode.HOST
    : defs.Runtime_Client_ServicesMode.DEDICATED_WORKER;

  config = new Config(
    {
      runtime: {
        client: {
          observabilityGroup,
          signalTelemetryEnabled: !observabilityDisabled,
          singleClientMode: useSingleClientMode,
          servicesMode,
          // Host and dedicated worker both use OPFS-backed SQLite.
          storage: { sqliteMode: defs.Runtime_Client_Storage_SqliteMode.OPFS },
        },
      },
    },
    config.values,
  );
  const services = await createClientServices(config, {
    createDedicatedWorker: () =>
      new Worker(new URL('./workers/dedicated-worker', import.meta.url), {
        type: 'module',
        name: 'dxos-client-worker',
      }),
    createCoordinatorWorker: () =>
      new SharedWorker(new URL('./workers/coordinator-worker', import.meta.url), {
        type: 'module',
        // Dev: SharedWorkers are keyed by (URL, name) and outlive vite restarts, so suffix the name
        // with the server boot id — a restarted server then gets a fresh coordinator instead of
        // attaching to a stale-code instance that new pages cannot negotiate with.
        name: `dxos-coordinator-worker${__DX_DEV_SERVER_BOOT_ID__ && `-${__DX_DEV_SERVER_BOOT_ID__}`}`,
      }),
    // TODO(wittjosiah): Instrument opfs worker?
    createOpfsWorker: () => new Worker(new URL('@dxos/client/opfs-worker', import.meta.url), { type: 'module' }),
    // Stale mixed-generation workers (tabs from before a dev-server restart) present as an endless
    // boot spinner with only a console warning; in dev, force every same-origin tab through one
    // coordinated reload so all generations converge. Production relies on the fatal dialog via the
    // startup timeout (tagged for telemetry — see ResetDialog).
    onPersistentWorkerFailure: (error) => {
      log.error('worker connection failing persistently', { error });
      if (import.meta.env?.DEV && !sessionStorage.getItem(DEV_RELOAD_GUARD_KEY)) {
        sessionStorage.setItem(DEV_RELOAD_GUARD_KEY, '1');
        new BroadcastChannel(DEV_RELOAD_CHANNEL).postMessage('reload');
        window.location.reload();
      }
    },
  });

  startupMark('services:end');
  startupMeasure('services', 'services:start', 'services:end');

  // Started here so the handshake and storage open overlap plugin loading, which plugin-client's
  // lazily-imported module would otherwise sit behind. Its call surfaces failures; this one only
  // has to not reject unhandled.
  performance.mark('milestone:client-initialize:start');
  const client = new Client({ config, services });
  // Spread rather than nest: the PostHog log processor forwards only top-level primitives, so
  // nesting the phase would drop it from the very exception that needs it.
  void client
    .initialize()
    .catch((err) => log.error('client initialization failed', { error: err, ...getConnectionDiagnostics(err) }));

  // Started here rather than from plugin-debug, which a plain local `serve` leaves disabled —
  // tying the flag to it would make the flag silently do nothing.
  if (__DX_DEBUG_PORT_SESSION__) {
    const { getDebugPortController } = await import('@dxos/client/devtools');
    getDebugPortController().start({ session: __DX_DEBUG_PORT_SESSION__, persist: true });
  }

  startupMark('plugins:start');

  const isPwa = !isFalse(getEnvString(config, 'DX_PWA'));
  // The forked `client.initialize()` runs outside the render tree: a failure or a stalled worker
  // handshake reaches no error boundary, leaving suspended consumers spinning. Plugins raise it
  // here, and `Main` swaps the app for the same fatal dialog the app boundary would have shown.
  let raiseFatalError: (error: unknown) => void = (error) =>
    log.error('client initialization failed before render', { error: String(error) });

  const conf: PluginConfig = {
    appKey: APP_KEY,
    config,
    services,
    client,
    observability,
    logStore,
    onFatalError: (error) => raiseFatalError(error),

    // Strictly the `dev` cloud environment (not preview) or a local `DX_DEV=true` opt-in, so a plain
    // local `serve` keeps the lean default plugin set (see `getDefaults` in plugin-defs.tsx).
    isDev: getEnvString(config, 'DX_ENVIRONMENT') === 'dev' || isTrue(getEnvString(config, 'DX_DEV')),
    isLocal: !isTauri && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'),
    isPwa,
    isTauri,
    isPopover,
    isMobile,
    isStrict: !isFalse(getEnvString(config, 'DX_STRICT')),
  };

  // `getPlugins` is synchronous: each plugin's main entry exposes only
  // `meta` + a `Plugin.lazy(...)` stub, so building the plugin array doesn't
  // pull any plugin's body. The plugin manager loads the real plugin
  // (separate Rollup chunk) on first `enable`. Remote plugin preload is
  // network-bound — the boot loader's counter follows that until the
  // plugin manager (post-React mount) takes over with module-activation
  // progress.
  bootStatus('Loading plugins…');
  const builtinPlugins = getPlugins(conf);
  const assetCache = await createAssetCache(isPwa, isTauri);
  const remotePluginsResult = await EffectEx.runPromise(
    UrlLoader.preload({
      cache: assetCache,
      onPluginLoaded: (loaded, total) => {
        // Pass `range` so the loader updates the existing line in place
        // ("Loading plugins (3/12)") instead of appending a fresh entry per
        // tick — keeps the visible log compact.
        bootLoader?.status({ humanized: 'Loading plugins', range: { index: loaded, total } });
        // The ring spans two phases — remote-plugin preload (0 → 50%) and
        // module activation (50 → 100%, driven from `Placeholder` once
        // React mounts). Splitting the range keeps it monotonic across
        // the boundary.
        bootLoader?.progress((loaded / total) * 0.5);
      },
    }),
  );

  bootStatus('Starting Composer…');
  // Park the ring at 50% — preload done, activation about to take over.
  bootLoader?.progress(0.5);
  const remotePlugins: Plugin.Plugin[] = remotePluginsResult;
  const plugins = [...builtinPlugins, ...remotePlugins];
  const pluginLoader = UrlLoader.make(builtinPlugins, { cache: assetCache });
  const onPluginRemove = (id: string) => UrlLoader.uninstall(id, { cache: assetCache });
  const defaults = getDefaults(conf);

  const edgeUrl = config.values.runtime?.services?.edge?.url;
  const pluginRegistryProvider = edgeUrl ? new EdgeRegistryPluginProvider(new EdgeHttpClient(edgeUrl)) : undefined;

  startupMark('plugins:end');
  startupMeasure('plugins-init', 'plugins:start', 'plugins:end');

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
      // Double-fault guard: the themed dialog can itself fail to render (e.g. a
      // vite dev mid-optimization module split breaks the ThemeContext/i18n
      // identity), which would otherwise loop the outer 'app' boundary forever
      // instead of reporting the original error. Falls back to the
      // theme-independent ErrorFallback showing the startup error, and logs the
      // dialog's own failure with the `fatal_dialog` tag (ResetDialog's tagged
      // log never runs when its render crashes).
      <ErrorBoundary
        name='fatal-dialog'
        onError={(dialogError) =>
          log.error('fatal dialog failed to render', { error: dialogError, fatal_dialog: true })
        }
        fallbackRender={(props) => <ErrorFallback {...props} error={error} />}
      >
        {/* `react-ui`'s own namespace ships with no plugin to register it, unlike every sibling
            (`react-ui-card`, `-form`, …) which a plugin re-exports — so without this the primitives'
            keys (`system-button.*`, `toolbar-*`) render raw as the accessible name of every
            icon-only button. */}
        <ThemeProvider
          tx={defaultTx}
          resourceExtensions={[...reactUiTranslations, ...translations, ...observabilityTranslations]}
        >
          <Tooltip.Provider>
            {/* If the lazy chunk fails to load (broken deploy, offline), the throw reaches the
                fatal-dialog boundary above, which shows the original error via ErrorFallback. */}
            <Suspense fallback={null}>
              <ResetDialog
                error={error}
                logStore={logStore}
                observability={observability}
                needRefresh={needRefresh}
                onRefresh={needRefresh ? () => void updateServiceWorker(true) : undefined}
                onReset={import.meta.env.DEV ? handleReset : undefined}
              />
            </Suspense>
          </Tooltip.Provider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  };

  const Main = () => {
    const [fatalError, setFatalError] = useState<Error>();
    useEffect(() => {
      raiseFatalError = (error) => setFatalError(error instanceof Error ? error : new Error(String(error)));
    }, []);

    const App = useApp({
      fallback: Fallback,
      // The boot loader (injected by `bootLoaderPlugin`, with the brand mark
      // supplied via `markSvg` in vite.config.ts) is the loading UI; `App`
      // relays startup progress into it and dismisses it — no placeholder here.
      pluginLoader,
      onPluginRemove,
      pluginRegistryProvider,
      plugins,
      defaults,
      cacheEnabled: true,
      safeMode,
      // The useLoading state machine ticks every `debounce` ms (Loading → FadeIn → FadeOut → Done),
      // so the gap between `Startup` activated and `<Placeholder>` dismissed is at least 2× debounce.
      // The boot loader covers the pre-React phase, so we don't need a longer fade to hide a flash.
      debounce: 200,
      // Shortened only to exercise the deadline (`VITE_DX_STARTUP_TIMEOUT=2` puts the loader's
      // stalled offer two seconds in). `undefined` leaves `useApp` on its own 30s default.
      timeout: startupTimeout,
    });

    // Rendered instead of `App`, not thrown: `Main` sits above the app-level error boundary, so a
    // throw here would escape React entirely and blank the page.
    return fatalError ? <Fallback error={fatalError} /> : <App />;
  };

  const root = document.getElementById('root');
  if (!root) {
    // `index.html` always ships a `#root` element — its absence means the document itself
    // failed to load correctly, which no in-tree fallback can recover from.
    throw new Error('composer main: #root element not found');
  }
  log('composer main: rendering App', { bootId: BOOT_ID, strict: conf.isStrict });
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
