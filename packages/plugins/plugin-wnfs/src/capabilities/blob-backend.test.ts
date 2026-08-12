//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import { type Client } from '@dxos/client';
import { SpaceId } from '@dxos/keys';

import { WnfsCapabilities } from '#types';

vi.mock('../helpers', () => ({
  loadWnfs: vi.fn(),
  readWnfsFile: vi.fn(),
  upload: vi.fn(),
  getBlobUrl: vi.fn(),
}));

import { getBlobUrl, loadWnfs, readWnfsFile, upload } from '../helpers';
import { createWnfsBlobBackend } from './blob-backend';

describe('createWnfsBlobBackend', () => {
  // Test doubles: `Client`/`Space`/`Blockstore`/`PrivateDirectory`/`PrivateForest` are only ever
  // passed through to the mocked `../helpers` functions below, never inspected by the backend
  // itself, so minimal stand-ins are sufficient.
  const spaceId = SpaceId.random();
  const space = { id: spaceId } as any;
  const client = { spaces: { get: (id: SpaceId) => (id === spaceId ? space : undefined) } } as unknown as Client;
  const blockstore = {} as any;

  test('schemes includes the wnfs scheme', ({ expect }) => {
    const backend = createWnfsBlobBackend({ client, blockstore });
    expect(backend.schemes).toContain(WnfsCapabilities.WNFS_SCHEME);
  });

  test('put uploads via the upload helper and returns its url as the URI', async ({ expect }) => {
    vi.mocked(upload).mockResolvedValueOnce({
      name: 'photo.png',
      type: 'image/png',
      url: 'wnfs://spaces/x/files/abc',
      cid: 'abc',
    });
    const backend = createWnfsBlobBackend({ client, blockstore });

    const response = await backend.put({
      spaceId,
      data: new Uint8Array([1, 2, 3]),
      contentType: 'image/png',
      contentHash: 'abc',
    });

    expect(response.uri).toBe('wnfs://spaces/x/files/abc');
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({ blockstore, space }));
  });

  test('get returns undefined when the space is not found', async ({ expect }) => {
    const backend = createWnfsBlobBackend({ client, blockstore });
    const result = await backend.get({ spaceId: SpaceId.random(), uri: 'wnfs://x' });
    expect(result).toBeUndefined();
  });

  test('get reads bytes via loadWnfs + readWnfsFile', async ({ expect }) => {
    const directory = {} as any;
    const forest = {} as any;
    vi.mocked(loadWnfs).mockResolvedValueOnce({ directory, forest });
    vi.mocked(readWnfsFile).mockResolvedValueOnce(new Uint8Array([9, 8, 7]));

    const backend = createWnfsBlobBackend({ client, blockstore });
    const result = await backend.get({ spaceId, uri: 'wnfs://spaces/x/files/abc' });

    expect(result).toEqual(new Uint8Array([9, 8, 7]));
    expect(readWnfsFile).toHaveBeenCalledWith(
      expect.objectContaining({ wnfsUrl: 'wnfs://spaces/x/files/abc', directory, forest }),
    );
  });

  test('get returns undefined when reading throws', async ({ expect }) => {
    vi.mocked(loadWnfs).mockRejectedValueOnce(new Error('boom'));
    const backend = createWnfsBlobBackend({ client, blockstore });
    const result = await backend.get({ spaceId, uri: 'wnfs://spaces/x/files/missing' });
    expect(result).toBeUndefined();
  });

  test('has reflects whether get resolves bytes', async ({ expect }) => {
    vi.mocked(loadWnfs).mockResolvedValueOnce({ directory: {} as any, forest: {} as any });
    vi.mocked(readWnfsFile).mockResolvedValueOnce(new Uint8Array([1]));
    const backend = createWnfsBlobBackend({ client, blockstore });
    expect(await backend.has({ spaceId, uri: 'wnfs://spaces/x/files/abc' })).toBe(true);

    vi.mocked(loadWnfs).mockRejectedValueOnce(new Error('boom'));
    expect(await backend.has({ spaceId, uri: 'wnfs://spaces/x/files/missing' })).toBe(false);
  });

  test('getUrl resolves via the getBlobUrl helper', async ({ expect }) => {
    const directory = {} as any;
    const forest = {} as any;
    vi.mocked(loadWnfs).mockResolvedValueOnce({ directory, forest });
    vi.mocked(getBlobUrl).mockResolvedValueOnce('blob:http://local/abc');

    const backend = createWnfsBlobBackend({ client, blockstore });
    const url = await backend.getUrl!({ spaceId, uri: 'wnfs://spaces/x/files/abc', contentType: 'image/png' });

    expect(url).toBe('blob:http://local/abc');
    expect(getBlobUrl).toHaveBeenCalledWith(
      expect.objectContaining({ wnfsUrl: 'wnfs://spaces/x/files/abc', type: 'image/png' }),
    );
  });
});
