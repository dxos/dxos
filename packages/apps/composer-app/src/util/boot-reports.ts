//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { log } from '@dxos/log';
import type * as Observability from '@dxos/observability/Observability';

import { BOOT_ASSET_FAILURE_KEY, BOOT_ASSET_RETRY_KEY } from './constants.ts';

const BootAssetFailure = Schema.Struct({
  url: Schema.String,
  page: Schema.String,
  at: Schema.Number,
  failures: Schema.Number,
});

export type BootAssetFailure = typeof BootAssetFailure.Type;

const decodeBootAssetFailure = Schema.decodeUnknownOption(Schema.fromJsonString(BootAssetFailure));

type WebProcessTermination = { at: number; webview: string; visible: boolean; hostUptimeMs: number };

/** The part of observability these reports use. */
type EventSink = { events: Pick<Observability.Observability['events'], 'captureEvent'> };

/**
 * Reads the failure the inline script in `index.html` recorded and resets that script's retry guard. Call as
 * soon as a boot succeeds, before anything that can fail. A valid record stays until `reportBootAssetFailure`
 * has sent it; a malformed one is dropped.
 */
export const readBootAssetFailure = (): BootAssetFailure | undefined => {
  try {
    sessionStorage.removeItem(BOOT_ASSET_RETRY_KEY);
    const raw = localStorage.getItem(BOOT_ASSET_FAILURE_KEY);
    if (raw === null) {
      return undefined;
    }
    const failure = Option.getOrUndefined(decodeBootAssetFailure(raw));
    if (!failure) {
      localStorage.removeItem(BOOT_ASSET_FAILURE_KEY);
    }
    return failure;
  } catch (error) {
    log.catch(error);
    return undefined;
  }
};

/** Sends a failure `readBootAssetFailure` returned, then removes its record so it is reported once. */
export const reportBootAssetFailure = (observability: EventSink, failure: BootAssetFailure) => {
  const attributes = {
    url: failure.url,
    page: failure.page,
    failures: failure.failures,
    ageMs: Date.now() - failure.at,
  };
  log.warn('boot asset failed to load in an earlier boot', attributes);
  observability.events.captureEvent('composer.boot.asset-failed', attributes);
  localStorage.removeItem(BOOT_ASSET_FAILURE_KEY);
};

/** Reports WebContent terminations the native host recovered from since the last report. */
export const reportWebProcessTerminations = async (observability: EventSink): Promise<void> => {
  const { invoke } = await import('@tauri-apps/api/core');
  const now = Date.now();
  for (const termination of await invoke<WebProcessTermination[]>('take_web_process_terminations')) {
    const attributes = {
      webview: termination.webview,
      visible: termination.visible,
      hostUptimeMs: termination.hostUptimeMs,
      ageMs: now - termination.at,
    };
    log.warn('web content process terminated', attributes);
    observability.events.captureEvent('composer.native.web-process-terminated', attributes);
  }
};
