//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import { SpaceId } from '@dxos/keys';

import { type BlobTransport } from '../backend';
import { fromDigestHex } from '../ni-uri';
import { createEdgeBlobBackend } from './blob-backend';

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

describe('createEdgeBlobBackend', () => {
  const niUri = fromDigestHex('deadbeef');

  test('put uploads via the transport and returns an ni: URI', async ({ expect }) => {
    const put = vi.fn(async () => undefined);
    const backend = createEdgeBlobBackend({ transport: transportWith({ put }) });

    const spaceId = SpaceId.random();
    const data = new Uint8Array([1, 2, 3]);
    const response = await backend.put({ spaceId, data, contentType: 'image/png', contentHash: 'deadbeef' });

    expect(response.uri).toBe(niUri);
    expect(put).toHaveBeenCalledWith('deadbeef', data, { contentType: 'image/png' });
  });

  test('get downloads using the digest encoded in the URI', async ({ expect }) => {
    const bytes = new Uint8Array([9, 8, 7]);
    const get = vi.fn(async () => bytes);
    const backend = createEdgeBlobBackend({ transport: transportWith({ get }) });

    const spaceId = SpaceId.random();
    const result = await backend.get({ spaceId, uri: niUri });

    expect(result).toBe(bytes);
    expect(get).toHaveBeenCalledWith('deadbeef');
  });

  test('get returns undefined when the transport reports a miss', async ({ expect }) => {
    const get = vi.fn(async () => undefined);
    const backend = createEdgeBlobBackend({ transport: transportWith({ get }) });

    const spaceId = SpaceId.random();
    const result = await backend.get({ spaceId, uri: fromDigestHex('c0ffee') });

    expect(result).toBeUndefined();
  });

  test('has checks using the digest encoded in the URI', async ({ expect }) => {
    const has = vi.fn(async () => true);
    const backend = createEdgeBlobBackend({ transport: transportWith({ has }) });

    const spaceId = SpaceId.random();
    const result = await backend.has({ spaceId, uri: niUri });

    expect(result).toBe(true);
    expect(has).toHaveBeenCalledWith('deadbeef');
  });

  test('getUrl builds a direct URL from the digest encoded in the URI', async ({ expect }) => {
    const url = vi.fn((key: string) => new URL(`/blob/file/${key}`, 'https://edge.example.com'));
    const backend = createEdgeBlobBackend({ transport: transportWith({ url }) });

    const spaceId = SpaceId.random();
    const result = await backend.getUrl?.({ spaceId, uri: niUri });

    expect(result).toBe('https://edge.example.com/blob/file/deadbeef');
    expect(url).toHaveBeenCalledWith('deadbeef');
  });
});
