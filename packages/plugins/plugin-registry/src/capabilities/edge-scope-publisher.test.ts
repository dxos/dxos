//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import { makeScopePublisher } from './edge-scope-publisher.ts';

const SPACE_ID = ('B' + 'A'.repeat(32)) as never;
const THREAD = 'org.dxos.plugin.thread';
const TABLE = 'org.dxos.plugin.table';

const makeEdge = () => {
  const calls: { path: string; method: string; body?: unknown }[] = [];
  return {
    calls,
    request: async (_ctx: unknown, path: string, args: { method: string; body?: unknown }) => {
      calls.push({ path, method: args.method, body: args.body });
      return undefined;
    },
  };
};

/** Lets the debounce fire and the publish settle. */
const settle = async () => {
  await vi.advanceTimersByTimeAsync(1_000);
};

describe('plugin scope publisher', () => {
  test('publishes the identity list, sorted, once the debounce fires', async ({ expect }) => {
    vi.useFakeTimers();
    const edge = makeEdge();
    const publisher = makeScopePublisher(edge);

    publisher.publishIdentity([TABLE, THREAD]);
    expect(edge.calls).toEqual([]);
    await settle();

    expect(edge.calls).toEqual([
      { path: '/registry/scopes/identity', method: 'PUT', body: { pluginKeys: [TABLE, THREAD] } },
    ]);
    vi.useRealTimers();
  });

  test('coalesces a burst into one publish: enabling one plugin can enable several', async ({ expect }) => {
    vi.useFakeTimers();
    const edge = makeEdge();
    const publisher = makeScopePublisher(edge);

    publisher.publishIdentity([THREAD]);
    publisher.publishIdentity([THREAD, TABLE]);
    await settle();

    expect(edge.calls).toHaveLength(1);
    expect(edge.calls[0].body).toEqual({ pluginKeys: [TABLE, THREAD] });
    vi.useRealTimers();
  });

  test('republishes nothing when the list has not changed', async ({ expect }) => {
    vi.useFakeTimers();
    const edge = makeEdge();
    const publisher = makeScopePublisher(edge);

    publisher.publishIdentity([THREAD]);
    await settle();
    // A different order is the same set; the publisher compares the sorted list.
    publisher.publishIdentity([THREAD]);
    await settle();

    expect(edge.calls).toHaveLength(1);
    vi.useRealTimers();
  });

  test('a space with no decisions clears its record rather than publishing an empty list', async ({ expect }) => {
    vi.useFakeTimers();
    const edge = makeEdge();
    const publisher = makeScopePublisher(edge);

    // An empty list on EDGE means the scope enabled nothing; no record means it made no choice (D-81).
    publisher.publishSpace(SPACE_ID, []);
    await settle();

    expect(edge.calls).toEqual([{ path: `/registry/scopes/spaces/${SPACE_ID}`, method: 'DELETE', body: undefined }]);
    vi.useRealTimers();
  });

  test('each scope is published independently', async ({ expect }) => {
    vi.useFakeTimers();
    const edge = makeEdge();
    const publisher = makeScopePublisher(edge);

    publisher.publishIdentity([TABLE]);
    publisher.publishSpace(SPACE_ID, [THREAD]);
    await settle();

    expect(edge.calls.map((call) => call.path).sort()).toEqual([
      '/registry/scopes/identity',
      `/registry/scopes/spaces/${SPACE_ID}`,
    ]);
    vi.useRealTimers();
  });

  test('a failed publish is dropped so the next change sends again', async ({ expect }) => {
    vi.useFakeTimers();
    const calls: string[] = [];
    let fail = true;
    const publisher = makeScopePublisher({
      request: async (_ctx: unknown, path: string) => {
        calls.push(path);
        if (fail) {
          throw new Error('edge is down');
        }
        return undefined;
      },
    } as never);

    publisher.publishIdentity([THREAD]);
    await settle();
    expect(calls).toHaveLength(1);

    // The same list again: a successful publish would have been skipped, a failed one is retried.
    fail = false;
    publisher.publishIdentity([THREAD]);
    await settle();
    expect(calls).toHaveLength(2);
    vi.useRealTimers();
  });

  test('cancelling drops a publish that has not fired', async ({ expect }) => {
    vi.useFakeTimers();
    const edge = makeEdge();
    const publisher = makeScopePublisher(edge);

    publisher.publishIdentity([THREAD]);
    publisher.cancel();
    await settle();

    expect(edge.calls).toEqual([]);
    vi.useRealTimers();
  });
});
