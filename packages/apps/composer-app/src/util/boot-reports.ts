//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';
import type * as Observability from '@dxos/observability/Observability';

import { BOOT_ASSET_FAILURE_KEY } from './constants.ts';

type BootAssetFailure = { url: string; page: string; at: number; attempts: number };

type WebProcessTermination = { at: number; visible: boolean; hostUptimeMs: number };

/** Platforms whose host registers `take_web_process_terminations`. */
const DESKTOP_PLATFORMS = ['linux', 'macos', 'windows'];

/** Takes the failure the inline script in `index.html` recorded, so it is reported once. */
const takeBootAssetFailure = (): BootAssetFailure | undefined => {
  try {
    const raw = localStorage.getItem(BOOT_ASSET_FAILURE_KEY);
    localStorage.removeItem(BOOT_ASSET_FAILURE_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch (error) {
    log.catch(error);
    return undefined;
  }
};

const takeWebProcessTerminations = async (): Promise<WebProcessTermination[]> => {
  const { type } = await import('@tauri-apps/plugin-os');
  if (!DESKTOP_PLATFORMS.includes(type())) {
    return [];
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<WebProcessTermination[]>('take_web_process_terminations');
};

/**
 * Reports failures an earlier boot could not: a boot asset that failed to load, and WebContent
 * terminations the native host recovered from. Call once a boot has succeeded.
 */
export const reportPreviousBootFailures = async (
  observability: Observability.Observability,
  isTauri: boolean,
): Promise<void> => {
  const now = Date.now();
  const failure = takeBootAssetFailure();
  if (failure) {
    const attributes = { url: failure.url, page: failure.page, attempts: failure.attempts, ageMs: now - failure.at };
    log.warn('boot asset failed to load in an earlier boot', attributes);
    observability.events.captureEvent('composer.boot.asset-failed', attributes);
  }

  if (isTauri) {
    for (const termination of await takeWebProcessTerminations()) {
      const attributes = {
        visible: termination.visible,
        hostUptimeMs: termination.hostUptimeMs,
        ageMs: now - termination.at,
      };
      log.warn('web content process terminated', attributes);
      observability.events.captureEvent('composer.native.web-process-terminated', attributes);
    }
  }
};
