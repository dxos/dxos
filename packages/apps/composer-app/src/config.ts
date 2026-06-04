//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Match from 'effect/Match';

import { DXOS_VERSION, Remote } from '@dxos/client';
import { Config, Defaults, Envs, Local, Storage } from '@dxos/config';
import { type IdbLogStore } from '@dxos/log-store-idb';
import { Observability, ObservabilityExtension, ObservabilityProvider } from '@dxos/observability';
import { getHostPlatform } from '@dxos/util';

import { FEEDBACK_LOGS_MAX_SIZE } from './constants';

export const PARAM_PROFILER = 'profiler';
export const PARAM_SAFE_MODE = 'safe';
export const PARAM_LOG_LEVEL = 'log';

export const setSafeModeUrl = (on: boolean) => {
  const url = new URL(window.location.href);
  const flat = on ? 'true' : 'false';
  url.searchParams.set(PARAM_SAFE_MODE, flat);
  history.pushState({ [PARAM_SAFE_MODE]: flat }, '', url);
  return url.toString();
};

export const setupConfig = async () => {
  const sources = [await Storage(), Envs(), Local(), Defaults()];
  // Not available in the worker.
  if (typeof window !== 'undefined') {
    const searchProps = new URLSearchParams(window.location.search);
    // TODO(burdon): Add monolithic flag. Currently, can set `target=file://local`.
    sources.splice(0, 0, Remote(searchProps.get('target') ?? undefined));
  }

  return new Config(...sources);
};

/** Data provider that sets app and OS platform tags for PostHog and OTEL. */
const platformProvider = (isTauri: boolean): Observability.DataProvider =>
  Effect.fn(function* (observability) {
    const osPlatform = yield* Match.value(isTauri).pipe(
      Match.when(
        true,
        Effect.fnUntraced(function* () {
          const { platform: tauriPlatform } = yield* Effect.promise(() => import('@tauri-apps/plugin-os'));
          return tauriPlatform();
        }),
      ),
      Match.when(false, () => Effect.succeed(getHostPlatform())),
      Match.exhaustive,
    );
    observability.setTags({ appPlatform: isTauri ? 'tauri' : 'web', osPlatform });
  });

/**
 * PostHog runtime overrides applied at `posthog.init` time when telemetry is disabled.
 * `posthog.opt_out_capturing()` blocks event capture *after* init but does not prevent the
 * recorder / dead-clicks / autocapture extension scripts from being downloaded and hooking
 * every DOM event — those scripts only respect the boot-time config. Passing these flags up
 * front means the heavy instrumentation never loads when the user has telemetry off.
 */
const POSTHOG_DISABLED_CONFIG = {
  disable_session_recording: true,
  capture_dead_clicks: false,
  capture_pageview: false,
  capture_pageleave: false,
  autocapture: false,
} as const;

/** Initialize observability extensions and data providers for Composer. */
export const initializeObservability = async (
  config: Config,
  isTauri: boolean,
  logStore?: IdbLogStore,
  observabilityDisabled = false,
) =>
  Function.pipe(
    Observability.make(),
    Observability.addExtension(
      ObservabilityExtension.Otel.extensions({
        // TODO(wittjosiah): Make APP_KEY "composer"?
        serviceName: 'composer',
        serviceVersion: DXOS_VERSION,
        environment: config.values.runtime?.app?.env?.DX_ENVIRONMENT ?? 'unknown',
        config,
        logs: true,
        metrics: true,
        traces: true,
      }),
    ),
    Observability.addExtension(
      ObservabilityExtension.PostHog.extensions({
        config,
        release: DXOS_VERSION,
        environment: config.values.runtime?.app?.env?.DX_ENVIRONMENT ?? 'unknown',
        logStore,
        feedbackLogMaxSize: FEEDBACK_LOGS_MAX_SIZE,
        posthog: observabilityDisabled ? POSTHOG_DISABLED_CONFIG : undefined,
      }),
    ),
    Observability.addDataProvider(ObservabilityProvider.IPData.provider(config)),
    Observability.addDataProvider(ObservabilityProvider.Storage.provider),
    Observability.addDataProvider(platformProvider(isTauri)),
    Observability.initialize,
    Effect.runPromise,
  );
