//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type RenderBrowserApi, renderUrl } from './render';

type Listener = (tabId: number, changeInfo: { status?: string }) => void;

type MockOptions = {
  /** Result returned by the document-reading executeScript call. */
  readResult?: unknown;
  /** Emit `complete` for the created tab on the next tick. */
  autoComplete?: boolean;
};

const createMockApi = (options: MockOptions = {}) => {
  const { readResult = { html: '<html></html>', finalUrl: 'https://example.com/final' }, autoComplete = true } =
    options;

  const listeners = new Set<Listener>();
  const removed: number[] = [];
  let nextTabId = 1;
  let nextWindowId = 100;

  const api: RenderBrowserApi = {
    windows: {
      create: async () => {
        const tabId = nextTabId++;
        const windowId = nextWindowId++;
        if (autoComplete) {
          queueMicrotask(() => {
            for (const listener of listeners) {
              listener(tabId, { status: 'complete' });
            }
          });
        }
        return { id: windowId, tabs: [{ id: tabId }] };
      },
      remove: async (windowId) => {
        removed.push(windowId);
      },
    },
    tabs: {
      onUpdated: {
        addListener: (cb) => listeners.add(cb),
        removeListener: (cb) => listeners.delete(cb),
      },
    },
    scripting: {
      executeScript: async () => [{ result: readResult }],
    },
  };

  return { api, removed };
};

describe('renderUrl', () => {
  test('creates a background tab, reads HTML on complete, then removes the tab', async ({ expect }) => {
    const { api, removed } = createMockApi();

    const ack = await renderUrl(api, { version: 1, id: 'r1', url: 'https://example.com/' });

    expect(ack).toEqual({
      version: 1,
      id: 'r1',
      ok: true,
      html: '<html></html>',
      finalUrl: 'https://example.com/final',
    });
    expect(removed).toEqual([100]);
  });

  test('returns invalidAck when the injected reader returns an unexpected shape', async ({ expect }) => {
    const { api, removed } = createMockApi({ readResult: { nope: true } });

    const ack = await renderUrl(api, { version: 1, id: 'r2', url: 'https://example.com/' });

    expect(ack).toEqual({ version: 1, id: 'r2', ok: false, error: 'invalidAck' });
    expect(removed).toEqual([100]);
  });

  test('returns noTab when the created window has no tab', async ({ expect }) => {
    const api: RenderBrowserApi = {
      windows: {
        create: async () => ({ id: 1 }),
        remove: async () => {},
      },
      tabs: {
        onUpdated: { addListener: () => {}, removeListener: () => {} },
      },
      scripting: { executeScript: async () => [] },
    };

    const ack = await renderUrl(api, { version: 1, id: 'r3', url: 'https://example.com/' });
    expect(ack).toEqual({ version: 1, id: 'r3', ok: false, error: 'noTab' });
  });

  test('times out and still removes the tab when complete never fires', async ({ expect }) => {
    const { api, removed } = createMockApi({ autoComplete: false });

    const ack = await renderUrl(api, { version: 1, id: 'r4', url: 'https://example.com/', timeoutMs: 20 });

    expect(ack).toEqual({ version: 1, id: 'r4', ok: false, error: 'timeout' });
    expect(removed).toEqual([100]);
  });

  test('reads the page best-effort when the selector never matches', async ({ expect }) => {
    // The probe returns a non-true value, so waitForSelector gives up at its deadline and the
    // render reads whatever is there rather than failing.
    const { api, removed } = createMockApi();

    const ack = await renderUrl(api, {
      version: 1,
      id: 'r5',
      url: 'https://example.com/',
      waitForSelector: 'div.never-matches',
      timeoutMs: 1_500,
    });

    expect(ack).toEqual({
      version: 1,
      id: 'r5',
      ok: true,
      html: '<html></html>',
      finalUrl: 'https://example.com/final',
    });
    expect(removed).toEqual([100]);
  });
});
