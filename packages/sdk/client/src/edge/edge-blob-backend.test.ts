//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import { fromDigestHex } from '@dxos/echo-client/internal';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { SpaceId } from '@dxos/keys';

import { createEdgeBlobBackend } from './edge-blob-backend';

describe('createEdgeBlobBackend', () => {
  const niUri = fromDigestHex('deadbeef');

  test('put uploads via putBlob and returns an ni: URI', async ({ expect }) => {
    const putBlob = vi.fn(async () => undefined);
    // Only `putBlob`/`getBlob`/`hasBlob` are exercised by the backend; the rest of the class is
    // irrelevant to this test.
    const edgeClient = { putBlob } as unknown as EdgeHttpClient;
    const backend = createEdgeBlobBackend({ edgeClient });

    const spaceId = SpaceId.random();
    const data = new Uint8Array([1, 2, 3]);
    const response = await backend.put({ spaceId, data, contentType: 'image/png', contentHash: 'deadbeef' });

    expect(response.uri).toBe(niUri);
    expect(putBlob).toHaveBeenCalledWith(expect.anything(), 'deadbeef', data, { contentType: 'image/png' });
  });

  test('get downloads via getBlob using the digest encoded in the URI', async ({ expect }) => {
    const bytes = new Uint8Array([9, 8, 7]);
    const getBlob = vi.fn(async () => bytes);
    const edgeClient = { getBlob } as unknown as EdgeHttpClient;
    const backend = createEdgeBlobBackend({ edgeClient });

    const spaceId = SpaceId.random();
    const result = await backend.get({ spaceId, uri: niUri });

    expect(result).toBe(bytes);
    expect(getBlob).toHaveBeenCalledWith(expect.anything(), 'deadbeef');
  });

  test('get returns undefined when getBlob returns undefined', async ({ expect }) => {
    const getBlob = vi.fn(async () => undefined);
    const edgeClient = { getBlob } as unknown as EdgeHttpClient;
    const backend = createEdgeBlobBackend({ edgeClient });

    const spaceId = SpaceId.random();
    const result = await backend.get({ spaceId, uri: fromDigestHex('c0ffee') });

    expect(result).toBeUndefined();
  });

  test('has checks via hasBlob using the digest encoded in the URI', async ({ expect }) => {
    const hasBlob = vi.fn(async () => true);
    const edgeClient = { hasBlob } as unknown as EdgeHttpClient;
    const backend = createEdgeBlobBackend({ edgeClient });

    const spaceId = SpaceId.random();
    const result = await backend.has({ spaceId, uri: niUri });

    expect(result).toBe(true);
    expect(hasBlob).toHaveBeenCalledWith(expect.anything(), 'deadbeef');
  });

  test('getUrl builds a direct edge URL from the digest encoded in the URI', async ({ expect }) => {
    const getBlobUrl = vi.fn((key: string) => new URL(`/api/file/${key}`, 'https://edge.example.com'));
    const edgeClient = { getBlobUrl } as unknown as EdgeHttpClient;
    const backend = createEdgeBlobBackend({ edgeClient });

    const spaceId = SpaceId.random();
    const result = await backend.getUrl?.({ spaceId, uri: niUri });

    expect(result).toBe('https://edge.example.com/api/file/deadbeef');
    expect(getBlobUrl).toHaveBeenCalledWith('deadbeef');
  });
});
