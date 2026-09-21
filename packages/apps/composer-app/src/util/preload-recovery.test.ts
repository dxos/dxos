//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { BOOT_ASSET_FAILURE_KEY, PRELOAD_RETRY_KEY } from './constants.ts';
import { registerPreloadErrorHandler } from './preload-recovery.ts';

const createStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, String(value)),
  };
};

/** Stands in for the window Vite dispatches `vite:preloadError` on. */
const createTarget = () => {
  const listeners = new Set<(event: Event) => void>();
  const target = {
    addEventListener: (_type: string, listener: (event: Event) => void) => void listeners.add(listener),
  };
  const dispatch = (url: string) => {
    const event = new Event('vite:preloadError', { cancelable: true });
    Object.assign(event, { payload: { message: `Unable to preload CSS for ${url}` } });
    for (const listener of listeners) {
      listener(event);
    }
    return event;
  };
  return { target, dispatch };
};

describe('preload recovery', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage());
    vi.stubGlobal('sessionStorage', createStorage());
    vi.stubGlobal('location', { origin: 'https://composer.space', pathname: '/space/x', search: '?code=secret' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('reloads once for a chunk that is no longer on the CDN, then stops', () => {
    const reload = vi.fn();
    const { target, dispatch } = createTarget();
    registerPreloadErrorHandler({ target, reload });

    const first = dispatch('https://composer.space/assets/src-abc123.css');
    expect(reload).toHaveBeenCalledTimes(1);
    // The reload is the recovery, so the error must not also surface as a fatal route error.
    expect(first.defaultPrevented).toBe(true);
    expect(sessionStorage.getItem(PRELOAD_RETRY_KEY)).toBe('1');

    const second = dispatch('https://composer.space/assets/src-abc123.css');
    expect(reload).toHaveBeenCalledTimes(1);
    expect(second.defaultPrevented).toBe(false);
  });

  test('records the failure for the next boot, without the page query', () => {
    const { target, dispatch } = createTarget();
    registerPreloadErrorHandler({ target, reload: vi.fn() });
    dispatch('https://composer.space/assets/src-abc123.css');

    const record = JSON.parse(localStorage.getItem(BOOT_ASSET_FAILURE_KEY) ?? 'null');
    expect(record).toMatchObject({
      url: 'https://composer.space/assets/src-abc123.css',
      page: 'https://composer.space/space/x',
      failures: 1,
    });
  });

  test('does not reload when storage is unavailable', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('storage disabled');
      },
    });
    const reload = vi.fn();
    const { target, dispatch } = createTarget();
    registerPreloadErrorHandler({ target, reload });

    dispatch('https://composer.space/assets/src-abc123.css');
    expect(reload).not.toHaveBeenCalled();
  });
});
