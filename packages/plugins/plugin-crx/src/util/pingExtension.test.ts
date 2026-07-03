//
// Copyright 2026 DXOS.org
//
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Proxy } from '@dxos/crx-protocol';

import { isExtensionAvailable, pingExtension } from './pingExtension';

const setAvailable = (available: boolean) => {
  if (available) {
    document.documentElement.dataset.composerProxy = '1';
  } else {
    delete document.documentElement.dataset.composerProxy;
  }
};

// Stand in for the extension content relay: ack each ping with the given outcome.
const installFakeRelay = (respond: (id: string) => unknown) => {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent).detail as { id: string };
    window.dispatchEvent(new CustomEvent(Proxy.PING_ACK_EVENT, { detail: respond(detail.id) }));
  };
  window.addEventListener(Proxy.PING_EVENT, listener);
  return () => window.removeEventListener(Proxy.PING_EVENT, listener);
};

describe('pingExtension', () => {
  beforeEach(() => setAvailable(false));
  afterEach(() => setAvailable(false));

  test('isExtensionAvailable reflects the dataset marker', ({ expect }) => {
    expect(isExtensionAvailable()).toBe(false);
    setAvailable(true);
    expect(isExtensionAvailable()).toBe(true);
  });

  test('resolves with the extension identity on a successful ack', async ({ expect }) => {
    setAvailable(true);
    const uninstall = installFakeRelay((id) => ({
      version: 1,
      id,
      ok: true,
      extensionVersion: '0.8.3',
      extensionName: 'Composer',
    }));
    await expect(pingExtension()).resolves.toEqual({ extensionVersion: '0.8.3', extensionName: 'Composer' });
    uninstall();
  });

  test('rejects when the extension is not detected', async ({ expect }) => {
    setAvailable(false);
    await expect(pingExtension()).rejects.toThrow(/not detected/);
  });

  test('rejects on a non-ok ack', async ({ expect }) => {
    setAvailable(true);
    const uninstall = installFakeRelay((id) => ({ version: 1, id, ok: false, error: 'forbiddenOrigin' }));
    await expect(pingExtension()).rejects.toThrow(/forbiddenOrigin/);
    uninstall();
  });

  test('rejects on timeout when no ack arrives', async ({ expect }) => {
    setAvailable(true);
    await expect(pingExtension(50)).rejects.toThrow(/did not respond/);
  });
});
