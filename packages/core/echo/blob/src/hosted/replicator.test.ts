//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test, vi } from 'vitest';

import { type BlobTransport } from '../backend.ts';
import { createMemoryBlobStore } from '../memory-store.ts';
import { type BlobReplicator, createBlobReplicator, withReadThrough } from './replicator.ts';

/** An in-memory hosted store that can be taken offline. */
const memoryTransport = () => {
  const stored = new Map<string, Uint8Array>();
  let online = true;
  const assertOnline = () => {
    if (!online) {
      throw new Error('offline');
    }
  };
  const transport: BlobTransport = {
    url: (key) => new URL(`https://edge.test/blobs/${key}`),
    put: vi.fn(async (key: string, data: Uint8Array) => {
      assertOnline();
      stored.set(key, data);
    }),
    get: vi.fn(async (key: string) => {
      assertOnline();
      return stored.get(key);
    }),
    has: vi.fn(async (key: string) => {
      assertOnline();
      return stored.has(key);
    }),
  };
  return {
    transport,
    stored,
    setOnline: (value: boolean) => {
      online = value;
    },
  };
};

const FAST_RETRY = { baseDelay: 5, maxDelay: 20 };

describe('createBlobReplicator', () => {
  const replicators: BlobReplicator[] = [];
  const open = (...args: Parameters<typeof createBlobReplicator>) => {
    const replicator = createBlobReplicator(...args);
    replicators.push(replicator);
    return replicator;
  };

  afterEach(async () => {
    await Promise.all(replicators.splice(0).map((replicator) => replicator.close()));
  });

  test('pushes a stored blob after a wake and records the upload', async ({ expect }) => {
    const local = createMemoryBlobStore();
    const edge = memoryTransport();
    const replicator = open({ local, transport: edge.transport, retry: FAST_RETRY });

    const data = new Uint8Array([1, 2]);
    await local.put('aa', data, { contentType: 'text/plain' });
    replicator.wake();

    await expect.poll(() => edge.stored.get('aa')).toEqual(data);
    await expect.poll(() => local.listPending({ limit: 10 })).toEqual([]);
    expect(edge.transport.put).toHaveBeenCalledWith('aa', data, { contentType: 'text/plain' });
  });

  test('pending blobs from an earlier session are pushed on start', async ({ expect }) => {
    const local = createMemoryBlobStore();
    await local.put('aa', new Uint8Array([3]));
    const edge = memoryTransport();
    open({ local, transport: edge.transport, retry: FAST_RETRY });

    await expect.poll(() => edge.stored.has('aa')).toBe(true);
  });

  test('retries while the edge is unreachable and pushes once it is back', async ({ expect }) => {
    const local = createMemoryBlobStore();
    const edge = memoryTransport();
    edge.setOnline(false);
    await local.put('aa', new Uint8Array([4]));
    open({ local, transport: edge.transport, retry: FAST_RETRY });

    await expect.poll(() => vi.mocked(edge.transport.put).mock.calls.length).toBeGreaterThan(1);
    expect(await local.listPending({ limit: 10 })).toEqual(['aa']);

    edge.setOnline(true);
    await expect.poll(() => edge.stored.has('aa')).toBe(true);
    await expect.poll(() => local.listPending({ limit: 10 })).toEqual([]);
  });

  test('flush pushes pending blobs and rejects while offline', async ({ expect }) => {
    const local = createMemoryBlobStore();
    const edge = memoryTransport();
    edge.setOnline(false);
    const replicator = open({ local, transport: edge.transport, retry: { baseDelay: 60_000 } });
    await local.put('aa', new Uint8Array([5]));

    await expect(replicator.flush()).rejects.toThrow();
    edge.setOnline(true);
    await replicator.flush();
    expect(edge.stored.has('aa')).toBe(true);
  });
});

describe('withReadThrough', () => {
  test('fills a local miss from the edge and caches it as already uploaded', async ({ expect }) => {
    const local = createMemoryBlobStore();
    const edge = memoryTransport();
    const data = new Uint8Array([6]);
    edge.stored.set('aa', data);
    const store = withReadThrough({ local, transport: edge.transport });

    expect(await store.get('aa')).toEqual({ data });
    expect(await local.get('aa')).toEqual({ data });
    expect(await local.listPending({ limit: 10 })).toEqual([]);

    edge.setOnline(false);
    expect(await store.get('aa')).toEqual({ data });
    expect(edge.transport.get).toHaveBeenCalledTimes(1);
  });

  test('concurrent reads of a cold key fetch it once', async ({ expect }) => {
    const edge = memoryTransport();
    edge.stored.set('aa', new Uint8Array([7]));
    const store = withReadThrough({ local: createMemoryBlobStore(), transport: edge.transport });

    await Promise.all([store.get('aa'), store.get('aa'), store.get('aa')]);
    expect(edge.transport.get).toHaveBeenCalledTimes(1);
  });

  test('a miss in both stores is undefined; an unreachable edge rejects', async ({ expect }) => {
    const edge = memoryTransport();
    const store = withReadThrough({ local: createMemoryBlobStore(), transport: edge.transport });

    expect(await store.get('cc')).toBeUndefined();
    expect(await store.has('cc')).toBe(false);
    edge.setOnline(false);
    await expect(store.get('cc')).rejects.toThrow('offline');
  });
});
