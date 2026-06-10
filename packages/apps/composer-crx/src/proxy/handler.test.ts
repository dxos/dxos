//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { type RenderAck } from './types';

type Listener = (message: unknown, sender: { tab?: { url?: string }; url?: string }) => undefined | Promise<RenderAck>;

const listeners: Listener[] = [];

const storage: Record<string, unknown> = {};

vi.mock('webextension-polyfill', () => ({
  default: {
    runtime: {
      onMessage: {
        addListener: (listener: Listener) => listeners.push(listener),
      },
    },
    storage: {
      sync: {
        get: async (key: string) => ({ [key]: storage[key] }),
      },
    },
  },
}));

const renderUrlMock = vi.fn<(api: unknown, request: { id: string }) => Promise<RenderAck>>(async (_api, request) => ({
  version: 1,
  id: request.id,
  ok: true,
  html: '<html></html>',
  finalUrl: 'https://example.com/final',
}));

vi.mock('./render', () => ({
  renderUrl: (api: unknown, request: { id: string }) => renderUrlMock(api, request),
}));

// Imported after the mocks are registered.
const { installSearchProxy } = await import('./handler');
const { RENDER_MESSAGE_TYPE } = await import('./types');

const COMPOSER_URL = 'http://localhost:5173/';

describe('installSearchProxy', () => {
  beforeEach(() => {
    listeners.length = 0;
    renderUrlMock.mockClear();
    installSearchProxy();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const send = (message: unknown, sender: { tab?: { url?: string }; url?: string }) => {
    const [listener] = listeners;
    return listener(message, sender);
  };

  test('renders for a request from a Composer origin', async ({ expect }) => {
    const request = { version: 1, id: 'r1', url: 'https://example.com/' };
    const result = await send({ type: RENDER_MESSAGE_TYPE, request }, { tab: { url: COMPOSER_URL } });

    expect(result).toEqual({
      version: 1,
      id: 'r1',
      ok: true,
      html: '<html></html>',
      finalUrl: 'https://example.com/final',
    });
    expect(renderUrlMock).toHaveBeenCalledTimes(1);
  });

  test('rejects a request from a non-Composer origin without rendering', async ({ expect }) => {
    const request = { version: 1, id: 'r2', url: 'https://example.com/' };
    const result = await send({ type: RENDER_MESSAGE_TYPE, request }, { tab: { url: 'https://evil.example/' } });

    expect(result).toEqual({ version: 1, id: 'r2', ok: false, error: 'forbiddenOrigin' });
    expect(renderUrlMock).not.toHaveBeenCalled();
  });

  test('rejects a malformed request', async ({ expect }) => {
    const result = await send({ type: RENDER_MESSAGE_TYPE, request: { version: 2 } }, { tab: { url: COMPOSER_URL } });
    expect(result).toEqual({ version: 1, id: '', ok: false, error: 'badRequest' });
    expect(renderUrlMock).not.toHaveBeenCalled();
  });

  test('ignores unrelated messages', ({ expect }) => {
    const result = send({ type: 'composer-crx:deliver-clip' }, { tab: { url: COMPOSER_URL } });
    expect(result).toBeUndefined();
  });
});
