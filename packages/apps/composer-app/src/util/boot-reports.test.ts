//
// Copyright 2026 DXOS.org
//

import { invoke } from '@tauri-apps/api/core';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { readBootAssetFailure, reportBootAssetFailure, reportWebProcessTerminations } from './boot-reports.ts';
import { BOOT_ASSET_FAILURE_KEY, BOOT_ASSET_RETRY_KEY } from './constants.ts';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('boot reports', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage());
    vi.stubGlobal('sessionStorage', createStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test('keeps a recorded failure until it is reported, and resets the retry guard on read', () => {
    const failure = {
      url: 'http://localhost:26779/assets/boot-0.js',
      page: 'http://localhost:26779/',
      at: 1,
      failures: 2,
    };
    localStorage.setItem(BOOT_ASSET_FAILURE_KEY, JSON.stringify(failure));
    sessionStorage.setItem(BOOT_ASSET_RETRY_KEY, '1');

    expect(readBootAssetFailure()).toEqual(failure);
    expect(sessionStorage.getItem(BOOT_ASSET_RETRY_KEY)).toBeNull();
    expect(readBootAssetFailure()).toEqual(failure);

    const { captureEvent, sink } = createSink();
    reportBootAssetFailure(sink, failure);
    expect(captureEvent).toHaveBeenCalledWith(
      'composer.boot.asset-failed',
      expect.objectContaining({ url: failure.url, page: failure.page, failures: 2 }),
    );
    expect(readBootAssetFailure()).toBeUndefined();
  });

  test('drops a malformed record', () => {
    localStorage.setItem(BOOT_ASSET_FAILURE_KEY, JSON.stringify({ url: 1 }));

    expect(readBootAssetFailure()).toBeUndefined();
    expect(localStorage.getItem(BOOT_ASSET_FAILURE_KEY)).toBeNull();
  });

  test('reports each host termination as an event', async () => {
    const { captureEvent, sink } = createSink();
    vi.mocked(invoke).mockResolvedValue([{ at: Date.now(), webview: 'main', visible: true, hostUptimeMs: 5 }]);
    await reportWebProcessTerminations(sink);
    expect(invoke).toHaveBeenCalledWith('take_web_process_terminations');
    expect(captureEvent).toHaveBeenCalledWith(
      'composer.native.web-process-terminated',
      expect.objectContaining({ webview: 'main', visible: true, hostUptimeMs: 5 }),
    );
  });

  test('index.html records under the same storage keys', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(html).toContain(`'${BOOT_ASSET_FAILURE_KEY}'`);
    expect(html).toContain(`'${BOOT_ASSET_RETRY_KEY}'`);
  });
});

const createStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
};

const createSink = () => {
  const captureEvent = vi.fn();
  return { captureEvent, sink: { events: { captureEvent } } };
};
