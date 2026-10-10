//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test, vi } from 'vitest';

import { SpaceId } from '@dxos/keys';

import { type BlobTransport, type LocalBlobStore } from '../backend.ts';
import { createMemoryBlobStore } from '../memory-store.ts';
import { digestHexFromBytes, fromDigestHex } from '../ni-uri.ts';
import { type EdgeBlobBackend, createEdgeBlobBackend } from './blob-backend.ts';

/**
 * A transport whose unused operations reject. Before the backend took a `BlobTransport` these tests
 * built partial `EdgeHttpClient`s behind `as unknown as`, which asserted a 33-method class from a
 * one-method object; the narrow interface makes each stub honest.
 */
const transportWith = (overrides: Partial<BlobTransport>): BlobTransport => ({
  url: () => {
    throw new Error('url not stubbed');
  },
  put: async () => {
    throw new Error('put not stubbed');
  },
  get: async () => {
    throw new Error('get not stubbed');
  },
  has: async () => {
    throw new Error('has not stubbed');
  },
  ...overrides,
});

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

describe('createEdgeBlobBackend', () => {
  const spaceId = SpaceId.random();
  const backends: EdgeBlobBackend[] = [];
  const open = (...args: Parameters<typeof createEdgeBlobBackend>) => {
    const backend = createEdgeBlobBackend(...args);
    backends.push(backend);
    return backend;
  };

  afterEach(async () => {
    await Promise.all(backends.splice(0).map((backend) => backend.close()));
  });

  const write = async (backend: EdgeBlobBackend, data: Uint8Array, contentType?: string) => {
    const contentHash = await digestHexFromBytes(data);
    const { uri } = await backend.put({ spaceId, data, contentType, contentHash });
    return { uri, contentHash };
  };

  test('put stores locally first and returns an ni: URI', async ({ expect }) => {
    const local = createMemoryBlobStore();
    const backend = open({ local });

    const data = new Uint8Array([1, 2, 3]);
    const { uri, contentHash } = await write(backend, data, 'image/png');

    expect(uri).toBe(fromDigestHex(contentHash));
    expect(await local.get(contentHash)).toEqual({ data, contentType: 'image/png' });
    expect(await backend.get({ spaceId, uri })).toEqual(data);
    expect(await backend.has({ spaceId, uri })).toBe(true);
  });

  test('without a transport the backend is fully local and writes stay pending', async ({ expect }) => {
    const local = createMemoryBlobStore();
    const backend = open({ local });

    const { contentHash } = await write(backend, new Uint8Array([4, 5]));
    await backend.flush();

    expect(await local.listPending({ limit: 10 })).toEqual([contentHash]);
    expect(await backend.get({ spaceId, uri: fromDigestHex('c0ffee') })).toBeUndefined();
    expect(await backend.has({ spaceId, uri: fromDigestHex('c0ffee') })).toBe(false);
  });

  test('uploads in the background and records the upload', async ({ expect }) => {
    const local = createMemoryBlobStore();
    const edge = memoryTransport();
    const backend = open({ local, transport: edge.transport, retry: FAST_RETRY });

    const data = new Uint8Array([6, 7, 8]);
    const { contentHash } = await write(backend, data, 'text/plain');

    await expect.poll(() => edge.stored.get(contentHash)).toEqual(data);
    await expect.poll(() => local.listPending({ limit: 10 })).toEqual([]);
    expect(edge.transport.put).toHaveBeenCalledWith(contentHash, data, { contentType: 'text/plain' });
  });

  test('a write made offline succeeds and uploads once the edge is reachable', async ({ expect }) => {
    const local = createMemoryBlobStore();
    const edge = memoryTransport();
    edge.setOnline(false);
    const backend = open({ local, transport: edge.transport, retry: FAST_RETRY });

    const data = new Uint8Array([9]);
    const { uri, contentHash } = await write(backend, data);
    expect(await backend.get({ spaceId, uri })).toEqual(data);

    await expect.poll(() => vi.mocked(edge.transport.put).mock.calls.length).toBeGreaterThan(1);
    expect(await local.listPending({ limit: 10 })).toEqual([contentHash]);

    edge.setOnline(true);
    await expect.poll(() => edge.stored.get(contentHash)).toEqual(data);
    await expect.poll(() => local.listPending({ limit: 10 })).toEqual([]);
  });

  test('pending writes from an earlier session are uploaded on start', async ({ expect }) => {
    const local = createMemoryBlobStore();
    const data = new Uint8Array([10, 11]);
    const contentHash = await digestHexFromBytes(data);
    await local.put(contentHash, data, { uploaded: false });

    const edge = memoryTransport();
    open({ local, transport: edge.transport, retry: FAST_RETRY });

    await expect.poll(() => edge.stored.get(contentHash)).toEqual(data);
  });

  test('a local miss is read through from the edge and cached', async ({ expect }) => {
    const local = createMemoryBlobStore();
    const edge = memoryTransport();
    const data = new Uint8Array([12, 13]);
    const contentHash = await digestHexFromBytes(data);
    edge.stored.set(contentHash, data);
    const backend = open({ local, transport: edge.transport });

    const uri = fromDigestHex(contentHash);
    expect(await backend.get({ spaceId, uri })).toEqual(data);
    expect(await local.get(contentHash)).toEqual({ data });
    // Cached as already uploaded, so it is never sent back.
    expect(await local.listPending({ limit: 10 })).toEqual([]);

    edge.setOnline(false);
    expect(await backend.get({ spaceId, uri })).toEqual(data);
    expect(edge.transport.get).toHaveBeenCalledTimes(1);
  });

  test('get returns undefined on a miss in both stores and rejects when the edge is unreachable', async ({
    expect,
  }) => {
    const edge = memoryTransport();
    const backend = open({ local: createMemoryBlobStore(), transport: edge.transport });

    expect(await backend.get({ spaceId, uri: fromDigestHex('c0ffee') })).toBeUndefined();
    edge.setOnline(false);
    await expect(backend.get({ spaceId, uri: fromDigestHex('c0ffee') })).rejects.toThrow('offline');
  });

  test('concurrent reads of a cold key fetch it from the edge once', async ({ expect }) => {
    const edge = memoryTransport();
    const data = new Uint8Array([14]);
    const contentHash = await digestHexFromBytes(data);
    edge.stored.set(contentHash, data);
    const backend = open({ local: createMemoryBlobStore(), transport: edge.transport });

    const uri = fromDigestHex(contentHash);
    await Promise.all([backend.get({ spaceId, uri }), backend.get({ spaceId, uri }), backend.getUrl({ spaceId, uri })]);
    expect(edge.transport.get).toHaveBeenCalledTimes(1);
  });

  test('getUrl serves an object URL from local bytes, offline', async ({ expect }) => {
    const edge = memoryTransport();
    edge.setOnline(false);
    const backend = open({ local: createMemoryBlobStore(), transport: edge.transport, retry: FAST_RETRY });

    const data = new TextEncoder().encode('hello');
    const { uri } = await write(backend, data, 'text/plain');
    const url = await backend.getUrl({ spaceId, uri });

    expect(url).toMatch(/^blob:/);
    expect(await backend.getUrl({ spaceId, uri })).toBe(url);
    const response = await fetch(url!);
    expect(await response.text()).toBe('hello');
    expect(response.headers.get('content-type')).toBe('text/plain');
  });

  test('getUrl falls back to the edge URL when the bytes cannot be fetched', async ({ expect }) => {
    const edge = memoryTransport();
    edge.setOnline(false);
    const backend = open({ local: createMemoryBlobStore(), transport: edge.transport });

    expect(await backend.getUrl({ spaceId, uri: fromDigestHex('deadbeef') })).toBe('https://edge.test/blobs/deadbeef');
  });

  test('flush uploads pending blobs and rejects while offline', async ({ expect }) => {
    const local: LocalBlobStore = createMemoryBlobStore();
    const edge = memoryTransport();
    edge.setOnline(false);
    const backend = open({ local, transport: edge.transport, retry: { baseDelay: 60_000 } });

    const { contentHash } = await write(backend, new Uint8Array([15]));
    await expect(backend.flush()).rejects.toThrow();

    edge.setOnline(true);
    await backend.flush();
    expect(edge.stored.has(contentHash)).toBe(true);
    expect(await local.listPending({ limit: 10 })).toEqual([]);
  });

  test('has falls back to the edge', async ({ expect }) => {
    const has = vi.fn(async () => true);
    const backend = open({ local: createMemoryBlobStore(), transport: transportWith({ has }) });

    expect(await backend.has({ spaceId, uri: fromDigestHex('deadbeef') })).toBe(true);
    expect(has).toHaveBeenCalledWith('deadbeef');
  });

  test('adoptUpload finalizes via the transport and returns an ni: URI with the stored size and type', async ({
    expect,
  }) => {
    const finalizeUpload = vi.fn(async () => ({ key: 'deadbeef', size: 42, contentType: 'image/png' }));
    const backend = open({ local: createMemoryBlobStore(), transport: transportWith({ finalizeUpload }) });

    const result = await backend.adoptUpload?.({ spaceId, uploadId: 'u1' });

    expect(result).toEqual({ uri: fromDigestHex('deadbeef'), size: 42, contentType: 'image/png' });
    expect(finalizeUpload).toHaveBeenCalledWith('u1');
  });

  test('adoptUpload is absent when the transport cannot finalize uploads', ({ expect }) => {
    expect(open({ local: createMemoryBlobStore(), transport: transportWith({}) }).adoptUpload).toBeUndefined();
    expect(open({ local: createMemoryBlobStore() }).adoptUpload).toBeUndefined();
  });

  test('rejects URIs with the wrong scheme', async ({ expect }) => {
    const backend = open({ local: createMemoryBlobStore() });
    await expect(backend.get({ spaceId, uri: 's3://bucket/key' })).rejects.toThrow();
  });
});
