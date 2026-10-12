//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import { SpaceId } from '@dxos/keys';

import { type BlobStore } from '../backend.ts';
import { createMemoryBlobStore } from '../memory-store.ts';
import { digestHexFromBytes, fromDigestHex } from '../ni-uri.ts';
import { createEdgeBlobBackend } from './blob-backend.ts';

describe('createEdgeBlobBackend', () => {
  const spaceId = SpaceId.random();

  test('put is confirmed once the local store holds the bytes, and returns an ni: URI', async ({ expect }) => {
    const store = createMemoryBlobStore();
    const backend = createEdgeBlobBackend({ store });

    const data = new Uint8Array([1, 2, 3]);
    const contentHash = await digestHexFromBytes(data);
    const { uri } = await backend.put({ spaceId, data, contentType: 'image/png', contentHash });

    expect(uri).toBe(fromDigestHex(contentHash));
    expect(await store.get(contentHash)).toEqual({ data, contentType: 'image/png' });
    expect(await backend.get({ spaceId, uri })).toEqual(data);
    expect(await backend.has({ spaceId, uri })).toBe(true);
    expect(await backend.get({ spaceId, uri: fromDigestHex('c0ffee') })).toBeUndefined();
    expect(await backend.has({ spaceId, uri: fromDigestHex('c0ffee') })).toBe(false);
  });

  test('a write is not held up by replication behind the store', async ({ expect }) => {
    // A store whose replication never settles: the backend must not wait on anything but the put.
    const store: BlobStore = { ...createMemoryBlobStore(), put: vi.fn(async () => undefined) };
    const backend = createEdgeBlobBackend({ store });

    await expect(backend.put({ spaceId, data: new Uint8Array([1]), contentHash: 'deadbeef' })).resolves.toEqual({
      uri: fromDigestHex('deadbeef'),
    });
    expect(store.put).toHaveBeenCalledWith('deadbeef', new Uint8Array([1]), { contentType: undefined });
  });

  test('getUrl serves an object URL over the local bytes and reuses it', async ({ expect }) => {
    const store = createMemoryBlobStore();
    const backend = createEdgeBlobBackend({ store });
    const data = new TextEncoder().encode('hello');
    const { uri } = await backend.put({ spaceId, data, contentType: 'text/plain', contentHash: 'aa' });

    const url = await backend.getUrl({ spaceId, uri });
    expect(url).toMatch(/^blob:/);
    expect(await backend.getUrl({ spaceId, uri })).toBe(url);
    const response = await fetch(url ?? '');
    expect(await response.text()).toBe('hello');
    expect(response.headers.get('content-type')).toBe('text/plain');
    expect(await backend.getUrl({ spaceId, uri: fromDigestHex('c0ffee') })).toBeUndefined();

    const asHtml = await backend.getUrl({ spaceId, uri, contentType: 'text/html' });
    expect(asHtml).not.toBe(url);
    expect((await fetch(asHtml ?? '')).headers.get('content-type')).toBe('text/html');
    backend.close();
  });

  test('adoptUpload finalizes the upload and returns an ni: URI with the stored size and type', async ({ expect }) => {
    const finalizeUpload = vi.fn(async () => ({ key: 'deadbeef', size: 42, contentType: 'image/png' }));
    const backend = createEdgeBlobBackend({ store: createMemoryBlobStore(), finalizeUpload });

    expect(await backend.adoptUpload?.({ spaceId, uploadId: 'u1' })).toEqual({
      uri: fromDigestHex('deadbeef'),
      size: 42,
      contentType: 'image/png',
    });
    expect(finalizeUpload).toHaveBeenCalledWith('u1');
  });

  test('adoptUpload is absent without a way to finalize uploads', ({ expect }) => {
    // Absent rather than throwing: the manager distinguishes "this backend cannot adopt uploads"
    // from "the adoption failed", and only the missing method expresses the first.
    expect(createEdgeBlobBackend({ store: createMemoryBlobStore() }).adoptUpload).toBeUndefined();
  });

  test('rejects URIs with the wrong scheme', async ({ expect }) => {
    const backend = createEdgeBlobBackend({ store: createMemoryBlobStore() });
    await expect(backend.get({ spaceId, uri: 's3://bucket/key' })).rejects.toThrow();
  });
});
