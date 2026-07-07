//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

// `invoke.ts` (and its `bridge/sender` import) loads the polyfill at module
// scope; the tests below drive `deliverInvoke` through an injected
// `InvokeBridgeApi`, so an inert stand-in suffices (same pattern as
// `search-proxy/handler.test.ts`).
vi.mock('webextension-polyfill', () => ({ default: {} }));

import { type InvokeBridgeApi, deliverInvoke } from './invoke';
import { type InvokeRequest, PAGE_ACTION_INVOKE_MESSAGE_TYPE } from './types';

const request: InvokeRequest = {
  version: 1,
  id: 'req-1',
  actionId: 'org.dxos.test/page-action/test',
  page: { url: 'https://example.com', title: 'Example' },
  inputs: {},
  invokedFrom: 'popup',
};

const FAST = { retryIntervalMs: 1, retryAttempts: 3 };

describe('deliverInvoke', () => {
  test('delivers to an open Composer tab and returns the decoded ack', async ({ expect }) => {
    const sent: unknown[] = [];
    const api: InvokeBridgeApi = {
      findComposerTab: async () => ({ id: 7 }),
      openComposerTab: async () => {
        throw new Error('should not open a tab');
      },
      sendMessage: async (tabId, message) => {
        sent.push({ tabId, message });
        return { version: 1, id: request.id, ok: true, objectId: 'obj-1' };
      },
    };

    const ack = await deliverInvoke(request, api, FAST);

    expect(ack).toEqual({ version: 1, id: 'req-1', ok: true, objectId: 'obj-1' });
    expect(sent).toEqual([{ tabId: 7, message: { type: PAGE_ACTION_INVOKE_MESSAGE_TYPE, request } }]);
  });

  test('opens a Composer tab once and retries until it answers', async ({ expect }) => {
    let opens = 0;
    let queries = 0;
    let sends = 0;
    const api: InvokeBridgeApi = {
      // No tab on the first two queries; the opened tab appears afterwards.
      findComposerTab: async () => (++queries > 2 ? { id: 1 } : undefined),
      openComposerTab: async () => {
        opens++;
      },
      sendMessage: async () => {
        sends++;
        // First send: content relay times out while the app boots — retried.
        return sends === 1
          ? { version: 1, id: request.id, ok: false, error: 'timeout' }
          : { version: 1, id: request.id, ok: true };
      },
    };

    const ack = await deliverInvoke(request, api, { retryIntervalMs: 1, retryAttempts: 5 });

    expect(ack).toEqual({ version: 1, id: 'req-1', ok: true });
    expect(opens).toBe(1);
    expect(sends).toBe(2);
  });

  test('retries when the content script is not ready (sendMessage rejects)', async ({ expect }) => {
    let sends = 0;
    const api: InvokeBridgeApi = {
      findComposerTab: async () => ({ id: 1 }),
      openComposerTab: async () => {},
      sendMessage: async () => {
        sends++;
        if (sends === 1) {
          throw new Error('Could not establish connection');
        }
        return { version: 1, id: request.id, ok: true };
      },
    };

    const ack = await deliverInvoke(request, api, FAST);

    expect(ack).toEqual({ version: 1, id: 'req-1', ok: true });
    expect(sends).toBe(2);
  });

  test('gives up with a timeout ack when no tab ever appears', async ({ expect }) => {
    let opens = 0;
    const api: InvokeBridgeApi = {
      findComposerTab: async () => undefined,
      openComposerTab: async () => {
        opens++;
      },
      sendMessage: async () => {
        throw new Error('unreachable');
      },
    };

    const ack = await deliverInvoke(request, api, FAST);

    expect(ack).toEqual({ version: 1, id: 'req-1', ok: false, error: 'timeout' });
    expect(opens).toBe(1);
  });

  test('returns a non-timeout error ack immediately even after opening a tab', async ({ expect }) => {
    const api: InvokeBridgeApi = {
      findComposerTab: (() => {
        let queries = 0;
        return async () => (++queries > 1 ? { id: 1 } : undefined);
      })(),
      openComposerTab: async () => {},
      sendMessage: async () => ({ version: 1, id: request.id, ok: false, error: 'unknownAction' }),
    };

    const ack = await deliverInvoke(request, api, FAST);

    expect(ack).toEqual({ version: 1, id: 'req-1', ok: false, error: 'unknownAction' });
  });
});
