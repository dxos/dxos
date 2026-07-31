//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

// `registry.ts` (and its `bridge/sender` import) loads the polyfill at module
// scope; the tests below drive `refreshRegistry` through an injected
// `RegistryBridgeApi`, so an inert stand-in suffices (same pattern as
// `invoke.test.ts`).
vi.mock('webextension-polyfill', () => ({ default: {} }));

import { type RegistryBridgeApi, refreshRegistry } from './registry';
import { PAGE_ACTIONS_LIST_MESSAGE_TYPE, PAGE_ACTIONS_STORAGE_KEY } from './types';

const okAck = {
  version: 1,
  id: 'req-1',
  ok: true,
  actions: [
    {
      id: 'action-1',
      label: 'Test action',
      icon: 'ph--star--regular',
      urlPatterns: ['*://example.com/*'],
      extractor: { name: 'snapshot' },
      contexts: ['popup'],
      operation: 'org.dxos.test/page-action/test',
    },
  ],
} as const;

const timeoutAck = { version: 1, id: 'req-1', ok: false, error: 'timeout' } as const;

const FAST = { retryIntervalMs: 1, retryAttempts: 3 };

describe('refreshRegistry', () => {
  test('stores registry when the first request succeeds', async ({ expect }) => {
    const stored: Record<string, unknown> = {};
    const api: RegistryBridgeApi = {
      findComposerTab: async () => ({ id: 1 }),
      sendMessage: async () => okAck,
      storageSet: async (key, value) => {
        stored[key] = value;
      },
    };

    await refreshRegistry(undefined, api, FAST);

    expect((stored[PAGE_ACTIONS_STORAGE_KEY] as any).actions).toHaveLength(1);
    expect((stored[PAGE_ACTIONS_STORAGE_KEY] as any).actions[0].id).toBe('action-1');
  });

  test('retries on timeout ack then stores on success', async ({ expect }) => {
    const stored: Record<string, unknown> = {};
    let sends = 0;
    const api: RegistryBridgeApi = {
      findComposerTab: async () => ({ id: 1 }),
      sendMessage: async () => {
        sends++;
        // First two sends time out; third succeeds.
        return sends < 3 ? timeoutAck : okAck;
      },
      storageSet: async (key, value) => {
        stored[key] = value;
      },
    };

    await refreshRegistry(undefined, api, FAST);

    expect(sends).toBe(3);
    expect((stored[PAGE_ACTIONS_STORAGE_KEY] as any).actions).toHaveLength(1);
  });

  test('gives up after exhausting retries on repeated timeouts', async ({ expect }) => {
    const stored: Record<string, unknown> = {};
    let sends = 0;
    const api: RegistryBridgeApi = {
      findComposerTab: async () => ({ id: 1 }),
      sendMessage: async () => {
        sends++;
        return timeoutAck;
      },
      storageSet: async (key, value) => {
        stored[key] = value;
      },
    };

    await refreshRegistry(undefined, api, FAST);

    expect(sends).toBe(3);
    expect(stored[PAGE_ACTIONS_STORAGE_KEY]).toBeUndefined();
  });

  test('does not retry on non-timeout errors', async ({ expect }) => {
    const stored: Record<string, unknown> = {};
    let sends = 0;
    const api: RegistryBridgeApi = {
      findComposerTab: async () => ({ id: 1 }),
      sendMessage: async () => {
        sends++;
        return { version: 1, id: 'req-1', ok: false, error: 'invalidPayload' };
      },
      storageSet: async (key, value) => {
        stored[key] = value;
      },
    };

    await refreshRegistry(undefined, api, FAST);

    expect(sends).toBe(1);
    expect(stored[PAGE_ACTIONS_STORAGE_KEY]).toBeUndefined();
  });

  test('no-ops when no Composer tab is found', async ({ expect }) => {
    const stored: Record<string, unknown> = {};
    let sends = 0;
    const api: RegistryBridgeApi = {
      findComposerTab: async () => undefined,
      sendMessage: async () => {
        sends++;
        return okAck;
      },
      storageSet: async (key, value) => {
        stored[key] = value;
      },
    };

    await refreshRegistry(undefined, api, FAST);

    expect(sends).toBe(0);
    expect(stored[PAGE_ACTIONS_STORAGE_KEY]).toBeUndefined();
  });

  test('uses provided tabId directly without calling findComposerTab', async ({ expect }) => {
    const stored: Record<string, unknown> = {};
    let findCalls = 0;
    const api: RegistryBridgeApi = {
      findComposerTab: async () => {
        findCalls++;
        return undefined;
      },
      sendMessage: async () => okAck,
      storageSet: async (key, value) => {
        stored[key] = value;
      },
    };

    await refreshRegistry(42, api, FAST);

    expect(findCalls).toBe(0);
    expect((stored[PAGE_ACTIONS_STORAGE_KEY] as any).actions).toHaveLength(1);
  });

  test('sends PAGE_ACTIONS_LIST_MESSAGE_TYPE in the request', async ({ expect }) => {
    const messages: unknown[] = [];
    const api: RegistryBridgeApi = {
      findComposerTab: async () => ({ id: 5 }),
      sendMessage: async (tabId, message) => {
        messages.push({ tabId, message });
        return okAck;
      },
      storageSet: async () => {},
    };

    await refreshRegistry(undefined, api, FAST);

    expect(messages).toHaveLength(1);
    expect((messages[0] as any).message.type).toBe(PAGE_ACTIONS_LIST_MESSAGE_TYPE);
    expect((messages[0] as any).tabId).toBe(5);
  });
});
